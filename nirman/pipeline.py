import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any, Tuple

from nirman.models.stacking_ensemble import WaferStackingClassifier
from nirman.models.anomaly_detector import WaferAnomalyDetector
from nirman.drift_analyzer import DriftVelocityAnalyzer
from nirman.forecasting import TimeToThresholdForecaster
from nirman.alert_engine import RuleBasedAlertEngine
from nirman.data_loader import SENSOR_COLUMNS, SPEC_LIMITS

class HybridWaferPipeline:
    """
    Unified Production Pipeline implementing:
    - Primary Classification: Stacking Ensemble (Random Forest + XGBoost + Extra Trees)
    - Anomaly Detection: Isolation Forest
    - Drift Velocity: Linear Regression slope analyzer
    - Time-To-Threshold: Regression-based forecasting (TTT / RUL)
    - Alert Validation: Multi-condition Rule-Based Alert Engine
    """
    def __init__(
        self,
        sensor_columns: Optional[List[str]] = None,
        spec_limits: Optional[Dict[str, Dict[str, float]]] = None,
        random_state: int = 42
    ):
        self.sensor_columns = sensor_columns or SENSOR_COLUMNS
        self.spec_limits = spec_limits or SPEC_LIMITS
        self.random_state = random_state

        # Initialize sub-modules
        self.stacking_classifier = WaferStackingClassifier(random_state=random_state)
        self.anomaly_detector = WaferAnomalyDetector(contamination=0.05, random_state=random_state)
        self.drift_analyzer = DriftVelocityAnalyzer(window_size=10, time_col="time_sec")
        self.forecaster = TimeToThresholdForecaster(spec_limits=self.spec_limits)
        self.alert_engine = RuleBasedAlertEngine()
        
        self.is_fitted = False

    def fit(self, train_df: pd.DataFrame, label_col: str = "label"):
        """
        Fits all models:
        1. Stacking Ensemble on all labeled wafer data (Normal, Chamber_Drift, Process_Fault)
        2. Isolation Forest on baseline Normal wafer telemetry
        """
        print(f"[*] Training Hybrid Wafer Pipeline with {len(train_df)} telemetry samples...")
        
        # Train Primary Stacking Ensemble
        print("  -> Fitting Stacking Ensemble (Base 1: RF, Base 2: XGBoost, Base 3: ExtraTrees, Meta: LogisticRegression)...")
        self.stacking_classifier.fit(
            X=train_df,
            y=train_df[label_col],
            feature_cols=self.sensor_columns
        )

        # Train Isolation Forest on normal baseline runs
        normal_mask = train_df[label_col] == 0
        normal_data = train_df[normal_mask]
        print(f"  -> Fitting Isolation Forest on {len(normal_data)} normal baseline telemetry points...")
        self.anomaly_detector.fit(
            X=normal_data,
            feature_cols=self.sensor_columns
        )

        self.is_fitted = True
        print("[+] Hybrid Pipeline Training Complete!")
        return self

    def process_wafer_stream(self, wafer_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Executes end-to-end streaming evaluation across time for a wafer run.
        At each time tick:
        - Runs Drift Velocity calculation
        - Runs Regression-based TTT forecasting
        - Evaluates Stacking Ensemble & Isolation Forest
        - Executes Rule-Based Alert Engine
        """
        if not self.is_fitted:
            raise RuntimeError("Pipeline must be fitted before running inference!")

        self.alert_engine.reset_state()
        time_vals = wafer_df["time_sec"].values if "time_sec" in wafer_df.columns else np.arange(len(wafer_df)) * 0.2
        
        # Batch predict classification & anomaly detection for high performance
        stacking_preds = self.stacking_classifier.predict(wafer_df)
        stacking_probas = self.stacking_classifier.predict_proba(wafer_df)
        is_anoms, anom_scores = self.anomaly_detector.score_samples(wafer_df)

        stream_results = []
        history_window = 12

        for i in range(len(wafer_df)):
            t_curr = time_vals[i]
            sample = wafer_df.iloc[i]
            start_idx = max(0, i - history_window + 1)
            
            # 1. Linear Regression Drift Velocities
            drift_velocities = {}
            w_time = time_vals[start_idx : i + 1]
            for col in self.spec_limits.keys():
                if col in wafer_df.columns and len(w_time) >= 3:
                    w_sensor = wafer_df[col].iloc[start_idx : i + 1].values
                    drift_velocities[col] = self.drift_analyzer.compute_window_slope(w_time, w_sensor)
                else:
                    drift_velocities[col] = 0.0

            # 2. Regression-based Time-To-Threshold (TTT) Forecasting
            ttt_forecasts = {}
            for col in self.spec_limits.keys():
                if col in wafer_df.columns and len(w_time) >= 3:
                    w_sensor = wafer_df[col].iloc[start_idx : i + 1].values
                    ttt_forecasts[col] = self.forecaster.predict_ttt(w_time, w_sensor, col)
                else:
                    ttt_forecasts[col] = {"ttt_seconds": float("inf"), "breach_type": "STABLE"}

            # 3. Top Deviating Features
            top_deviations = self.anomaly_detector.get_top_anomalous_features(sample, top_k=3)

            # 4. Rule-Based Alert Engine Validation
            alert_decision = self.alert_engine.evaluate_sample(
                timestamp=t_curr,
                stacking_class=stacking_preds[i],
                stacking_proba=stacking_probas[i],
                anomaly_score=anom_scores[i],
                is_isolated_anomaly=is_anoms[i],
                drift_velocities=drift_velocities,
                ttt_forecasts=ttt_forecasts,
                top_deviations=top_deviations
            )
            
            stream_results.append(alert_decision)

        return stream_results

    def save(self, filepath: str = "models/hybrid_wafer_pipeline.joblib"):
        """Saves entire pipeline artifact to disk."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self, filepath)
        print(f"[+] Pipeline successfully saved to {filepath}")

    @classmethod
    def load(cls, filepath: str = "models/hybrid_wafer_pipeline.joblib") -> "HybridWaferPipeline":
        """Loads fitted pipeline from disk."""
        pipeline = joblib.load(filepath)
        print(f"[+] Pipeline loaded from {filepath}")
        return pipeline
