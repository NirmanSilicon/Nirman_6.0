"""Custom industrial plant quick-retraining pipeline for AlarmSense.

Allows any external factory's labeled sensor CSV to be validated, split safely
without episode leakage, converted into sliding-window statistical/trend features,
trained with an XGBoost classifier, and saved under artifacts/plants/<plant_id>/
without overwriting the default Tennessee Eastman Process model artifacts.
"""

import json
from pathlib import Path
import re
import time
from typing import Any
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier

from app.config import DEFAULT_WINDOW_SIZE
from app.services.features import extract_window_features_batch, get_feature_names

PLANT_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")
DEFAULT_PLANTS_ARTIFACTS_ROOT = Path("artifacts/plants")


def validate_plant_id(plant_id: str) -> str:
    """Validate plant_id format and forbid overwriting reserved 'tep' identifier."""
    cleaned = plant_id.strip()
    if not cleaned or not PLANT_ID_PATTERN.match(cleaned):
        raise ValueError(
            f"Invalid plant_id '{plant_id}'. Use only alphanumeric characters, '_' or '-'."
        )
    if cleaned.lower() == "tep":
        raise ValueError("plant_id 'tep' is reserved for the built-in TEP baseline model.")
    return cleaned


def _detect_csv_separator(csv_path: Path) -> str:
    """Auto-detect ',' vs ';' delimiter from the header line."""
    with open(csv_path, encoding="utf-8", errors="replace") as f:
        for line in f:
            stripped = line.strip()
            if stripped:
                return ";" if stripped.count(";") > stripped.count(",") else ","
    return ","


def _safe_split_episodes(
    df: pd.DataFrame,
    window_size: int,
    seed: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Split episodes into train/val/test, falling back to chronological split on small CSVs.

    Ensures every class contributes windows to train_df and, whenever enough rows
    exist, also contributes independent slices to val_df and test_df without
    crossing episode boundaries.
    """
    rng = np.random.default_rng(seed)

    train_parts: list[pd.DataFrame] = []
    val_parts: list[pd.DataFrame] = []
    test_parts: list[pd.DataFrame] = []
    next_ep_id = int(df["episode_id"].max()) + 1

    for status in sorted(df["STATUS"].unique()):
        status_df = df[df["STATUS"] == status]
        ep_groups = [
            ep.reset_index(drop=True)
            for _, ep in status_df.groupby("episode_id", sort=True)
            if len(ep) >= window_size
        ]

        if not ep_groups:
            raise ValueError(
                f"Class {status} has no contiguous episode with at least window_size={window_size} rows."
            )

        if len(ep_groups) >= 3:
            perm = rng.permutation(len(ep_groups))
            n = len(ep_groups)
            n_val = max(1, int(round(0.15 * n)))
            n_test = max(1, int(round(0.15 * n)))
            n_train = n - n_val - n_test
            if n_train < 1:
                n_train = 1
                if n_val > n_test:
                    n_val = max(1, n_val - 1)
                else:
                    n_test = max(1, n_test - 1)
            for idx in perm[:n_train]:
                train_parts.append(ep_groups[int(idx)])
            for idx in perm[n_train : n_train + n_val]:
                val_parts.append(ep_groups[int(idx)])
            for idx in perm[n_train + n_val :]:
                test_parts.append(ep_groups[int(idx)])
            continue

        # Small dataset fallback: split chronologically within each episode
        for ep in ep_groups:
            n_rows = len(ep)
            if n_rows >= 3 * window_size:
                val_len = max(window_size, int(round(0.15 * n_rows)))
                test_len = max(window_size, int(round(0.15 * n_rows)))
                if n_rows - val_len - test_len < window_size:
                    val_len = window_size
                    test_len = window_size
                train_end = n_rows - val_len - test_len
                val_end = n_rows - test_len

                tr = ep.iloc[:train_end].copy()
                va = ep.iloc[train_end:val_end].copy()
                te = ep.iloc[val_end:].copy()

                tr["episode_id"] = np.int32(next_ep_id)
                va["episode_id"] = np.int32(next_ep_id + 1)
                te["episode_id"] = np.int32(next_ep_id + 2)
                next_ep_id += 3

                train_parts.append(tr)
                val_parts.append(va)
                test_parts.append(te)
            elif n_rows >= 2 * window_size:
                split_idx = n_rows - window_size
                tr = ep.iloc[:split_idx].copy()
                te = ep.iloc[split_idx:].copy()
                va = te.copy()

                tr["episode_id"] = np.int32(next_ep_id)
                va["episode_id"] = np.int32(next_ep_id + 1)
                te["episode_id"] = np.int32(next_ep_id + 2)
                next_ep_id += 3

                train_parts.append(tr)
                val_parts.append(va)
                test_parts.append(te)
            else:
                tr = ep.copy()
                va = ep.copy()
                te = ep.copy()
                tr["episode_id"] = np.int32(next_ep_id)
                va["episode_id"] = np.int32(next_ep_id + 1)
                te["episode_id"] = np.int32(next_ep_id + 2)
                next_ep_id += 3
                train_parts.append(tr)
                val_parts.append(va)
                test_parts.append(te)

    train_df = pd.concat(train_parts, ignore_index=True)
    val_df = pd.concat(val_parts, ignore_index=True) if val_parts else train_df.copy()
    test_df = pd.concat(test_parts, ignore_index=True) if test_parts else val_df.copy()
    return train_df, val_df, test_df


def train_custom_plant_csv(
    csv_path: str | Path,
    plant_id: str,
    plant_name: str | None = None,
    status_col: str = "STATUS",
    timestamp_col: str | None = None,
    normal_label: int = 0,
    window_size: int = DEFAULT_WINDOW_SIZE,
    artifacts_root: Path = DEFAULT_PLANTS_ARTIFACTS_ROOT,
) -> dict[str, Any]:
    """Train and persist an XGBoost fault diagnosis model for a custom plant CSV.

    Args:
        csv_path: Path to the labeled CSV dataset.
        plant_id: Unique plant identifier (alphanumeric, '_' or '-', cannot be 'tep').
        plant_name: Human-readable plant display name.
        status_col: Column containing integer fault labels (default 'STATUS').
        timestamp_col: Optional timestamp column to exclude from sensor features.
        normal_label: Label representing normal baseline operation (default 0).
        window_size: Sliding window size W (default 20).
        artifacts_root: Root directory under which <plant_id>/ artifacts are saved.

    Returns:
        dict[str, Any]: Training summary and evaluation metrics.
    """
    t_start = time.perf_counter()
    clean_id = validate_plant_id(plant_id)
    effective_name = (plant_name or "").strip() or clean_id.replace("_", " ").replace("-", " ").title()

    path = Path(csv_path)
    if not path.is_file():
        raise FileNotFoundError(f"CSV file not found: {path}")
    if window_size < 2:
        raise ValueError(f"window_size must be >= 2, got {window_size}")

    sep = _detect_csv_separator(path)
    raw_df = pd.read_csv(path, sep=sep)
    if raw_df.empty:
        raise ValueError("Uploaded CSV contains no rows.")
    if status_col not in raw_df.columns:
        raise ValueError(f"Required label column '{status_col}' not found in CSV columns.")

    # Auto-detect numeric sensor columns excluding metadata and timestamps
    excluded = {status_col, "episode_id", "Unnamed: 0", "timestamp"}
    if timestamp_col:
        excluded.add(timestamp_col)

    sensor_cols = [
        col
        for col in raw_df.columns
        if col not in excluded
        and not str(col).startswith("Unnamed:")
        and pd.api.types.is_numeric_dtype(raw_df[col])
        and not raw_df[col].isna().all()
    ]
    if len(sensor_cols) < 2:
        raise ValueError(
            f"At least 2 numeric sensor columns are required, found {len(sensor_cols)}: {sensor_cols}"
        )

    work_df = pd.DataFrame()
    for col in sensor_cols:
        series = pd.to_numeric(raw_df[col], errors="coerce").ffill().bfill().fillna(0.0)
        work_df[col] = series.astype(np.float32)

    # Normalize status labels to integer codes while preserving original names if non-numeric
    raw_labels = raw_df[status_col]
    custom_fault_names: dict[int, str] = {}
    if pd.api.types.is_numeric_dtype(raw_labels):
        int_labels = pd.to_numeric(raw_labels, errors="raise").astype(np.int64)
        work_df["STATUS"] = int_labels
        for cls_val in sorted(int(v) for v in int_labels.unique()):
            custom_fault_names[cls_val] = (
                "Normal" if cls_val == normal_label else f"Fault {cls_val}"
            )
    else:
        str_labels = raw_labels.astype(str).str.strip()
        unique_strs = sorted(str_labels.unique())
        str_to_int = {name: idx for idx, name in enumerate(unique_strs)}
        work_df["STATUS"] = str_labels.map(str_to_int).astype(np.int64)
        for name, idx in str_to_int.items():
            custom_fault_names[idx] = name

    unique_classes = sorted(int(c) for c in work_df["STATUS"].unique())
    if len(unique_classes) < 2:
        raise ValueError(
            f"At least 2 unique classes in '{status_col}' are required, found {unique_classes}."
        )

    work_df["episode_id"] = (work_df["STATUS"] != work_df["STATUS"].shift()).cumsum().astype(np.int32)

    train_df, val_df, test_df = _safe_split_episodes(work_df, window_size=window_size, seed=42)

    # Compute baseline strictly on normal_label rows in train_df (fallback to train_df overall)
    normal_rows = train_df[train_df["STATUS"] == normal_label]
    baseline_source = normal_rows if not normal_rows.empty else train_df
    means = baseline_source[sensor_cols].mean(axis=0)
    stds = baseline_source[sensor_cols].std(axis=0).replace(0.0, 1e-6).fillna(1e-6)
    stds = stds.where(stds > 1e-9, 1e-6)
    baseline_df = pd.DataFrame({"mean": means, "std": stds}, index=sensor_cols)

    X_train, y_train_raw, _ = extract_window_features_batch(
        train_df, sensor_cols=sensor_cols, window_size=window_size
    )
    X_val, y_val_raw, _ = extract_window_features_batch(
        val_df, sensor_cols=sensor_cols, window_size=window_size
    )
    X_test, y_test_raw, _ = extract_window_features_batch(
        test_df, sensor_cols=sensor_cols, window_size=window_size
    )

    if len(X_train) == 0:
        raise ValueError(
            f"Insufficient data to form training windows of length window_size={window_size}."
        )

    fault_to_idx = {cls_val: idx for idx, cls_val in enumerate(unique_classes)}
    idx_to_fault = {idx: cls_val for idx, cls_val in enumerate(unique_classes)}

    y_train = np.array([fault_to_idx[int(v)] for v in y_train_raw], dtype=np.int64)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train).astype(np.float32)

    sample_weights = compute_sample_weight("balanced", y_train)
    model = XGBClassifier(
        tree_method="hist",
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train_scaled, y_train, sample_weight=sample_weights, verbose=False)

    # Evaluate on test_df (fallback to val_df or train_df if empty)
    if len(X_test) > 0:
        X_eval, y_eval_raw = X_test, y_test_raw
    elif len(X_val) > 0:
        X_eval, y_eval_raw = X_val, y_val_raw
    else:
        X_eval, y_eval_raw = X_train, y_train_raw

    X_eval_scaled = scaler.transform(X_eval).astype(np.float32)
    y_eval = np.array([fault_to_idx[int(v)] for v in y_eval_raw], dtype=np.int64)
    y_pred = model.predict(X_eval_scaled)

    sample_acc = round(float(accuracy_score(y_eval, y_pred)), 4)
    sample_macro_f1 = round(float(f1_score(y_eval, y_pred, average="macro", zero_division=0)), 4)

    plant_dir = Path(artifacts_root) / clean_id
    plant_dir.mkdir(parents=True, exist_ok=True)

    model.save_model(plant_dir / "xgb_model.json")
    joblib.dump(scaler, plant_dir / "scaler.joblib")
    baseline_df.to_json(plant_dir / "baseline.json", orient="index", indent=2)

    label_map_payload = {
        "plant_id": clean_id,
        "plant_name": effective_name,
        "fault_to_idx": {str(k): v for k, v in fault_to_idx.items()},
        "idx_to_fault": {str(k): v for k, v in idx_to_fault.items()},
        "classes": unique_classes,
        "sensor_cols": list(sensor_cols),
        "fault_names": {str(k): v for k, v in custom_fault_names.items()},
        "window_size": int(window_size),
        "feature_names": get_feature_names(sensor_cols),
    }
    with open(plant_dir / "label_map.json", "w", encoding="utf-8") as f:
        json.dump(label_map_payload, f, indent=2)

    elapsed = round(time.perf_counter() - t_start, 2)
    return {
        "plant_id": clean_id,
        "plant_name": effective_name,
        "n_sensors": len(sensor_cols),
        "sensor_cols": list(sensor_cols),
        "classes": unique_classes,
        "train_windows": int(len(X_train)),
        "sample_accuracy": sample_acc,
        "sample_macro_f1": sample_macro_f1,
        "train_time_sec": elapsed,
        "artifacts_dir": str(plant_dir),
    }
