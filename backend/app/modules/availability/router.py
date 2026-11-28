"""ParkSMART - Availability Endpoints API Router (File 109)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db
from app.modules.availability import service
from app.schemas.common import UtcDateTime
from app.schemas.forecast import (
    AvailabilityOut,
    AvailabilityRequest,
    CompareOut,
    CompareRequest,
)

router = APIRouter()


@router.post("/estimate", response_model=AvailabilityOut)
async def estimate_zone_availability(
    body: AvailabilityRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> AvailabilityOut:
    """Calculates arrival-time availability probability for a zone."""
    return await service.estimate(db, body)


@router.post("/compare", response_model=CompareOut)
async def compare_zones_availability(
    body: CompareRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> CompareOut:
    """Compares availability probabilities across multiple candidate zones."""
    return await service.compare(db, body)


@router.get("/zones/{zone_id}", response_model=AvailabilityOut)
async def get_zone_availability_convenience(
    zone_id: uuid.UUID,
    arrival_time: UtcDateTime | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> AvailabilityOut:
    """Convenience GET endpoint to retrieve availability probability for a zone."""
    req = AvailabilityRequest(zone_id=zone_id, arrival_time=arrival_time)
    return await service.estimate(db, req)
