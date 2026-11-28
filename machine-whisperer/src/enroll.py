import argparse
from pathlib import Path
import joblib
import numpy as np
import sounddevice as sd
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import RobustScaler

from src.features import array_to_features

LOG_COLS = [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
WINDOWS_PER_CHUNK = 3  # 3 sliding 1s windows (0.5s hop) = 2.0s live chunk


def enroll_machine(name: str, seconds: int = 60, sr: int = 16000, angle_deg: float = 0.0):
    print(f"Enrolling '{name}' (angle={angle_deg:+.1f} deg)...")
    print(f"Recording {seconds} seconds of NORMAL sound at {sr} Hz. Keep the machine running steadily...")

    audio = sd.rec(int(seconds * sr), samplerate=sr, channels=1, dtype="float32")
    sd.wait()
    y = audio[:, 0]
    print("Recording complete. Extracting features...")

    # Extract 1s sliding windows (0.5s hop) across the entire recording
    feats = array_to_features(y, sr=sr)
    if len(feats) < WINDOWS_PER_CHUNK + 5:
        raise ValueError("Recording too short. Record at least 10 seconds.")

    # Log-transform energy columns
    X_log = feats.copy()
    X_log[:, LOG_COLS] = np.log(np.maximum(X_log[:, LOG_COLS], 0.0) + 1e-12)

    # Group into overlapping 2-second chunks (3 windows each) to match live inference
    clip_vecs = []
    for i in range(len(X_log) - WINDOWS_PER_CHUNK + 1):
        chunk = X_log[i : i + WINDOWS_PER_CHUNK]
        clip_vecs.append(np.hstack([chunk.mean(axis=0), chunk.std(axis=0)]))
    X_clips = np.vstack(clip_vecs)

    # Fit scaler and LOF novelty detector
    scaler = RobustScaler()
    X_scaled = scaler.fit_transform(X_clips)

    n_neighbors = min(20, len(X_scaled) - 1)
    model = LocalOutlierFactor(n_neighbors=n_neighbors, novelty=True, n_jobs=-1)
    model.fit(X_scaled)

    # Threshold at 99th percentile of normal scores (matches proposal spec)
    scores = -model.decision_function(X_scaled)
    threshold = float(np.percentile(scores, 99))

    out_path = Path(f"models/{name}_lof.joblib")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "machine_name": name,
            "angle_deg": float(angle_deg),
            "model": model,
            "scaler": scaler,
            "threshold": threshold,
            "log_cols": LOG_COLS,
            "windows_per_clip": WINDOWS_PER_CHUNK,
        },
        out_path,
    )
    print(f"Enrolled '{name}' on {len(X_clips)} chunks | threshold={threshold:.4f}")
    print(f"Saved model bundle to {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Enroll a machine from normal sound")
    parser.add_argument("--name", required=True, help="Machine name (e.g., motor_a, room_fan)")
    parser.add_argument("--seconds", type=int, default=60, help="Recording duration in seconds (default: 60)")
    parser.add_argument("--sr", type=int, default=16000, help="Sample rate in Hz (default: 16000)")
    parser.add_argument("--angle", type=float, default=0.0, help="Machine angle in degrees (-90 to +90)")
    args = parser.parse_args()

    enroll_machine(name=args.name, seconds=args.seconds, sr=args.sr, angle_deg=args.angle)