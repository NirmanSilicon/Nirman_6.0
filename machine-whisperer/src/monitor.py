import argparse
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
import joblib
import numpy as np
import sounddevice as sd

from src.alerts import AlertController
from src.diagnostics import Debouncer, analyze_audio
from src.doa import delay_and_sum, estimate_doa

DB_PATH = Path("data/events.db")


def init_db(db_path: Path = DB_PATH):
    """Create the SQLite events table if it doesn't exist."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                machine TEXT NOT NULL,
                health INTEGER NOT NULL,
                fault TEXT NOT NULL,
                score REAL NOT NULL,
                angle_deg REAL,
                alarm INTEGER NOT NULL
            )
            """
        )
        conn.commit()


def log_event(
    machine: str,
    health: int,
    fault: str,
    score: float,
    alarm: bool,
    angle_deg: float | None = None,
    db_path: Path = DB_PATH,
):
    """Insert a diagnostic reading or alarm into SQLite."""
    ts = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO events (timestamp, machine, health, fault, score, angle_deg, alarm)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (ts, machine, health, fault, score, angle_deg, int(alarm)),
        )
        conn.commit()


def run_monitor(model_paths: list[Path], channels: int = 1, sr: int = 16000, clip_sec: float = 2.0):
    init_db()
    alerts = AlertController()

    machines = []
    for path in model_paths:
        if "test_room" in str(path).lower():
            # Exclude test_room in 2-machine, 2-mic hackathon setup
            continue
        bundle = joblib.load(path)
        name = bundle.get("machine_name", path.stem.replace("_lof", ""))
        angle = float(bundle.get("angle_deg", 0.0))
        machines.append(
            {
                "name": name,
                "angle": angle,
                "bundle": bundle,
                "debouncer": Debouncer(window=5, trigger=3),
                "last_alarm": False,
            }
        )

    print(f"Loaded {len(machines)} machine(s): {[m['name'] for m in machines]}")
    print(f"Monitoring ({channels}ch, {sr} Hz, {clip_sec}s chunks). Logging alarms to {DB_PATH}. Press Ctrl+C to stop.\n")

    try:
        clip_num = 1
        while True:
            audio = sd.rec(
                int(clip_sec * sr),
                samplerate=sr,
                channels=channels,
                dtype="float32",
            )
            sd.wait()

            dominant_angle = None
            if channels >= 2:
                dominant_angle, _ = estimate_doa(audio[:, 0], audio[:, 1], sr=sr)

            print(
                f"--- Clip {clip_num:03d}"
                + (f" | Dominant DOA: {dominant_angle:+.1f} deg" if dominant_angle is not None else "")
                + " ---"
            )
            for idx, m in enumerate(machines):
                # Dual-mic hackathon setup: mic 0 -> Machine 1, mic 1 -> Machine 2
                if channels >= 2 and idx == 1 and audio.shape[1] >= 2:
                    sig = audio[:, 1]
                else:
                    sig = audio[:, 0]

                res = analyze_audio(sig, sr, m["bundle"])
                is_voice = bool(res.get("is_voice", False)) or (res.get("fault") == "voice_ignored")

                if is_voice:
                    # Voice rejection active: suppress false alarms
                    alarm = m["debouncer"].update(False)
                    status = "VOICE "
                    health = 100
                    fault_name = "voice_ignored"
                    score_val = 0.0
                else:
                    alarm = m["debouncer"].update(res["is_abnormal"])
                    status = "ALARM!" if alarm else "OK    "
                    health = res["health"]
                    fault_name = res["fault"]
                    score_val = res["score"]

                print(
                    f"  [{m['name']:<12}] {status} | health={health:3d}/100 | "
                    f"fault={fault_name:<16} | score={score_val:.4f}"
                )

                if alarm != m["last_alarm"]:
                    alerts.set_alarm(m["name"], alarm)
                    m["last_alarm"] = alarm

                if alarm:
                    log_event(
                        machine=m["name"],
                        health=res["health"],
                        fault=res["fault"],
                        score=res["score"],
                        alarm=True,
                        angle_deg=dominant_angle if dominant_angle is not None else m["angle"],
                    )

            clip_num += 1
    except KeyboardInterrupt:
        print("\nStopped multi-machine monitor.")
    finally:
        alerts.cleanup()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Multi-machine acoustic monitor + SQLite logger")
    parser.add_argument(
        "--models",
        nargs="+",
        type=Path,
        default=[Path("models/fan_id_00_lof.joblib"), Path("models/pump_id_00_lof.joblib")],
        help="List of .joblib model bundles to monitor",
    )
    parser.add_argument("--channels", type=int, default=1, choices=[1, 2], help="1 for laptop mic, 2 for Pi I2S array")
    parser.add_argument("--sr", type=int, default=16000, help="Sample rate in Hz (16000 for MIMII, 48000 for Pi I2S)")
    parser.add_argument("--seconds", type=float, default=2.0, help="Chunk duration in seconds")
    args = parser.parse_args()

    run_monitor(model_paths=args.models, channels=args.channels, sr=args.sr, clip_sec=args.seconds)