"""Evaluation script for the trained AlarmSense XGBoost classifier.

Loads persisted artifacts, extracts features on the untouched test split,
and reports:
- Sample-Level Accuracy & Macro F1
- Episode-Level Accuracy & Macro F1 (mean predicted probabilities per episode)
- Per-fault F1 breakdown (sample-level & episode-level)
- Single-window inference latency (ms)
"""

import json
from pathlib import Path
import time
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
from app.services.features import extract_single_window, extract_window_features_batch
from app.services.tep_loader import load_tep_parquet, split_episodes

ARTIFACTS_DIR = Path(__file__).resolve().parents[1] / "artifacts"


def evaluate_model(
    parquet_path: str = PARQUET_PATH,
    artifacts_dir: Path = ARTIFACTS_DIR,
    window_size: int = DEFAULT_WINDOW_SIZE,
    latency_iters: int = 100,
) -> dict[str, object]:
    """Evaluate saved XGBoost artifacts on untouched test_df episodes."""
    model_path = artifacts_dir / "xgb_model.json"
    scaler_path = artifacts_dir / "scaler.joblib"
    label_map_path = artifacts_dir / "label_map.json"

    for p in (model_path, scaler_path, label_map_path):
        if not p.is_file():
            raise FileNotFoundError(f"Required artifact missing: {p}. Run training.train_xgb first.")

    model = XGBClassifier()
    model.load_model(model_path)
    scaler = joblib.load(scaler_path)
    with open(label_map_path, encoding="utf-8") as f:
        label_map = json.load(f)

    fault_to_idx = {int(k): int(v) for k, v in label_map["fault_to_idx"].items()}
    idx_to_fault = {int(k): int(v) for k, v in label_map["idx_to_fault"].items()}
    classes = [int(c) for c in label_map["classes"]]
    n_classes = len(classes)

    print(f"Loading test split from {parquet_path}...")
    df = load_tep_parquet(path=parquet_path, target_faults=TARGET_FAULTS)
    _, _, test_df = split_episodes(df, train_ratio=0.70, val_ratio=0.15, seed=42)

    X_test, y_test_raw, ep_test = extract_window_features_batch(
        test_df, sensor_cols=SENSOR_COLS, window_size=window_size
    )
    X_test_scaled = scaler.transform(X_test).astype(np.float32)
    y_test = np.array([fault_to_idx[int(label)] for label in y_test_raw], dtype=np.int64)

    # 1. Sample-Level Predictions & Metrics
    probs = model.predict_proba(X_test_scaled)
    y_pred = np.argmax(probs, axis=1)

    sample_acc = float(accuracy_score(y_test, y_pred))
    sample_macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
    sample_per_fault_f1 = f1_score(
        y_test, y_pred, labels=list(range(n_classes)), average=None, zero_division=0
    )

    # 2. Episode-Level Predictions & Metrics (mean predicted probability per episode)
    unique_eps = np.unique(ep_test)
    ep_trues: list[int] = []
    ep_preds: list[int] = []
    for ep_id in unique_eps:
        mask = ep_test == ep_id
        mean_probs = probs[mask].mean(axis=0)
        ep_preds.append(int(np.argmax(mean_probs)))
        ep_trues.append(int(y_test[mask][0]))

    ep_trues_arr = np.array(ep_trues, dtype=np.int64)
    ep_preds_arr = np.array(ep_preds, dtype=np.int64)

    episode_acc = float(accuracy_score(ep_trues_arr, ep_preds_arr))
    episode_macro_f1 = float(f1_score(ep_trues_arr, ep_preds_arr, average="macro", zero_division=0))
    episode_per_fault_f1 = f1_score(
        ep_trues_arr, ep_preds_arr, labels=list(range(n_classes)), average=None, zero_division=0
    )

    # 3. Single-Window Inference Latency Benchmark (feature extraction + scaling + predict_proba)
    first_ep_id = unique_eps[0]
    sample_window_df = (
        test_df[test_df["episode_id"] == first_ep_id].iloc[:window_size][SENSOR_COLS].copy()
    )

    # Warmup
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
    p95_latency_ms = float(np.percentile(latencies_ms, 95))

    # Print Structured Report
    print("\n" + "=" * 78)
    print("ALARMSENSE TEST SET EVALUATION REPORT")
    print("=" * 78)
    print(f"Test Windows: {len(X_test):,} | Test Episodes: {len(unique_eps)}")
    print(f"Sample-Level  Accuracy: {sample_acc:.4f} | Macro F1: {sample_macro_f1:.4f}")
    print(f"Episode-Level Accuracy: {episode_acc:.4f} | Macro F1: {episode_macro_f1:.4f}")
    print(
        f"Single-Window Inference Latency ({latency_iters} runs): "
        f"mean={mean_latency_ms:.3f} ms, p95={p95_latency_ms:.3f} ms"
    )
    print("-" * 78)
    print(
        f"{'STATUS':>6} | {'Fault Name':<42} | {'Sample F1':>9} | {'Ep F1':>7} | {'Windows':>7} | {'Eps':>4}"
    )
    print("-" * 78)

    per_fault_rows: list[dict[str, object]] = []
    for idx in range(n_classes):
        status = idx_to_fault[idx]
        name = FAULT_METADATA[status]["name"]
        s_f1 = float(sample_per_fault_f1[idx])
        e_f1 = float(episode_per_fault_f1[idx])
        n_win = int((y_test == idx).sum())
        n_ep = int((ep_trues_arr == idx).sum())
        print(f"{status:>6} | {name:<42} | {s_f1:>9.4f} | {e_f1:>7.4f} | {n_win:>7,} | {n_ep:>4}")
        per_fault_rows.append(
            {
                "status": status,
                "name": name,
                "sample_f1": round(s_f1, 4),
                "episode_f1": round(e_f1, 4),
                "windows": n_win,
                "episodes": n_ep,
            }
        )
    print("=" * 78)

    return {
        "sample_accuracy": round(sample_acc, 4),
        "sample_macro_f1": round(sample_macro_f1, 4),
        "episode_accuracy": round(episode_acc, 4),
        "episode_macro_f1": round(episode_macro_f1, 4),
        "mean_latency_ms": round(mean_latency_ms, 3),
        "p95_latency_ms": round(p95_latency_ms, 3),
        "per_fault": per_fault_rows,
    }


def main() -> None:
    """CLI entrypoint for evaluating the AlarmSense XGBoost model."""
    evaluate_model()


if __name__ == "__main__":
    main()
