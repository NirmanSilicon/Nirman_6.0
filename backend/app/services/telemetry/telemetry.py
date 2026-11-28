from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


def build_telemetry_message(
    row: dict[str, Any], sequence: int, simulated_timestamp: datetime,
    source: str = "CSV_REPLAY",
) -> dict[str, Any]:
    return {
        "engine_id": row["engine_id"],
        "sequence": sequence,
        "source_cycle": row["source_cycle"],
        "simulated_timestamp": simulated_timestamp.astimezone(timezone.utc).isoformat(),
        "sensors": row["sensors"],
        "operating_conditions": row["operating_conditions"],
        "source": source,
        "simulation": True,
    }


def next_simulated_timestamp(current: datetime, seconds: float = 1.0) -> datetime:
    return current + timedelta(seconds=seconds)
