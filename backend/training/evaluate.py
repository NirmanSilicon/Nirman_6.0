
"""
AlarmSense - XGBoost Model Evaluation

Loads persisted XGBoost artifacts and evaluates the model on the
untouched episode-based test split.

Reports:
- Sample-Level Accuracy and Macro-F1
- Episode-Level Accuracy and Macro-F1
- Per-fault Sample-Level F1
- Per-fault Episode-Level F1
- Single-window inference latency (mean and p95)

This script is read-only. It does not train or overwrite model artifacts.
"""

import json
import time
from pathlib import Path

import joblib
import numpy as np

from sklearn.metrics import accuracy_score, f1_score
from xgboost import XGBClassifier

from app.config import (
    DEFAULT_WINDOW_SIZE,
    FAULT_METADATA,
    PARQUET_PATH,
    SENSOR_COLS,
    TARGET_FAULTS,
)

from app.services.features import (
    extract_single_window,
    extract_window_features_batch,
)

from app.services.tep_loader import (
    load_tep_parquet,
    split_episodes,
)


# ---------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------

ARTIFACTS_DIR = Path(__file__).resolve().parents[1] / "artifacts"

RANDOM_STATE = 42

WARMUP_ITERATIONS = 10


# ---------------------------------------------------------------------
# ARTIFACT VALIDATION
# ---------------------------------------------------------------------

def validate_artifacts(artifacts_dir: Path) -> dict[str, Path]:
    """Verify that all required trained model artifacts exist."""

    artifact_paths = {
        "model": artifacts_dir / "xgb_model.json",
        "scaler": artifacts_dir / "scaler.joblib",
        "label_map": artifacts_dir / "label_map.json",
    }

    missing = [
        path
        for path in artifact_paths.values()
        if not path.is_file()
    ]

    if missing:
        missing_files = "\n".join(
            str(path) for path in missing
        )

        raise FileNotFoundError(
            "Required model artifacts are missing:\n"
            f"{missing_files}\n\n"
            "Run training.train_xgb first."
        )

    return artifact_paths


# ---------------------------------------------------------------------
# LABEL MAPPING
# ---------------------------------------------------------------------

def load_label_mapping(label_map_path: Path):
    """Load and validate the persisted fault-to-class mappings."""

    with open(label_map_path, encoding="utf-8") as file:
        label_map = json.load(file)

    required_keys = {
        "fault_to_idx",
        "idx_to_fault",
        "classes",
    }

    missing_keys = required_keys - set(label_map)

    if missing_keys:
        raise KeyError(
            f"label_map.json is missing keys: {sorted(missing_keys)}"
        )

    fault_to_idx = {
        int(key): int(value)
        for key, value in label_map["fault_to_idx"].items()
    }

    idx_to_fault = {
        int(key): int(value)
        for key, value in label_map["idx_to_fault"].items()
    }

    classes = [
        int(value)
        for value in label_map["classes"]
    ]

    expected_faults = set(
        int(fault) for fault in TARGET_FAULTS
    )

    if set(fault_to_idx) != expected_faults:
        raise ValueError(
            "Saved fault mapping does not match TARGET_FAULTS.\n"
            f"Expected: {sorted(expected_faults)}\n"
            f"Found: {sorted(fault_to_idx)}"
        )

    expected_indices = set(range(len(fault_to_idx)))

    if set(fault_to_idx.values()) != expected_indices:
        raise ValueError(
            "Fault indices must be contiguous, starting from zero."
        )

    for fault, index in fault_to_idx.items():
        if idx_to_fault.get(index) != fault:
            raise ValueError(
                "Inconsistent fault_to_idx and idx_to_fault mappings."
            )

    if len(classes) != len(fault_to_idx):
        raise ValueError(
            "The saved classes list does not match the number "
            "of supported faults."
        )

    if set(classes) != expected_faults:
        raise ValueError(
            "The saved classes list does not match TARGET_FAULTS."
        )

    return fault_to_idx, idx_to_fault, classes


def map_labels(
    y_raw: np.ndarray,
    fault_to_idx: dict[int, int],
) -> np.ndarray:
    """Convert raw TEP STATUS values into contiguous class indices."""

    mapped_labels = []

    for label in y_raw:

        status = int(label)

        if status not in fault_to_idx:
            raise ValueError(
                f"Unknown STATUS value encountered: {status}"
            )

        mapped_labels.append(
            fault_to_idx[status]
        )

    return np.asarray(
        mapped_labels,
        dtype=np.int64,
    )


# ---------------------------------------------------------------------
# DATA VALIDATION
# ---------------------------------------------------------------------

def validate_feature_data(
    X: np.ndarray,
    y: np.ndarray,
    episode_ids: np.ndarray,
):
    """Validate extracted test features, labels, and episode IDs."""

    X = np.asarray(X)
    y = np.asarray(y)
    episode_ids = np.asarray(episode_ids)

    if X.ndim != 2:
        raise ValueError(
            f"Expected a 2D feature matrix, got shape {X.shape}."
        )

    if len(X) == 0:
        raise ValueError(
            "No test feature windows were generated."
        )

    if len(X) != len(y) or len(X) != len(episode_ids):
        raise ValueError(
            "Feature, label, and episode counts do not match."
        )

    if not np.isfinite(X).all():
        raise ValueError(
            "Test features contain NaN or infinite values."
        )

    if not np.isfinite(y).all():
        raise ValueError(
            "Test labels contain invalid values."
        )

    if len(np.unique(y)) == 0:
        raise ValueError(
            "No test classes were found."
        )


def validate_model_dimensions(
    X: np.ndarray,
    scaler,
    model,
):
    """Verify that feature dimensions match the trained model."""

    expected_features = getattr(
        scaler,
        "n_features_in_",
        None,
    )

    if expected_features is not None:
        if X.shape[1] != expected_features:
            raise ValueError(
                "Scaler feature dimension mismatch. "
                f"Expected {expected_features}, got {X.shape[1]}."
            )

    model_features = getattr(
        model,
        "n_features_in_",
        None,
    )

    if model_features is not None:
        if X.shape[1] != model_features:
            raise ValueError(
                "Model feature dimension mismatch. "
                f"Expected {model_features}, got {X.shape[1]}."
            )


# ---------------------------------------------------------------------
# EPISODE-LEVEL EVALUATION
# ---------------------------------------------------------------------

def calculate_episode_metrics(
    probs: np.ndarray,
    y_test: np.ndarray,
    episode_ids: np.ndarray,
    n_classes: int,
):
    """
    Calculate episode-level predictions.

    Each episode contributes one prediction, obtained by averaging
    predicted class probabilities across all windows in that episode.
    """

    episode_true = []
    episode_pred = []

    unique_episodes = np.unique(episode_ids)

    for episode_id in unique_episodes:

        mask = episode_ids == episode_id

        episode_probs = probs[mask]
        episode_labels = y_test[mask]

        if len(episode_probs) == 0:
            continue

        unique_labels = np.unique(episode_labels)

        if len(unique_labels) != 1:
            raise ValueError(
                f"Episode {episode_id} contains multiple fault labels: "
                f"{unique_labels.tolist()}"
            )

        mean_probs = episode_probs.mean(axis=0)

        predicted_class = int(
            np.argmax(mean_probs)
        )

        true_class = int(
            unique_labels[0]
        )

        episode_true.append(true_class)
        episode_pred.append(predicted_class)

    if not episode_true:
        raise ValueError(
            "No valid test episodes were available."
        )

    episode_true = np.asarray(
        episode_true,
        dtype=np.int64,
    )

    episode_pred = np.asarray(
        episode_pred,
        dtype=np.int64,
    )

    episode_accuracy = float(
        accuracy_score(
            episode_true,
            episode_pred,
        )
    )

    episode_macro_f1 = float(
        f1_score(
            episode_true,
            episode_pred,
            labels=list(range(n_classes)),
            average="macro",
            zero_division=0,
        )
    )

    episode_per_fault_f1 = f1_score(
        episode_true,
        episode_pred,
        labels=list(range(n_classes)),
        average=None,
        zero_division=0,
    )

    return (
        episode_true,
        episode_pred,
        episode_accuracy,
        episode_macro_f1,
        episode_per_fault_f1,
    )


# ---------------------------------------------------------------------
# LATENCY BENCHMARK
# ---------------------------------------------------------------------

def measure_inference_latency(
    model,
    scaler,
    sample_window_df,
    window_size: int,
    latency_iters: int,
):
    """
    Measure single-window inference latency.

    Includes:
    - Feature extraction
    - Feature scaling
    - XGBoost predict_proba()

    Returns mean and 95th-percentile latency in milliseconds.
    """

    if latency_iters < 1:
        raise ValueError(
            "latency_iters must be at least 1."
        )

    if len(sample_window_df) != window_size:
        raise ValueError(
            f"Expected {window_size} rows for latency testing, "
            f"received {len(sample_window_df)}."
        )

    # Warm-up.
    for _ in range(WARMUP_ITERATIONS):

        features = extract_single_window(
            sample_window_df,
            sensor_cols=SENSOR_COLS,
            window_size=window_size,
        )

        scaled = scaler.transform(
            features
        ).astype(np.float32)

        model.predict_proba(scaled)

    latencies_ms = []

    for _ in range(latency_iters):

        start = time.perf_counter()

        features = extract_single_window(
            sample_window_df,
            sensor_cols=SENSOR_COLS,
            window_size=window_size,
        )

        scaled = scaler.transform(
            features
        ).astype(np.float32)

        model.predict_proba(scaled)

        elapsed_ms = (
            time.perf_counter() - start
        ) * 1000.0

        latencies_ms.append(elapsed_ms)

    mean_latency_ms = float(
        np.mean(latencies_ms)
    )

    p95_latency_ms = float(
        np.percentile(latencies_ms, 95)
    )

    return mean_latency_ms, p95_latency_ms


# ---------------------------------------------------------------------
# REPORTING
# ---------------------------------------------------------------------

def print_evaluation_report(
    X_test: np.ndarray,
    unique_eps: np.ndarray,
    sample_acc: float,
    sample_macro_f1: float,
    episode_acc: float,
    episode_macro_f1: float,
    mean_latency_ms: float,
    p95_latency_ms: float,
    sample_per_fault_f1: np.ndarray,
    episode_per_fault_f1: np.ndarray,
    y_test: np.ndarray,
    episode_true: np.ndarray,
    idx_to_fault: dict[int, int],
):
    """Print the structured AlarmSense evaluation report."""

    n_classes = len(idx_to_fault)

    print("\n" + "=" * 78)
    print("ALARMSENSE TEST SET EVALUATION REPORT")
    print("=" * 78)

    print(
        f"Test Windows: {len(X_test):,} | "
        f"Test Episodes: {len(unique_eps):,}"
    )

    print(
        f"Sample-Level  Accuracy: {sample_acc:.4f} | "
        f"Macro F1: {sample_macro_f1:.4f}"
    )

    print(
        f"Episode-Level Accuracy: {episode_acc:.4f} | "
        f"Macro F1: {episode_macro_f1:.4f}"
    )

    print(
        f"Single-Window Inference Latency: "
        f"mean={mean_latency_ms:.3f} ms, "
        f"p95={p95_latency_ms:.3f} ms"
    )

    print("-" * 78)

    print(
        f"{'STATUS':>6} | "
        f"{'Fault Name':<42} | "
        f"{'Sample F1':>9} | "
        f"{'Ep F1':>7} | "
        f"{'Windows':>7} | "
        f"{'Eps':>4}"
    )

    print("-" * 78)

    per_fault_rows = []

    for idx in range(n_classes):

        status = idx_to_fault[idx]

        if status not in FAULT_METADATA:
            raise KeyError(
                f"Fault {status} is missing from FAULT_METADATA."
            )

        name = FAULT_METADATA[status]["name"]

        sample_f1 = float(
            sample_per_fault_f1[idx]
        )

        episode_f1 = float(
            episode_per_fault_f1[idx]
        )

        n_windows = int(
            (y_test == idx).sum()
        )

        n_episodes = int(
            (episode_true == idx).sum()
        )

        print(
            f"{status:>6} | "
            f"{name:<42} | "
            f"{sample_f1:>9.4f} | "
            f"{episode_f1:>7.4f} | "
            f"{n_windows:>7,} | "
            f"{n_episodes:>4}"
        )

        per_fault_rows.append({
            "status": status,
            "name": name,
            "sample_f1": round(sample_f1, 4),
            "episode_f1": round(episode_f1, 4),
            "windows": n_windows,
            "episodes": n_episodes,
        })

    print("=" * 78)

    return per_fault_rows


# ---------------------------------------------------------------------
# MAIN EVALUATION
# ---------------------------------------------------------------------

def evaluate_model(
    parquet_path: str = PARQUET_PATH,
    artifacts_dir: Path = ARTIFACTS_DIR,
    window_size: int = DEFAULT_WINDOW_SIZE,
    latency_iters: int = 100,
) -> dict[str, object]:
    """Evaluate saved XGBoost artifacts on the untouched test episodes."""

    total_start = time.perf_counter()

    parquet_path = Path(parquet_path)
    artifacts_dir = Path(artifacts_dir)

    # -------------------------------------------------------------
    # 1. Validate inputs.
    # -------------------------------------------------------------

    if window_size < 1:
        raise ValueError(
            "window_size must be at least 1."
        )

    if latency_iters < 1:
        raise ValueError(
            "latency_iters must be at least 1."
        )

    if not parquet_path.is_file():
        raise FileNotFoundError(
            f"Processed dataset not found: {parquet_path}\n"
            "Run scripts/prepare_data.py first."
        )

    artifact_paths = validate_artifacts(
        artifacts_dir
    )

    # -------------------------------------------------------------
    # 2. Load model artifacts.
    # -------------------------------------------------------------

    print("\nLoading trained XGBoost artifacts...")

    model = XGBClassifier()

    model.load_model(
        artifact_paths["model"]
    )

    scaler = joblib.load(
        artifact_paths["scaler"]
    )

    (
        fault_to_idx,
        idx_to_fault,
        classes,
    ) = load_label_mapping(
        artifact_paths["label_map"]
    )

    n_classes = len(classes)

    # -------------------------------------------------------------
    # 3. Load dataset and recreate the canonical split.
    # -------------------------------------------------------------

    print(
        f"\nLoading dataset from {parquet_path}..."
    )

    df = load_tep_parquet(
        path=parquet_path,
        target_faults=TARGET_FAULTS,
    )

    _, _, test_df = split_episodes(
        df,
        train_ratio=0.70,
        val_ratio=0.15,
        seed=RANDOM_STATE,
    )

    if test_df.empty:
        raise ValueError(
            "The test split is empty."
        )

    print(
        f"Test split contains {len(test_df):,} rows."
    )

    # -------------------------------------------------------------
    # 4. Extract test features.
    # -------------------------------------------------------------

    print(
        f"\nExtracting test features (W={window_size})..."
    )

    X_test, y_test_raw, ep_test = (
        extract_window_features_batch(
            test_df,
            sensor_cols=SENSOR_COLS,
            window_size=window_size,
        )
    )

    validate_feature_data(
        X_test,
        y_test_raw,
        ep_test,
    )

    y_test = map_labels(
        y_test_raw,
        fault_to_idx,
    )

    validate_model_dimensions(
        X_test,
        scaler,
        model,
    )

    X_test_scaled = scaler.transform(
        X_test
    ).astype(np.float32)

    print(
        f"Generated {len(X_test):,} test windows "
        f"with {X_test.shape[1]} features."
    )

    # -------------------------------------------------------------
    # 5. Sample-level predictions.
    # -------------------------------------------------------------

    print("\nCalculating sample-level metrics...")

    probs = model.predict_proba(
        X_test_scaled
    )

    if probs.ndim != 2 or probs.shape[1] != n_classes:
        raise ValueError(
            "Model probability output does not match the saved "
            f"class mapping. Expected {n_classes} classes, "
            f"received shape {probs.shape}."
        )

    if len(probs) != len(y_test):
        raise ValueError(
            "Prediction count does not match test label count."
        )

    if not np.isfinite(probs).all():
        raise ValueError(
            "Model returned NaN or infinite probabilities."
        )

    y_pred = np.argmax(
        probs,
        axis=1,
    )

    sample_acc = float(
        accuracy_score(
            y_test,
            y_pred,
        )
    )

    sample_macro_f1 = float(
        f1_score(
            y_test,
            y_pred,
            labels=list(range(n_classes)),
            average="macro",
            zero_division=0,
        )
    )

    sample_per_fault_f1 = f1_score(
        y_test,
        y_pred,
        labels=list(range(n_classes)),
        average=None,
        zero_division=0,
    )

    # -------------------------------------------------------------
    # 6. Episode-level predictions.
    # -------------------------------------------------------------

    print(
        "Calculating episode-level metrics..."
    )

    (
        episode_true,
        episode_pred,
        episode_acc,
        episode_macro_f1,
        episode_per_fault_f1,
    ) = calculate_episode_metrics(
        probs=probs,
        y_test=y_test,
        episode_ids=ep_test,
        n_classes=n_classes,
    )

    unique_eps = np.unique(ep_test)

    # -------------------------------------------------------------
    # 7. Select a complete window for latency testing.
    # -------------------------------------------------------------

    first_episode_id = unique_eps[0]

    sample_window_df = (
        test_df[
            test_df["episode_id"] == first_episode_id
        ]
        .iloc[:window_size][SENSOR_COLS]
        .copy()
    )

    if len(sample_window_df) != window_size:
        raise ValueError(
            f"Test episode {first_episode_id} does not contain "
            f"enough rows for a {window_size}-step latency window."
        )

    # -------------------------------------------------------------
    # 8. Measure inference latency.
    # -------------------------------------------------------------

    print(
        "\nMeasuring single-window inference latency..."
    )

    mean_latency_ms, p95_latency_ms = (
        measure_inference_latency(
            model=model,
            scaler=scaler,
            sample_window_df=sample_window_df,
            window_size=window_size,
            latency_iters=latency_iters,
        )
    )

    # -------------------------------------------------------------
    # 9. Print evaluation report.
    # -------------------------------------------------------------

    per_fault_rows = print_evaluation_report(
        X_test=X_test,
        unique_eps=unique_eps,
        sample_acc=sample_acc,
        sample_macro_f1=sample_macro_f1,
        episode_acc=episode_acc,
        episode_macro_f1=episode_macro_f1,
        mean_latency_ms=mean_latency_ms,
        p95_latency_ms=p95_latency_ms,
        sample_per_fault_f1=sample_per_fault_f1,
        episode_per_fault_f1=episode_per_fault_f1,
        y_test=y_test,
        episode_true=episode_true,
        idx_to_fault=idx_to_fault,
    )

    # -------------------------------------------------------------
    # 10. Return structured results.
    # -------------------------------------------------------------

    total_time = time.perf_counter() - total_start

    print(
        f"\nEvaluation completed in {total_time:.2f} seconds."
    )

    return {
        "sample_accuracy": round(sample_acc, 4),
        "sample_macro_f1": round(sample_macro_f1, 4),
        "episode_accuracy": round(episode_acc, 4),
        "episode_macro_f1": round(episode_macro_f1, 4),
        "mean_latency_ms": round(mean_latency_ms, 3),
        "p95_latency_ms": round(p95_latency_ms, 3),
        "per_fault": per_fault_rows,
    }


# ---------------------------------------------------------------------
# CLI ENTRYPOINT
# ---------------------------------------------------------------------

def main() -> None:
    """CLI entrypoint for evaluating the AlarmSense XGBoost model."""

    evaluate_model()


if __name__ == "__main__":
    main()
