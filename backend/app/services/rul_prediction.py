"""Phase 8 DS05 XGBoost RUL inference and SHAP explanations."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[3]
ARTIFACT_DIR = PROJECT_ROOT / "phase7_evaluation" / "outputs"
MODEL_PATH = ARTIFACT_DIR / "xgboost_ds05_final_dev_engines_1_6.joblib"
FEATURES_PATH = ARTIFACT_DIR / "feature_columns.json"
DEV_FLIGHTS_PATH = PROJECT_ROOT / "phase4_ncmapss" / "data" / "processed" / "ncmapss_ds05_dev_flights.csv"


class RULModelError(RuntimeError):
    """Raised when the final DS05 model or its metadata cannot be used."""


@lru_cache(maxsize=2)
def _load_cached(model_mtime_ns: int, model_size: int, features_mtime_ns: int, features_size: int):
    del model_mtime_ns, model_size, features_mtime_ns, features_size
    if not MODEL_PATH.is_file() or not FEATURES_PATH.is_file():
        raise RULModelError(
            "Final DS05 model artifacts are missing. Expected model and feature_columns.json "
            f"under {ARTIFACT_DIR}."
        )
    try:
        model = joblib.load(MODEL_PATH)
        features = json.loads(FEATURES_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        raise RULModelError(f"Could not load DS05 RUL artifacts: {exc}") from exc
    if not isinstance(features, list) or len(features) != 72 or not all(isinstance(x, str) for x in features):
        raise RULModelError("Feature metadata must contain exactly 72 feature names.")
    return model, features


def load_model():
    if not MODEL_PATH.is_file() or not FEATURES_PATH.is_file():
        raise RULModelError(f"DS05 RUL model artifacts not found in {ARTIFACT_DIR}")
    ms, fs = MODEL_PATH.stat(), FEATURES_PATH.stat()
    return _load_cached(ms.st_mtime_ns, ms.st_size, fs.st_mtime_ns, fs.st_size)


def model_status() -> dict[str, Any]:
    available = MODEL_PATH.is_file() and FEATURES_PATH.is_file()
    payload = {
        "model_available": available,
        "model_path": str(MODEL_PATH),
        "feature_metadata_path": str(FEATURES_PATH),
        "development_dataset_available": DEV_FLIGHTS_PATH.is_file(),
        "feature_count_expected": 72,
        "training_engines": [1, 2, 3, 4, 5, 6],
        "independent_test_engines": [7, 8, 9, 10],
    }
    if available:
        try:
            _, features = load_model()
            payload["feature_count_loaded"] = len(features)
        except RULModelError as exc:
            payload["load_error"] = str(exc)
    return payload


def _validated_frame(rows: list[dict[str, Any]], features: list[str]) -> pd.DataFrame:
    if not rows:
        raise ValueError("At least one feature row is required.")
    frame = pd.DataFrame(rows)
    missing = [f for f in features if f not in frame.columns]
    if missing:
        raise ValueError(f"Missing required features ({len(missing)}): {', '.join(missing[:12])}")
    try:
        frame = frame.loc[:, features].apply(pd.to_numeric, errors="raise").astype(float)
    except (TypeError, ValueError) as exc:
        raise ValueError("All 72 model features must be numeric.") from exc
    if not np.isfinite(frame.to_numpy()).all():
        raise ValueError("Feature values must not contain NaN or infinity.")
    return frame


def predict_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    model, features = load_model()
    frame = _validated_frame(rows, features)
    predictions = np.asarray(model.predict(frame), dtype=float)
    if not np.isfinite(predictions).all():
        raise RULModelError("Model returned a non-finite prediction.")
    return [
        {
            "predicted_rul_cycles": float(value),
            "predicted_rul_nonnegative_cycles": float(max(0.0, value)),
            "raw_prediction_preserved": True,
        }
        for value in predictions
    ]


def list_development_engines() -> dict[str, Any]:
    if not DEV_FLIGHTS_PATH.is_file():
        raise RULModelError(f"Processed DS05 development flights not found: {DEV_FLIGHTS_PATH}")
    try:
        frame = pd.read_csv(DEV_FLIGHTS_PATH, usecols=["unit", "cycle"])
    except Exception as exc:
        raise RULModelError(f"Could not read DS05 development flight index: {exc}") from exc
    engines = []
    for engine, group in frame.groupby("unit", sort=True):
        engines.append({
            "engine_id": int(engine),
            "flight_count": int(len(group)),
            "first_cycle": int(group["cycle"].min()),
            "last_cycle": int(group["cycle"].max()),
        })
    return {"data_source": "development_only", "engines": engines}


def predict_development_engine(engine_id: int) -> dict[str, Any]:
    if engine_id not in {1, 2, 3, 4, 5, 6}:
        raise ValueError("Only development engines 1–6 are available for historical inference.")
    if not DEV_FLIGHTS_PATH.is_file():
        raise RULModelError(f"Processed DS05 development flights not found: {DEV_FLIGHTS_PATH}")
    model, features = load_model()
    try:
        frame = pd.read_csv(DEV_FLIGHTS_PATH)
    except Exception as exc:
        raise RULModelError(f"Could not read development flights: {exc}") from exc
    selected = frame.loc[frame["unit"] == engine_id].copy().sort_values("cycle")
    if selected.empty:
        raise ValueError(f"Development engine {engine_id} was not found.")
    X = _validated_frame(selected.to_dict(orient="records"), features)
    preds = np.asarray(model.predict(X), dtype=float)
    selected["predicted_rul"] = preds
    output_cols = ["unit", "cycle", "rul_mean", "predicted_rul"]
    return {
        "engine_id": engine_id,
        "data_source": "development_only",
        "rows": int(len(selected)),
        "predictions": [
            {
                "cycle": int(row.cycle),
                "actual_rul_for_development_analysis": float(row.rul_mean),
                "predicted_rul_cycles": float(row.predicted_rul),
            }
            for row in selected[output_cols].itertuples(index=False)
        ],
        "warning": "Development-set predictions are not independent test results and must not be presented as such.",
    }


def explain_rows(rows: list[dict[str, Any]], max_rows: int = 5) -> dict[str, Any]:
    """Return optional local TreeSHAP contributions; lazily imports SHAP."""
    model, features = load_model()
    frame = _validated_frame(rows[:max_rows], features)
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        values = np.asarray(explainer.shap_values(frame), dtype=float)
        base = np.asarray(explainer.expected_value, dtype=float).reshape(-1)
        base_value = float(base[0] if len(base) else 0.0)
    except Exception as exc:
        raise RULModelError(f"SHAP explanation failed: {exc}") from exc
    explanations = []
    for idx in range(len(frame)):
        contributions = [
            {"feature": name, "shap_value": float(value)}
            for name, value in zip(features, values[idx])
        ]
        contributions.sort(key=lambda item: abs(item["shap_value"]), reverse=True)
        explanations.append({
            "base_value": base_value,
            "prediction": float(model.predict(frame.iloc[[idx]])[0]),
            "top_contributions": contributions[:15],
        })
    return {
        "method": "SHAP TreeExplainer",
        "interpretation": "Feature attribution, not physical causation.",
        "explanations": explanations,
    }
