"""Read-only model and window-size comparison benchmark for AlarmSense.

Compares 5 configurations on the exact same stratified episode split:
1. RandomForest (W=20)
2. HistGradientBoosting (W=20)
3. MLPClassifier (W=20)
4. XGBoost (W=20) - loaded from artifacts/xgb_model.json (read-only)
5. XGBoost (W=30) - trained in-memory without modifying artifacts/

Reports Sample Accuracy/Macro-F1, Early-5 Accuracy/Macro-F1, Full Episode Macro-F1,
training time, single-window inference latency, and top-5 confusion pairs for
XGBoost (W=20) vs XGBoost (W=30).
"""

from dataclasses import dataclass
import json
from pathlib import Path
import time
import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier

from app.config import FAULT_METADATA, PARQUET_PATH, SENSOR_COLS, TARGET_FAULTS
from app.services.features import extract_single_window, extract_window_features_batch
from app.services.tep_loader import load_tep_parquet, split_episodes

ARTIFACTS_DIR = Path(__file__).resolve().parents[1] / "artifacts"


@dataclass(frozen=True)
class BenchmarkResult:
    """Evaluation metrics for a single benchmarked model configuration."""

    name: str
    window_size: int
    sample_acc: float
    sample_macro_f1: float
    early5_acc: float
    early5_macro_f1: float
    full_ep_macro_f1: float
    train_time_label: str
    latency_ms: float


def _map_labels(
    y_raw: np.ndarray,
    fault_to_idx: dict[int, int],
) -> np.ndarray:
    """Map raw TEP STATUS codes to contiguous 0..K-1 class indices."""
    return np.array([fault_to_idx[int(label)] for label in y_raw], dtype=np.int64)


def _evaluate_configuration(
    name: str,
    model: object,
    scaler: StandardScaler,
    X_test_raw: np.ndarray,
    y_test: np.ndarray,
    ep_test: np.ndarray,
    sample_window_df: object,
    window_size: int,
    train_time_label: str,
    n_classes: int,
    latency_iters: int = 100,
) -> tuple[BenchmarkResult, np.ndarray]:
    """Compute sample, Early-5, full-episode metrics, and latency for a model."""
    X_test_scaled = scaler.transform(X_test_raw).astype(np.float32)
    probs = model.predict_proba(X_test_scaled)
    y_pred = np.argmax(probs, axis=1)

    sample_acc = float(accuracy_score(y_test, y_pred))
    sample_macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))

    unique_eps = np.unique(ep_test)
    early5_trues: list[int] = []
    early5_preds: list[int] = []
    full_trues: list[int] = []
    full_preds: list[int] = []

    for ep_id in unique_eps:
        mask = ep_test == ep_id
        ep_probs = probs[mask]
        ep_true = int(y_test[mask][0])

        early5_mean_probs = ep_probs[:5].mean(axis=0)
        early5_preds.append(int(np.argmax(early5_mean_probs)))
        early5_trues.append(ep_true)

        full_mean_probs = ep_probs.mean(axis=0)
        full_preds.append(int(np.argmax(full_mean_probs)))
        full_trues.append(ep_true)

    early5_acc = float(accuracy_score(early5_trues, early5_preds))
    early5_macro_f1 = float(f1_score(early5_trues, early5_preds, average="macro", zero_division=0))
    full_ep_macro_f1 = float(f1_score(full_trues, full_preds, average="macro", zero_division=0))

    # Measure single-window latency (feature extraction + scaling + predict_proba)
    for _ in range(10):
        x_one = extract_single_window(sample_window_df, sensor_cols=SENSOR_COLS, window_size=window_size)
        _ = model.predict_proba(scaler.transform(x_one).astype(np.float32))

    latencies_ms: list[float] = []
    for _ in range(latency_iters):
        t0 = time.perf_counter()
        x_one = extract_single_window(sample_window_df, sensor_cols=SENSOR_COLS, window_size=window_size)
        x_one_scaled = scaler.transform(x_one).astype(np.float32)
        _ = model.predict_proba(x_one_scaled)
        latencies_ms.append((time.perf_counter() - t0) * 1000.0)

    mean_latency_ms = float(np.mean(latencies_ms))

    cm = confusion_matrix(y_test, y_pred, labels=list(range(n_classes)))
    result = BenchmarkResult(
        name=name,
        window_size=window_size,
        sample_acc=sample_acc,
        sample_macro_f1=sample_macro_f1,
        early5_acc=early5_acc,
        early5_macro_f1=early5_macro_f1,
        full_ep_macro_f1=full_ep_macro_f1,
        train_time_label=train_time_label,
        latency_ms=mean_latency_ms,
    )
    return result, cm


def _print_top_confusions(
    title: str,
    cm: np.ndarray,
    idx_to_fault: dict[int, int],
    top_n: int = 5,
) -> None:
    """Print the top N most frequent off-diagonal (True -> Predicted) confusion pairs."""
    off_diag = cm.copy()
    np.fill_diagonal(off_diag, 0)
    row_totals = cm.sum(axis=1)

    flat_indices = np.argsort(off_diag.ravel())[::-1][:top_n]
    print(f"\nTop {top_n} Confused Pairs — {title}:")
    print(f"{'Rank':>4} | {'True Fault':<40} -> {'Predicted Fault':<40} | {'Count':>6} | {'True %':>6}")
    print("-" * 112)

    for rank, flat_idx in enumerate(flat_indices, start=1):
        true_i, pred_j = np.unravel_index(flat_idx, off_diag.shape)
        count = int(off_diag[true_i, pred_j])
        true_status = idx_to_fault[int(true_i)]
        pred_status = idx_to_fault[int(pred_j)]
        true_name = f"{true_status}: {FAULT_METADATA[true_status]['name']}"
        pred_name = f"{pred_status}: {FAULT_METADATA[pred_status]['name']}"
        pct = (count / row_totals[true_i] * 100.0) if row_totals[true_i] > 0 else 0.0
        print(f"{rank:>4} | {true_name:<40} -> {pred_name:<40} | {count:>6,} | {pct:>5.2f}%")


def run_benchmark() -> None:
    """Execute read-only 5-model benchmark on the canonical TEP episode split."""
    print(f"Loading dataset from {PARQUET_PATH}...")
    df = load_tep_parquet(path=PARQUET_PATH, target_faults=TARGET_FAULTS)
    train_df, val_df, test_df = split_episodes(df, train_ratio=0.70, val_ratio=0.15, seed=42)

    sorted_faults = sorted(TARGET_FAULTS)
    fault_to_idx = {int(f): idx for idx, f in enumerate(sorted_faults)}
    idx_to_fault = {idx: int(f) for idx, f in enumerate(sorted_faults)}
    n_classes = len(sorted_faults)

    # -------------------------------------------------------------------------
    # Window Size W=20 Dataset Extraction & Scaling
    # -------------------------------------------------------------------------
    print("Extracting W=20 sliding-window features (train, val, test)...")
    t0 = time.perf_counter()
    X_train_20, y_train_20_raw, _ = extract_window_features_batch(train_df, SENSOR_COLS, window_size=20)
    X_val_20, y_val_20_raw, _ = extract_window_features_batch(val_df, SENSOR_COLS, window_size=20)
    X_test_20, y_test_20_raw, ep_test_20 = extract_window_features_batch(test_df, SENSOR_COLS, window_size=20)
    print(f"W=20 extraction finished in {time.perf_counter() - t0:.2f}s "
          f"(train={len(X_train_20):,}, val={len(X_val_20):,}, test={len(X_test_20):,})")

    y_train_20 = _map_labels(y_train_20_raw, fault_to_idx)
    y_test_20 = _map_labels(y_test_20_raw, fault_to_idx)

    scaler_20 = StandardScaler()
    X_train_20_scaled = scaler_20.fit_transform(X_train_20).astype(np.float32)

    first_ep_id_20 = int(np.unique(ep_test_20)[0])
    sample_win_20 = test_df[test_df["episode_id"] == first_ep_id_20].iloc[:20][SENSOR_COLS].copy()

    results: list[BenchmarkResult] = []

    # 1. RandomForest (W=20)
    print("\n[1/5] Training RandomForest (W=20)...")
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=18,
        class_weight="balanced",
        n_jobs=-1,
        random_state=42,
    )
    t_rf = time.perf_counter()
    rf.fit(X_train_20_scaled, y_train_20)
    rf_time = time.perf_counter() - t_rf
    res_rf, _ = _evaluate_configuration(
        name="RandomForest (W=20)",
        model=rf,
        scaler=scaler_20,
        X_test_raw=X_test_20,
        y_test=y_test_20,
        ep_test=ep_test_20,
        sample_window_df=sample_win_20,
        window_size=20,
        train_time_label=f"{rf_time:.2f}s",
        n_classes=n_classes,
    )
    results.append(res_rf)
    print(f"      Done in {rf_time:.2f}s | Sample F1={res_rf.sample_macro_f1:.4f} | Early-5 F1={res_rf.early5_macro_f1:.4f}")

    # 2. HistGradientBoosting (W=20)
    print("\n[2/5] Training HistGradientBoosting (W=20)...")
    hgb = HistGradientBoostingClassifier(
        max_iter=250,
        max_depth=8,
        learning_rate=0.05,
        class_weight="balanced",
        random_state=42,
    )
    t_hgb = time.perf_counter()
    hgb.fit(X_train_20_scaled, y_train_20)
    hgb_time = time.perf_counter() - t_hgb
    res_hgb, _ = _evaluate_configuration(
        name="HistGradientBoosting (W=20)",
        model=hgb,
        scaler=scaler_20,
        X_test_raw=X_test_20,
        y_test=y_test_20,
        ep_test=ep_test_20,
        sample_window_df=sample_win_20,
        window_size=20,
        train_time_label=f"{hgb_time:.2f}s",
        n_classes=n_classes,
    )
    results.append(res_hgb)
    print(f"      Done in {hgb_time:.2f}s | Sample F1={res_hgb.sample_macro_f1:.4f} | Early-5 F1={res_hgb.early5_macro_f1:.4f}")

    # 3. MLPClassifier (W=20)
    print("\n[3/5] Training MLPClassifier (W=20)...")
    mlp = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        max_iter=30,
        early_stopping=True,
        random_state=42,
    )
    t_mlp = time.perf_counter()
    mlp.fit(X_train_20_scaled, y_train_20)
    mlp_time = time.perf_counter() - t_mlp
    res_mlp, _ = _evaluate_configuration(
        name="MLPClassifier (W=20)",
        model=mlp,
        scaler=scaler_20,
        X_test_raw=X_test_20,
        y_test=y_test_20,
        ep_test=ep_test_20,
        sample_window_df=sample_win_20,
        window_size=20,
        train_time_label=f"{mlp_time:.2f}s",
        n_classes=n_classes,
    )
    results.append(res_mlp)
    print(f"      Done in {mlp_time:.2f}s | Sample F1={res_mlp.sample_macro_f1:.4f} | Early-5 F1={res_mlp.early5_macro_f1:.4f}")

    # 4. XGBoost (W=20) - read-only load of existing artifacts
    print("\n[4/5] Loading existing XGBoost (W=20) from artifacts/ (read-only)...")
    xgb_20 = XGBClassifier()
    xgb_20.load_model(ARTIFACTS_DIR / "xgb_model.json")
    scaler_xgb_20 = joblib.load(ARTIFACTS_DIR / "scaler.joblib")
    with open(ARTIFACTS_DIR / "label_map.json", encoding="utf-8") as f:
        label_map_20 = json.load(f)
    xgb_20_fault_to_idx = {int(k): int(v) for k, v in label_map_20["fault_to_idx"].items()}
    xgb_20_idx_to_fault = {int(k): int(v) for k, v in label_map_20["idx_to_fault"].items()}
    y_test_xgb_20 = _map_labels(y_test_20_raw, xgb_20_fault_to_idx)

    res_xgb_20, cm_xgb_20 = _evaluate_configuration(
        name="XGBoost (W=20)",
        model=xgb_20,
        scaler=scaler_xgb_20,
        X_test_raw=X_test_20,
        y_test=y_test_xgb_20,
        ep_test=ep_test_20,
        sample_window_df=sample_win_20,
        window_size=20,
        train_time_label="loaded (artifacts)",
        n_classes=n_classes,
    )
    results.append(res_xgb_20)
    print(f"      Loaded | Sample F1={res_xgb_20.sample_macro_f1:.4f} | Early-5 F1={res_xgb_20.early5_macro_f1:.4f}")

    # -------------------------------------------------------------------------
    # 5. XGBoost (W=30) - in-memory only (do not save to artifacts/)
    # -------------------------------------------------------------------------
    print("\n[5/5] Extracting W=30 features and training XGBoost (W=30) in-memory...")
    X_train_30, y_train_30_raw, _ = extract_window_features_batch(train_df, SENSOR_COLS, window_size=30)
    X_val_30, y_val_30_raw, _ = extract_window_features_batch(val_df, SENSOR_COLS, window_size=30)
    X_test_30, y_test_30_raw, ep_test_30 = extract_window_features_batch(test_df, SENSOR_COLS, window_size=30)

    y_train_30 = _map_labels(y_train_30_raw, fault_to_idx)
    y_val_30 = _map_labels(y_val_30_raw, fault_to_idx)
    y_test_30 = _map_labels(y_test_30_raw, fault_to_idx)

    scaler_30 = StandardScaler()
    X_train_30_scaled = scaler_30.fit_transform(X_train_30).astype(np.float32)
    X_val_30_scaled = scaler_30.transform(X_val_30).astype(np.float32)

    weights_30 = compute_sample_weight("balanced", y_train_30)
    xgb_30 = XGBClassifier(
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
    t_xgb30 = time.perf_counter()
    xgb_30.fit(
        X_train_30_scaled,
        y_train_30,
        sample_weight=weights_30,
        eval_set=[(X_val_30_scaled, y_val_30)],
        verbose=100,
    )
    xgb30_time = time.perf_counter() - t_xgb30

    first_ep_id_30 = int(np.unique(ep_test_30)[0])
    sample_win_30 = test_df[test_df["episode_id"] == first_ep_id_30].iloc[:30][SENSOR_COLS].copy()

    res_xgb_30, cm_xgb_30 = _evaluate_configuration(
        name="XGBoost (W=30)",
        model=xgb_30,
        scaler=scaler_30,
        X_test_raw=X_test_30,
        y_test=y_test_30,
        ep_test=ep_test_30,
        sample_window_df=sample_win_30,
        window_size=30,
        train_time_label=f"{xgb30_time:.2f}s",
        n_classes=n_classes,
    )
    results.append(res_xgb_30)
    print(f"      Done in {xgb30_time:.2f}s | Sample F1={res_xgb_30.sample_macro_f1:.4f} | Early-5 F1={res_xgb_30.early5_macro_f1:.4f}")

    # -------------------------------------------------------------------------
    # Print Comparison Table & Top Confusions
    # -------------------------------------------------------------------------
    print("\n" + "=" * 124)
    print("ALARMSENSE MODEL & WINDOW SIZE BENCHMARK COMPARISON (UNTOUCHED TEST SPLIT)")
    print("=" * 124)
    print(
        f"{'Model':<28} | {'Sample Acc':>10} | {'Sample F1':>9} | "
        f"{'Early-5 Acc':>11} | {'Early-5 F1':>10} | {'Full Ep F1':>10} | "
        f"{'Train Time':>18} | {'Latency (ms)':>12}"
    )
    print("-" * 124)
    for r in results:
        print(
            f"{r.name:<28} | {r.sample_acc:>10.4f} | {r.sample_macro_f1:>9.4f} | "
            f"{r.early5_acc:>11.4f} | {r.early5_macro_f1:>10.4f} | {r.full_ep_macro_f1:>10.4f} | "
            f"{r.train_time_label:>18} | {r.latency_ms:>12.3f}"
        )
    print("=" * 124)

    _print_top_confusions("XGBoost (W=20)", cm_xgb_20, xgb_20_idx_to_fault, top_n=5)
    _print_top_confusions("XGBoost (W=30)", cm_xgb_30, idx_to_fault, top_n=5)

    # Also print per-fault F1 comparison specifically for Faults 8, 10, 13 (plus Normal)
    f1_20 = f1_score(y_test_xgb_20, np.argmax(xgb_20.predict_proba(scaler_xgb_20.transform(X_test_20).astype(np.float32)), axis=1), average=None, labels=list(range(n_classes)))
    f1_30 = f1_score(y_test_30, np.argmax(xgb_30.predict_proba(scaler_30.transform(X_test_30).astype(np.float32)), axis=1), average=None, labels=list(range(n_classes)))
    print("\nHard-Fault Sample F1 Comparison (XGBoost W=20 vs W=30):")
    print(f"{'STATUS':>6} | {'Fault Name':<42} | {'W=20 F1':>8} | {'W=30 F1':>8} | {'Delta':>8}")
    print("-" * 82)
    for status in (0, 8, 10, 13):
        idx20 = xgb_20_fault_to_idx[status]
        idx30 = fault_to_idx[status]
        delta = f1_30[idx30] - f1_20[idx20]
        print(f"{status:>6} | {FAULT_METADATA[status]['name']:<42} | {f1_20[idx20]:>8.4f} | {f1_30[idx30]:>8.4f} | {delta:>+8.4f}")


def main() -> None:
    """CLI entrypoint for running the benchmark comparison."""
    run_benchmark()


if __name__ == "__main__":
    main()
