
"""
AlarmSense - Model and Window Size Benchmark

Compares five configurations on the same episode-based train/validation/test split:

1. RandomForest (W=20)
2. HistGradientBoosting (W=20)
3. MLPClassifier (W=20)
4. XGBoost (W=20) - loaded from existing artifacts (read-only)
5. XGBoost (W=30) - trained in memory only

Metrics:
- Sample Accuracy
- Sample Macro-F1
- Early-5 Accuracy
- Early-5 Macro-F1
- Full Episode Macro-F1
- Training time
- Single-window inference latency
- Top-5 confusion pairs
- Per-fault F1 comparison

This script does not overwrite existing model artifacts.
"""

from dataclasses import dataclass
import json
import time
from pathlib import Path

import joblib
import numpy as np

from sklearn.ensemble import (
    HistGradientBoostingClassifier,
    RandomForestClassifier,
)
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_sample_weight

from xgboost import XGBClassifier

from app.config import (
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
    _resolve_data_path,
    load_tep_parquet,
    split_episodes,
)


# ---------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------

ARTIFACTS_DIR = Path(__file__).resolve().parents[1] / "artifacts"

RANDOM_STATE = 42

WINDOW_SIZE_20 = 20
WINDOW_SIZE_30 = 30

LATENCY_ITERATIONS = 100
LATENCY_WARMUP_ITERATIONS = 10

N_CLASSES = len(TARGET_FAULTS)


# ---------------------------------------------------------------------
# RESULT MODEL
# ---------------------------------------------------------------------

@dataclass(frozen=True)
class BenchmarkResult:
    """Evaluation metrics for one benchmark configuration."""

    name: str
    window_size: int

    sample_acc: float
    sample_macro_f1: float

    early5_acc: float
    early5_macro_f1: float

    full_ep_macro_f1: float

    train_time_label: str
    latency_ms: float


# ---------------------------------------------------------------------
# ARTIFACT VALIDATION
# ---------------------------------------------------------------------

def validate_dataset():
    """Verify that the processed dataset exists."""

    try:
        _resolve_data_path(PARQUET_PATH)
    except FileNotFoundError as exc:
        raise FileNotFoundError(
            f"Processed dataset not found:\n{PARQUET_PATH}\n\n"
            "Run scripts/prepare_data.py first."
        ) from exc


def validate_artifacts():
    """Verify that the existing W=20 XGBoost artifacts exist."""

    required_files = [
        ARTIFACTS_DIR / "xgb_model.json",
        ARTIFACTS_DIR / "scaler.joblib",
        ARTIFACTS_DIR / "label_map.json",
    ]

    missing_files = [
        path for path in required_files
        if not path.exists()
    ]

    if missing_files:
        missing = "\n".join(str(path) for path in missing_files)

        raise FileNotFoundError(
            "Required XGBoost artifacts are missing:\n"
            f"{missing}\n\n"
            "Train the W=20 XGBoost model before running this benchmark."
        )


# ---------------------------------------------------------------------
# LABEL MAPPING
# ---------------------------------------------------------------------

def build_label_mappings():
    """Create contiguous class mappings from raw TEP STATUS codes."""

    sorted_faults = sorted(int(fault) for fault in TARGET_FAULTS)

    fault_to_idx = {
        fault: index
        for index, fault in enumerate(sorted_faults)
    }

    idx_to_fault = {
        index: fault
        for fault, index in fault_to_idx.items()
    }

    return fault_to_idx, idx_to_fault


def _map_labels(
    y_raw: np.ndarray,
    fault_to_idx: dict[int, int],
) -> np.ndarray:
    """Map raw TEP STATUS values to contiguous class indices."""

    y_raw = np.asarray(y_raw)

    try:
        mapped = [
            fault_to_idx[int(label)]
            for label in y_raw
        ]

    except KeyError as exc:
        raise ValueError(
            f"Unknown STATUS value encountered: {exc}"
        ) from exc

    return np.asarray(mapped, dtype=np.int64)


def load_artifact_label_mapping():
    """Load and validate the label mapping used by the existing XGBoost model."""

    label_map_path = ARTIFACTS_DIR / "label_map.json"

    with open(label_map_path, encoding="utf-8") as file:
        label_map = json.load(file)

    if "fault_to_idx" not in label_map:
        raise KeyError(
            "label_map.json does not contain 'fault_to_idx'."
        )

    if "idx_to_fault" not in label_map:
        raise KeyError(
            "label_map.json does not contain 'idx_to_fault'."
        )

    fault_to_idx = {
        int(key): int(value)
        for key, value in label_map["fault_to_idx"].items()
    }

    idx_to_fault = {
        int(key): int(value)
        for key, value in label_map["idx_to_fault"].items()
    }

    expected_faults = set(int(f) for f in TARGET_FAULTS)

    if set(fault_to_idx) != expected_faults:
        raise ValueError(
            "The W=20 artifact label mapping does not match "
            "TARGET_FAULTS.\n"
            f"Expected: {sorted(expected_faults)}\n"
            f"Found: {sorted(fault_to_idx)}"
        )

    expected_indices = set(range(len(expected_faults)))

    if set(fault_to_idx.values()) != expected_indices:
        raise ValueError(
            "The W=20 artifact labels are not mapped to "
            "contiguous indices starting from zero."
        )

    for fault, index in fault_to_idx.items():
        if idx_to_fault.get(index) != fault:
            raise ValueError(
                "Inconsistent fault_to_idx and idx_to_fault mappings."
            )

    return fault_to_idx, idx_to_fault


# ---------------------------------------------------------------------
# DATA VALIDATION
# ---------------------------------------------------------------------

def validate_feature_data(
    X: np.ndarray,
    y: np.ndarray,
    episode_ids: np.ndarray,
    name: str,
):
    """Validate extracted features, labels, and episode identifiers."""

    X = np.asarray(X)
    y = np.asarray(y)
    episode_ids = np.asarray(episode_ids)

    if X.ndim != 2:
        raise ValueError(
            f"{name}: expected a 2D feature matrix, got {X.shape}."
        )

    if len(X) == 0:
        raise ValueError(
            f"{name}: no feature windows were generated."
        )

    if len(X) != len(y) or len(X) != len(episode_ids):
        raise ValueError(
            f"{name}: feature, label, and episode counts do not match."
        )

    if not np.isfinite(X).all():
        raise ValueError(
            f"{name}: feature matrix contains NaN or infinite values."
        )

    if len(np.unique(y)) == 0:
        raise ValueError(
            f"{name}: no classes were found."
        )


def validate_model_features(
    X: np.ndarray,
    scaler,
    model_name: str,
):
    """Check feature count compatibility with a fitted scaler."""

    expected_features = getattr(
        scaler,
        "n_features_in_",
        None,
    )

    if expected_features is not None:
        if X.shape[1] != expected_features:
            raise ValueError(
                f"{model_name}: feature dimension mismatch. "
                f"Expected {expected_features}, got {X.shape[1]}."
            )


# ---------------------------------------------------------------------
# EPISODE METRICS
# ---------------------------------------------------------------------

def calculate_episode_metrics(
    probs: np.ndarray,
    y_test: np.ndarray,
    episode_ids: np.ndarray,
):
    """
    Calculate Early-5 and full-episode metrics.

    Each episode contributes one prediction:
    - Early-5: mean probability across the first five windows.
    - Full episode: mean probability across all windows.
    """

    early5_true = []
    early5_pred = []

    full_true = []
    full_pred = []

    unique_episodes = np.unique(episode_ids)

    for episode_id in unique_episodes:

        mask = episode_ids == episode_id

        episode_probs = probs[mask]
        episode_labels = y_test[mask]

        if len(episode_probs) == 0:
            continue

        # Each episode should belong to one fault class.
        unique_labels = np.unique(episode_labels)

        if len(unique_labels) != 1:
            raise ValueError(
                f"Episode {episode_id} contains multiple labels: "
                f"{unique_labels.tolist()}"
            )

        true_label = int(unique_labels[0])

        # Early-5 prediction.
        early_probs = episode_probs[:5].mean(axis=0)

        early5_true.append(true_label)
        early5_pred.append(int(np.argmax(early_probs)))

        # Full-episode prediction.
        full_probs = episode_probs.mean(axis=0)

        full_true.append(true_label)
        full_pred.append(int(np.argmax(full_probs)))

    if not early5_true:
        raise ValueError(
            "No valid test episodes available for evaluation."
        )

    early5_acc = accuracy_score(
        early5_true,
        early5_pred,
    )

    early5_macro_f1 = f1_score(
        early5_true,
        early5_pred,
        average="macro",
        zero_division=0,
    )

    full_episode_macro_f1 = f1_score(
        full_true,
        full_pred,
        average="macro",
        zero_division=0,
    )

    return (
        float(early5_acc),
        float(early5_macro_f1),
        float(full_episode_macro_f1),
    )


# ---------------------------------------------------------------------
# LATENCY BENCHMARK
# ---------------------------------------------------------------------

def measure_inference_latency(
    model,
    scaler,
    sample_window_df,
    window_size: int,
    iterations: int = LATENCY_ITERATIONS,
) -> float:
    """
    Measure average single-window latency.

    Includes:
    - Feature extraction
    - Scaling
    - predict_proba()
    """

    # Warm-up iterations.
    for _ in range(LATENCY_WARMUP_ITERATIONS):

        features = extract_single_window(
            sample_window_df,
            sensor_cols=SENSOR_COLS,
            window_size=window_size,
        )

        scaled = scaler.transform(features).astype(np.float32)

        model.predict_proba(scaled)

    latencies = []

    for _ in range(iterations):

        start = time.perf_counter()

        features = extract_single_window(
            sample_window_df,
            sensor_cols=SENSOR_COLS,
            window_size=window_size,
        )

        scaled = scaler.transform(features).astype(np.float32)

        model.predict_proba(scaled)

        elapsed_ms = (
            time.perf_counter() - start
        ) * 1000.0

        latencies.append(elapsed_ms)

    return float(np.mean(latencies))


# ---------------------------------------------------------------------
# MODEL EVALUATION
# ---------------------------------------------------------------------

def _evaluate_configuration(
    name: str,
    model,
    scaler,
    X_test_raw: np.ndarray,
    y_test: np.ndarray,
    ep_test: np.ndarray,
    sample_window_df,
    window_size: int,
    train_time_label: str,
    n_classes: int,
):
    """Evaluate sample metrics, episode metrics, confusion matrix, and latency."""

    validate_model_features(
        X_test_raw,
        scaler,
        name,
    )

    X_test_scaled = scaler.transform(
        X_test_raw
    ).astype(np.float32)

    probs = model.predict_proba(X_test_scaled)

    if probs.ndim != 2:
        raise ValueError(
            f"{name}: predict_proba returned an invalid array."
        )

    if probs.shape[1] != n_classes:
        raise ValueError(
            f"{name}: expected {n_classes} probability columns, "
            f"received {probs.shape[1]}."
        )

    if len(probs) != len(y_test):
        raise ValueError(
            f"{name}: prediction count does not match test labels."
        )

    y_pred = np.argmax(probs, axis=1)

    sample_acc = float(
        accuracy_score(y_test, y_pred)
    )

    sample_macro_f1 = float(
        f1_score(
            y_test,
            y_pred,
            average="macro",
            zero_division=0,
        )
    )

    (
        early5_acc,
        early5_macro_f1,
        full_ep_macro_f1,
    ) = calculate_episode_metrics(
        probs,
        y_test,
        ep_test,
    )

    latency_ms = measure_inference_latency(
        model=model,
        scaler=scaler,
        sample_window_df=sample_window_df,
        window_size=window_size,
    )

    cm = confusion_matrix(
        y_test,
        y_pred,
        labels=list(range(n_classes)),
    )

    result = BenchmarkResult(
        name=name,
        window_size=window_size,
        sample_acc=sample_acc,
        sample_macro_f1=sample_macro_f1,
        early5_acc=early5_acc,
        early5_macro_f1=early5_macro_f1,
        full_ep_macro_f1=full_ep_macro_f1,
        train_time_label=train_time_label,
        latency_ms=latency_ms,
    )

    return result, cm, y_pred


# ---------------------------------------------------------------------
# CONFUSION ANALYSIS
# ---------------------------------------------------------------------

def _print_top_confusions(
    title: str,
    cm: np.ndarray,
    idx_to_fault: dict[int, int],
    top_n: int = 5,
):
    """Print the most frequent off-diagonal confusion pairs."""

    off_diag = cm.copy()

    np.fill_diagonal(off_diag, 0)

    row_totals = cm.sum(axis=1)

    flat_indices = np.argsort(
        off_diag.ravel()
    )[::-1][:top_n]

    print(f"\nTop {top_n} Confused Pairs — {title}:")

    print(
        f"{'Rank':>4} | "
        f"{'True Fault':<40} -> "
        f"{'Predicted Fault':<40} | "
        f"{'Count':>6} | "
        f"{'True %':>6}"
    )

    print("-" * 112)

    for rank, flat_index in enumerate(
        flat_indices,
        start=1,
    ):

        true_idx, predicted_idx = np.unravel_index(
            flat_index,
            off_diag.shape,
        )

        count = int(
            off_diag[true_idx, predicted_idx]
        )

        true_status = idx_to_fault[int(true_idx)]
        predicted_status = idx_to_fault[int(predicted_idx)]

        true_name = (
            f"{true_status}: "
            f"{FAULT_METADATA[true_status]['name']}"
        )

        predicted_name = (
            f"{predicted_status}: "
            f"{FAULT_METADATA[predicted_status]['name']}"
        )

        true_percentage = (
            count / row_totals[true_idx] * 100.0
            if row_totals[true_idx] > 0
            else 0.0
        )

        print(
            f"{rank:>4} | "
            f"{true_name:<40} -> "
            f"{predicted_name:<40} | "
            f"{count:>6,} | "
            f"{true_percentage:>5.2f}%"
        )


# ---------------------------------------------------------------------
# RESULT TABLE
# ---------------------------------------------------------------------

def print_comparison_table(
    results: list[BenchmarkResult],
):
    """Print the comparison of all benchmark configurations."""

    print("\n" + "=" * 124)

    print(
        "ALARMSENSE MODEL & WINDOW SIZE BENCHMARK "
        "(UNTOUCHED TEST SPLIT)"
    )

    print("=" * 124)

    print(
        f"{'Model':<28} | "
        f"{'Sample Acc':>10} | "
        f"{'Sample F1':>9} | "
        f"{'Early-5 Acc':>11} | "
        f"{'Early-5 F1':>10} | "
        f"{'Full Ep F1':>10} | "
        f"{'Train Time':>18} | "
        f"{'Latency (ms)':>12}"
    )

    print("-" * 124)

    for result in results:

        print(
            f"{result.name:<28} | "
            f"{result.sample_acc:>10.4f} | "
            f"{result.sample_macro_f1:>9.4f} | "
            f"{result.early5_acc:>11.4f} | "
            f"{result.early5_macro_f1:>10.4f} | "
            f"{result.full_ep_macro_f1:>10.4f} | "
            f"{result.train_time_label:>18} | "
            f"{result.latency_ms:>12.3f}"
        )

    print("=" * 124)


# ---------------------------------------------------------------------
# PER-FAULT COMPARISON
# ---------------------------------------------------------------------

def print_hard_fault_comparison(
    y_test_20: np.ndarray,
    pred_20: np.ndarray,
    y_test_30: np.ndarray,
    pred_30: np.ndarray,
    fault_to_idx_20: dict[int, int],
    fault_to_idx_30: dict[int, int],
):
    """Compare per-class F1 for Normal and selected difficult faults."""

    f1_20 = f1_score(
        y_test_20,
        pred_20,
        average=None,
        labels=list(range(len(fault_to_idx_20))),
        zero_division=0,
    )

    f1_30 = f1_score(
        y_test_30,
        pred_30,
        average=None,
        labels=list(range(len(fault_to_idx_30))),
        zero_division=0,
    )

    print(
        "\nHard-Fault Sample F1 Comparison "
        "(XGBoost W=20 vs W=30):"
    )

    print(
        f"{'STATUS':>6} | "
        f"{'Fault Name':<42} | "
        f"{'W=20 F1':>8} | "
        f"{'W=30 F1':>8} | "
        f"{'Delta':>8}"
    )

    print("-" * 82)

    for status in (0, 8, 10, 13):

        if status not in fault_to_idx_20:
            print(f"{status:>6} | Not available in W=20 mapping")
            continue

        if status not in fault_to_idx_30:
            print(f"{status:>6} | Not available in W=30 mapping")
            continue

        idx20 = fault_to_idx_20[status]
        idx30 = fault_to_idx_30[status]

        score20 = float(f1_20[idx20])
        score30 = float(f1_30[idx30])

        delta = score30 - score20

        fault_name = FAULT_METADATA[status]["name"]

        print(
            f"{status:>6} | "
            f"{fault_name:<42} | "
            f"{score20:>8.4f} | "
            f"{score30:>8.4f} | "
            f"{delta:>+8.4f}"
        )


# ---------------------------------------------------------------------
# SAMPLE WINDOW EXTRACTION
# ---------------------------------------------------------------------

def get_sample_window(
    test_df,
    episode_ids: np.ndarray,
    window_size: int,
):
    """Get the first complete test episode window for latency measurement."""

    if len(episode_ids) == 0:
        raise ValueError(
            "No test episodes available for latency measurement."
        )

    first_episode_id = episode_ids[0]

    episode_df = test_df[
        test_df["episode_id"] == first_episode_id
    ]

    sample_window = episode_df.iloc[:window_size][
        SENSOR_COLS
    ].copy()

    if len(sample_window) != window_size:
        raise ValueError(
            f"Could not obtain a complete {window_size}-step "
            "sample window."
        )

    return sample_window


# ---------------------------------------------------------------------
# MAIN BENCHMARK
# ---------------------------------------------------------------------

def run_benchmark() -> None:
    """Execute the five-configuration benchmark."""

    total_start = time.perf_counter()

    print("=" * 70)
    print("ALARMSENSE MODEL BENCHMARK")
    print("=" * 70)

    # 1. Validate dataset and artifacts.
    validate_dataset()
    validate_artifacts()

    # 2. Load dataset.
    print(f"\nLoading dataset from {PARQUET_PATH}...")

    df = load_tep_parquet(
        path=PARQUET_PATH,
        target_faults=TARGET_FAULTS,
    )

    print(
        f"Loaded {len(df):,} rows and "
        f"{len(df.columns)} columns."
    )

    # 3. Create exact same episode split for all configurations.
    print("\nCreating episode-based train/validation/test split...")

    train_df, val_df, test_df = split_episodes(
        df,
        train_ratio=0.70,
        val_ratio=0.15,
        seed=RANDOM_STATE,
    )

    print(
        f"Train rows: {len(train_df):,}\n"
        f"Validation rows: {len(val_df):,}\n"
        f"Test rows: {len(test_df):,}"
    )

    # 4. Build class mappings.
    fault_to_idx, idx_to_fault = build_label_mappings()

    n_classes = len(fault_to_idx)

    print(f"\nNumber of target classes: {n_classes}")

    # -----------------------------------------------------------------
    # W=20 FEATURE EXTRACTION
    # -----------------------------------------------------------------

    print("\nExtracting W=20 sliding-window features...")

    start = time.perf_counter()

    (
        X_train_20,
        y_train_20_raw,
        _,
    ) = extract_window_features_batch(
        train_df,
        SENSOR_COLS,
        window_size=WINDOW_SIZE_20,
    )

    (
        X_test_20,
        y_test_20_raw,
        ep_test_20,
    ) = extract_window_features_batch(
        test_df,
        SENSOR_COLS,
        window_size=WINDOW_SIZE_20,
    )

    print(
        f"W=20 extraction completed in "
        f"{time.perf_counter() - start:.2f}s"
    )

    validate_feature_data(
        X_train_20,
        y_train_20_raw,
        np.arange(len(X_train_20)),
        "W=20 training data",
    )

    validate_feature_data(
        X_test_20,
        y_test_20_raw,
        ep_test_20,
        "W=20 test data",
    )

    y_train_20 = _map_labels(
        y_train_20_raw,
        fault_to_idx,
    )

    y_test_20 = _map_labels(
        y_test_20_raw,
        fault_to_idx,
    )

    # 5. Fit W=20 scaler using training data only.
    scaler_20 = StandardScaler()

    X_train_20_scaled = scaler_20.fit_transform(
        X_train_20
    ).astype(np.float32)

    sample_win_20 = get_sample_window(
        test_df,
        np.unique(ep_test_20),
        WINDOW_SIZE_20,
    )

    results: list[BenchmarkResult] = []

    # -----------------------------------------------------------------
    # MODEL 1: RANDOM FOREST
    # -----------------------------------------------------------------

    print("\n[1/5] Training RandomForest (W=20)...")

    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=18,
        class_weight="balanced",
        n_jobs=-1,
        random_state=RANDOM_STATE,
    )

    start = time.perf_counter()

    rf.fit(
        X_train_20_scaled,
        y_train_20,
    )

    rf_time = time.perf_counter() - start

    res_rf, _, _ = _evaluate_configuration(
        name="RandomForest (W=20)",
        model=rf,
        scaler=scaler_20,
        X_test_raw=X_test_20,
        y_test=y_test_20,
        ep_test=ep_test_20,
        sample_window_df=sample_win_20,
        window_size=WINDOW_SIZE_20,
        train_time_label=f"{rf_time:.2f}s",
        n_classes=n_classes,
    )

    results.append(res_rf)

    print(
        f"Done in {rf_time:.2f}s | "
        f"Sample F1={res_rf.sample_macro_f1:.4f} | "
        f"Early-5 F1={res_rf.early5_macro_f1:.4f}"
    )

    # -----------------------------------------------------------------
    # MODEL 2: HIST GRADIENT BOOSTING
    # -----------------------------------------------------------------

    print("\n[2/5] Training HistGradientBoosting (W=20)...")

    hgb = HistGradientBoostingClassifier(
        max_iter=250,
        max_depth=8,
        learning_rate=0.05,
        class_weight="balanced",
        random_state=RANDOM_STATE,
    )

    start = time.perf_counter()

    hgb.fit(
        X_train_20_scaled,
        y_train_20,
    )

    hgb_time = time.perf_counter() - start

    res_hgb, _, _ = _evaluate_configuration(
        name="HistGradientBoosting (W=20)",
        model=hgb,
        scaler=scaler_20,
        X_test_raw=X_test_20,
        y_test=y_test_20,
        ep_test=ep_test_20,
        sample_window_df=sample_win_20,
        window_size=WINDOW_SIZE_20,
        train_time_label=f"{hgb_time:.2f}s",
        n_classes=n_classes,
    )

    results.append(res_hgb)

    print(
        f"Done in {hgb_time:.2f}s | "
        f"Sample F1={res_hgb.sample_macro_f1:.4f} | "
        f"Early-5 F1={res_hgb.early5_macro_f1:.4f}"
    )

    # -----------------------------------------------------------------
    # MODEL 3: MLP CLASSIFIER
    # -----------------------------------------------------------------

    print("\n[3/5] Training MLPClassifier (W=20)...")

    mlp = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        max_iter=30,
        early_stopping=True,
        random_state=RANDOM_STATE,
    )

    start = time.perf_counter()

    mlp.fit(
        X_train_20_scaled,
        y_train_20,
    )

    mlp_time = time.perf_counter() - start

    res_mlp, _, _ = _evaluate_configuration(
        name="MLPClassifier (W=20)",
        model=mlp,
        scaler=scaler_20,
        X_test_raw=X_test_20,
        y_test=y_test_20,
        ep_test=ep_test_20,
        sample_window_df=sample_win_20,
        window_size=WINDOW_SIZE_20,
        train_time_label=f"{mlp_time:.2f}s",
        n_classes=n_classes,
    )

    results.append(res_mlp)

    print(
        f"Done in {mlp_time:.2f}s | "
        f"Sample F1={res_mlp.sample_macro_f1:.4f} | "
        f"Early-5 F1={res_mlp.early5_macro_f1:.4f}"
    )

    # -----------------------------------------------------------------
    # MODEL 4: EXISTING XGBOOST W=20 (READ-ONLY)
    # -----------------------------------------------------------------

    print(
        "\n[4/5] Loading existing XGBoost (W=20) "
        "from artifacts (read-only)..."
    )

    xgb_20 = XGBClassifier()

    xgb_20.load_model(
        ARTIFACTS_DIR / "xgb_model.json"
    )

    scaler_xgb_20 = joblib.load(
        ARTIFACTS_DIR / "scaler.joblib"
    )

    (
        xgb_20_fault_to_idx,
        xgb_20_idx_to_fault,
    ) = load_artifact_label_mapping()

    y_test_xgb_20 = _map_labels(
        y_test_20_raw,
        xgb_20_fault_to_idx,
    )

    validate_model_features(
        X_test_20,
        scaler_xgb_20,
        "XGBoost W=20",
    )

    res_xgb_20, cm_xgb_20, pred_xgb_20 = (
        _evaluate_configuration(
            name="XGBoost (W=20)",
            model=xgb_20,
            scaler=scaler_xgb_20,
            X_test_raw=X_test_20,
            y_test=y_test_xgb_20,
            ep_test=ep_test_20,
            sample_window_df=sample_win_20,
            window_size=WINDOW_SIZE_20,
            train_time_label="loaded (artifacts)",
            n_classes=n_classes,
        )
    )

    results.append(res_xgb_20)

    print(
        f"Loaded | "
        f"Sample F1={res_xgb_20.sample_macro_f1:.4f} | "
        f"Early-5 F1={res_xgb_20.early5_macro_f1:.4f}"
    )

    # -----------------------------------------------------------------
    # W=30 FEATURE EXTRACTION
    # -----------------------------------------------------------------

    print(
        "\n[5/5] Extracting W=30 features and "
        "training XGBoost (W=30) in memory..."
    )

    start = time.perf_counter()

    (
        X_train_30,
        y_train_30_raw,
        _,
    ) = extract_window_features_batch(
        train_df,
        SENSOR_COLS,
        window_size=WINDOW_SIZE_30,
    )

    (
        X_val_30,
        y_val_30_raw,
        _,
    ) = extract_window_features_batch(
        val_df,
        SENSOR_COLS,
        window_size=WINDOW_SIZE_30,
    )

    (
        X_test_30,
        y_test_30_raw,
        ep_test_30,
    ) = extract_window_features_batch(
        test_df,
        SENSOR_COLS,
        window_size=WINDOW_SIZE_30,
    )

    print(
        f"W=30 extraction completed in "
        f"{time.perf_counter() - start:.2f}s"
    )

    validate_feature_data(
        X_train_30,
        y_train_30_raw,
        np.arange(len(X_train_30)),
        "W=30 training data",
    )

    validate_feature_data(
        X_val_30,
        y_val_30_raw,
        np.arange(len(X_val_30)),
        "W=30 validation data",
    )

    validate_feature_data(
        X_test_30,
        y_test_30_raw,
        ep_test_30,
        "W=30 test data",
    )

    y_train_30 = _map_labels(
        y_train_30_raw,
        fault_to_idx,
    )

    y_val_30 = _map_labels(
        y_val_30_raw,
        fault_to_idx,
    )

    y_test_30 = _map_labels(
        y_test_30_raw,
        fault_to_idx,
    )

    # -----------------------------------------------------------------
    # W=30 SCALING
    # -----------------------------------------------------------------

    scaler_30 = StandardScaler()

    X_train_30_scaled = scaler_30.fit_transform(
        X_train_30
    ).astype(np.float32)

    X_val_30_scaled = scaler_30.transform(
        X_val_30
    ).astype(np.float32)

    # -----------------------------------------------------------------
    # W=30 SAMPLE WEIGHTS
    # -----------------------------------------------------------------

    weights_30 = compute_sample_weight(
        class_weight="balanced",
        y=y_train_30,
    )

    # -----------------------------------------------------------------
    # XGBOOST W=30
    # -----------------------------------------------------------------

    xgb_30 = XGBClassifier(
        tree_method="hist",
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        early_stopping_rounds=25,
        eval_metric="mlogloss",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    start = time.perf_counter()

    xgb_30.fit(
        X_train_30_scaled,
        y_train_30,
        sample_weight=weights_30,
        eval_set=[
            (X_val_30_scaled, y_val_30)
        ],
        verbose=100,
    )

    xgb30_time = time.perf_counter() - start

    sample_win_30 = get_sample_window(
        test_df,
        np.unique(ep_test_30),
        WINDOW_SIZE_30,
    )

    res_xgb_30, cm_xgb_30, pred_xgb_30 = (
        _evaluate_configuration(
            name="XGBoost (W=30)",
            model=xgb_30,
            scaler=scaler_30,
            X_test_raw=X_test_30,
            y_test=y_test_30,
            ep_test=ep_test_30,
            sample_window_df=sample_win_30,
            window_size=WINDOW_SIZE_30,
            train_time_label=f"{xgb30_time:.2f}s",
            n_classes=n_classes,
        )
    )

    results.append(res_xgb_30)

    print(
        f"Done in {xgb30_time:.2f}s | "
        f"Sample F1={res_xgb_30.sample_macro_f1:.4f} | "
        f"Early-5 F1={res_xgb_30.early5_macro_f1:.4f}"
    )

    # -----------------------------------------------------------------
    # COMPARISON TABLE
    # -----------------------------------------------------------------

    print_comparison_table(results)

    # -----------------------------------------------------------------
    # CONFUSION ANALYSIS
    # -----------------------------------------------------------------

    _print_top_confusions(
        "XGBoost (W=20)",
        cm_xgb_20,
        xgb_20_idx_to_fault,
        top_n=5,
    )

    _print_top_confusions(
        "XGBoost (W=30)",
        cm_xgb_30,
        idx_to_fault,
        top_n=5,
    )

    # -----------------------------------------------------------------
    # PER-FAULT COMPARISON
    # -----------------------------------------------------------------

    print_hard_fault_comparison(
        y_test_20=y_test_xgb_20,
        pred_20=pred_xgb_20,
        y_test_30=y_test_30,
        pred_30=pred_xgb_30,
        fault_to_idx_20=xgb_20_fault_to_idx,
        fault_to_idx_30=fault_to_idx,
    )

    # -----------------------------------------------------------------
    # FINAL SUMMARY
    # -----------------------------------------------------------------

    print("\n" + "=" * 70)
    print("BENCHMARK COMPLETED")
    print("=" * 70)

    print(
        f"Total execution time: "
        f"{time.perf_counter() - total_start:.2f} seconds"
    )

    print("\nArtifact safety:")
    print("- Existing W=20 XGBoost model: read-only")
    print("- Existing W=20 scaler: read-only")
    print("- Existing W=20 label map: read-only")
    print("- W=30 XGBoost model: trained in memory only")
    print("- No model artifacts were overwritten.")

    print("=" * 70)


# ---------------------------------------------------------------------
# CLI ENTRYPOINT
# ---------------------------------------------------------------------

def main() -> None:
    """Command-line entrypoint."""

    run_benchmark()


if __name__ == "__main__":
    main()
