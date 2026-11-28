"""XGBoost multi-class fault classifier training pipeline for AlarmSense.

Loads preprocessed TEP Parquet data, performs episode-stratified splitting,
computes normal baseline statistics strictly on training STATUS == 0 rows,
extracts vectorized sliding-window features, fits StandardScaler on training
features only, trains an XGBoost classifier with balanced sample weights and
validation early stopping, and saves all production artifacts.
"""

import json
from pathlib import Path
import time
import joblib
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier

from app.config import (
    DEFAULT_WINDOW_SIZE,
    FAULT_METADATA,
    PARQUET_PATH,
    SENSOR_COLS,
    TARGET_FAULTS,
)
from app.services.features import extract_window_features_batch, get_feature_names
from app.services.tep_loader import (
    compute_normal_baseline,
    load_tep_parquet,
    split_episodes,
)

ARTIFACTS_DIR = Path(__file__).resolve().parents[1] / "artifacts"


def build_label_mappings(target_faults: list[int]) -> tuple[dict[int, int], dict[int, int]]:
    """Create bidirectional mappings between TEP STATUS codes and 0..K-1 class indices."""
    sorted_faults = sorted(int(f) for f in target_faults)
    fault_to_idx = {fault: idx for idx, fault in enumerate(sorted_faults)}
    idx_to_fault = {idx: fault for idx, fault in enumerate(sorted_faults)}
    return fault_to_idx, idx_to_fault


def train_pipeline(
    parquet_path: str = PARQUET_PATH,
    artifacts_dir: Path = ARTIFACTS_DIR,
    window_size: int = DEFAULT_WINDOW_SIZE,
) -> dict[str, object]:
    """Execute end-to-end XGBoost training and save model/scaler/baseline/label_map artifacts."""
    t_start = time.perf_counter()

    print(f"[1/6] Loading TEP dataset from {parquet_path}...")
    df = load_tep_parquet(path=parquet_path, target_faults=TARGET_FAULTS)
    train_df, val_df, test_df = split_episodes(df, train_ratio=0.70, val_ratio=0.15, seed=42)
    print(
        f"      Episodes split -> train rows: {len(train_df):,}, "
        f"val rows: {len(val_df):,}, test rows: {len(test_df):,}"
    )

    print("[2/6] Computing normal baseline strictly on train_df (STATUS == 0)...")
    baseline_df = compute_normal_baseline(train_df, sensor_cols=SENSOR_COLS)

    print(f"[3/6] Extracting vectorized sliding-window features (W={window_size})...")
    t_feat = time.perf_counter()
    X_train, y_train_raw, _ = extract_window_features_batch(
        train_df, sensor_cols=SENSOR_COLS, window_size=window_size
    )
    X_val, y_val_raw, _ = extract_window_features_batch(
        val_df, sensor_cols=SENSOR_COLS, window_size=window_size
    )
    print(
        f"      Extracted X_train={X_train.shape}, X_val={X_val.shape} "
        f"in {time.perf_counter() - t_feat:.2f}s"
    )

    print("[4/6] Fitting StandardScaler strictly on X_train and mapping labels...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train).astype(np.float32)
    X_val_scaled = scaler.transform(X_val).astype(np.float32)

    fault_to_idx, idx_to_fault = build_label_mappings(TARGET_FAULTS)
    y_train = np.array([fault_to_idx[int(label)] for label in y_train_raw], dtype=np.int64)
    y_val = np.array([fault_to_idx[int(label)] for label in y_val_raw], dtype=np.int64)

    sample_weights = compute_sample_weight("balanced", y_train)

    print("[5/6] Training XGBClassifier (tree_method='hist', early_stopping_rounds=25)...")
    t_train = time.perf_counter()
    model = XGBClassifier(
        tree_method="hist",
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        early_stopping_rounds=25,
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(
        X_train_scaled,
        y_train,
        sample_weight=sample_weights,
        eval_set=[(X_val_scaled, y_val)],
        verbose=50,
    )
    train_elapsed = time.perf_counter() - t_train
    print(
        f"      Training complete in {train_elapsed:.2f}s "
        f"(best_iteration={model.best_iteration}, best_score={model.best_score:.4f})"
    )

    print(f"[6/6] Saving artifacts to {artifacts_dir}...")
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    model_path = artifacts_dir / "xgb_model.json"
    scaler_path = artifacts_dir / "scaler.joblib"
    baseline_path = artifacts_dir / "baseline.json"
    label_map_path = artifacts_dir / "label_map.json"

    model.save_model(model_path)
    joblib.dump(scaler, scaler_path)
    baseline_df.to_json(baseline_path, orient="index", indent=2)

    label_map_payload = {
        "fault_to_idx": {str(k): v for k, v in fault_to_idx.items()},
        "idx_to_fault": {str(k): v for k, v in idx_to_fault.items()},
        "classes": [int(f) for f in sorted(TARGET_FAULTS)],
        "fault_names": {
            str(f): FAULT_METADATA[int(f)]["name"] for f in sorted(TARGET_FAULTS)
        },
        "window_size": window_size,
        "feature_names": get_feature_names(SENSOR_COLS),
    }
    with open(label_map_path, "w", encoding="utf-8") as f:
        json.dump(label_map_payload, f, indent=2)

    total_elapsed = time.perf_counter() - t_start
    print(f"All artifacts saved successfully. Total pipeline time: {total_elapsed:.2f}s")

    return {
        "train_time_sec": round(train_elapsed, 2),
        "total_time_sec": round(total_elapsed, 2),
        "best_iteration": int(model.best_iteration),
        "best_val_mlogloss": round(float(model.best_score), 4),
        "X_train_shape": X_train.shape,
        "X_val_shape": X_val.shape,
    }


def main() -> None:
    """CLI entrypoint for training the AlarmSense XGBoost model."""
    train_pipeline()


if __name__ == "__main__":
    main()
