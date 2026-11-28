from collections import deque
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import sqlite3
import threading
import time

from flask import Flask, jsonify, render_template, request
import joblib
import numpy as np

# Project root is parent of dashboard directory
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "events.db"
MODELS_DIR = BASE_DIR / "models"
RAW_DATA_DIR = BASE_DIR / "data" / "raw"
TEMPLATE_DIR = Path(__file__).resolve().parent / "templates"
STATIC_DIR = Path(__file__).resolve().parent / "static"

# Re-use existing core modules & hardware controller
from dashboard.hardware import RPiHardwareController
from src.alerts import AlertController
from src.diagnostics import Debouncer, analyze_audio, calibrate_threshold
from src.doa import delay_and_sum, estimate_doa
from src.features import load_wav
from src.monitor import init_db, log_event

logger = logging.getLogger("machine_whisperer_dashboard")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

app = Flask(
    __name__,
    template_folder=str(TEMPLATE_DIR),
    static_folder=str(STATIC_DIR),
    static_url_path="/static",
)
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

# Global runtime state
state_lock = threading.Lock()
stop_event = threading.Event()

current_mode = "demo"  # default to demo so dashboard is immediately interactive
active_channels = 2    # default to 2-channel stereo for dual INMP441 I2S mics
sample_rate = 16000
clip_seconds = 2.0
latest_doa: float | None = None
latest_spectrum: list[float] = [0.0] * 32

# Raspberry Pi 4 Hardware Controller (auto-mocks on Windows)
hardware = RPiHardwareController()
alerts = hardware  # backward-compatible alias

# Default machine angles if not embedded in model bundle
DEFAULT_ANGLES = {
    "fan_id_00": -45.0,
    "test_room": -30.0,
    "pump_id_00": 45.0,
}

machines: list[dict] = []


def discover_and_load_models():
    """Discover all *_lof.joblib models in models/ and initialize runtime state."""
    global machines
    machines = []
    model_paths = sorted(MODELS_DIR.glob("*_lof.joblib"))
    if not model_paths:
        logger.warning(f"No *_lof.joblib models found in {MODELS_DIR}")
        return

    for path in model_paths:
        try:
            bundle = joblib.load(path)
            machine_name = bundle.get("machine_name", path.stem.replace("_lof", ""))
            stored_angle = bundle.get("angle_deg")
            angle = float(stored_angle if stored_angle is not None else DEFAULT_ANGLES.get(machine_name, 0.0))
            threshold = float(bundle.get("threshold", 0.0))

            machines.append(
                {
                    "id": machine_name,
                    "name": machine_name,
                    "path": str(path.relative_to(BASE_DIR)),
                    "angle": angle,
                    "bundle": bundle,
                    "threshold": threshold,
                    "debouncer": Debouncer(window=5, trigger=3),
                    "last_alarm": False,
                    "health": 97,
                    "fault": "NORMAL",
                    "score": round(threshold - 0.35, 4),
                    "is_abnormal": False,
                    "is_voice": False,
                    "alarm": False,
                    "demo_fault": "normal",
                    "live_doa": angle,
                }
            )
            logger.info(f"Loaded machine model '{machine_name}' (angle={angle:+.1f} deg, thresh={threshold:.4f})")
        except Exception as e:
            logger.error(f"Failed to load model {path}: {e}")


def compute_spectrum_bins(audio_1d: np.ndarray, num_bins: int = 32) -> list[float]:
    """Compute 32-bin log-scaled normalized FFT spectrum from 1D audio."""
    if len(audio_1d) < 256:
        return [0.0] * num_bins

    # Real FFT
    fft_vals = np.abs(np.fft.rfft(audio_1d))
    n_freqs = len(fft_vals)
    if n_freqs <= num_bins:
        return [0.0] * num_bins

    # 32 log-spaced bin edges from 20 Hz to Nyquist
    edges = np.logspace(np.log10(1), np.log10(n_freqs - 1), num_bins + 1).astype(int)
    edges = np.maximum.accumulate(edges)

    raw_bins = []
    for i in range(num_bins):
        s_idx = edges[i]
        e_idx = max(edges[i + 1], s_idx + 1)
        raw_bins.append(float(np.mean(fft_vals[s_idx:e_idx])))

    max_val = max(raw_bins) if raw_bins else 1e-6
    if max_val > 1e-6:
        # Scale logarithmically to [0.0, 1.0]
        norm = [
            float(np.clip((20 * np.log10(b / max_val + 1e-9) + 60.0) / 60.0, 0.0, 1.0))
            for b in raw_bins
        ]
    else:
        norm = [0.0] * num_bins
    return norm


def generate_simulated_spectrum(active_fault: str | None = None) -> list[float]:
    """Generate realistic fluctuating 32-bin industrial acoustic spectrum."""
    freq_decay = np.linspace(0.68, 0.12, 32)
    rumble = np.array([0.15, 0.22, 0.18, 0.12] + [0.0] * 28)
    jitter = np.random.uniform(-0.025, 0.025, size=32)
    spectrum = freq_decay + rumble + jitter

    # Fault-specific spectral signatures
    if active_fault == "imbalance":
        spectrum[2] += 0.38
        spectrum[3] += 0.32
    elif active_fault == "misalignment":
        spectrum[4] += 0.32
        spectrum[6] += 0.28
        spectrum[8] += 0.22
    elif active_fault == "bearing_wear":
        for b in range(20, 31):
            spectrum[b] += np.random.uniform(0.20, 0.42)
    elif active_fault == "cavitation":
        spectrum[12:28] += np.random.uniform(0.18, 0.32, size=16)
    elif active_fault == "voice_ignored":
        # Speech formants in vowel/voice bands (300Hz, 800Hz, 2.5kHz)
        spectrum[6] += 0.28
        spectrum[11] += 0.34
        spectrum[19] += 0.24

    return [float(np.clip(val, 0.03, 1.0)) for val in spectrum]


def run_live_tick():
    """Acquire 2-second clip from dual I2S microphones and evaluate all machines."""
    global latest_doa, latest_spectrum, active_channels
    import sounddevice as sd

    try:
        audio = sd.rec(
            int(clip_seconds * sample_rate),
            samplerate=sample_rate,
            channels=active_channels,
            dtype="float32",
        )
        sd.wait()
    except Exception as e:
        logger.warning(f"Live microphone capture failed: {e}. Waiting before retry...")
        time.sleep(1.0)
        return

    # Extract 2 channels for dual I2S microphones:
    # mic 0 (channel 0) -> Machine 1 (Left / fan_id_00)
    # mic 1 (channel 1) -> Machine 2 (Right / pump_id_00)
    if audio.ndim == 1:
        mic_0 = audio
        mic_1 = audio
    else:
        mic_0 = audio[:, 0]
        mic_1 = audio[:, 1] if audio.shape[1] >= 2 else audio[:, 0]

    dominant_angle = None
    if active_channels >= 2 and audio.ndim > 1 and audio.shape[1] >= 2:
        try:
            dominant_angle, _ = estimate_doa(mic_0, mic_1, sr=sample_rate)
        except Exception as e:
            logger.warning(f"DOA estimation error: {e}")

    spectrum_bins = compute_spectrum_bins(mic_0, num_bins=32)

    with state_lock:
        latest_doa = dominant_angle
        latest_spectrum = spectrum_bins

        # Exclude test_room during live mic mode: dual-mic hackathon setup only tracks 2 machines
        live_machines = [m for m in machines if m["id"] != "test_room"]

        m1_obj = next((m for m in live_machines if m["id"] == "fan_id_00"), live_machines[0] if live_machines else None)
        m2_obj = next((m for m in live_machines if m["id"] == "pump_id_00"), live_machines[1] if len(live_machines) > 1 else None)

        channel_map = {}
        if m1_obj:
            channel_map[m1_obj["id"]] = mic_0
        if m2_obj:
            channel_map[m2_obj["id"]] = mic_1

        for m in live_machines:
            sig = channel_map.get(m["id"], mic_0)
            try:
                res = analyze_audio(sig, sample_rate, m["bundle"])
                is_voice = bool(res.get("is_voice", False)) or (res.get("fault") == "voice_ignored")

                if is_voice:
                    # Speech rejection: Prevent false positive alarms!
                    m["is_voice"] = True
                    m["is_abnormal"] = False
                    m["health"] = 100
                    m["fault"] = "VOICE_IGNORED"
                    m["score"] = 0.0
                    alarm = m["debouncer"].update(False)
                    m["alarm"] = bool(alarm)
                    m["live_doa"] = dominant_angle if dominant_angle is not None else m["angle"]

                    # Log speech filtered reading in SQLite
                    log_event(
                        machine=m["name"],
                        health=100,
                        fault="VOICE_IGNORED",
                        score=0.0,
                        alarm=False,
                        angle_deg=m["live_doa"],
                        db_path=DB_PATH,
                    )
                else:
                    m["is_voice"] = False
                    is_abnormal = bool(res["is_abnormal"])
                    alarm = m["debouncer"].update(is_abnormal)

                    m["health"] = int(res["health"])
                    m["fault"] = str(res["fault"]).upper()
                    m["score"] = float(res["score"])
                    m["is_abnormal"] = is_abnormal
                    m["alarm"] = bool(alarm)
                    m["live_doa"] = dominant_angle if dominant_angle is not None else m["angle"]

                    if alarm != m["last_alarm"]:
                        m["last_alarm"] = alarm
                        if alarm:
                            log_event(
                                machine=m["name"],
                                health=m["health"],
                                fault=m["fault"],
                                score=m["score"],
                                alarm=True,
                                angle_deg=m["live_doa"],
                                db_path=DB_PATH,
                            )
            except Exception as e:
                logger.error(f"Inference error on machine {m['name']}: {e}")

        # Update independent hardware actuators:
        # Machine 1 (Left / Mic 0) & Machine 2 (Right / Mic 1)
        m1_abnormal = bool(m1_obj["is_abnormal"]) if m1_obj else False
        m1_alarm = bool(m1_obj["alarm"]) if m1_obj else False
        m1_voice = bool(m1_obj.get("is_voice", False)) if m1_obj else False

        m2_abnormal = bool(m2_obj["is_abnormal"]) if m2_obj else False
        m2_alarm = bool(m2_obj["alarm"]) if m2_obj else False
        m2_voice = bool(m2_obj.get("is_voice", False)) if m2_obj else False

        hardware.set_machine_states(
            m1_abnormal=m1_abnormal,
            m1_alarm=m1_alarm,
            m2_abnormal=m2_abnormal,
            m2_alarm=m2_alarm,
            m1_voice=m1_voice,
            m2_voice=m2_voice,
        )


def run_demo_tick():
    """Generate simulated realistic industrial telemetry for all machines."""
    global latest_doa, latest_spectrum

    time.sleep(1.0)

    active_fault_seen = None
    any_abnormal = False
    any_voice = False

    with state_lock:
        for m in machines:
            target_fault = m.get("demo_fault", "normal")
            thresh = m["threshold"]

            if target_fault == "normal":
                is_abnormal = False
                is_voice = False
                health = int(np.clip(np.random.normal(96.5, 1.2), 91, 100))
                score = float(thresh - np.random.uniform(0.28, 0.42))
                fault = "NORMAL"
                doa = float(m["angle"] + np.random.normal(0, 0.4))
            elif target_fault == "voice_ignored":
                # Speech rejection filter simulated
                is_abnormal = False
                is_voice = True
                health = 100
                score = 0.0
                fault = "VOICE_IGNORED"
                doa = float(m["angle"] + np.random.normal(0, 0.4))
                active_fault_seen = "voice_ignored"
                any_voice = True
            elif target_fault == "imbalance":
                is_abnormal = True
                is_voice = False
                health = int(np.clip(np.random.normal(38.0, 2.5), 18, 52))
                score = float(thresh + np.random.uniform(1.8, 2.5))
                fault = "IMBALANCE"
                doa = float(m["angle"] + np.random.normal(0, 0.6))
                active_fault_seen = "imbalance"
            elif target_fault == "misalignment":
                is_abnormal = True
                is_voice = False
                health = int(np.clip(np.random.normal(42.0, 2.8), 22, 56))
                score = float(thresh + np.random.uniform(1.4, 2.1))
                fault = "MISALIGNMENT"
                doa = float(m["angle"] + np.random.normal(0, 0.6))
                active_fault_seen = "misalignment"
            elif target_fault == "bearing_wear":
                is_abnormal = True
                is_voice = False
                health = int(np.clip(np.random.normal(26.0, 3.2), 12, 44))
                score = float(thresh + np.random.uniform(2.6, 3.8))
                fault = "BEARING_WEAR"
                doa = float(m["angle"] + np.random.normal(0, 0.6))
                active_fault_seen = "bearing_wear"
            elif target_fault == "cavitation":
                is_abnormal = True
                is_voice = False
                health = int(np.clip(np.random.normal(31.0, 3.0), 16, 48))
                score = float(thresh + np.random.uniform(2.2, 3.2))
                fault = "CAVITATION"
                doa = float(m["angle"] + np.random.normal(0, 0.6))
                active_fault_seen = "cavitation"
            else:
                is_abnormal = False
                is_voice = False
                health = 95
                score = thresh - 0.3
                fault = "NORMAL"
                doa = m["angle"]

            if is_abnormal:
                any_abnormal = True

            alarm = m["debouncer"].update(is_abnormal)

            m["health"] = health
            m["fault"] = fault
            m["score"] = round(score, 4)
            m["is_abnormal"] = is_abnormal
            m["is_voice"] = is_voice
            m["alarm"] = bool(alarm)
            m["live_doa"] = round(doa, 1)

            # Log active alarms or speech filtering
            if alarm != m["last_alarm"]:
                m["last_alarm"] = alarm
                if alarm:
                    log_event(
                        machine=m["name"],
                        health=m["health"],
                        fault=m["fault"],
                        score=m["score"],
                        alarm=True,
                        angle_deg=m["live_doa"],
                        db_path=DB_PATH,
                    )
            elif is_voice and m.get("demo_fault_logged") != "voice_ignored":
                m["demo_fault_logged"] = "voice_ignored"
                log_event(
                    machine=m["name"],
                    health=100,
                    fault="VOICE_IGNORED",
                    score=0.0,
                    alarm=False,
                    angle_deg=m["live_doa"],
                    db_path=DB_PATH,
                )
            elif not is_voice:
                m["demo_fault_logged"] = None

        # Drive independent Raspberry Pi status LEDs & Active-Low Buzzer:
        # Machine 1 (Left / Mic 0) & Machine 2 (Right / Mic 1)
        m1_obj = next((m for m in machines if m["id"] == "fan_id_00"), machines[0] if machines else None)
        m2_obj = next((m for m in machines if m["id"] == "pump_id_00"), machines[1] if len(machines) > 1 else None)

        m1_abnormal = bool(m1_obj["is_abnormal"]) if m1_obj else False
        m1_alarm = bool(m1_obj["alarm"]) if m1_obj else False
        m1_voice = bool(m1_obj.get("is_voice", False)) if m1_obj else False

        m2_abnormal = bool(m2_obj["is_abnormal"]) if m2_obj else False
        m2_alarm = bool(m2_obj["alarm"]) if m2_obj else False
        m2_voice = bool(m2_obj.get("is_voice", False)) if m2_obj else False

        hardware.set_machine_states(
            m1_abnormal=m1_abnormal,
            m1_alarm=m1_alarm,
            m2_abnormal=m2_abnormal,
            m2_alarm=m2_alarm,
            m1_voice=m1_voice,
            m2_voice=m2_voice,
        )

        # Update global spectrum and dominant DOA
        latest_spectrum = generate_simulated_spectrum(active_fault_seen)

        alarmed_machines = [m for m in machines if m["alarm"] or m["is_abnormal"]]
        if alarmed_machines:
            latest_doa = alarmed_machines[0]["live_doa"]
        elif machines:
            latest_doa = float(machines[0]["angle"] + np.random.normal(0, 0.5))


def background_telemetry_loop():
    """Background daemon thread running live or demo telemetry."""
    logger.info("Starting background telemetry worker thread...")
    while not stop_event.is_set():
        try:
            if current_mode == "live":
                run_live_tick()
            else:
                run_demo_tick()
        except Exception as e:
            logger.error(f"Error in telemetry loop: {e}", exc_info=True)
            time.sleep(1.0)


# ==========================================
# FLASK ROUTES & API
# ==========================================

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status", methods=["GET"])
def get_status():
    """Returns current telemetry status, machines, hardware pinout, spectrum, and DOA."""
    with state_lock:
        machine_status = []
        # Exclude test_room in Live Mic mode so room noise does not show up as a noisy test_room feed
        if current_mode == "live":
            active_machines = [m for m in machines if m["id"] != "test_room"]
        else:
            active_machines = machines

        for m in active_machines:
            raw_hist = list(m["debouncer"].history)
            padded_hist = [False] * (5 - len(raw_hist)) + [bool(x) for x in raw_hist]

            machine_status.append(
                {
                    "id": m["id"],
                    "name": m["name"],
                    "enrolled_angle": m["angle"],
                    "health": m["health"],
                    "fault": m["fault"],
                    "score": m["score"],
                    "threshold": m["threshold"],
                    "is_abnormal": m["is_abnormal"],
                    "is_voice": m.get("is_voice", False),
                    "alarm": m["alarm"],
                    "debouncer_history": padded_hist,
                    "live_doa": m.get("live_doa"),
                    "demo_fault": m.get("demo_fault", "normal"),
                }
            )

        response = {
            "mode": current_mode,
            "channels": active_channels,
            "sample_rate": sample_rate,
            "live_doa": latest_doa,
            "spectrum": latest_spectrum,
            "machines": machine_status,
            "hardware": hardware.get_status(),
        }
    return jsonify(response)


@app.route("/api/events", methods=["GET"])
def get_events():
    """Return 25 most recent alarm and speech rejection rows from SQLite."""
    init_db(DB_PATH)
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                """
                SELECT id, timestamp, machine, health, fault, score, angle_deg, alarm
                FROM events
                ORDER BY id DESC
                LIMIT 25
                """
            ).fetchall()
            return jsonify([dict(r) for r in rows])
    except Exception as e:
        logger.error(f"Failed to query events: {e}")
        return jsonify([])


@app.route("/api/mode", methods=["POST"])
def set_mode():
    """Toggle or set mode between 'live' and 'demo', and channels between 1 and 2."""
    global current_mode, active_channels
    data = request.get_json(silent=True) or {}
    req_mode = data.get("mode")

    with state_lock:
        if req_mode in ("live", "demo"):
            current_mode = req_mode
        else:
            current_mode = "demo" if current_mode == "live" else "live"

        if "channels" in data and data["channels"] in (1, 2):
            active_channels = int(data["channels"])

    logger.info(f"Switched mode to '{current_mode}' (channels={active_channels})")
    return jsonify({"status": "ok", "mode": current_mode, "channels": active_channels})


@app.route("/api/demo/trigger", methods=["POST"])
def trigger_demo_fault():
    """Inject a simulated fault (or voice rejection) into a specific machine."""
    data = request.get_json(silent=True) or {}

    # Support global reset
    if data.get("reset"):
        with state_lock:
            for m in machines:
                m["demo_fault"] = "normal"
                m["debouncer"].history.clear()
                m["is_abnormal"] = False
                m["alarm"] = False
                m["is_voice"] = False
            hardware.set_machine_states(
                m1_abnormal=False, m1_alarm=False,
                m2_abnormal=False, m2_alarm=False,
                m1_voice=False, m2_voice=False
            )
        logger.info("Reset all machines to normal.")
        return jsonify({"status": "ok", "message": "All machines reset to normal"})

    machine_id = data.get("machine") or data.get("machine_id")
    if machine_id in ("machine_1", "m1", "machine1"):
        machine_id = "fan_id_00"
    elif machine_id in ("machine_2", "m2", "machine2"):
        machine_id = "pump_id_00"

    fault = data.get("fault", "normal").lower()

    valid_faults = {
        "imbalance",
        "misalignment",
        "bearing_wear",
        "cavitation",
        "normal",
        "voice_ignored",
    }
    if fault not in valid_faults:
        return (
            jsonify({"status": "error", "message": f"Invalid fault '{fault}'. Valid: {list(valid_faults)}"}),
            400,
        )

    with state_lock:
        matched = False
        for m in machines:
            if m["id"] == machine_id or m["name"] == machine_id:
                m["demo_fault"] = fault
                matched = True
                logger.info(f"Injected demo fault '{fault}' on machine '{m['name']}'")
                break

        if not matched:
            return jsonify({"status": "error", "message": f"Machine '{machine_id}' not found"}), 404

    return jsonify({"status": "ok", "machine": machine_id, "fault": fault})


@app.route("/api/audio/files", methods=["GET"])
def get_audio_files():
    """Return available test WAV files in synthetic_broken_wavs/, extreme_damaged_wavs/, and data/."""
    files = []
    search_dirs = [
        BASE_DIR / "synthetic_broken_wavs",
        BASE_DIR / "extreme_damaged_wavs",
        RAW_DATA_DIR,
        BASE_DIR / "data",
    ]
    seen = set()

    for sdir in search_dirs:
        if sdir.exists():
            for f in sorted(sdir.glob("*.wav")):
                if f.name not in seen:
                    seen.add(f.name)
                    is_speech = "test" in f.name.lower() or "voice" in f.name.lower()
                    parent_name = f.parent.name
                    category = (
                        "synthetic_broken"
                        if "synthetic" in parent_name or "synthetic" in f.name.lower()
                        else (
                            "extreme_damaged"
                            if "extreme" in parent_name or "extreme" in f.name.lower()
                            else ("speech" if is_speech else "raw_sample")
                        )
                    )
                    files.append(
                        {
                            "name": f.name,
                            "path": str(f.relative_to(BASE_DIR)).replace("\\", "/"),
                            "size_kb": round(f.stat().st_size / 1024, 1),
                            "is_speech": is_speech,
                            "category": category,
                        }
                    )
    return jsonify({"status": "ok", "files": files})


@app.route("/api/audio/test-file", methods=["POST"])
def test_audio_file():
    """Load a WAV audio file, analyze with LOF and speech filter, update machine & GPIO."""
    data = request.get_json(silent=True) or {}
    file_path_rel = data.get("file_path", "data/raw/test.wav")

    # Determine target machine and mic channel (mic 0 -> fan_id_00, mic 1 -> pump_id_00)
    mic_val = data.get("mic")
    if mic_val is not None:
        mic_str = str(mic_val).strip().lower()
        if mic_str in ("0", "mic 0", "mic_0", "mic0", "left", "m1", "machine 1", "ch0", "channel 0"):
            target_id = "fan_id_00"
        elif mic_str in ("1", "mic 1", "mic_1", "mic1", "right", "m2", "machine 2", "ch1", "channel 1"):
            target_id = "pump_id_00"
        else:
            target_id = "fan_id_00"
    else:
        req_id = data.get("machine_id") or data.get("machine") or "fan_id_00"
        req_str = str(req_id).strip().lower()
        if req_str in ("machine_1", "m1", "machine1", "mic 0", "mic_0", "mic0", "0", "left", "ch0", "channel 0"):
            target_id = "fan_id_00"
        elif req_str in ("machine_2", "m2", "machine2", "mic 1", "mic_1", "mic1", "1", "right", "ch1", "channel 1"):
            target_id = "pump_id_00"
        else:
            target_id = req_id

    full_path = BASE_DIR / file_path_rel
    if not full_path.exists():
        return jsonify({"status": "error", "message": f"File not found: {file_path_rel}"}), 404

    target_machine = next((m for m in machines if m["id"] == target_id or m["name"] == target_id), None)
    if not target_machine:
        target_machine = next((m for m in machines if m["id"] == "fan_id_00"), machines[0] if machines else None)
    if not target_machine:
        return jsonify({"status": "error", "message": f"Machine '{target_id}' not found"}), 404

    # In direct WAV testing on one mic, the other machine is maintained nominal GREEN
    other_machine = next((m for m in machines if m["id"] != target_machine["id"] and m["id"] != "test_room"), None)

    try:
        import soundfile as sf
        raw_y, sr = sf.read(str(full_path), dtype="float32")
        # Handle stereo input: if stereo and target is pump_id_00 (mic 1), select channel 1
        if raw_y.ndim > 1:
            if target_machine["id"] == "pump_id_00" and raw_y.shape[1] >= 2:
                y = raw_y[:, 1]
            else:
                y = raw_y[:, 0]
        else:
            y = raw_y

        clip_len = min(len(y), int(sr * clip_seconds))
        chunk = y[:clip_len]

        res = analyze_audio(chunk, sr=sr, bundle=target_machine["bundle"])
        is_voice = bool(res.get("is_voice", False)) or (res.get("fault") == "voice_ignored")

        with state_lock:
            # 1. Update the target machine
            if is_voice:
                target_machine["is_voice"] = True
                target_machine["is_abnormal"] = False
                target_machine["health"] = 100
                target_machine["fault"] = "VOICE_IGNORED"
                target_machine["score"] = 0.0
                target_machine["alarm"] = False
                target_machine["debouncer"].update(False)
            else:
                target_machine["is_voice"] = False
                target_machine["is_abnormal"] = bool(res["is_abnormal"])
                target_machine["health"] = int(res["health"])
                target_machine["fault"] = str(res["fault"]).upper()
                target_machine["score"] = round(float(res["score"]), 4)
                # In direct test, update debouncer 3 times so abnormal test clips immediately debounces into ALARM
                target_machine["debouncer"].history.clear()
                for _ in range(3):
                    alarm_state = target_machine["debouncer"].update(target_machine["is_abnormal"])
                target_machine["alarm"] = bool(alarm_state)

            # 2. Keep the other machine nominal GREEN
            if other_machine:
                other_machine["is_voice"] = False
                other_machine["is_abnormal"] = False
                other_machine["health"] = 96
                other_machine["fault"] = "NORMAL"
                other_machine["score"] = round(float(other_machine["threshold"] - 0.35), 4)
                other_machine["alarm"] = False
                other_machine["debouncer"].history.clear()

            # 3. Update independent hardware actuators for Machine 1 and Machine 2
            m1_obj = next((m for m in machines if m["id"] == "fan_id_00"), machines[0] if machines else None)
            m2_obj = next((m for m in machines if m["id"] == "pump_id_00"), machines[1] if len(machines) > 1 else None)

            hardware.set_machine_states(
                m1_abnormal=bool(m1_obj["is_abnormal"]) if m1_obj else False,
                m1_alarm=bool(m1_obj["alarm"]) if m1_obj else False,
                m2_abnormal=bool(m2_obj["is_abnormal"]) if m2_obj else False,
                m2_alarm=bool(m2_obj["alarm"]) if m2_obj else False,
                m1_voice=bool(m1_obj.get("is_voice", False)) if m1_obj else False,
                m2_voice=bool(m2_obj.get("is_voice", False)) if m2_obj else False,
            )

            # Log event into SQLite
            log_event(
                machine=target_machine["name"],
                health=target_machine["health"],
                fault=target_machine["fault"],
                score=target_machine["score"],
                alarm=target_machine["alarm"],
                angle_deg=target_machine["angle"],
                db_path=DB_PATH,
            )

        return jsonify(
            {
                "status": "ok",
                "file": file_path_rel,
                "machine": target_machine["name"],
                "target_mic": 0 if target_machine["id"] == "fan_id_00" else 1,
                "health": target_machine["health"],
                "fault": target_machine["fault"],
                "score": target_machine["score"],
                "threshold": target_machine["threshold"],
                "is_abnormal": target_machine["is_abnormal"],
                "is_voice": target_machine["is_voice"],
                "alarm": target_machine["alarm"],
                "result": {
                    "score": target_machine["score"],
                    "threshold": target_machine["threshold"],
                    "health": target_machine["health"],
                    "fault": target_machine["fault"],
                    "is_abnormal": target_machine["is_abnormal"],
                    "is_voice": target_machine["is_voice"],
                    "alarm": target_machine["alarm"],
                },
                "hardware": hardware.get_status(),
            }
        )
    except Exception as e:
        logger.error(f"Error testing audio file {file_path_rel}: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500
    except Exception as e:
        logger.error(f"Error testing audio file {file_path_rel}: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/calibrate", methods=["POST"])
def calibrate_machine_threshold():
    """Calibrate or manually update the LOF anomaly threshold for a machine model."""
    data = request.get_json(silent=True) or {}
    machine_id = data.get("machine_id", "fan_id_00")
    new_thresh = data.get("threshold")
    auto_calibrate = data.get("auto", False)

    target_machine = next((m for m in machines if m["id"] == machine_id or m["name"] == machine_id), None)
    if not target_machine:
        return jsonify({"status": "error", "message": f"Machine not found: {machine_id}"}), 404

    bundle = target_machine["bundle"]
    model_file = BASE_DIR / target_machine["path"]

    try:
        if auto_calibrate:
            # Calibrate threshold against normal and damaged clips
            normal_wav = RAW_DATA_DIR / "normal_sample.wav"
            abnormal_wav = RAW_DATA_DIR / "bearing_wear_sample.wav"

            normal_list = []
            abnormal_list = []
            if normal_wav.exists():
                y, sr = load_wav(str(normal_wav))
                normal_list.append((y, sr))
            if abnormal_wav.exists():
                y, sr = load_wav(str(abnormal_wav))
                abnormal_list.append((y, sr))

            calculated_thresh = calibrate_threshold(normal_list, abnormal_list, bundle)
            bundle["threshold"] = calculated_thresh
            final_thresh = calculated_thresh
        else:
            if new_thresh is None:
                return jsonify({"status": "error", "message": "Threshold value required"}), 400
            final_thresh = float(new_thresh)
            bundle["threshold"] = final_thresh

        # Save back to model joblib bundle
        joblib.dump(bundle, model_file)

        with state_lock:
            target_machine["threshold"] = round(final_thresh, 4)

        logger.info(f"Calibrated threshold for {target_machine['name']}: {final_thresh:.4f}")
        return jsonify(
            {
                "status": "ok",
                "machine": target_machine["name"],
                "threshold": round(final_thresh, 4),
                "message": f"Threshold successfully updated to {final_thresh:.4f}",
            }
        )
    except Exception as e:
        logger.error(f"Error calibrating threshold: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/events/clear", methods=["POST"])
def clear_events():
    """Clear all records from the SQLite events table."""
    init_db(DB_PATH)
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("DELETE FROM events")
            conn.commit()
        logger.info("Cleared events table in SQLite")
        return jsonify({"status": "ok", "message": "Events cleared"})
    except Exception as e:
        logger.error(f"Failed to clear events: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


def initialize_app():
    """Ensure database and machine models are loaded and worker started."""
    init_db(DB_PATH)
    discover_and_load_models()

    # Start background telemetry thread
    worker = threading.Thread(target=background_telemetry_loop, daemon=True, name="TelemetryWorker")
    worker.start()


initialize_app()

if __name__ == "__main__":
    print("Starting Machine Whisperer Dashboard on http://0.0.0.0:5000")
    try:
        app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
    finally:
        stop_event.set()
        hardware.cleanup()
