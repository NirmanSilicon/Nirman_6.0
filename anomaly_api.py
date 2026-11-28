"""Small FastAPI inference service for the AEROSENTRY Phase 3 FD001 model.

Start after running phase3_complete.py:
    uvicorn anomaly_api:app --host 127.0.0.1 --port 8000

The caller must provide a per-engine healthy calibration window and the latest
six ordered observations. This is a local research/demo API, not a live aircraft
or certified maintenance system.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "raw" / "FD001" / "train_FD001.txt"
STATIC_DIR = ROOT / "static"
MODEL_PATH = ROOT / "outputs" / "aerosentry_phase3_model.joblib"

app = FastAPI(
    title="AEROSENTRY Phase 3 Anomaly API",
    version="1.0.0",
    description="Synthetic-benchmark anomaly scoring using the NASA C-MAPSS FD001 prototype model.",
)


class AnomalyRequest(BaseModel):
    engine_id: str = Field(..., min_length=1, max_length=64)
    # Historical, assumed-healthy readings for this engine, ideally >= 8 cycles.
    baseline: list[dict[str, float]] = Field(..., min_length=8)
    # Last six consecutive observations, oldest to newest.
    window: list[dict[str, float]] = Field(..., min_length=6, max_length=6)


def get_bundle():
    if not MODEL_PATH.exists():
        raise RuntimeError(
            "Model file is missing. Run `python phase3_complete.py` before starting the API."
        )
    return joblib.load(MODEL_PATH)


BUNDLE = get_bundle()
COLS = ["unit", "cycle", "setting_1", "setting_2", "setting_3"] + [f"sensor_{i}" for i in range(1, 22)]
DEMO_DATA = pd.read_csv(DATA_PATH, sep=r"\s+", header=None, names=COLS) if DATA_PATH.exists() else None
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def validate_rows(rows: list[dict[str, float]], features: list[str], label: str):
    frame = pd.DataFrame(rows)
    missing = [name for name in features if name not in frame.columns]
    if missing:
        raise ValueError(f"{label} is missing required features: {', '.join(missing)}")
    frame = frame[features].astype(float)
    if not np.isfinite(frame.to_numpy()).all():
        raise ValueError(f"{label} contains a NaN or infinite value.")
    return frame


def calculate_scores(bundle: dict[str, Any], baseline_rows, window_rows):
    features = bundle["features"]
    sensors = bundle["sensor_features"]
    flatline_features = bundle["flatline_features"]
    baseline = validate_rows(baseline_rows, features, "baseline")
    window = validate_rows(window_rows, features, "window")

    last = window.iloc[[-1]]
    lof_score = float(-bundle["lof"].score_samples(bundle["scaler"].transform(last))[0])
    isolation_forest_score = float(-bundle["isolation_forest"].score_samples(bundle["scaler"].transform(last))[0])

    spike_values = {}
    for sensor in sensors:
        centre = float(baseline[sensor].median())
        scale = float(baseline[sensor].std(ddof=1))
        scale = max(scale if np.isfinite(scale) else 0.0,
                    float(bundle["global_sensor_scales"][sensor]) * 0.03, 1e-8)
        spike_values[sensor] = abs(float(last.iloc[0][sensor]) - centre) / scale
    spike_z = max(spike_values.values())

    stuck_values = {}
    for sensor in flatline_features:
        current_range = float(np.ptp(window[sensor].to_numpy(dtype=float)))
        reference_range = float(bundle["rolling_range_q05"][sensor])
        stuck_values[sensor] = reference_range / max(current_range, 1e-8)
    stuck_score = max(stuck_values.values()) if stuck_values else 0.0

    thresholds = bundle["thresholds"]
    triggered = []
    flagged_sensors = []
    if lof_score >= thresholds["lof_score"]:
        triggered.append("local_density_outlier")
    if spike_z >= thresholds["spike_z"]:
        triggered.append("point_sensor_deviation")
        flagged_sensors.extend(
            sensor for sensor, value in spike_values.items()
            if value >= thresholds["spike_z"]
        )
    if stuck_score >= thresholds["stuck_score"]:
        triggered.append("possible_sensor_flatline")
        flagged_sensors.extend(
            sensor for sensor, value in stuck_values.items()
            if value >= thresholds["stuck_score"]
        )

    return {
        "engine_id": None,
        "status": "possible_anomaly" if triggered else "no_anomaly_detected",
        "triggered_checks": sorted(set(triggered)),
        "flagged_sensors": sorted(set(flagged_sensors)),
        "scores": {
            "lof": lof_score,
            "isolation_forest_reference": isolation_forest_score,
            "maximum_sensor_deviation_z": float(spike_z),
            "flatline_score": float(stuck_score),
        },
        "thresholds": thresholds,
        "interpretation": (
            "Unusual telemetry detected; this is not a confirmed component failure."
            if triggered else
            "No configured anomaly rule was triggered in this window; this does not prove the engine is fault-free."
        ),
        "data_note": "NASA C-MAPSS FD001 simulation-based prototype; not validated for live aircraft maintenance.",
    }


@app.get("/phase3", include_in_schema=False)
def phase3_console():
    page = STATIC_DIR / "phase3_console.html"
    if not page.exists():
        raise HTTPException(status_code=404, detail="Phase 3 console page is missing.")
    return FileResponse(page)


@app.get("/api/demo/engines")
def demo_engines():
    if DEMO_DATA is None:
        raise HTTPException(status_code=503, detail="FD001 training data is unavailable.")
    rows = []
    for unit, group in DEMO_DATA.groupby("unit"):
        rows.append({"engine_id": int(unit), "max_cycle": int(group.cycle.max())})
    return {"mode": "historical_replay", "engines": rows}


@app.get("/api/demo/analyze")
def demo_analyze(
    engine_id: int = Query(1, ge=1),
    end_cycle: int = Query(26, ge=26),
):
    """Score the last six historical rows after using the first 20 as baseline."""
    if DEMO_DATA is None:
        raise HTTPException(status_code=503, detail="FD001 training data is unavailable.")
    group = DEMO_DATA.loc[DEMO_DATA.unit == engine_id].sort_values("cycle").copy()
    if group.empty:
        raise HTTPException(status_code=404, detail=f"Engine {engine_id} was not found.")
    max_cycle = int(group.cycle.max())
    if end_cycle > max_cycle:
        raise HTTPException(status_code=422, detail=f"end_cycle must be <= {max_cycle} for this engine.")
    baseline_rows = group.loc[group.cycle <= 20, BUNDLE["features"]]
    window_rows = group.loc[(group.cycle > end_cycle - 6) & (group.cycle <= end_cycle), BUNDLE["features"]]
    if len(baseline_rows) < 8 or len(window_rows) != 6:
        raise HTTPException(status_code=422, detail="Not enough sequential observations for this replay window.")
    result = calculate_scores(BUNDLE, baseline_rows.to_dict(orient="records"), window_rows.to_dict(orient="records"))
    result["engine_id"] = str(engine_id)
    result["current_cycle"] = int(end_cycle)
    result["mode"] = "historical_replay"
    return result


@app.get("/health")
def health():
    return {"status": "ok", "model_version": BUNDLE["model_version"], "feature_count": len(BUNDLE["features"])}


@app.post("/api/anomaly/score")
def score_anomaly(payload: AnomalyRequest):
    try:
        result = calculate_scores(BUNDLE, payload.baseline, payload.window)
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    result["engine_id"] = payload.engine_id
    return result
