import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from sklearn.linear_model import Ridge, LinearRegression
from nirman.data_loader import SPEC_LIMITS

class TimeToThresholdForecaster:
    """
    Regression-based forecasting engine to estimate Time-To-Threshold (TTT)
    before critical wafer chamber parameters breach USL (Upper Spec Limit)
    or LSL (Lower Spec Limit).
    """
    def __init__(self, spec_limits: Optional[Dict[str, Dict[str, float]]] = None):
        self.spec_limits = spec_limits or SPEC_LIMITS
        self.regressor = Ridge(alpha=1.0)

    def predict_ttt(
        self,
        time_history: np.ndarray,
        sensor_history: np.ndarray,
        sensor_name: str,
        max_horizon_sec: float = 300.0
    ) -> Dict[str, float]:
        """
        Calculates Time-To-Threshold for a single sensor based on recent history.
        Returns:
            - ttt_seconds: Estimated seconds until breach (float, inf if no breach projected)
            - breach_type: 'USL_BREACH', 'LSL_BREACH', or 'STABLE'
            - current_value: Current reading
            - projected_slope: Regression drift velocity (units/sec)
            - r2_confidence: Goodness of fit (R^2)
        """
        limits = self.spec_limits.get(sensor_name)
        if not limits or len(sensor_history) < 3:
            return {
                "ttt_seconds": float("inf"),
                "breach_type": "STABLE",
                "current_value": float(sensor_history[-1]) if len(sensor_history) else 0.0,
                "projected_slope": 0.0,
                "r2_confidence": 0.0
            }

        usl = limits.get("USL")
        usl = float(usl) if usl is not None else float("inf")
        lsl = limits.get("LSL")
        lsl = float(lsl) if lsl is not None else float("-inf")
        curr_val = float(sensor_history[-1])
        curr_time = float(time_history[-1])

        # Immediate breach check
        if usl < float("inf") and curr_val >= usl:
            return {
                "ttt_seconds": 0.0,
                "breach_type": "USL_BREACH_IMMEDIATE",
                "current_value": curr_val,
                "projected_slope": 0.0,
                "r2_confidence": 1.0
            }
        if lsl > float("-inf") and curr_val <= lsl:
            return {
                "ttt_seconds": 0.0,
                "breach_type": "LSL_BREACH_IMMEDIATE",
                "current_value": curr_val,
                "projected_slope": 0.0,
                "r2_confidence": 1.0
            }

        # Fit linear regression trend: sensor = slope * (t - curr_time) + intercept
        t_relative = (time_history - curr_time).reshape(-1, 1)
        self.regressor.fit(t_relative, sensor_history)
        slope = float(self.regressor.coef_[0])
        r2 = max(0.0, float(self.regressor.score(t_relative, sensor_history)))

        # Solve for breach
        ttt = float("inf")
        breach_type = "STABLE"

        if slope > 1e-5 and usl < float("inf"):
            # Drifting upward towards USL
            ttt_candidate = (usl - curr_val) / slope
            if 0 < ttt_candidate <= max_horizon_sec:
                ttt = ttt_candidate
                breach_type = "USL_BREACH"
        elif slope < -1e-5 and lsl > float("-inf"):
            # Drifting downward towards LSL
            ttt_candidate = (lsl - curr_val) / slope
            if 0 < ttt_candidate <= max_horizon_sec:
                ttt = ttt_candidate
                breach_type = "LSL_BREACH"

        return {
            "ttt_seconds": ttt,
            "breach_type": breach_type,
            "current_value": curr_val,
            "projected_slope": slope,
            "r2_confidence": r2
        }

    def forecast_trajectory(
        self,
        time_history: np.ndarray,
        sensor_history: np.ndarray,
        future_steps_sec: float = 30.0,
        n_points: int = 15
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Projects future values over the specified time horizon."""
        curr_time = float(time_history[-1])
        t_relative = (time_history - curr_time).reshape(-1, 1)
        self.regressor.fit(t_relative, sensor_history)

        future_t_rel = np.linspace(0, future_steps_sec, n_points).reshape(-1, 1)
        future_preds = self.regressor.predict(future_t_rel)
        future_t_abs = curr_time + future_t_rel.flatten()

        return future_t_abs, future_preds
