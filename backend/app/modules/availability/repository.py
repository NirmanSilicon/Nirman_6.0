"""ParkSMART - Availability Probability Cache Repository (File 111)."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forecast import AvailabilityProbability


async def insert_probability(
    db: AsyncSession,
    *,
    zone_id: uuid.UUID,
    requested_arrival_ts: datetime,
    estimated_arrival_ts: datetime,
    total_capacity: int,
    expected_occupancy_pct: float | None,
    expected_available: float | None,
    probability: float | None,
    method: str,
    n_simulations: int | None,
    model_version_id: uuid.UUID | None,
    data_freshness_s: int | None,
    reliability: str,
    generated_at: datetime,
) -> AvailabilityProbability:
    """Stores calculated availability probability in cache table."""
    prob_dec = Decimal(f"{probability:.4f}") if probability is not None else None
    row = AvailabilityProbability(
        zone_id=zone_id,
        requested_arrival_ts=requested_arrival_ts,
        estimated_arrival_ts=estimated_arrival_ts,
        total_capacity=total_capacity,
        expected_occupancy_pct=expected_occupancy_pct,
        expected_available=expected_available,
        probability=prob_dec,
        method=method,
        n_simulations=n_simulations,
        model_version_id=model_version_id,
        data_freshness_s=data_freshness_s,
        reliability=reliability,
        generated_at=generated_at,
    )
    db.add(row)
    await db.flush()
    return row


async def latest_for_zone(
    db: AsyncSession, zone_id: uuid.UUID, since: datetime
) -> AvailabilityProbability | None:
    """Retrieves the newest cached availability calculation for a zone."""
    stmt = (
        select(AvailabilityProbability)
        .where(
            AvailabilityProbability.zone_id == zone_id,
            AvailabilityProbability.generated_at >= since,
        )
        .order_by(AvailabilityProbability.generated_at.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def purge_older_than(db: AsyncSession, before: datetime) -> int:
    """Purges expired cached availability probabilities."""
    stmt = delete(AvailabilityProbability).where(
        AvailabilityProbability.generated_at < before
    )
    res = await db.execute(stmt)
    await db.flush()
    return res.rowcount or 0
