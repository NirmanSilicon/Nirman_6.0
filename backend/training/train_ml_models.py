
"""
AlarmSense - Four-Model TEP Training Pipeline

Models:
1. Isolation Forest - unsupervised anomaly detection
2. Random Forest - multi-class fault classification
3. PCA - reconstruction-based anomaly detection
4. XGBoost - multi-class fault classification

Uses the existing TEP loader, episode-based split and
sliding-window feature extraction.

Experimental artifacts are saved separately from production artifacts.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_sample_weight

from app.config import (
    DEFAULT_WINDOW_SIZE,
    PARQUET_PATH,
    SENSOR_COLS,
    TARGET_FAULTS,
)

from app.services.tep_loader import (
    load_tep_parquet,
    split_episodes,
)

from app.services.features import (
    extract_window_features_batch,
    get_feature_names,
)

from ml.models import (
    IsolationForestModel,
    RandomForestModel,
    PCAModel,
    XGBoostModel,
)


# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------

RANDOM_STATE = 42

TRAIN_RATIO = 0.70
VALIDATION_RATIO = 0.15

ARTIFACTS_DIR = (
    Path(__file__).resolve().parents[1]
    / "artifacts"
    / "experimental_ml"
)

# Limit unsupervised fitting memory usage.
# This does not change the held-out evaluation dataset.
MAX_UNSUPERVISED_TRAIN_SAMPLES = 100_000

# PCA can be expensive on very large datasets.
MAX_PCA_TRAIN_SAMPLES = 50_000


# ---------------------------------------------------------
# LABEL MAPPING
# ---------------------------------------------------------

def build_label_mapping():
    sorted_faults = sorted(int(x) for x in TARGET_FAULTS)

    fault_to_index = {
        fault: index
        for index, fault in enumerate(sorted_faults)
    }

    index_to_fault = {
        index: fault
        for fault, index in fault_to_index.items()
    }

    return fault_to_index, index_to_fault


def map_labels(labels, mapping):
    labels = np.asarray(labels, dtype=np.int64)

    unknown = set(np.unique(labels)) - set(mapping)

    if unknown:
        raise ValueError(f"Unknown STATUS labels: {unknown}")

    return np.asarray(
        [mapping[int(label)] for label in labels],
        dtype=np.int64,
    )


# ---------------------------------------------------------
# DATA VALIDATION
# ---------------------------------------------------------

def validate_features(X, y, name):

    if X.ndim != 2:
        raise ValueError(f"{name}: expected a 2D feature matrix.")

    if len(X) == 0:
        raise ValueError(f"{name}: no feature windows extracted.")

    if len(X) != len(y):
        raise ValueError(f"{name}: feature/label count mismatch.")

    if not np.isfinite(X).all():
        raise ValueError(f"{name}: NaN or infinite features found.")

    print(
        f"{name}: {X.shape[0]:,} windows, "
        f"{X.shape[1]} features"
    )


# ---------------------------------------------------------
# DATA PREPARATION
# ---------------------------------------------------------

def prepare_data():

    print("\n[1/6] Loading TEP dataset...")

    df = load_tep_parquet(
        path=PARQUET_PATH,
        target_faults=TARGET_FAULTS,
    )

    if df.empty:
        raise ValueError("TEP dataset is empty.")

    print(f"Loaded {len(df):,} rows.")

    print("\n[2/6] Splitting complete episodes...")

    train_df, val_df, test_df = split_episodes(
        df,
        train_ratio=TRAIN_RATIO,
        val_ratio=VALIDATION_RATIO,
        seed=RANDOM_STATE,
    )

    if train_df.empty or val_df.empty or test_df.empty:
        raise ValueError("One or more dataset partitions are empty.")

    # Ensure no episode is shared between partitions.
    train_ids = set(train_df["episode_id"].unique())
    val_ids = set(val_df["episode_id"].unique())
    test_ids = set(test_df["episode_id"].unique())

    assert train_ids.isdisjoint(val_ids)
    assert train_ids.isdisjoint(test_ids)
    assert val_ids.isdisjoint(test_ids)

    print(f"Training rows:   {len(train_df):,}")
    print(f"Validation rows: {len(val_df):,}")
    print(f"Testing rows:    {len(test_df):,}")

    print("\n[3/6] Extracting sliding-window features...")

    X_train, y_train_raw, _ = extract_window_features_batch(
        train_df,
        sensor_cols=SENSOR_COLS,
        window_size=DEFAULT_WINDOW_SIZE,
    )

    X_val, y_val_raw, _ = extract_window_features_batch(
        val_df,
        sensor_cols=SENSOR_COLS,
        window_size=DEFAULT_WINDOW_SIZE,
    )

    X_test, y_test_raw, _ = extract_window_features_batch(
        test_df,
        sensor_cols=SENSOR_COLS,
        window_size=DEFAULT_WINDOW_SIZE,
    )

    validate_features(X_train, y_train_raw, "Training")
    validate_features(X_val, y_val_raw, "Validation")
    validate_features(X_test, y_test_raw, "Testing")

    fault_to_index, index_to_fault = build_label_mapping()

    y_train = map_labels(y_train_raw, fault_to_index)
    y_val = map_labels(y_val_raw, fault_to_index)
    y_test = map_labels(y_test_raw, fault_to_index)

    if len(np.unique(y_train)) < 2:
        raise ValueError("Training data contains fewer than two classes.")

    if set(np.unique(y_val)) - set(np.unique(y_train)):
        raise ValueError("Validation contains classes absent from training.")

    if set(np.unique(y_test)) - set(np.unique(y_train)):
        raise ValueError("Testing contains classes absent from training.")

    return (
        X_train,
        y_train,
        X_val,
        y_val,
        X_test,
        y_test,
        fault_to_index,
        index_to_fault,
    )


# ---------------------------------------------------------
# SAMPLING HELPER
# ---------------------------------------------------------

def deterministic_sample(X, max_samples, seed=RANDOM_STATE):

    if len(X) <= max_samples:
        return X

    rng = np.random.default_rng(seed)

    indices = rng.choice(
        len(X),
        size=max_samples,
        replace=False,
    )

    return X[indices]


# ---------------------------------------------------------
# METRICS
# ---------------------------------------------------------

def classification_metrics(y_true, y_pred):

    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision_macro": float(
            precision_score(
                y_true,
                y_pred,
                average="macro",
                zero_division=0,
            )
        ),
        "recall_macro": float(
            recall_score(
                y_true,
                y_pred,
                average="macro",
                zero_division=0,
            )
        ),
        "f1_macro": float(
            f1_score(
                y_true,
                y_pred,
                average="macro",
                zero_division=0,
            )
        ),
        "f1_weighted": float(
            f1_score(
                y_true,
                y_pred,
                average="weighted",
                zero_division=0,
            )
        ),
    }


def anomaly_metrics(y_true, y_pred):

    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(
            precision_score(y_true, y_pred, zero_division=0)
        ),
        "recall": float(
            recall_score(y_true, y_pred, zero_division=0)
        ),
        "f1": float(
            f1_score(y_true, y_pred, zero_division=0)
        ),
    }


# ---------------------------------------------------------
# TRAINING PIPELINE
# ---------------------------------------------------------

def train_all_models():

    total_start = time.perf_counter()

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    (
        X_train,
        y_train,
        X_val,
        y_val,
        X_test,
        y_test,
        fault_to_index,
        index_to_fault,
    ) = prepare_data()

    # The validation data is retained for future tuning.
    # It is not used to fit models or set thresholds here.

    results = {}
    training_times = {}

    feature_names = get_feature_names(SENSOR_COLS)

    if len(feature_names) != X_train.shape[1]:
        raise ValueError("Feature-name count does not match feature matrix.")

    # -----------------------------------------------------
    # NORMAL OPERATION DATA
    # -----------------------------------------------------

    normal_class = fault_to_index[0]

    normal_mask = y_train == normal_class

    X_normal = X_train[normal_mask]

    if len(X_normal) < 2:
        raise ValueError("Insufficient normal training windows.")

    print("\nNormal training windows:", len(X_normal))

    # Fit scaling on normal training data only.
    scaler = StandardScaler()

    scaler.fit(X_normal)

    X_normal_scaled = scaler.transform(X_normal)
    X_test_scaled = scaler.transform(X_test)

    # -----------------------------------------------------
    # 1. ISOLATION FOREST
    # -----------------------------------------------------

    print("\n[4/6] Training Isolation Forest...")

    start = time.perf_counter()

    X_if_train = deterministic_sample(
        X_normal_scaled,
        MAX_UNSUPERVISED_TRAIN_SAMPLES,
    )

    isolation = IsolationForestModel(
        contamination=0.02,
        random_state=RANDOM_STATE,
    )

    isolation.fit(X_if_train)

    isolation_predictions = isolation.predict(X_test_scaled)

    # Ground truth: 0 = normal, 1 = faulty.
    y_test_anomaly = (y_test != normal_class).astype(int)

    results["Isolation Forest"] = anomaly_metrics(
        y_test_anomaly,
        isolation_predictions,
    )

    training_times["Isolation Forest"] = (
        time.perf_counter() - start
    )

    isolation.save(
        str(ARTIFACTS_DIR / "isolation_forest.joblib")
    )

    # -----------------------------------------------------
    # 2. PCA
    # -----------------------------------------------------

    print("\n[5/6] Training PCA...")

    start = time.perf_counter()

    X_pca_train = deterministic_sample(
        X_normal_scaled,
        MAX_PCA_TRAIN_SAMPLES,
    )

    pca = PCAModel(n_components=0.95)

    pca.fit(X_pca_train)

    pca_predictions = pca.predict_anomaly(X_test_scaled)

    results["PCA"] = anomaly_metrics(
        y_test_anomaly,
        pca_predictions,
    )

    training_times["PCA"] = time.perf_counter() - start

    pca.save(str(ARTIFACTS_DIR / "pca.joblib"))

    # -----------------------------------------------------
    # 3. RANDOM FOREST
    # -----------------------------------------------------

    print("\nTraining Random Forest...")

    start = time.perf_counter()

    random_forest = RandomForestModel(
        n_estimators=300,
        random_state=RANDOM_STATE,
    )

    random_forest.fit(X_train, y_train)

    rf_predictions = random_forest.predict(X_test)

    results["Random Forest"] = classification_metrics(
        y_test,
        rf_predictions,
    )

    training_times["Random Forest"] = time.perf_counter() - start

    random_forest.save(
        str(ARTIFACTS_DIR / "random_forest.joblib")
    )

    # -----------------------------------------------------
    # 4. XGBOOST
    # -----------------------------------------------------

    print("\nTraining XGBoost...")

    start = time.perf_counter()

    xgboost = XGBoostModel(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        random_state=RANDOM_STATE,
    )

    # Balanced weights help address class imbalance.
    sample_weights = compute_sample_weight(
        class_weight="balanced",
        y=y_train,
    )

    # Use the underlying estimator to pass sample weights.
    classes = np.unique(y_train)

    params = xgboost.params.copy()

    params["objective"] = "multi:softprob"
    params["eval_metric"] = "mlogloss"
    params["num_class"] = len(classes)

    xgboost.model = xgboost.XGBClassifier(**params)
    xgboost.model.fit(
        X_train,
        y_train,
        sample_weight=sample_weights,
    )

    xgboost.classes_ = classes

    xgb_predictions = xgboost.predict(X_test)

    results["XGBoost"] = classification_metrics(
        y_test,
        xgb_predictions,
    )

    training_times["XGBoost"] = time.perf_counter() - start

    xgboost.save(str(ARTIFACTS_DIR / "xgboost.joblib"))

    # -----------------------------------------------------
    # SAVE SHARED ARTIFACTS
    # -----------------------------------------------------

    joblib.dump(
        scaler,
        ARTIFACTS_DIR / "normal_feature_scaler.joblib",
    )

    metadata = {
        "window_size": DEFAULT_WINDOW_SIZE,
        "sensor_columns": SENSOR_COLS,
        "feature_names": feature_names,
        "fault_to_index": fault_to_index,
        "index_to_fault": index_to_fault,
        "normal_class_index": normal_class,
        "train_ratio": TRAIN_RATIO,
        "validation_ratio": VALIDATION_RATIO,
        "test_ratio": 1 - TRAIN_RATIO - VALIDATION_RATIO,
        "random_state": RANDOM_STATE,
    }

    with open(ARTIFACTS_DIR / "metadata.json", "w") as file:
        json.dump(metadata, file, indent=4)

    # -----------------------------------------------------
    # RESULTS
    # -----------------------------------------------------

    print("\n" + "=" * 65)
    print("ALARMSENSE MODEL EVALUATION")
    print("=" * 65)

    for model_name, metrics in results.items():

        print(f"\n{model_name}")

        for metric_name, value in metrics.items():
            print(f"  {metric_name}: {value:.4f}")

        print(
            f"  Training time: "
            f"{training_times[model_name]:.2f} seconds"
        )

    # Keep anomaly and classification metrics separate.
    report = {
        "anomaly_detection": {
            name: results[name]
            for name in ("Isolation Forest", "PCA")
        },
        "fault_classification": {
            name: results[name]
            for name in ("Random Forest", "XGBoost")
        },
        "training_times_seconds": training_times,
        "total_duration_seconds": time.perf_counter() - total_start,
    }

    with open(ARTIFACTS_DIR / "evaluation_results.json", "w") as file:
        json.dump(report, file, indent=4)

    print("\nArtifacts saved to:")
    print(ARTIFACTS_DIR)

    print("\nTotal duration:", round(
        time.perf_counter() - total_start, 2
    ), "seconds")

    return report


if __name__ == "__main__":
    train_all_models()
