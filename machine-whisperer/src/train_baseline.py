import argparse
from pathlib import Path
import joblib
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import RobustScaler

WINDOWS_PER_CLIP = 19
LOG_COLS = [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]


def clip_to_features(clips: np.ndarray) -> np.ndarray:
    """Log-transform energy columns and compute mean + std across each clip's windows."""
    X_log = clips.copy()
    X_log[..., LOG_COLS] = np.log(np.maximum(X_log[..., LOG_COLS], 0.0) + 1e-12)
    return np.hstack([X_log.mean(axis=1), X_log.std(axis=1)])


def main(machine: str, snr: str = "6", target_id: str = "id_00"):
    data_path = Path(f"data/processed/{snr}_dB_{machine}_{target_id}.npz")
    model_path = Path(f"models/{machine}_{target_id}_lof.joblib")

    data = np.load(data_path)
    X, y = data["X"], data["y"]

    n_clips = len(X) // WINDOWS_PER_CLIP
    X_clips = X[: n_clips * WINDOWS_PER_CLIP].reshape(n_clips, WINDOWS_PER_CLIP, -1)
    y_clips = y[: n_clips * WINDOWS_PER_CLIP].reshape(n_clips, WINDOWS_PER_CLIP)[:, 0]

    X_norm = X_clips[y_clips == 0]
    X_abn = X_clips[y_clips == 1]

    train_clips, val_norm_clips = train_test_split(X_norm, test_size=0.2, random_state=42)

    scaler = RobustScaler()
    X_train_s = scaler.fit_transform(clip_to_features(train_clips))
    X_val_s = scaler.transform(clip_to_features(val_norm_clips))
    X_abn_s = scaler.transform(clip_to_features(X_abn))

    model = LocalOutlierFactor(n_neighbors=20, novelty=True, n_jobs=-1)
    model.fit(X_train_s)

    train_scores = -model.decision_function(X_train_s)
    threshold = float(np.percentile(train_scores, 95))

    X_test_s = np.vstack([X_val_s, X_abn_s])
    y_test = np.concatenate([np.zeros(len(X_val_s), dtype=int), np.ones(len(X_abn_s), dtype=int)])
    test_scores = -model.decision_function(X_test_s)
    y_pred = (test_scores > threshold).astype(int)

    print(f"=== {machine.upper()} ({target_id}, {snr} dB) ===")
    print(f"ROC-AUC: {roc_auc_score(y_test, test_scores):.4f}")
    print(f"Threshold (95th pct): {threshold:.4f}\n")
    print("Confusion Matrix (rows=true, cols=pred [normal, abnormal]):")
    print(confusion_matrix(y_test, y_pred))
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["normal", "abnormal"]))

    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "scaler": scaler,
            "threshold": threshold,
            "log_cols": LOG_COLS,
            "windows_per_clip": WINDOWS_PER_CLIP,
        },
        model_path,
    )
    print(f"Saved model bundle to {model_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--machine", default="pump", choices=["fan", "pump", "slider", "valve"])
    parser.add_argument("--snr", default="6", choices=["-6", "0", "6"])
    parser.add_argument("--id", default="id_00")
    args = parser.parse_args()
    main(machine=args.machine, snr=args.snr, target_id=args.id)