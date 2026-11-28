import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any

class RuleBasedAlertEngine:
    """
    Rule-Based Alert Engine that validates and synthesizes:
    - Primary Stacking Ensemble classification
    - Isolation Forest anomaly scores
    - Linear Regression drift velocities
    - Time-to-Threshold (TTT) forecasting
    
    Applies debounce persistence filtering to eliminate transient false alarms,
    assigns alert severity (INFO, WARNING, CRITICAL), and outputs root cause explanations.
    """
    def __init__(
        self,
        anomaly_threshold_warning: float = 0.50,
        anomaly_threshold_critical: float = 0.70,
        ttt_threshold_warning_sec: float = 60.0,
        ttt_threshold_critical_sec: float = 15.0,
        debounce_count: int = 3
    ):
        self.anomaly_threshold_warning = anomaly_threshold_warning
        self.anomaly_threshold_critical = anomaly_threshold_critical
        self.ttt_threshold_warning_sec = ttt_threshold_warning_sec
        self.ttt_threshold_critical_sec = ttt_threshold_critical_sec
        self.debounce_count = debounce_count
        
        # Debounce state tracker
        self.consecutive_anomalies = 0
        self.consecutive_drift_count = 0
        self.last_alert_time = None

    def reset_state(self):
        """Resets debounce state for a new wafer run."""
        self.consecutive_anomalies = 0
        self.consecutive_drift_count = 0
        self.last_alert_time = None

    def evaluate_sample(
        self,
        timestamp: float,
        stacking_class: int,
        stacking_proba: np.ndarray,
        anomaly_score: float,
        is_isolated_anomaly: int,
        drift_velocities: Dict[str, float],
        ttt_forecasts: Dict[str, Dict[str, Any]],
        top_deviations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Validates telemetry across all 4 components using the rule hierarchy.
        Returns validated alert decision dictionary.
        """
        # Determine fastest approaching TTT breach
        min_ttt_sec = float("inf")
        fastest_breach_sensor = None
        fastest_breach_type = "STABLE"

        for s_name, t_info in ttt_forecasts.items():
            t_val = t_info.get("ttt_seconds", float("inf"))
            if t_val < min_ttt_sec:
                min_ttt_sec = t_val
                fastest_breach_sensor = s_name
                fastest_breach_type = t_info.get("breach_type", "STABLE")

        # Significant drift check (|velocity| above physical steady state threshold)
        active_drifting_sensors = [
            s for s, vel in drift_velocities.items()
            if abs(vel) > 0.05
        ]
        has_significant_drift = len(active_drifting_sensors) > 0

        # Debounce counters
        if anomaly_score >= self.anomaly_threshold_warning or stacking_class in [1, 2]:
            self.consecutive_anomalies += 1
        else:
            self.consecutive_anomalies = max(0, self.consecutive_anomalies - 1)

        if has_significant_drift or stacking_class == 1:
            self.consecutive_drift_count += 1
        else:
            self.consecutive_drift_count = max(0, self.consecutive_drift_count - 1)

        # Rule evaluation hierarchy:
        alert_triggered = False
        severity = "NORMAL"
        rule_fired = "None"
        action_recommendation = "Maintain standard processing recipe."
        root_cause = "Nominal operation"

        # Determine primary root cause sensor
        primary_sensor = fastest_breach_sensor or (top_deviations[0]["feature"] if top_deviations else "System")

        # RULE 1: CRITICAL Process Fault (Stacking=Fault, High Anomaly Score, Sustained Debounce or Immediate Limit Breach)
        if (
            stacking_class == 2 and anomaly_score >= self.anomaly_threshold_critical
        ) or (
            min_ttt_sec <= self.ttt_threshold_critical_sec and min_ttt_sec >= 0
        ) or (
            self.consecutive_anomalies >= self.debounce_count and stacking_proba[2] > 0.60
        ):
            alert_triggered = True
            severity = "CRITICAL"
            rule_fired = "RULE_CRITICAL_EXCURSION"
            action_recommendation = f"Immediate Plasma Abort / Chamber Interlock on {primary_sensor}. Inspect hardware."
            root_cause = f"Severe out-of-control excursion in {primary_sensor} (Anomaly Score: {anomaly_score:.2f}, TTT: {min_ttt_sec:.1f}s)"

        # RULE 2: WARNING Chamber Drift (Stacking=Drift, Progressive Velocity, or Approaching Spec Window)
        elif (
            (stacking_class == 1 and self.consecutive_drift_count >= self.debounce_count) or
            (has_significant_drift and anomaly_score >= self.anomaly_threshold_warning and min_ttt_sec <= self.ttt_threshold_warning_sec)
        ):
            alert_triggered = True
            severity = "WARNING"
            rule_fired = "RULE_CHAMBER_DRIFT_PREDICTIVE"
            action_recommendation = f"Schedule preventive chamber maintenance / tune match network for {primary_sensor}."
            root_cause = f"Progressive drift detected on {primary_sensor} (Drift Vel: {drift_velocities.get(primary_sensor, 0.0):.4f}/s, Projected TTT: {min_ttt_sec:.1f}s)"

        # RULE 3: Transient / Debounce Suppression
        elif (anomaly_score >= self.anomaly_threshold_warning or stacking_class != 0) and self.consecutive_anomalies < self.debounce_count:
            alert_triggered = False
            severity = "INFO"
            rule_fired = "RULE_TRANSIENT_SUPPRESSION"
            action_recommendation = "Transient deviation observed; debouncing in progress (suppressing false alarm)."
            root_cause = f"Recipe transition jitter on {primary_sensor} (Debounce tick {self.consecutive_anomalies}/{self.debounce_count})"

        return {
            "timestamp": timestamp,
            "alert_triggered": alert_triggered,
            "severity": severity,
            "rule_fired": rule_fired,
            "stacking_prediction": int(stacking_class),
            "stacking_probabilities": {
                "Normal": float(stacking_proba[0]),
                "Chamber_Drift": float(stacking_proba[1]),
                "Process_Fault": float(stacking_proba[2])
            },
            "anomaly_score": float(anomaly_score),
            "is_isolated_anomaly": int(is_isolated_anomaly),
            "min_ttt_seconds": float(min_ttt_sec),
            "fastest_breach_sensor": fastest_breach_sensor,
            "fastest_breach_type": fastest_breach_type,
            "active_drifting_sensors": active_drifting_sensors,
            "root_cause": root_cause,
            "action_recommendation": action_recommendation
        }
