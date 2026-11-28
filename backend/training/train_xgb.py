
"""
AlarmSense - XGBoost Multi-Class Fault Classifier Training Pipeline

Pipeline:
1. Load preprocessed TEP Parquet data.
2. Split data into episode-based train/validation/test sets.
3. Compute normal baseline statistics using training STATUS == 0 rows only.
4. Extract vectorized sliding-window features.
5. Fit StandardScaler using training features only.
6. Train XGBoost with balanced sample weights and validation early stopping.
7. Save model, scaler, baseline, and label mapping artifacts.

The test split is intentionally not used during training or early stopping.
"""

import json
import os
import shutil
import tempfile
import time

from pathlib import Path

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

from app.services.features import (
    extract_window_features_batch,
    get_feature_names,
)

from app.services.tep_loader import (
    compute_normal_baseline,
    load_tep_parquet,
    split_episodes,
)


# ---------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------

ARTIFACTS_DIR = Path(__file__).resolve().parents[1] / "artifacts"

RANDOM_STATE = 42

TRAIN_RATIO = 0.70
VALIDATION_RATIO = 0.15

N_ESTIMATORS = 400
MAX_DEPTH = 6
LEARNING_RATE = 0.05

EARLY_STOPPING_ROUNDS = 25


# ---------------------------------------------------------------------
# LABEL MAPPING
# ---------------------------------------------------------------------

def build_label_mappings(
    target_faults: list[int],
) -> tuple[dict[int, int], dict[int, int]]:
    """
    Create bidirectional mappings between raw TEP STATUS codes
    and contiguous model class indices (0 to K-1).
    """

    sorted_faults = sorted(
        int(fault) for fault in target_faults
    )

    if not sorted_faults:
        return {}, {}

    if len(sorted_faults) != len(set(sorted_faults)):
        raise ValueError(
            "TARGET_FAULTS contains duplicate fault IDs."
        )

    fault_to_idx = {
        fault: idx
        for idx, fault in enumerate(sorted_faults)
    }

    idx_to_fault = {
        idx: fault
        for fault, idx in fault_to_idx.items()
    }

    return fault_to_idx, idx_to_fault


def map_labels(
    labels: np.ndarray,
    fault_to_idx: dict[int, int],
    split_name: str,
) -> np.ndarray:
    """Convert raw STATUS labels into contiguous class indices."""

    mapped_labels = []

    for label in labels:

        fault_id = int(label)

        if fault_id not in fault_to_idx:
            raise ValueError(
                f"{split_name}: unknown STATUS value {fault_id}."
            )

        mapped_labels.append(
            fault_to_idx[fault_id]
        )

    return np.asarray(
        mapped_labels,
        dtype=np.int64,
    )


# ---------------------------------------------------------------------
# INPUT VALIDATION
# ---------------------------------------------------------------------

def validate_training_configuration(
    parquet_path: str | Path,
    window_size: int,
):
    """Validate the dataset path, window size, and target configuration."""

    if not isinstance(window_size, int) or window_size < 2:
        raise ValueError(
            f"window_size must be an integer >= 2, got {window_size}."
        )

    if not SENSOR_COLS:
        raise ValueError(
            "SENSOR_COLS cannot be empty."
        )

    missing_metadata = [
        fault
        for fault in TARGET_FAULTS
        if int(fault) not in FAULT_METADATA
    ]

    if missing_metadata:
        raise ValueError(
            "Missing fault metadata for: "
            f"{missing_metadata}"
        )


# ---------------------------------------------------------------------
# FEATURE VALIDATION
# ---------------------------------------------------------------------

def validate_feature_data(
    X: np.ndarray,
    y: np.ndarray,
    split_name: str,
):
    """Validate extracted sliding-window features and labels."""

    X = np.asarray(X)
    y = np.asarray(y)

    if X.ndim != 2:
        raise ValueError(
            f"{split_name}: expected a 2D feature matrix, "
            f"received shape {X.shape}."
        )

    if len(X) == 0:
        raise ValueError(
            f"{split_name}: no sliding-window features were generated. "
            "Check the dataset and window size."
        )

    if len(X) != len(y):
        raise ValueError(
            f"{split_name}: feature and label counts do not match."
        )

    if not np.isfinite(X).all():
        raise ValueError(
            f"{split_name}: features contain NaN or infinite values."
        )

    if not np.isfinite(y).all():
        raise ValueError(
            f"{split_name}: labels contain invalid values."
        )


def validate_class_coverage(
    y: np.ndarray,
    expected_classes: set[int],
    split_name: str,
):
    """Ensure every target class is represented in the extracted windows."""

    actual_classes = set(
        int(value) for value in np.unique(y)
    )

    missing_classes = expected_classes - actual_classes

    if missing_classes:
        raise ValueError(
            f"{split_name} is missing target classes: "
            f"{sorted(missing_classes)}"
        )


# ---------------------------------------------------------------------
# ARTIFACT SAVING
# ---------------------------------------------------------------------

def save_artifacts(
    artifacts_dir: Path,
    model: XGBClassifier,
    scaler: StandardScaler,
    baseline_df,
    label_map_payload: dict,
):
    """
    Save all production artifacts through a staging directory.

    Existing artifacts are backed up before replacement. If replacement
    fails, the previous artifact directory is restored.
    """

    artifacts_dir = Path(artifacts_dir)

    artifacts_dir.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    staging_dir = Path(
        tempfile.mkdtemp(
            prefix=f".{artifacts_dir.name}_staging_",
            dir=artifacts_dir.parent,
        )
    )

    backup_dir = artifacts_dir.with_name(
        f".{artifacts_dir.name}_backup"
    )

    try:
        # Write all artifacts into the staging directory.
        model.save_model(
            staging_dir / "xgb_model.json"
        )

        joblib.dump(
            scaler,
            staging_dir / "scaler.joblib",
        )

        baseline_df.to_json(
            staging_dir / "baseline.json",
            orient="index",
            indent=2,
        )

        with open(
            staging_dir / "label_map.json",
            "w",
            encoding="utf-8",
        ) as file:

            json.dump(
                label_map_payload,
                file,
                indent=2,
            )

        # Confirm all expected files were generated.
        required_files = [
            "xgb_model.json",
            "scaler.joblib",
            "baseline.json",
            "label_map.json",
        ]

        for filename in required_files:

            artifact_file = staging_dir / filename

            if not artifact_file.is_file():
                raise RuntimeError(
                    f"Artifact was not generated: {filename}"
                )

            if artifact_file.stat().st_size == 0:
                raise RuntimeError(
                    f"Generated artifact is empty: {filename}"
                )

        # Preserve the previous artifact directory until replacement.
        if backup_dir.exists():
            shutil.rmtree(backup_dir)

        if artifacts_dir.exists():
            os.replace(
                artifacts_dir,
                backup_dir,
            )

        try:
            os.replace(
                staging_dir,
                artifacts_dir,
            )

        except Exception:
            if backup_dir.exists() and not artifacts_dir.exists():
                os.replace(
                    backup_dir,
                    artifacts_dir,
                )

            raise

        # Remove backup after successful replacement.
        if backup_dir.exists():
            shutil.rmtree(backup_dir)

    finally:
        if staging_dir.exists():
            shutil.rmtree(staging_dir)


# ---------------------------------------------------------------------
# TRAINING PIPELINE
# ---------------------------------------------------------------------

def train_pipeline(
    parquet_path: str = PARQUET_PATH,
    artifacts_dir: Path = ARTIFACTS_DIR,
    window_size: int = DEFAULT_WINDOW_SIZE,
) -> dict[str, object]:
    """
    Execute end-to-end XGBoost training.

    Returns:
        Training duration, validation score, best iteration,
        and feature matrix dimensions.
    """

    t_start = time.perf_counter()

    # -------------------------------------------------------------
    # STEP 1: Validate configuration and load dataset.
    # -------------------------------------------------------------

    print("\n" + "=" * 65)
    print("ALARMSENSE XGBOOST TRAINING PIPELINE")
    print("=" * 65)

    validate_training_configuration(
        parquet_path,
        window_size,
    )

    print(
        f"\n[1/6] Loading TEP dataset from {parquet_path}..."
    )

    df = load_tep_parquet(
        path=parquet_path,
        target_faults=TARGET_FAULTS,
    )

    if df.empty:
        raise ValueError(
            "Loaded TEP dataset is empty."
        )

    print(
        f"      Loaded {len(df):,} rows."
    )

    # -------------------------------------------------------------
    # STEP 2: Episode-based splitting.
    # -------------------------------------------------------------

    print(
        "\nCreating episode-stratified train/validation/test split..."
    )

    train_df, val_df, test_df = split_episodes(
        df,
        train_ratio=TRAIN_RATIO,
        val_ratio=VALIDATION_RATIO,
        seed=RANDOM_STATE,
    )

    if train_df.empty or val_df.empty or test_df.empty:
        raise ValueError(
            "Episode splitting produced an empty dataset partition."
        )

    print(
        f"      Train rows: {len(train_df):,}\n"
        f"      Validation rows: {len(val_df):,}\n"
        f"      Test rows: {len(test_df):,}"
    )

    # -------------------------------------------------------------
    # STEP 3: Compute normal baseline using training data only.
    # -------------------------------------------------------------

    print(
        "\n[2/6] Computing normal baseline from training STATUS == 0 rows..."
    )

    normal_train_rows = train_df[
        train_df["STATUS"] == 0
    ]

    if normal_train_rows.empty:
        raise ValueError(
            "Training split contains no STATUS == 0 rows. "
            "Cannot calculate the required normal operating baseline."
        )

    baseline_df = compute_normal_baseline(
    normal_train_rows,
    sensor_cols=SENSOR_COLS,
)

    if baseline_df.empty:
        raise ValueError(
            "Normal baseline calculation returned an empty dataframe."
        )

    if not {"mean", "std"}.issubset(baseline_df.columns):
        raise ValueError(
            "Baseline must contain 'mean' and 'std' columns."
        )

    if not np.isfinite(
        baseline_df[["mean", "std"]].to_numpy(dtype=np.float64)
    ).all():
        raise ValueError(
            "Baseline contains NaN or infinite values."
        )

    if (baseline_df["std"] <= 0).any():
        raise ValueError(
            "Baseline contains zero or negative standard deviations."
        )

    # -------------------------------------------------------------
    # STEP 4: Extract sliding-window features.
    # -------------------------------------------------------------

    print(
        f"\n[3/6] Extracting sliding-window features (W={window_size})..."
    )

    t_feat = time.perf_counter()

    X_train, y_train_raw, _ = (
        extract_window_features_batch(
            train_df,
            sensor_cols=SENSOR_COLS,
            window_size=window_size,
        )
    )

    X_val, y_val_raw, _ = (
        extract_window_features_batch(
            val_df,
            sensor_cols=SENSOR_COLS,
            window_size=window_size,
        )
    )

    # The test set is deliberately not used in model fitting.
    print(
        f"      X_train: {X_train.shape}\n"
        f"      X_val:   {X_val.shape}\n"
        f"      Feature extraction time: "
        f"{time.perf_counter() - t_feat:.2f}s"
    )

    validate_feature_data(
        X_train,
        y_train_raw,
        "Training",
    )

    validate_feature_data(
        X_val,
        y_val_raw,
        "Validation",
    )

    # -------------------------------------------------------------
    # STEP 5: Scale features and map labels.
    # -------------------------------------------------------------

    print(
        "\n[4/6] Fitting StandardScaler and mapping labels..."
    )

    fault_to_idx, idx_to_fault = build_label_mappings(
        TARGET_FAULTS
    )

    expected_classes = set(
        fault_to_idx.values()
    )

    y_train = map_labels(
        y_train_raw,
        fault_to_idx,
        "Training",
    )

    y_val = map_labels(
        y_val_raw,
        fault_to_idx,
        "Validation",
    )

    validate_class_coverage(
        y_train,
        expected_classes,
        "Training windows",
    )

    validate_class_coverage(
        y_val,
        expected_classes,
        "Validation windows",
    )

    scaler = StandardScaler()

    # Fit scaler strictly on training features.
    X_train_scaled = scaler.fit_transform(
        X_train
    ).astype(np.float32)

    # Validation only receives transform.
    X_val_scaled = scaler.transform(
        X_val
    ).astype(np.float32)

    if X_train_scaled.shape[1] != X_val_scaled.shape[1]:
        raise ValueError(
            "Training and validation feature dimensions do not match."
        )

    if not np.isfinite(X_train_scaled).all():
        raise ValueError(
            "Scaled training features contain invalid values."
        )

    if not np.isfinite(X_val_scaled).all():
        raise ValueError(
            "Scaled validation features contain invalid values."
        )

    # Balanced sample weights.
    sample_weights = compute_sample_weight(
        class_weight="balanced",
        y=y_train,
    )

    # -------------------------------------------------------------
    # STEP 6: Train XGBoost with early stopping.
    # -------------------------------------------------------------

    print(
        "\n[5/6] Training XGBClassifier with validation early stopping..."
    )

    model = XGBClassifier(
        tree_method="hist",
        n_estimators=N_ESTIMATORS,
        max_depth=MAX_DEPTH,
        learning_rate=LEARNING_RATE,
        subsample=0.8,
        colsample_bytree=0.8,
        early_stopping_rounds=EARLY_STOPPING_ROUNDS,
        eval_metric="mlogloss",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    t_train = time.perf_counter()

    model.fit(
        X_train_scaled,
        y_train,
        sample_weight=sample_weights,
        eval_set=[
            (X_val_scaled, y_val)
        ],
        verbose=50,
    )

    train_elapsed = (
        time.perf_counter() - t_train
    )

    # Read best iteration and score after successful training.
    best_iteration = getattr(
        model,
        "best_iteration",
        None,
    )

    best_score = getattr(
        model,
        "best_score",
        None,
    )

    if best_iteration is None:
        raise RuntimeError(
            "XGBoost did not expose best_iteration. "
            "Check the installed XGBoost version and early stopping setup."
        )

    if best_score is None:
        raise RuntimeError(
            "XGBoost did not expose best_score after training."
        )

    best_iteration = int(best_iteration)
    best_score = float(best_score)

    if not np.isfinite(best_score):
        raise RuntimeError(
            "XGBoost returned a non-finite validation score."
        )

    print(
        f"\n      Training completed in {train_elapsed:.2f}s."
    )

    print(
        f"      Best iteration: {best_iteration}\n"
        f"      Best validation mlogloss: {best_score:.6f}"
    )

    # -------------------------------------------------------------
    # Prepare artifact metadata.
    # -------------------------------------------------------------

    label_map_payload = {
        "fault_to_idx": {
            str(key): value
            for key, value in fault_to_idx.items()
        },
        "idx_to_fault": {
            str(key): value
            for key, value in idx_to_fault.items()
        },
        "classes": [
            int(fault)
            for fault in sorted(TARGET_FAULTS)
        ],
        "fault_names": {
            str(fault): FAULT_METADATA[int(fault)]["name"]
            for fault in sorted(TARGET_FAULTS)
        },
        "window_size": int(window_size),
        "feature_names": get_feature_names(
            SENSOR_COLS
        ),
        "best_iteration": best_iteration,
        "best_val_mlogloss": best_score,
        "random_state": RANDOM_STATE,
    }

    # -------------------------------------------------------------
    # STEP 7: Save artifacts.
    # -------------------------------------------------------------

    print(
        f"\n[6/6] Saving production artifacts to {artifacts_dir}..."
    )

    save_artifacts(
        artifacts_dir=Path(artifacts_dir),
        model=model,
        scaler=scaler,
        baseline_df=baseline_df,
        label_map_payload=label_map_payload,
    )

    total_elapsed = (
        time.perf_counter() - t_start
    )

    print("\n" + "=" * 65)
    print("ALARMSENSE TRAINING COMPLETED")
    print("=" * 65)

    print(f"Training time:       {train_elapsed:.2f}s")
    print(f"Total pipeline time: {total_elapsed:.2f}s")
    print(f"Best iteration:      {best_iteration}")
    print(f"Best validation loss:{best_score:.6f}")
    print(f"Training windows:    {len(X_train):,}")
    print(f"Validation windows:  {len(X_val):,}")
    print(f"Features:            {X_train.shape[1]}")
    print(f"Artifacts:            {artifacts_dir}")

    print("=" * 65)

    return {
        "train_time_sec": round(train_elapsed, 2),
        "total_time_sec": round(total_elapsed, 2),
        "best_iteration": best_iteration,
        "best_val_mlogloss": round(best_score, 4),
        "X_train_shape": X_train.shape,
        "X_val_shape": X_val.shape,
    }


# ---------------------------------------------------------------------
# CLI ENTRYPOINT
# ---------------------------------------------------------------------

def main() -> None:
    """CLI entrypoint for training the AlarmSense XGBoost model."""

    train_pipeline()


if __name__ == "__main__":
    main()
