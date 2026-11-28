"""AEROSENTRY Phase 3: baseline anomaly detection for NASA C-MAPSS FD001.

Run from this folder after placing train_FD001.txt and test_FD001.txt in data/:
    python phase3_anomaly_detection.py

This is a research/demo baseline, not a certified aircraft diagnostic system.
"""
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
import joblib

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
OUTPUT = ROOT / "outputs"
OUTPUT.mkdir(exist_ok=True)
COLS = ["unit", "cycle", "setting_1", "setting_2", "setting_3"] + [f"sensor_{i}" for i in range(1, 22)]
META = ["unit", "cycle"]
RANDOM_STATE = 42


def load_fd001(filename: str) -> pd.DataFrame:
    path = DATA / filename
    if not path.exists():
        raise FileNotFoundError(f"Missing {path}. Put {filename} inside the data/ folder.")
    frame = pd.read_csv(path, sep=r"\s+", header=None, names=COLS)
    return frame


def inject_demo_faults(normal: pd.DataFrame, feature_cols: list[str], seed: int = 42):
    """Create a separate labelled copy with spike, drift and stuck-at faults."""
    rng = np.random.default_rng(seed)
    clean = normal[feature_cols].copy().reset_index(drop=True)
    faulty = clean.copy()
    labels = np.zeros(len(faulty), dtype=int)
    n = max(1, int(0.05 * len(faulty)))
    chosen = rng.choice(len(faulty), size=n, replace=False)
    third = max(1, n // 3)
    # Spike: large one-cycle perturbation.
    c = feature_cols[0]
    std = max(float(clean[c].std()), 1e-6)
    faulty.loc[chosen[:third], c] += 6.0 * std
    # Drift: gradually increasing offset over a contiguous segment.
    c = feature_cols[min(1, len(feature_cols)-1)]
    drift_idx = chosen[third:2*third]
    if len(drift_idx):
        order = np.sort(drift_idx)
        faulty.loc[order, c] += np.linspace(0.5, 5.0, len(order)) * max(float(clean[c].std()), 1e-6)
    # Stuck-at: repeated constant values over a segment.
    c = feature_cols[min(2, len(feature_cols)-1)]
    stuck_idx = np.sort(chosen[2*third:])
    if len(stuck_idx):
        faulty.loc[stuck_idx, c] = float(clean[c].median())
    labels[chosen] = 1
    return clean, faulty, labels


def main():
    train = load_fd001("train_FD001.txt")
    test = load_fd001("test_FD001.txt")

    # Remove only truly constant columns, determined from the training set.
    candidates = [c for c in COLS if c not in META]
    feature_cols = [c for c in candidates if train[c].nunique(dropna=False) > 1]
    if not feature_cols:
        raise RuntimeError("No usable feature columns found.")

    # Early-life reference window: first 30% of each engine's observed cycles.
    # This is an explicit baseline assumption to validate, not a NASA fault label.
    train = train.sort_values(["unit", "cycle"]).copy()
    max_cycle = train.groupby("unit")["cycle"].transform("max")
    reference_mask = train["cycle"] <= np.ceil(0.30 * max_cycle)
    reference = train.loc[reference_mask, feature_cols]

    scaler = StandardScaler()
    x_reference = scaler.fit_transform(reference)
    model = IsolationForest(
        n_estimators=300,
        contamination=0.02,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    model.fit(x_reference)

    # Score every training/test row. -1 is an outlier; 1 is an inlier.
    train_scaled = scaler.transform(train[feature_cols])
    test = test.sort_values(["unit", "cycle"]).copy()
    test_scaled = scaler.transform(test[feature_cols])
    train["anomaly_score"] = -model.score_samples(train_scaled)
    train["if_label"] = model.predict(train_scaled)
    test["anomaly_score"] = -model.score_samples(test_scaled)
    test["if_label"] = model.predict(test_scaled)
    train.to_csv(OUTPUT / "train_anomaly_scores.csv", index=False)
    test.to_csv(OUTPUT / "test_anomaly_scores.csv", index=False)

    # Synthetic fault check, deliberately separate from original NASA observations.
    clean, faulty, labels = inject_demo_faults(reference, feature_cols)
    faulty_scaled = scaler.transform(faulty)
    pred = (model.predict(faulty_scaled) == -1).astype(int)
    (OUTPUT / "synthetic_fault_results.txt").write_text(
        "Synthetic fault experiment (not ground-truth NASA labels)\n"
        f"Injected samples: {int(labels.sum())} / {len(labels)}\n"
        f"Detected as outliers: {int(pred.sum())}\n\n"
        + classification_report(labels, pred, zero_division=0)
        + "\nConfusion matrix [ [TN, FP], [FN, TP] ]:\n"
        + str(confusion_matrix(labels, pred))
    )

    joblib.dump({"model": model, "scaler": scaler, "feature_cols": feature_cols}, OUTPUT / "isolation_forest_fd001.joblib")
    print(f"Rows: train={len(train)}, test={len(test)}")
    print(f"Usable input features ({len(feature_cols)}): {', '.join(feature_cols)}")
    print(f"Early-life reference rows: {len(reference)}")
    print("Saved scores, synthetic experiment and model under outputs/.")
    print("Reminder: synthetic-fault metrics do not establish real aircraft fault-detection performance.")

if __name__ == "__main__":
    main()
