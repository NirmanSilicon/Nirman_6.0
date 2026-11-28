from __future__ import annotations

from pathlib import Path
from typing import Any
import pandas as pd


class TelemetryDataError(ValueError):
    pass


ENGINE_COLUMNS = ("engine_id", "unit_nr", "unit", "engine")
CYCLE_COLUMNS = ("cycle", "time_cycles", "cycle_number", "time")


def _find_column(columns: list[str], candidates: tuple[str, ...]) -> str | None:
    lowered = {column.lower(): column for column in columns}
    return next((lowered[name] for name in candidates if name in lowered), None)


def load_engine_rows(csv_path: str | Path, engine_id: str | int | None = None) -> list[dict[str, Any]]:
    # N-CMAPSS HDF5 should first be converted by the data pipeline to this
    # canonical row format. The simulator itself stays dataset-independent.
    path = Path(csv_path)
    if not path.is_file():
        raise TelemetryDataError(f"Telemetry CSV not found: {path}")
    try:
        frame = pd.read_csv(path)
    except Exception as exc:
        raise TelemetryDataError(f"Could not read telemetry CSV: {exc}") from exc
    if frame.empty:
        raise TelemetryDataError("Telemetry CSV contains no rows.")

    engine_col = _find_column(list(frame.columns), ENGINE_COLUMNS)
    cycle_col = _find_column(list(frame.columns), CYCLE_COLUMNS)
    if engine_col is None or cycle_col is None:
        raise TelemetryDataError("CSV must contain engine_id (or unit_nr) and cycle (or time_cycles).")

    if engine_id is None:
        values = frame[engine_col].dropna().unique().tolist()
        if not values:
            raise TelemetryDataError("No engine IDs found.")
        engine_id = values[0]

    selected = frame[frame[engine_col].astype(str) == str(engine_id)].copy()
    if selected.empty:
        available = frame[engine_col].dropna().astype(str).unique().tolist()[:20]
        raise TelemetryDataError(f"Engine {engine_id!r} not found. Available IDs: {available}")

    excluded = {engine_col, cycle_col}
    # Never stream target labels or hidden evaluation metadata as if they were
    # measured sensor values. In particular, N-CMAPSS flight summaries contain
    # rul_* columns and health_state_code for evaluation only.
    metadata_names = {"flight_class", "health_state_code", "samples_in_flight", "hs", "fc"}
    numeric_columns = [
        col for col in selected.columns
        if col not in excluded
        and col.lower() not in metadata_names
        and not col.lower().startswith(("rul", "target_", "label_"))
        and pd.api.types.is_numeric_dtype(selected[col])
    ]
    if not numeric_columns:
        raise TelemetryDataError("No numeric sensor or operating-condition columns found.")

    selected[cycle_col] = pd.to_numeric(selected[cycle_col], errors="coerce")
    selected[numeric_columns] = selected[numeric_columns].apply(pd.to_numeric, errors="coerce")
    selected = selected.dropna(subset=[cycle_col] + numeric_columns).sort_values(cycle_col)
    if selected.empty:
        raise TelemetryDataError("Selected engine has no valid numeric telemetry rows.")

    rows = []
    for _, row in selected.iterrows():
        sensors = {c: float(row[c]) for c in numeric_columns if c.lower().startswith("sensor")}
        settings = {
            c: float(row[c]) for c in numeric_columns
            if c.lower().startswith(("setting", "op_", "operating_", "alt_", "mach_", "tra_", "t2_"))
        }
        other = {c: float(row[c]) for c in numeric_columns if c not in sensors and c not in settings}
        rows.append({
            "engine_id": str(engine_id),
            "source_cycle": int(row[cycle_col]) if float(row[cycle_col]).is_integer() else float(row[cycle_col]),
            "sensors": sensors or other,
            "operating_conditions": settings,
        })
    return rows
