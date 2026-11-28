import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

class WaferAnomalyDetector:
    """
    Multivariate Anomaly Detection using Isolation Forest for semiconductor wafer telemetry.
    Trains on normal baseline runs and computes calibrated anomaly scores [0, 1]
    with anomaly contribution attribution per sensor.
    """
    def __init__(
        self,
        contamination: float = 0.05,
        n_estimators: int = 150,
        random_state: int = 42
    ):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.scaler = StandardScaler()
        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=-1
        )
        self.feature_names: List[str] = []
        self.baseline_mean_: Optional[np.ndarray] = None
        self.baseline_std_: Optional[np.ndarray] = None

    def fit(self, X: pd.DataFrame, feature_cols: List[str]):
        """Fits the scaler and Isolation Forest on normal baseline telemetry."""
        self.feature_names = feature_cols
        X_mat = X[feature_cols].values
        X_scaled = self.scaler.fit_transform(X_mat)
        
        self.model.fit(X_scaled)
        self.baseline_mean_ = np.nanmean(X_mat, axis=0)
        self.baseline_std_ = np.nanstd(X_mat, axis=0) + 1e-6
        return self

    def score_samples(self, X: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Returns:
            - is_anomaly: binary flags (1 = Anomaly, 0 = Normal)
            - anomaly_scores: calibrated anomaly scores in range [0, 1] (higher = more anomalous)
        """
        X_mat = X[self.feature_names].values
        X_scaled = self.scaler.transform(X_mat)
        
        # sklearn IsolationForest: -1 for outlier, 1 for inlier
        raw_preds = self.model.predict(X_scaled)
        is_anomaly = (raw_preds == -1).astype(int)
        
        # decision_function: positive for inliers, negative for outliers
        decision_scores = self.model.decision_function(X_scaled)
        
        # Calibrate into sigmoid [0, 1] range: higher score = higher severity anomaly
        calibrated_scores = 1.0 / (1.0 + np.exp(15.0 * decision_scores))
        
        return is_anomaly, calibrated_scores

    def get_top_anomalous_features(self, sample_series: pd.Series, top_k: int = 3) -> List[Dict[str, float]]:
        """
        Attribution: Returns top sensor features deviating most from baseline normal z-score.
        """
        if self.baseline_mean_ is None or self.baseline_std_ is None:
            return []
            
        vals = sample_series[self.feature_names].values
        z_scores = np.abs((vals - self.baseline_mean_) / self.baseline_std_)
        
        sorted_indices = np.argsort(z_scores)[::-1][:top_k]
        top_features = []
        for idx in sorted_indices:
            feat_name = self.feature_names[idx]
            top_features.append({
                "feature": feat_name,
                "current_value": float(vals[idx]),
                "baseline_mean": float(self.baseline_mean_[idx]),
                "z_deviation": float(z_scores[idx])
            })
        return top_features
