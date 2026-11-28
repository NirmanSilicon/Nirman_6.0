from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, AsyncIterator

from .telemetry import build_telemetry_message, next_simulated_timestamp


async def replay_rows(
    rows: list[dict[str, Any]], interval_seconds: float = 1.0,
    start_sequence: int = 1, source: str = "CSV_REPLAY",
) -> AsyncIterator[dict[str, Any]]:
    if interval_seconds < 0:
        raise ValueError("interval_seconds must be zero or greater")
    timestamp = datetime.now(timezone.utc)
    for offset, row in enumerate(rows):
        if interval_seconds:
            await asyncio.sleep(interval_seconds)
        yield build_telemetry_message(row, start_sequence + offset, timestamp, source=source)
        timestamp = next_simulated_timestamp(timestamp, 1.0)
