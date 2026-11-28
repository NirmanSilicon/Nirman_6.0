"""XGBoost fault diagnosis and TreeSHAP explainability service for AlarmSense."""

import json
from pathlib import Path
from typing import TypedDict
import joblib
import numpy as np
import pandas as pd
import shap
from xgboost import XGBClassifier

from app.config import (
    DEFAULT_WINDOW_SIZE,
    FAULT_METADATA,
    SENSOR_COLS,
    get_sensor_label,
    get_sensor_unit,
)
from app.services.features import STAT_NAMES, extract_single_window, get_feature_names

DEFAULT_ARTIFACTS_DIR = Path(__file__).resolve().parents[2] / "artifacts"


class TopCauseDict(TypedDict):
    """Predicted fault candidate ranked by model probability."""

    fault_id: int
    name: str
    unit: str
    probability: float


class ShapEvidenceDict(TypedDict):
    """TreeSHAP feature attribution for the predicted fault class."""

    feature: str
    sensor: str
    label: str
    unit: str
    stat: str
    shap_value: float
    feature_value: float
    impact_direction: str


class PredictionResult(TypedDict):
    """Structured prediction and TreeSHAP explanation output."""

    predicted_fault_id: int
    confidence: float
    top_causes: list[TopCauseDict]
    shap_evidence: list[ShapEvidenceDict]


def _split_feature_name(feature_name: str) -> tuple[str, str]:
    """Split '<SENSOR>_<STAT>' safely even when STAT contains underscores (e.g. linear_trend)."""
    for stat in STAT_NAMES:
        suffix = f"_{stat}"
        if feature_name.endswith(suffix):
            return feature_name[: -len(suffix)], stat
    if "_" in feature_name:
        sensor, stat = feature_name.rsplit("_", 1)
        return sensor, stat
    return feature_name, "value"


class PredictorService:
    """Loads persisted XGBoost, StandardScaler, baseline, and TreeSHAP explainer once."""

    def __init__(self, artifacts_dir: str | Path = DEFAULT_ARTIFACTS_DIR) -> None:
        """Load model artifacts and initialize TreeSHAP explainer."""
        self.artifacts_dir = Path(artifacts_dir)
        model_path = self.artifacts_dir / "xgb_model.json"
        scaler_path = self.artifacts_dir / "scaler.joblib"
        baseline_path = self.artifacts_dir / "baseline.json"
        label_map_path = self.artifacts_dir / "label_map.json"

        for path in (model_path, scaler_path, baseline_path, label_map_path):
            if not path.is_file():
                raise FileNotFoundError(f"Required model artifact not found: {path}")

        self.model = XGBClassifier()
        self.model.load_model(model_path)

        self.scaler = joblib.load(scaler_path)
        self.baseline: pd.DataFrame = pd.read_json(baseline_path, orient="index")

        with open(label_map_path, encoding="utf-8") as f:
            label_map = json.load(f)

        self.plant_id: str = str(label_map.get("plant_id", "tep"))
        self.plant_name: str = str(label_map.get("plant_name", "Tennessee Eastman Process"))
        self.sensor_cols: list[str] = list(label_map.get("sensor_cols", SENSOR_COLS))
        self.fault_names: dict[int, str] = {
            int(k): str(v) for k, v in label_map.get("fault_names", {}).items()
        }
        self.fault_to_idx: dict[int, int] = {
            int(k): int(v) for k, v in label_map["fault_to_idx"].items()
        }
        self.idx_to_fault: dict[int, int] = {
            int(k): int(v) for k, v in label_map["idx_to_fault"].items()
        }
        self.classes: list[int] = [int(c) for c in label_map["classes"]]
        self.window_size: int = int(label_map.get("window_size", DEFAULT_WINDOW_SIZE))
        self.feature_names: list[str] = list(
            label_map.get("feature_names", get_feature_names(self.sensor_cols))
        )

        # Initialize TreeExplainer once at startup for low-latency live SHAP attributions
        self.explainer = shap.TreeExplainer(self.model)

        # Warm up predict_proba and shap_values on a zero vector to avoid first-request overhead
        dummy = np.zeros((1, len(self.feature_names)), dtype=np.float32)
        dummy_scaled = self.scaler.transform(dummy).astype(np.float32)
        _ = self.model.predict_proba(dummy_scaled)
        _ = self.explainer.shap_values(dummy_scaled)

    def _extract_class_shap(self, shap_values: object, pred_idx: int) -> np.ndarray:
        """Extract 1D SHAP vector for a specific predicted class across SHAP output formats."""
        if isinstance(shap_values, list):
            return np.asarray(shap_values[pred_idx], dtype=np.float64)[0]

        sv_arr = np.asarray(shap_values, dtype=np.float64)
        if sv_arr.ndim == 3:
            # Modern SHAP multi-class layout: (n_samples, n_features, n_classes)
            return sv_arr[0, :, pred_idx]
        if sv_arr.ndim == 2:
            return sv_arr[0]
        raise ValueError(f"Unexpected SHAP values array shape: {sv_arr.shape}")

    def predict_window(self, window_df: pd.DataFrame, top_k: int = 3) -> PredictionResult:
        """Predict fault probabilities and compute top-k TreeSHAP feature attributions.

        Args:
            window_df: DataFrame with at least window_size rows covering SENSOR_COLS.
            top_k: Number of top candidate causes and SHAP features to return (default 3).

        Returns:
            PredictionResult: Dictionary containing predicted_fault_id, confidence,
                top_causes, and shap_evidence.
        """
        if top_k < 1:
            raise ValueError(f"top_k must be >= 1, got {top_k}")

        x_raw = extract_single_window(
            window_df=window_df,
            sensor_cols=self.sensor_cols,
            window_size=self.window_size,
        )
        x_scaled = self.scaler.transform(x_raw).astype(np.float32)

        probs = self.model.predict_proba(x_scaled)[0]
        sorted_indices = np.argsort(probs)[::-1]

        pred_idx = int(sorted_indices[0])
        predicted_fault_id = self.idx_to_fault[pred_idx]
        confidence = round(float(probs[pred_idx]), 4)

        top_causes: list[TopCauseDict] = []
        for idx in sorted_indices[:top_k]:
            class_idx = int(idx)
            f_id = self.idx_to_fault[class_idx]
            if self.plant_id == "tep" and f_id in FAULT_METADATA:
                meta = FAULT_METADATA[f_id]
                cause_name = meta["name"]
                cause_unit = meta["unit"]
            else:
                cause_name = self.fault_names.get(
                    f_id,
                    "Normal" if f_id == 0 else f"Fault {f_id}",
                )
                cause_unit = self.plant_name
            top_causes.append(
                {
                    "fault_id": f_id,
                    "name": cause_name,
                    "unit": cause_unit,
                    "probability": round(float(probs[class_idx]), 4),
                }
            )

        raw_shap = self.explainer.shap_values(x_scaled)
        class_shap = self._extract_class_shap(raw_shap, pred_idx)

        top_feat_indices = np.argsort(np.abs(class_shap))[::-1][:top_k]
        shap_evidence: list[ShapEvidenceDict] = []
        for f_idx in top_feat_indices:
            idx_int = int(f_idx)
            feat_name = self.feature_names[idx_int]
            sensor, stat = _split_feature_name(feat_name)
            shap_val = round(float(class_shap[idx_int]), 4)
            feat_val = round(float(x_raw[0, idx_int]), 4)
            shap_evidence.append(
                {
                    "feature": feat_name,
                    "sensor": sensor,
                    "label": get_sensor_label(sensor),
                    "unit": get_sensor_unit(sensor),
                    "stat": stat,
                    "shap_value": shap_val,
                    "feature_value": feat_val,
                    "impact_direction": "positive" if shap_val >= 0.0 else "negative",
                }
            )

        return {
            "predicted_fault_id": predicted_fault_id,
            "confidence": confidence,
            "top_causes": top_causes,
            "shap_evidence": shap_evidence,
        }
