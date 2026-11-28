from pathlib import Path
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.metrics import confusion_matrix, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import RobustScaler, StandardScaler
from sklearn.svm import OneClassSVM

DATA_PATH = Path("data/processed/6_dB_fan_id_00.npz")
WINDOWS_PER_CLIP = 19

# Positive, right-skewed energy/amplitude columns (excludes kurtosis at index 2)
LOG_COLS = [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]


def log_transform(X: np.ndarray) -> np.ndarray:
    X_out = X.copy()
    X_out[..., LOG_COLS] = np.log(np.maximum(X_out[..., LOG_COLS], 0.0) + 1e-12)
    return X_out


def evaluate(name: str, train_scores: np.ndarray, val_norm_scores: np.ndarray, abn_scores: np.ndarray):
    y_test = np.concatenate([np.zeros(len(val_norm_scores), dtype=int), np.ones(len(abn_scores), dtype=int)])
    test_scores = np.concatenate([val_norm_scores, abn_scores])
    auc = roc_auc_score(y_test, test_scores)

    thresh = float(np.percentile(train_scores, 95))
    y_pred = (test_scores > thresh).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()

    print(
        f"{name:<34} | AUC: {auc:.4f} | "
        f"Norm@95%: {tn/(tn+fp):6.2%} | Abn@95%: {tp/(tp+fn):6.2%} | FA: {fp}/{tn+fp}"
    )


def main():
    data = np.load(DATA_PATH)
    X, y = data["X"], data["y"]

    n_clips = len(X) // WINDOWS_PER_CLIP
    X_clips = X[: n_clips * WINDOWS_PER_CLIP].reshape(n_clips, WINDOWS_PER_CLIP, -1)
    y_clips = y[: n_clips * WINDOWS_PER_CLIP].reshape(n_clips, WINDOWS_PER_CLIP)[:, 0]

    X_clips = log_transform(X_clips)

    X_norm = X_clips[y_clips == 0]
    X_abn = X_clips[y_clips == 1]
    train_clips, val_norm_clips = train_test_split(X_norm, test_size=0.2, random_state=42)

    print("=== Approach A: Window-level models (averaged per 10s clip) ===")
    scaler_w = StandardScaler()
    X_tr_w = scaler_w.fit_transform(train_clips.reshape(-1, X_clips.shape[-1]))

    window_models = [
        ("IForest (log, window)", IsolationForest(n_estimators=300, random_state=42, n_jobs=-1)),
        ("LOF (log, window)", LocalOutlierFactor(n_neighbors=35, novelty=True, n_jobs=-1)),
        ("OneClassSVM (log, window)", OneClassSVM(kernel="rbf", nu=0.05, gamma="scale")),
    ]

    for name, clf in window_models:
        clf.fit(X_tr_w)

        def score_clips(clips):
            flat = scaler_w.transform(clips.reshape(-1, clips.shape[-1]))
            return -clf.decision_function(flat).reshape(len(clips), WINDOWS_PER_CLIP).mean(axis=1)

        evaluate(name, score_clips(train_clips), score_clips(val_norm_clips), score_clips(X_abn))

    print("\n=== Approach B: Clip-summary features (mean + std across 19 windows = 30 features) ===")
    def summarize(clips):
        return np.hstack([clips.mean(axis=1), clips.std(axis=1)])

    scaler_c = RobustScaler()
    X_tr_c = scaler_c.fit_transform(summarize(train_clips))
    X_val_c = scaler_c.transform(summarize(val_norm_clips))
    X_abn_c = scaler_c.transform(summarize(X_abn))

    clip_models = [
        ("IForest (log, clip-summary)", IsolationForest(n_estimators=300, random_state=42, n_jobs=-1)),
        ("LOF (log, clip-summary)", LocalOutlierFactor(n_neighbors=20, novelty=True, n_jobs=-1)),
        ("OneClassSVM (log, clip-summary)", OneClassSVM(kernel="rbf", nu=0.05, gamma="scale")),
    ]

    for name, clf in clip_models:
        clf.fit(X_tr_c)
        evaluate(
            name,
            -clf.decision_function(X_tr_c),
            -clf.decision_function(X_val_c),
            -clf.decision_function(X_abn_c),
        )


if __name__ == "__main__":
    main()