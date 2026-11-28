"""
backend/app/core/physics_anomaly/hybrid_detector.py

Hybrid Statistical + Physics-Informed Anomaly Detector.
Evaluates telemetry channels across both:
1. Statistical criteria (rolling z-score, sentinel bounds, mode state departures)
2. Physics-informed predictors (thermal energy balance, BMS-bus circuit coupling, slew rates)

Outputs a 4-way anomaly classification:
- statistically_abnormal  (S=1, P=0)
- physically_inconsistent (S=0, P=1)
- both                    (S=1, P=1)
- neither                 (S=0, P=0)

Calculates:
- observed value
- predicted value
- residual = observed - predicted
- residual-derived features and evidence
"""

import math
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List, Tuple
import pandas as pd
import numpy as np

from .predictors import (
    ThermalHeaterPredictor,
    PowerBusVoltagePredictor,
    SensorIntegrityPredictor,
    PhysicsPredictionResult,
)


@dataclass
class HybridAnomalyResult:
    """
    Unified result of statistical and physics evaluation for a telemetry observation.
    """
    timestamp: str
    component: str
    parameter: str
    observed_value: float
    predicted_value: Optional[float] = None
    residual: Optional[float] = None
    normalized_residual: Optional[float] = None
    is_statistical_anomaly: bool = False
    is_physical_anomaly: bool = False
    anomaly_classification: str = "neither"  # "statistically_abnormal" | "physically_inconsistent" | "both" | "neither"
    z_score: Optional[float] = None
    confidence: float = 0.5
    physics_rule: Optional[str] = None
    physics_evidence: Dict[str, Any] = field(default_factory=dict)
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "component": self.component,
            "parameter": self.parameter,
            "observed_value": self.observed_value,
            "predicted_value": self.predicted_value,
            "residual": self.residual,
            "normalized_residual": self.normalized_residual,
            "is_statistical_anomaly": self.is_statistical_anomaly,
            "is_physical_anomaly": self.is_physical_anomaly,
            "anomaly_classification": self.anomaly_classification,
            "z_score": round(self.z_score, 3) if self.z_score is not None else None,
            "confidence": round(self.confidence, 4),
            "physics_rule": self.physics_rule,
            "physics_evidence": self.physics_evidence,
            "description": self.description,
        }


class HybridAnomalyDetector:
    """
    Orchestrates statistical evaluation and physics-informed predictors for CubeSat telemetry.
    Maintains causal sequential state across channels (e.g. tracking heater duty cycle
    to predict battery temperature, and BMS trip state to predict power bus voltage).
    """

    def __init__(
        self,
        mission_config: Optional[Dict[str, Any]] = None,
        z_warning: float = 4.0,
        z_critical: float = 5.0,
        rolling_window: int = 20,
    ):
        self.mission_config = mission_config or {}
        self.z_warning = z_warning
        self.z_critical = z_critical
        self.rolling_window = rolling_window

        # Extract or default physics parameters from configuration
        thermal_cfg = self.mission_config.get("thermal", {})
        self.battery_thermal_predictor = ThermalHeaterPredictor(
            alpha=thermal_cfg.get("alpha", 0.065),
            beta=thermal_cfg.get("beta", 0.0015),
            ambient_temp=thermal_cfg.get("ambient_temp", 20.0),
            nominal_temp=thermal_cfg.get("battery_nominal_temp", 25.0),
            max_slew_rate=thermal_cfg.get("max_slew_rate", 3.5),
            sigma_expected=thermal_cfg.get("sigma_expected", 2.0),
            z_threshold=4.5,
        )

        self.chassis_thermal_predictor = ThermalHeaterPredictor(
            alpha=thermal_cfg.get("alpha", 0.065),
            beta=thermal_cfg.get("beta", 0.0015),
            ambient_temp=thermal_cfg.get("ambient_temp", 20.0),
            nominal_temp=thermal_cfg.get("chassis_nominal_temp", 20.0),
            max_slew_rate=thermal_cfg.get("max_slew_rate", 3.5),
            sigma_expected=thermal_cfg.get("sigma_expected", 2.0),
            z_threshold=4.5,
        )

        power_cfg = self.mission_config.get("power", {})
        self.power_predictor = PowerBusVoltagePredictor(
            v_nominal=power_cfg.get("v_nominal", 7.4),
            v_trip=power_cfg.get("v_trip", 1.8),
            uvlo_threshold=power_cfg.get("uvlo_threshold", 3.2),
            sigma_expected=power_cfg.get("sigma_expected", 0.25),
            z_threshold=4.0,
        )

        self.sensor_predictor = SensorIntegrityPredictor(
            nominal_mean=0.0,
            nominal_std=1.0,
            max_slew_rate=25.0,
            z_threshold=4.0,
        )

        # Causal coupling state trackers
        self._last_heater_duty: float = 0.325
        self._last_bms_trip: float = 0.0
        self._channel_history: Dict[str, Dict[str, Any]] = {}

    def reset_state(self):
        """Reset streaming state between simulation or replay runs."""
        self._last_heater_duty = 0.325
        self._last_bms_trip = 0.0
        self._channel_history.clear()

    def evaluate_sample(
        self,
        timestamp: str,
        component: str,
        parameter: str,
        value: float,
        z_score: Optional[float] = None,
        is_stat_override: Optional[bool] = None,
    ) -> HybridAnomalyResult:
        """
        Evaluate a single telemetry sample with causal sequential state updates.
        """
        channel_key = f"{component}.{parameter}"
        now_dt = pd.to_datetime(timestamp) if isinstance(timestamp, str) else timestamp

        # Retrieve prior state
        prev_entry = self._channel_history.get(channel_key)
        prev_val = prev_entry["value"] if prev_entry else None
        prev_ts = prev_entry["ts"] if prev_entry else None
        dt_s = 1.0
        if prev_ts is not None and now_dt is not None:
            dt_s = max((now_dt - prev_ts).total_seconds(), 0.1)

        # 1. Update coupled causal input states
        if component == "heater_controller" and parameter == "duty_cycle":
            if math.isfinite(value) and value > -900:
                self._last_heater_duty = max(min(value, 1.0), 0.0)

        if component == "battery_protection" and parameter == "trip_state":
            if math.isfinite(value) and value > -900:
                self._last_bms_trip = 1.0 if value >= 0.5 else 0.0

        # 2. Physics prediction & evaluation
        phys_res: Optional[PhysicsPredictionResult] = None

        if component == "battery" and parameter == "temperature_c":
            phys_res = self.battery_thermal_predictor.evaluate(
                observed_temp=value,
                prev_temp=prev_val,
                duty_cycle=self._last_heater_duty,
                dt_seconds=dt_s,
                channel=channel_key,
            )
        elif component == "thermal_sensor" and parameter == "temperature_c":
            phys_res = self.chassis_thermal_predictor.evaluate(
                observed_temp=value,
                prev_temp=prev_val,
                duty_cycle=self._last_heater_duty,
                dt_seconds=dt_s,
                channel=channel_key,
            )
        elif component == "power_bus" and parameter == "voltage_v":
            phys_res = self.power_predictor.evaluate(
                observed_voltage=value,
                trip_state=self._last_bms_trip,
                prev_voltage=prev_val,
                dt_seconds=dt_s,
                channel=channel_key,
            )
        else:
            phys_res = self.sensor_predictor.evaluate(
                observed_value=value,
                prev_value=prev_val,
                dt_seconds=dt_s,
                channel=channel_key,
            )

        # 3. Statistical anomaly evaluation
        is_stat = False
        if is_stat_override is not None:
            is_stat = is_stat_override
        else:
            if value <= -900.0:
                is_stat = True
            elif z_score is not None and pd.notna(z_score):
                is_stat = abs(z_score) >= self.z_warning

        is_phys = phys_res.is_physically_inconsistent if phys_res else False

        # 4. 4-Way Classification
        if is_stat and is_phys:
            classification = "both"
        elif is_stat and not is_phys:
            classification = "statistically_abnormal"
        elif not is_stat and is_phys:
            classification = "physically_inconsistent"
        else:
            classification = "neither"

        # 5. Composite confidence score
        confidence = 0.5
        if classification == "both":
            confidence = 0.98
        elif classification == "physically_inconsistent":
            confidence = 0.88
        elif classification == "statistically_abnormal":
            confidence = 0.75
        else:
            confidence = 0.05

        # 6. Build descriptive text
        pred_v = phys_res.predicted_value if phys_res else None
        res_v = phys_res.residual if phys_res else None
        norm_res = phys_res.normalized_residual if phys_res else None
        rule_name = phys_res.rule_name if phys_res else "statistical_baseline"
        details = phys_res.details if phys_res else {}

        desc = f"{channel_key}={value}"
        if pred_v is not None and res_v is not None:
            desc += f" (pred={pred_v:.2f}, res={res_v:.2f}, class={classification})"

        # Update channel history
        self._channel_history[channel_key] = {"value": value, "ts": now_dt}

        return HybridAnomalyResult(
            timestamp=str(timestamp),
            component=component,
            parameter=parameter,
            observed_value=value,
            predicted_value=pred_v,
            residual=res_v,
            normalized_residual=norm_res,
            is_statistical_anomaly=is_stat,
            is_physical_anomaly=is_phys,
            anomaly_classification=classification,
            z_score=z_score,
            confidence=confidence,
            physics_rule=rule_name,
            physics_evidence=details,
            description=desc,
        )

    def evaluate_dataframe(
        self,
        df: pd.DataFrame,
        rolling_window: Optional[int] = None,
    ) -> List[HybridAnomalyResult]:
        """
        Evaluate full telemetry DataFrame in chronological order across all channels.
        Calculates rolling z-score baseline alongside physics predictions.
        """
        self.reset_state()
        window = rolling_window or self.rolling_window

        df_sorted = df.sort_values("timestamp").reset_index(drop=True)
        results: List[HybridAnomalyResult] = []

        # Precompute rolling statistics per channel
        z_dict = {}
        for (comp, param), group in df_sorted.groupby(["component", "parameter"]):
            series = group["value"]
            roll_mean = series.rolling(window=window, min_periods=3).mean().shift(1)
            roll_std = series.rolling(window=window, min_periods=3).std().shift(1).replace(0, np.nan)
            z = (series - roll_mean) / roll_std
            for idx, val in z.items():
                z_dict[idx] = val

        # Evaluate chronologically
        for idx, row in df_sorted.iterrows():
            z_val = z_dict.get(idx)
            val = float(row["value"])
            res = self.evaluate_sample(
                timestamp=row["timestamp"],
                component=row["component"],
                parameter=row["parameter"],
                value=val,
                z_score=float(z_val) if pd.notna(z_val) else None,
            )
            results.append(res)

        return results
