import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from sklearn.linear_model import LinearRegression

class DriftVelocityAnalyzer:
    """
    Computes sensor drift velocity (rate of change over time) using Linear Regression
    across rolling windows and multi-wafer trajectories.
    Formula: y(t) = beta_0 + beta_1 * t  -> beta_1 is the drift velocity (units/sec).
    """
    def __init__(self, window_size: int = 10, time_col: str = "time_sec"):
        self.window_size = window_size
        self.time_col = time_col
        self._lr = LinearRegression()

    def compute_window_slope(self, time_vals: np.ndarray, sensor_vals: np.ndarray) -> float:
        """Fits Linear Regression on window and returns the slope beta_1."""
        if len(time_vals) < 2 or np.all(time_vals == time_vals[0]):
            return 0.0
        X = time_vals.reshape(-1, 1)
        y = sensor_vals
        self._lr.fit(X, y)
        return float(self._lr.coef_[0])

    def calculate_rolling_drift(self, df: pd.DataFrame, sensor_cols: List[str]) -> pd.DataFrame:
        """
        Calculates rolling drift velocity for each specified sensor column
        using a sliding window Linear Regression.
        """
        df_out = df.copy()
        time_vals = df[self.time_col].values if self.time_col in df.columns else np.arange(len(df)) * 0.2
        
        for col in sensor_cols:
            if col not in df.columns:
                continue
            vals = df[col].values
            n = len(vals)
            slopes = np.zeros(n)
            
            for i in range(n):
                start_idx = max(0, i - self.window_size + 1)
                w_time = time_vals[start_idx : i + 1]
                w_vals = vals[start_idx : i + 1]
                if len(w_time) >= 3:
                    slopes[i] = self.compute_window_slope(w_time, w_vals)
                else:
                    slopes[i] = 0.0
                    
            df_out[f"{col}_drift_velocity"] = slopes
            
        return df_out

    def calculate_wafer_to_wafer_drift(
        self, wafer_summary_df: pd.DataFrame, target_sensor: str, wafer_order_col: str = "wafer_seq"
    ) -> Dict[str, float]:
        """
        Computes macro drift across consecutive wafers in a fabrication lot.
        """
        if len(wafer_summary_df) < 2:
            return {"drift_slope": 0.0, "r2_score": 0.0}
            
        X = wafer_summary_df[wafer_order_col].values.reshape(-1, 1)
        y = wafer_summary_df[target_sensor].values
        
        self._lr.fit(X, y)
        slope = float(self._lr.coef_[0])
        r2 = float(self._lr.score(X, y))
        
        return {
            "drift_slope": slope,
            "r2_score": r2,
            "intercept": float(self._lr.intercept_)
        }
