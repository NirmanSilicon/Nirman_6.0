from collections import deque
from math import gcd
from pathlib import Path
import joblib
import numpy as np
from scipy.signal import resample_poly

from src.features import array_to_features, is_speech_like

TARGET_SR = 16000

# Feature indices from src/features.py:
# 0:rms, 1:crest, 2:kurt, 3:flatness, 4:centroid,
# 5:b1, 6:b2, 7:b3, 8:b4(4-12kHz), 9:h1, 10:h2, 11:h3, 12:h2/h1, 13:h3/h1, 14:env_peak


def _ensure_16k(y: np.ndarray, sr: int) -> tuple[np.ndarray, int]:
    """Resample audio to 16 kHz if needed so spectral bands match the model bundle."""
    arr = np.asarray(y, dtype=np.float32).reshape(-1)
    if arr.size == 0 or sr == TARGET_SR:
        return arr, sr
    divisor = gcd(int(sr), TARGET_SR)
    up = TARGET_SR // divisor
    down = int(sr) // divisor
    resampled = resample_poly(arr, up, down).astype(np.float32)
    return resampled, TARGET_SR


def compute_health(score: float, threshold: float) -> int:
    """Map anomaly score to a 0-100 health score (70-100 normal, <70 abnormal)."""
    diff = score - threshold
    if diff <= 0:
        health = 70.0 + 30.0 * (1.0 - np.exp(3.0 * diff))
    else:
        health = 70.0 * np.exp(-1.5 * diff)
    return int(np.clip(round(health), 0, 100))


def classify_fault(z_means: np.ndarray) -> str:
    """Physics-based fault typing using normal-referenced feature deviations."""
    scores = {
        "imbalance": float(z_means[9]),  # 1x harmonic rise
        "misalignment": float(0.5 * (z_means[12] + z_means[13])),  # 2x/1x & 3x/1x ratios
        "bearing_wear": float((z_means[14] + z_means[2] + z_means[1] + z_means[8]) / 4.0),  # env, kurt, crest, 4-12kHz
        "cavitation": float((z_means[8] + z_means[3] + z_means[2]) / 3.0),  # 4-12kHz, flatness, kurt
    }
    best_fault, best_val = max(scores.items(), key=lambda kv: kv[1])
    return best_fault if best_val > 1.0 else "generic_abnormal"


class Debouncer:
    """Fires an alarm only when at least `trigger` of the last `window` clips are abnormal."""

    def __init__(self, window: int = 5, trigger: int = 3):
        self.history = deque(maxlen=window)
        self.trigger = trigger

    def update(self, is_abnormal: bool) -> bool:
        self.history.append(1 if is_abnormal else 0)
        return sum(self.history) >= self.trigger


def score_clip_array(y: np.ndarray, sr: int, bundle: dict) -> float | None:
    """Return anomaly score for a non-speech clip, or None if speech or too short."""
    y_16k, sr_16k = _ensure_16k(y, sr)
    if len(y_16k) == 0 or is_speech_like(y_16k, sr=sr_16k):
        return None

    feats = array_to_features(y_16k, sr=sr_16k, ignore_speech=True)
    if len(feats) == 0:
        return None

    log_cols = bundle["log_cols"]
    X_log = feats.copy()
    X_log[:, log_cols] = np.log(np.maximum(X_log[:, log_cols], 0.0) + 1e-12)

    clip_vec = np.hstack([X_log.mean(axis=0), X_log.std(axis=0)]).reshape(1, -1)
    clip_s = bundle["scaler"].transform(clip_vec)
    return float(-bundle["model"].decision_function(clip_s)[0])


def calibrate_threshold(
    normal_audio_list: list[tuple[np.ndarray, int]],
    abnormal_audio_list: list[tuple[np.ndarray, int]],
    bundle: dict,
    fallback_threshold: float = 2.0,
) -> float:
    """Compute a threshold separating normal scores from abnormal/damaged scores."""
    normal_scores = [
        s for y, sr in normal_audio_list if (s := score_clip_array(y, sr, bundle)) is not None
    ]
    abnormal_scores = [
        s for y, sr in abnormal_audio_list if (s := score_clip_array(y, sr, bundle)) is not None
    ]

    if normal_scores and abnormal_scores:
        max_norm = max(normal_scores)
        min_abn = min(abnormal_scores)
        if min_abn > max_norm:
            return float(0.5 * (max_norm + min_abn))
        return float(np.percentile(normal_scores, 95) + 0.5)
    if normal_scores:
        return float(np.percentile(normal_scores, 95) + 0.5)
    if abnormal_scores:
        return float(max(0.5, min(abnormal_scores) * 0.75))
    return float(fallback_threshold)


def save_calibrated_threshold(
    model_path: str,
    normal_audio_list: list[tuple[np.ndarray, int]],
    abnormal_audio_list: list[tuple[np.ndarray, int]],
    out_path: str | None = None,
) -> dict:
    """Load a model bundle, calibrate threshold against normal & damaged clips, and save."""
    bundle = joblib.load(model_path)
    new_thresh = calibrate_threshold(normal_audio_list, abnormal_audio_list, bundle)
    bundle["threshold"] = new_thresh
    target = Path(out_path) if out_path else Path(model_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, target)
    return bundle


def analyze_audio(y: np.ndarray, sr: int, bundle: dict) -> dict:
    """Run feature extraction, LOF anomaly scoring, health score, and physics fault typing."""
    threshold = float(bundle["threshold"])
    y_16k, sr_16k = _ensure_16k(y, sr)

    # Block human-speech chunks before anomaly scoring so voices do not trigger alarms
    if len(y_16k) > 0 and is_speech_like(y_16k, sr=sr_16k):
        return {
            "score": 0.0,
            "threshold": threshold,
            "is_abnormal": False,
            "is_voice": True,
            "health": 100,
            "fault": "voice_ignored",
        }

    feats = array_to_features(y_16k, sr=sr_16k, ignore_speech=True)
    if len(feats) == 0:
        raise ValueError("Audio clip is too short or consisted entirely of filtered speech.")

    log_cols = bundle["log_cols"]
    X_log = feats.copy()
    X_log[:, log_cols] = np.log(np.maximum(X_log[:, log_cols], 0.0) + 1e-12)

    clip_vec = np.hstack([X_log.mean(axis=0), X_log.std(axis=0)]).reshape(1, -1)
    clip_s = bundle["scaler"].transform(clip_vec)

    score = float(-bundle["model"].decision_function(clip_s)[0])
    is_abnormal = score > threshold
    health = compute_health(score, threshold)
    fault = classify_fault(clip_s[0, :15]) if is_abnormal else "normal"

    return {
        "score": score,
        "threshold": threshold,
        "is_abnormal": is_abnormal,
        "is_voice": False,
        "health": health,
        "fault": fault,
    }