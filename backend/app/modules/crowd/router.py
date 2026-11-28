"""ParkSMART - Crowd Analytics Router."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.deps import get_current_user
from app.models.occupancy import CrowdObservation

router = APIRouter()


@router.get("/overview")
async def crowd_overview(
    _user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    """Return latest crowd observation per zone (empty list if none)."""
    stmt = (
        select(CrowdObservation)
        .order_by(CrowdObservation.zone_id, desc(CrowdObservation.observed_at))
        .distinct(CrowdObservation.zone_id)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [
        {
            "zone_id": str(r.zone_id),
            "observed_at": r.observed_at.isoformat() if r.observed_at else None,
            "crowd_count": r.crowd_count,
            "crowd_level": r.crowd_level,
            "density_per_sqm": r.density_per_sqm,
            "provenance": "observed",
        }
        for r in rows
    ]


@router.get("/zones/{zone_id}/current")
async def crowd_zone_current(
    zone_id: str,
    _user=Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    """Return latest crowd observation for a zone."""
    stmt = (
        select(CrowdObservation)
        .where(CrowdObservation.zone_id == zone_id)
        .order_by(desc(CrowdObservation.observed_at))
        .limit(1)
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if not row:
        return {
            "zone_id": zone_id,
            "observed_at": None,
            "crowd_count": 0,
            "crowd_level": "unknown",
            "density_per_sqm": None,
            "provenance": "observed",
        }
    return {
        "zone_id": str(row.zone_id),
        "observed_at": row.observed_at.isoformat() if row.observed_at else None,
        "crowd_count": row.crowd_count,
        "crowd_level": row.crowd_level,
        "density_per_sqm": row.density_per_sqm,
        "provenance": "observed",
    }
