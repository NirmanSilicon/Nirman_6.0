"""Phase 3 FD001 anomaly inference, shared by the consolidated FastAPI service."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODEL_PATH = PROJECT_ROOT / "outputs" / "aerosentry_phase3_model.joblib"
TRAIN_PATH = PROJECT_ROOT / "data" / "raw" / "FD001" / "train_FD001.txt"
DATA_COLUMNS = ["unit", "cycle", "setting_1", "setting_2", "setting_3"] + [f"sensor_{i}" for i in range(1, 22)]


class AnomalyModelError(RuntimeError):
    """Raised when the Phase 3 model or its source data is unavailable."""


@lru_cache(maxsize=1)
def _load_bundle_cached(model_mtime_ns: int, model_size: int) -> dict[str, Any]:
    del model_mtime_ns, model_size
    if not MODEL_PATH.is_file():
        raise AnomalyModelError(
            f"Phase 3 model is missing at {MODEL_PATH}. Run python phase3_complete.py first."
        )
    try:
        bundle = joblib.load(MODEL_PATH)
    except Exception as exc:
        raise AnomalyModelError(f"Could not load the Phase 3 model bundle: {exc}") from exc
    required = {"model_version", "features", "sensor_features", "flatline_features", "scaler", "lof", "isolation_forest", "thresholds", "global_sensor_scales", "rolling_range_q05"}
    missing = sorted(required - set(bundle))
    if missing:
        raise AnomalyModelError(f"Phase 3 model bundle is missing fields: {missing}")
    return bundle


def get_bundle() -> dict[str, Any]:
    if not MODEL_PATH.is_file():
        raise AnomalyModelError(
            f"Phase 3 model is not available at {MODEL_PATH}. Run python phase3_complete.py first."
        )
    stat = MODEL_PATH.stat()
    return _load_bundle_cached(stat.st_mtime_ns, stat.st_size)


def model_status() -> dict[str, Any]:
    available = MODEL_PATH.is_file()
    response: dict[str, Any] = {
        "model_available": available,
        "model_path": str(MODEL_PATH),
        "dataset_available": TRAIN_PATH.is_file(),
    }
    if available:
        try:
            bundle = get_bundle()
            response.update({
                "model_version": bundle.get("model_version", "unknown"),
                "feature_count": len(bundle.get("features", [])),
                "features": list(bundle.get("features", [])),
                "thresholds": bundle.get("thresholds", {}),
            })
        except AnomalyModelError as exc:
            response["load_error"] = str(exc)
    return response


def validate_rows(rows: list[dict[str, float]], features: list[str], label: str) -> pd.DataFrame:
    frame = pd.DataFrame(rows)
    missing = [name for name in features if name not in frame.columns]
    if missing:
        raise ValueError(f"{label} is missing required features: {', '.join(missing)}")
    try:
        frame = frame[features].astype(float)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{label} contains a non-numeric feature value.") from exc
    if not np.isfinite(frame.to_numpy(dtype=float)).all():
        raise ValueError(f"{label} contains a NaN or infinite value.")
    return frame


def calculate_scores(bundle: dict[str, Any], baseline_rows, window_rows, engine_id: str | None = None) -> dict[str, Any]:
    features = bundle["features"]
    sensors = bundle["sensor_features"]
    flatline_features = bundle["flatline_features"]
    baseline = validate_rows(baseline_rows, features, "baseline")
    window = validate_rows(window_rows, features, "window")

    last = window.iloc[[-1]]
    scaled_last = bundle["scaler"].transform(last)
    lof_score = float(-bundle["lof"].score_samples(scaled_last)[0])
    isolation_forest_score = float(-bundle["isolation_forest"].score_samples(scaled_last)[0])

    spike_values: dict[str, float] = {}
    for sensor in sensors:
        centre = float(baseline[sensor].median())
        scale = float(baseline[sensor].std(ddof=1))
        scale = max(
            scale if np.isfinite(scale) else 0.0,
            float(bundle["global_sensor_scales"][sensor]) * 0.03,
            1e-8,
        )
        spike_values[sensor] = abs(float(last.iloc[0][sensor]) - centre) / scale
    spike_z = max(spike_values.values(), default=0.0)

    stuck_values: dict[str, float] = {}
    for sensor in flatline_features:
        current_range = float(np.ptp(window[sensor].to_numpy(dtype=float)))
        reference_range = float(bundle["rolling_range_q05"][sensor])
        stuck_values[sensor] = reference_range / max(current_range, 1e-8)
    stuck_score = max(stuck_values.values(), default=0.0)

    thresholds = bundle["thresholds"]
    triggered: list[str] = []
    flagged_sensors: list[str] = []
    evidence: list[dict[str, Any]] = []
    if lof_score >= thresholds["lof_score"]:
        triggered.append("local_density_outlier")
        evidence.append({"check": "local_density_outlier", "score": lof_score, "threshold": float(thresholds["lof_score"])})
    if spike_z >= thresholds["spike_z"]:
        triggered.append("point_sensor_deviation")
        flagged_sensors.extend(sensor for sensor, value in spike_values.items() if value >= thresholds["spike_z"])
        evidence.append({"check": "point_sensor_deviation", "score": float(spike_z), "threshold": float(thresholds["spike_z"])})
    if stuck_score >= thresholds["stuck_score"]:
        triggered.append("possible_sensor_flatline")
        flagged_sensors.extend(sensor for sensor, value in stuck_values.items() if value >= thresholds["stuck_score"])
        evidence.append({"check": "possible_sensor_flatline", "score": float(stuck_score), "threshold": float(thresholds["stuck_score"])})

    unique_triggers = sorted(set(triggered))
    unique_sensors = sorted(set(flagged_sensors))
    if not unique_triggers:
        assessment = "no_configured_anomaly_rule_triggered"
    elif len(unique_sensors) >= 2:
        assessment = "multi_sensor_pattern"
    elif unique_sensors:
        assessment = "possible_sensor_anomaly"
    else:
        assessment = "multivariate_pattern_requires_review"

    return {
        "engine_id": engine_id,
        "status": "possible_anomaly" if unique_triggers else "no_anomaly_detected",
        "assessment": assessment,
        "model_version": bundle.get("model_version", "unknown"),
        "triggered_checks": unique_triggers,
        "flagged_sensors": unique_sensors,
        "evidence": evidence,
        "scores": {
            "lof": lof_score,
            "isolation_forest_reference": isolation_forest_score,
            "maximum_sensor_deviation_z": float(spike_z),
            "flatline_score": float(stuck_score),
        },
        "thresholds": {key: float(value) for key, value in thresholds.items()},
        "interpretation": (
            "Unusual telemetry was detected. Review the indicated channels and time window; this is not a confirmed component failure."
            if unique_triggers else
            "No configured anomaly rule was triggered in this window. This does not prove that the engine is fault-free."
        ),
        "data_note": "NASA C-MAPSS FD001 is simulated degradation data. Isolated sensor fault labels in evaluation are synthetic injections, not NASA ground-truth fault labels.",
    }


def _load_training_data() -> pd.DataFrame:
    if not TRAIN_PATH.is_file():
        raise AnomalyModelError(f"FD001 training data is missing: {TRAIN_PATH}")
    try:
        frame = pd.read_csv(TRAIN_PATH, sep=r"\s+", header=None, names=DATA_COLUMNS)
    except Exception as exc:
        raise AnomalyModelError(f"Could not read FD001 training data: {exc}") from exc
    if frame.empty or frame.isna().any().any():
        raise AnomalyModelError("FD001 training data is empty or contains invalid values.")
    return frame.sort_values(["unit", "cycle"]).reset_index(drop=True)


def list_engines() -> dict[str, Any]:
    frame = _load_training_data()
    engines = [
        {"engine_id": int(unit), "max_cycle": int(group["cycle"].max())}
        for unit, group in frame.groupby("unit", sort=True)
    ]
    return {"mode": "historical_replay", "dataset": "NASA C-MAPSS FD001", "engines": engines}


def analyze_historical_engine(engine_id: int, end_cycle: int) -> dict[str, Any]:
    bundle = get_bundle()
    frame = _load_training_data()
    group = frame.loc[frame["unit"] == engine_id].sort_values("cycle").copy()
    if group.empty:
        raise KeyError(f"Engine {engine_id} was not found in FD001 training data.")
    max_cycle = int(group["cycle"].max())
    if end_cycle < 26:
        raise ValueError("end_cycle must be at least 26; the demo uses 20 baseline cycles plus a six-cycle scoring window.")
    if end_cycle > max_cycle:
        raise ValueError(f"end_cycle must be <= {max_cycle} for engine {engine_id}.")
    baseline = group.loc[group["cycle"] <= 20, bundle["features"]]
    window = group.loc[(group["cycle"] > end_cycle - 6) & (group["cycle"] <= end_cycle), bundle["features"]]
    if len(baseline) < 8 or len(window) != 6:
        raise ValueError("Not enough consecutive observations for the selected replay window.")
    result = calculate_scores(bundle, baseline.to_dict(orient="records"), window.to_dict(orient="records"), str(engine_id))
    result.update({"current_cycle": int(end_cycle), "mode": "historical_replay", "dataset": "NASA C-MAPSS FD001"})
    return result
