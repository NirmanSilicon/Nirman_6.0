"""ParkSMART - Operational Analytics and Reports Service (File 128)."""

from __future__ import annotations

import csv
import io
import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.reports import repository as repo
from app.schemas.common import Provenance


@dataclass
class ReportTable:
    columns: list[str]
    rows: list[list[Any]]
    provenance: Provenance
    notes: list[str]


def to_csv_stream(table: ReportTable) -> Iterator[str]:
    """Streams CSV string lines with formula injection sanitization."""
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(table.columns)
    yield output.getvalue()
    output.seek(0)
    output.truncate(0)

    for row in table.rows:
        sanitized = []
        for cell in row:
            s = str(cell) if cell is not None else ""
            if s and s[0] in ("=", "+", "-", "@"):
                s = f"'{s}"
            sanitized.append(s)
        writer.writerow(sanitized)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)


async def reservations_summary(
    db: AsyncSession,
    zone_id: uuid.UUID | None,
    from_ts: datetime,
    to_ts: datetime,
    kind: str = "all",
) -> ReportTable:
    """Aggregates reservation statistics, completion, and no-show rates."""
    raw = await repo.reservation_counts(db, zone_id, from_ts, to_ts, kind)
    cols = ["date", "kind", "status", "count"]
    rows = [[str(r[0]), r[1], r[2], r[3]] for r in raw]
    return ReportTable(
        columns=cols,
        rows=rows,
        provenance=Provenance.HISTORICAL,
        notes=["Excludes pending reservations from terminal rate calculations"],
    )


async def data_quality(
    db: AsyncSession,
    zone_id: uuid.UUID | None,
    from_ts: datetime,
    to_ts: datetime,
) -> ReportTable:
    """Generates sensor connectivity and observation quality metrics."""
    obs = await repo.observation_counts(db, zone_id, from_ts, to_ts)
    cols = ["camera_id", "received_observations", "avg_interval_s"]
    rows = [[str(o[0]), o[1], o[2]] for o in obs]
    return ReportTable(
        columns=cols,
        rows=rows,
        provenance=Provenance.OBSERVED,
        notes=["Future-skewed rejected messages are not counted"],
    )


async def forecast_evaluation(
    db: AsyncSession,
    zone_id: uuid.UUID,
    target: str,
    from_ts: datetime,
    to_ts: datetime,
) -> ReportTable:
    """Evaluates forecast accuracy against realized aggregate outcomes."""
    pairs = await repo.forecast_vs_actual(db, zone_id, target, from_ts, to_ts)
    cols = ["target_ts", "forecast_mean", "actual_value", "model_version_id"]
    rows = [[p[0].isoformat(), p[1], p[2], p[3]] for p in pairs]
    return ReportTable(
        columns=cols,
        rows=rows,
        provenance=Provenance.HISTORICAL,
        notes=["Metrics on simulated data do not represent real-world accuracy"],
    )
