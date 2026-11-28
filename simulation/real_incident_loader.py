"""
simulation/real_incident_loader.py

Loader and calibrated replay telemetry generator for real NASA/ESA flight incidents.
Distinguishes between DOCUMENTED fact and ESTIMATED demo timing.
Reuses the existing Gaussian noise baseline generator to preserve calibration guarantees.
"""

import os
import json
from typing import List, Optional, Literal
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np

# Resolve directory paths
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
REAL_INCIDENTS_DIR = os.path.join(CURRENT_DIR, "real_incidents")

# Robust import of baseline generator & calibration defaults
try:
    from app.simulate.log_generator import generate_baseline, DEFAULTS
except ImportError:
    try:
        import sys
        backend_dir = os.path.abspath(os.path.join(CURRENT_DIR, "..", "backend"))
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        from app.simulate.log_generator import generate_baseline, DEFAULTS
    except ImportError:
        from log_generator import generate_baseline, DEFAULTS


class IncidentEvent(BaseModel):
    order: int
    component: str
    parameter: str = "value"
    value: float
    description: str
    timing_confidence: Literal["documented", "estimated"] = "documented"
    relative_offset_seconds: Optional[int] = None
    notes: Optional[str] = None


class RealIncidentDefinition(BaseModel):
    scenario_id: str
    display_name: str
    source_citation: str
    source_url: str
    narrative_summary: str
    events: List[IncidentEvent]
    scenario_source: Literal["real_incident"] = "real_incident"


def _find_incident_file(scenario_id: str) -> Optional[str]:
    clean_id = scenario_id.replace(".json", "")
    candidates = [
        os.path.join(REAL_INCIDENTS_DIR, f"{clean_id}.json"),
        os.path.join(CURRENT_DIR, "real_incidents", f"{clean_id}.json"),
        os.path.join("simulation", "real_incidents", f"{clean_id}.json"),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def load_real_incident(scenario_id: str) -> RealIncidentDefinition:
    """
    Loads and validates a real incident definition JSON file.
    """
    file_path = _find_incident_file(scenario_id)
    if not file_path:
        raise FileNotFoundError(f"Real incident definition not found for scenario_id='{scenario_id}'.")

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return RealIncidentDefinition(**data)


def list_real_incidents() -> List[RealIncidentDefinition]:
    """
    Discovers all available real incident JSON definitions in simulation/real_incidents/.
    """
    incidents = []
    if os.path.exists(REAL_INCIDENTS_DIR):
        for fname in sorted(os.listdir(REAL_INCIDENTS_DIR)):
            if fname.endswith(".json"):
                try:
                    incidents.append(load_real_incident(fname))
                except Exception:
                    pass
    return incidents


def generate_replay_telemetry(
    incident: RealIncidentDefinition,
    calibration: Optional[dict] = None,
    duration_seconds: int = 600,
    start_offset_seconds: int = 300,
    start_time: Optional[datetime] = None,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Synthesizes realistic flight telemetry around a real incident event sequence.
    Reuses the existing calibrated Gaussian noise generator from log_generator.py.
    """
    start_time = start_time or datetime.now(timezone.utc)
    all_components = list(DEFAULTS.keys())
    for ev in incident.events:
        if ev.component not in all_components:
            all_components.append(ev.component)

    # 1. Generate normal calibrated background baseline using existing generator
    baseline_df = generate_baseline(
        components=all_components,
        duration_seconds=duration_seconds,
        start_time=start_time,
        calibration=calibration or {},
        seed=seed,
    )

    base_start = pd.to_datetime(baseline_df["timestamp"]).min()
    incident_rows = []

    # 2. Overlay real incident sequence with documented vs estimated relative offsets
    cumulative_offset = 0
    for ev in incident.events:
        if ev.relative_offset_seconds is not None:
            actual_offset = ev.relative_offset_seconds
        else:
            actual_offset = cumulative_offset

        cumulative_offset = actual_offset + 10
        ts = base_start + timedelta(seconds=start_offset_seconds + actual_offset)

        incident_rows.append({
            "timestamp": ts.isoformat(),
            "component": ev.component,
            "parameter": ev.parameter,
            "value": ev.value,
            "injected_note": f"[{ev.timing_confidence.upper()}] {ev.description}",
            "timing_confidence": ev.timing_confidence,
        })

    incident_events_df = pd.DataFrame(incident_rows)
    combined = pd.concat([baseline_df, incident_events_df], ignore_index=True)
    return combined.sort_values("timestamp").reset_index(drop=True)
