"""
Acoustic Monitoring Engine for 2-Machine, 2-Microphone Hackathon Setup.
Tracks Machine 1 (mic 0 / left) and Machine 2 (mic 1 / right) independently.

Features:
- Excludes test_room in 2-mic live mode so room/crowd noise never shows up as a noisy channel.
- Evaluates mic 0 (Machine 1 / fan_id_00) and mic 1 (Machine 2 / pump_id_00) independently with separate Debouncer instances.
- Speech rejection (voice_ignored / is_voice -> health=100, is_abnormal=False, alarm=False).
- Hardware actuation via dashboard.hardware (safe mock on Windows, real GPIO on Raspberry Pi 4):
    - Both motors normal: M1 GREEN, M2 GREEN, Buzzer OFF.
    - Damaged sound on mic 0: M1 RED, M2 stays GREEN, active-low Buzzer (BCM 22) ON upon debounced alarm.
    - Damaged sound on mic 1: M2 RED, M1 stays GREEN, active-low Buzzer (BCM 22) ON upon debounced alarm.
- Direct WAV injection / offline testing from synthetic_broken_wavs and extreme_damaged_wavs.
"""

import argparse
import logging
import sqlite3
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import sounddevice as sd
import soundfile as sf

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dashboard.hardware import hardware
from src.diagnostics import Debouncer, analyze_audio
from src.doa import estimate_doa

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("dashboard.monitor")

DB_PATH = PROJECT_ROOT / "data" / "events.db"


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
    angle_deg: Optional[float] = None,
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


def run_monitor(
    model_paths: Optional[list[Path]] = None,
    channels: int = 2,
    sr: int = 16000,
    clip_sec: float = 2.0,
    test_file: Optional[Path] = None,
    test_mic: int = 0,
):
    """
    Run multi-machine acoustic monitor for 2-mic setup.
    If test_file is provided, evaluates that file directly on test_mic (0 or 1).
    """
    init_db()

    if model_paths is None:
        model_paths = [
            PROJECT_ROOT / "models" / "fan_id_00_lof.joblib",
            PROJECT_ROOT / "models" / "pump_id_00_lof.joblib",
        ]

    # Load machine models, explicitly filtering out test_room
    machines = []
    for path in model_paths:
        if not path.exists():
            logger.warning(f"Model file not found: {path}")
            continue
        stem = path.stem.replace("_lof", "")
        # Remove test_room in 2-mic mode so room noise never appears as a noisy room channel
        if "test_room" in stem.lower():
            logger.info("Excluding test_room in 2-machine, 2-mic hackathon setup.")
            continue

        bundle = joblib.load(path)
        name = bundle.get("machine_name", stem)
        angle = float(bundle.get("angle_deg", 0.0))
        machines.append(
            {
                "id": stem,
                "name": name,
                "angle": angle,
                "bundle": bundle,
                "debouncer": Debouncer(window=5, trigger=3),
                "last_alarm": False,
                "is_abnormal": False,
                "alarm": False,
                "is_voice": False,
            }
        )

    if not machines:
        logger.error("No valid machine models loaded. Exiting.")
        return

    logger.info(f"Loaded {len(machines)} machine(s): {[m['name'] for m in machines]}")
    logger.info(f"Hardware Status: {hardware.get_status()['platform']}")

    # Handle direct WAV file test mode (synthetic_broken_wavs / extreme_damaged_wavs)
    if test_file and test_file.exists():
        logger.info(f"--- Direct WAV Test Mode: {test_file.name} on Mic {test_mic} ---")
        y, file_sr = sf.read(str(test_file), dtype="float32")
        if y.ndim > 1:
            y = y[:, test_mic] if test_mic < y.shape[1] else y[:, 0]

        target_idx = 0 if test_mic == 0 else min(1, len(machines) - 1)
        target_machine = machines[target_idx]

        res = analyze_audio(y[: int(file_sr * clip_sec)], file_sr, target_machine["bundle"])
        is_voice = bool(res.get("is_voice", False)) or (res.get("fault") == "voice_ignored")

        if is_voice:
            target_machine["is_voice"] = True
            target_machine["is_abnormal"] = False
            target_machine["health"] = 100
            target_machine["fault"] = "VOICE_IGNORED"
            target_machine["alarm"] = False
            target_machine["debouncer"].update(False)
        else:
            target_machine["is_voice"] = False
            target_machine["is_abnormal"] = bool(res["is_abnormal"])
            target_machine["health"] = int(res["health"])
            target_machine["fault"] = str(res["fault"]).upper()
            target_machine["score"] = float(res["score"])
            # In direct test, update debouncer multiple times to simulate burst detection
            for _ in range(3):
                target_machine["alarm"] = target_machine["debouncer"].update(target_machine["is_abnormal"])

        # Update independent hardware actuators:
        # Playing damaged clip on mic 0 highlights M1 as RED, keeps M2 GREEN.
        # Playing damaged clip on mic 1 highlights M2 as RED, keeps M1 GREEN.
        m1_obj = machines[0]
        m2_obj = machines[1] if len(machines) > 1 else None

        if target_idx == 0:
            m1_abnormal = m1_obj["is_abnormal"]
            m1_alarm = m1_obj["alarm"]
            m1_voice = m1_obj["is_voice"]
            m2_abnormal = False
            m2_alarm = False
            m2_voice = False
        else:
            m1_abnormal = False
            m1_alarm = False
            m1_voice = False
            m2_abnormal = m2_obj["is_abnormal"] if m2_obj else False
            m2_alarm = m2_obj["alarm"] if m2_obj else False
            m2_voice = m2_obj["is_voice"] if m2_obj else False

        hardware.set_machine_states(
            m1_abnormal=m1_abnormal,
            m1_alarm=m1_alarm,
            m2_abnormal=m2_abnormal,
            m2_alarm=m2_alarm,
            m1_voice=m1_voice,
            m2_voice=m2_voice,
        )

        log_event(
            machine=target_machine["name"],
            health=target_machine["health"],
            fault=target_machine["fault"],
            score=target_machine.get("score", 0.0),
            alarm=target_machine["alarm"],
            angle_deg=target_machine["angle"],
        )

        hw_stat = hardware.get_status()
        logger.info(
            f"Result: [{target_machine['name']}] fault={target_machine['fault']} | "
            f"health={target_machine['health']} | abnormal={target_machine['is_abnormal']} | "
            f"alarm={target_machine['alarm']}"
        )
        logger.info(
            f"Hardware State: M1(Mic 0)={hw_stat['machine_1']['indicator']} (Pin 29/31), "
            f"M2(Mic 1)={hw_stat['machine_2']['indicator']} (Pin 11/13), "
            f"Buzzer={hw_stat['buzzer']['state']} (Pin 15 active-low)"
        )
        return

    # Live microphone monitoring loop
    logger.info(
        f"Monitoring Live I2S Microphones ({channels}ch, {sr} Hz, {clip_sec}s chunks). "
        f"Mic 0 -> Machine 1 ({machines[0]['name']}), "
        f"Mic 1 -> Machine 2 ({machines[1]['name'] if len(machines) > 1 else 'None'}). "
        f"Press Ctrl+C to stop.\n"
    )

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

            if audio.ndim == 1:
                mic_0 = audio
                mic_1 = audio
            else:
                mic_0 = audio[:, 0]
                mic_1 = audio[:, 1] if audio.shape[1] >= 2 else audio[:, 0]

            dominant_angle = None
            if channels >= 2 and audio.ndim > 1 and audio.shape[1] >= 2:
                try:
                    dominant_angle, _ = estimate_doa(mic_0, mic_1, sr=sr)
                except Exception as e:
                    logger.debug(f"DOA error: {e}")

            # Evaluate Machine 1 (mic 0) and Machine 2 (mic 1) independently
            channel_map = {0: mic_0, 1: mic_1}

            for idx, m in enumerate(machines[:2]):
                sig = channel_map.get(idx, mic_0)
                res = analyze_audio(sig, sr, m["bundle"])
                is_voice = bool(res.get("is_voice", False)) or (res.get("fault") == "voice_ignored")

                if is_voice:
                    m["is_voice"] = True
                    m["is_abnormal"] = False
                    m["health"] = 100
                    m["fault"] = "VOICE_IGNORED"
                    m["score"] = 0.0
                    m["alarm"] = m["debouncer"].update(False)
                else:
                    m["is_voice"] = False
                    is_abnormal = bool(res["is_abnormal"])
                    m["is_abnormal"] = is_abnormal
                    m["health"] = int(res["health"])
                    m["fault"] = str(res["fault"]).upper()
                    m["score"] = float(res["score"])
                    m["alarm"] = m["debouncer"].update(is_abnormal)

                status_str = "ALARM!" if m["alarm"] else ("VOICE " if m["is_voice"] else "OK    ")
                logger.info(
                    f"[Clip {clip_num:03d} | Mic {idx}] {m['name']:<14} | {status_str} | "
                    f"health={m['health']:3d}/100 | fault={m['fault']:<14} | score={m['score']:.4f}"
                )

                if m["alarm"] != m["last_alarm"]:
                    m["last_alarm"] = m["alarm"]
                    if m["alarm"]:
                        log_event(
                            machine=m["name"],
                            health=m["health"],
                            fault=m["fault"],
                            score=m["score"],
                            alarm=True,
                            angle_deg=dominant_angle if dominant_angle is not None else m["angle"],
                        )

            # Update independent hardware actuators
            m1_obj = machines[0]
            m2_obj = machines[1] if len(machines) > 1 else None

            hardware.set_machine_states(
                m1_abnormal=m1_obj["is_abnormal"],
                m1_alarm=m1_obj["alarm"],
                m2_abnormal=m2_obj["is_abnormal"] if m2_obj else False,
                m2_alarm=m2_obj["alarm"] if m2_obj else False,
                m1_voice=m1_obj["is_voice"],
                m2_voice=m2_obj["is_voice"] if m2_obj else False,
            )

            clip_num += 1
    except KeyboardInterrupt:
        logger.info("\nStopping acoustic monitor...")
    finally:
        # Reset to nominal state
        hardware.set_machine_states(
            m1_abnormal=False, m1_alarm=False,
            m2_abnormal=False, m2_alarm=False,
        )
        logger.info("Acoustic monitor stopped. Hardware nominal.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="2-Machine, 2-Microphone Acoustic Monitor")
    parser.add_argument(
        "--models",
        nargs="+",
        type=Path,
        default=[
            PROJECT_ROOT / "models" / "fan_id_00_lof.joblib",
            PROJECT_ROOT / "models" / "pump_id_00_lof.joblib",
        ],
        help="Model bundles to monitor",
    )
    parser.add_argument("--channels", type=int, default=2, choices=[1, 2], help="2 for dual I2S mic array")
    parser.add_argument("--sr", type=int, default=16000, help="Sample rate in Hz")
    parser.add_argument("--seconds", type=float, default=2.0, help="Chunk duration in seconds")
    parser.add_argument("--test-file", type=Path, default=None, help="Direct WAV file to test on mic 0 or 1")
    parser.add_argument("--mic", type=int, default=0, choices=[0, 1], help="Target mic for --test-file (0 or 1)")
    args = parser.parse_args()

    run_monitor(
        model_paths=args.models,
        channels=args.channels,
        sr=args.sr,
        clip_sec=args.seconds,
        test_file=args.test_file,
        test_mic=args.mic,
    )
