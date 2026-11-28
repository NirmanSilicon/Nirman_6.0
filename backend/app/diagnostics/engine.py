import numpy as np
from scipy.fft import rfft, rfftfreq
from typing import List, Dict, Optional, Tuple
from collections import deque
import time
from backend.app.schemas.telemetry import (
    AccelerationSample,
    FeatureSnapshot,
    DiagnosticsResult
)

class SignalDiagnosticsEngine:
    def __init__(self, window_size_samples: int = 300, sample_rate_hz: int = 100):
        self.sample_rate_hz = sample_rate_hz
        self.window_size = window_size_samples
        
        # Rolling buffers for machine MOTOR_01
        self.vib_x = deque(maxlen=self.window_size)
        self.vib_y = deque(maxlen=self.window_size)
        self.vib_z = deque(maxlen=self.window_size)
        self.temp_history = deque(maxlen=30)  # ~30 seconds of 1Hz temperature
        self.current_history = deque(maxlen=30) # ~30 seconds of 10Hz current
        
        # Baseline norms for conveyor prototype
        self.BASELINE_VIB_RMS = 0.45
        self.BASELINE_TEMP = 32.0
        self.BASELINE_CURRENT = 0.85
        
        # Anomaly model placeholder
        self.ml_model = None
        self._try_load_model()

    def _try_load_model(self):
        try:
            import joblib
            import os
            model_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "models", "isolation_forest.joblib")
            if os.path.exists(model_path):
                self.ml_model = joblib.load(model_path)
        except Exception:
            self.ml_model = None

    def push_samples(self, samples: List[AccelerationSample], temp_c: float, current_a: float):
        for s in samples:
            self.vib_x.append(s.x)
            self.vib_y.append(s.y)
            self.vib_z.append(s.z)
        self.temp_history.append((time.time(), temp_c))
        self.current_history.append(current_a)

    def extract_features(self) -> FeatureSnapshot:
        # If not enough samples, use defaults or available
        if len(self.vib_z) < 10:
            return FeatureSnapshot(
                temperature_c=self.temp_history[-1][1] if self.temp_history else self.BASELINE_TEMP,
                temp_rate_c_min=0.0,
                vibration_rms_g=self.BASELINE_VIB_RMS,
                vibration_peak_g=self.BASELINE_VIB_RMS * 1.414,
                crest_factor=1.414,
                dominant_frequency_hz=25.0,
                motor_current_a=self.current_history[-1] if self.current_history else self.BASELINE_CURRENT,
                current_spike_ratio=1.0
            )

        # Vibration analysis (using resultant magnitude or dominant Z-axis)
        z = np.array(self.vib_z)
        rms = float(np.sqrt(np.mean(z**2)))
        peak = float(np.max(np.abs(z)))
        crest = float(peak / (rms + 1e-6))
        
        # FFT Dominant Frequency
        n = len(z)
        yf = np.abs(rfft(z))
        xf = rfftfreq(n, 1.0 / self.sample_rate_hz)
        # Avoid DC offset (0 Hz)
        if len(yf) > 1:
            dom_idx = np.argmax(yf[1:]) + 1
            dom_freq = float(xf[dom_idx])
        else:
            dom_freq = 0.0

        # Thermal rate of change
        current_temp = self.temp_history[-1][1]
        temp_rate = 0.0
        if len(self.temp_history) >= 2:
            dt = self.temp_history[-1][0] - self.temp_history[0][0]
            if dt > 1.0:
                d_temp = self.temp_history[-1][1] - self.temp_history[0][1]
                temp_rate = float((d_temp / dt) * 60.0) # °C per minute

        # Current dynamics
        curr_arr = np.array(self.current_history)
        mean_curr = float(np.mean(curr_arr)) if len(curr_arr) > 0 else self.BASELINE_CURRENT
        max_curr = float(np.max(curr_arr)) if len(curr_arr) > 0 else self.BASELINE_CURRENT
        spike_ratio = float(max_curr / (mean_curr + 1e-6))

        return FeatureSnapshot(
            temperature_c=current_temp,
            temp_rate_c_min=temp_rate,
            vibration_rms_g=rms,
            vibration_peak_g=peak,
            crest_factor=crest,
            dominant_frequency_hz=dom_freq,
            motor_current_a=mean_curr,
            current_spike_ratio=spike_ratio
        )

    def evaluate(self, features: FeatureSnapshot) -> DiagnosticsResult:
        """
        Runs ML or heuristic fault identification against extracted features.
        """
        prediction = "NORMAL"
        severity = "NORMAL"
        probable_fault = None
        anomaly_score = 0.05
        health_index = 100

        # Heuristic / Model Anomaly Score
        # Check Vibration
        if features.vibration_rms_g >= 2.5:
            prediction = "VIBRATION_ANOMALY"
            severity = "CRITICAL"
            probable_fault = "Mechanical looseness or critical unbalance"
            anomaly_score = 0.88
            health_index = 35
        elif features.vibration_rms_g >= 1.4:
            prediction = "VIBRATION_ANOMALY"
            severity = "WARNING"
            probable_fault = "Shaft misalignment or bearing raceway defect"
            anomaly_score = 0.65
            health_index = 65

        # Check Temperature
        if features.temperature_c >= 60.0 or features.temp_rate_c_min >= 5.0:
            if severity != "CRITICAL":
                prediction = "CRITICAL_TEMPERATURE"
                severity = "CRITICAL"
                probable_fault = "Motor stator winding overheating or cooling blockage"
                anomaly_score = max(anomaly_score, 0.92)
                health_index = min(health_index, 25)
        elif features.temperature_c >= 45.0 or features.temp_rate_c_min >= 2.0:
            if severity == "NORMAL":
                prediction = "RISING_TEMPERATURE"
                severity = "WARNING"
                probable_fault = "Elevated thermal dissipation"
                anomaly_score = max(anomaly_score, 0.55)
                health_index = min(health_index, 70)

        # Check Motor Current
        if features.motor_current_a >= 1.8:
            if severity != "CRITICAL":
                prediction = "MOTOR_OVERCURRENT"
                severity = "WARNING"
                probable_fault = "High conveyor belt mechanical load or jammed roller"
                anomaly_score = max(anomaly_score, 0.70)
                health_index = min(health_index, 55)

        # Scale health index if normal
        if severity == "NORMAL":
            # slight jitter based on distance from baseline
            vib_dev = abs(features.vibration_rms_g - self.BASELINE_VIB_RMS)
            health_index = max(85, int(100 - (vib_dev * 20)))
            anomaly_score = round(min(0.20, vib_dev * 0.3), 3)

        return DiagnosticsResult(
            health_index=health_index,
            anomaly_score=anomaly_score,
            prediction=prediction,
            severity=severity,
            probable_fault=probable_fault,
            confidence=0.94
        )

diagnostics_engine = SignalDiagnosticsEngine()
