"""ParkSMART - Parking Zones and Bay Status Router (File 65)."""

from __future__ import annotations

import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import geo
from app.core.clock import utcnow
from app.core.rbac import Role
from app.deps import get_current_user, get_db, require_roles
from app.errors import ValidationFailed
from app.modules.parking import repository as repo
from app.modules.parking import service
from app.schemas.common import Page, UtcDateTime, VehicleCategory
from app.schemas.occupancy import BayHistoryOut, OccupancyHistoryItem
from app.schemas.parking import (
    BayOut,
    BayStatusOut,
    BayWithStatus,
    FacilityOut,
    NearbyQuery,
    NearbyZoneOut,
    ZoneLiveOut,
    ZoneOut,
)

zones_router = APIRouter()
bays_router = APIRouter()


@zones_router.get("", response_model=Page[ZoneOut])
async def list_parking_zones(
    city_id: uuid.UUID | None = Query(default=None),
    kind: str | None = Query(default=None),
    active_only: bool = Query(default=True),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> Page[ZoneOut]:
    """Retrieves paginated list of registered parking and loading zones."""
    return await service.list_zones(
        db, city_id=city_id, kind=kind, active_only=active_only, limit=limit, offset=offset
    )


@zones_router.get("/nearby", response_model=list[NearbyZoneOut])
async def search_nearby_zones(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lon: float = Query(..., ge=-180.0, le=180.0),
    radius_m: float = Query(default=1000.0, gt=0, le=20000.0),
    vehicle_category: VehicleCategory | None = Query(default=None),
    only_available: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> list[NearbyZoneOut]:
    """Searches nearby parking zones ordered by distance."""
    q = NearbyQuery(
        lat=lat,
        lon=lon,
        radius_m=radius_m,
        vehicle_category=vehicle_category,
        only_available=only_available,
        limit=limit,
    )
    return await service.nearby_zones(db, q)


@zones_router.get("/{zone_id}", response_model=ZoneOut)
async def get_zone_details(
    zone_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> ZoneOut:
    """Retrieves metadata and capacity for a single zone."""
    return await service.get_zone(db, zone_id)


@zones_router.get("/{zone_id}/live", response_model=ZoneLiveOut)
async def get_zone_live_status(
    zone_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> ZoneLiveOut:
    """Retrieves real-time occupancy counts and data freshness state for a zone."""
    summary = await service.zone_live_summary(db, zone_id)
    return ZoneLiveOut(
        zone_id=zone_id,
        available_bays=summary.available,
        occupied_bays=summary.occupied,
        unknown_bays=summary.unknown,
        data_state=summary.data_state,
        observed_at=summary.observed_at,
        provenance=summary.provenance,
    )


@zones_router.get("/{zone_id}/facilities", response_model=list[FacilityOut])
async def list_zone_facilities(
    zone_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> list[FacilityOut]:
    """Retrieves all facilities located in a zone."""
    return await service.list_facilities(db, zone_id)


@zones_router.get("/{zone_id}/bays", response_model=list[BayWithStatus])
async def list_zone_bays(
    zone_id: uuid.UUID,
    bay_type: str | None = Query(default=None),
    facility_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> list[BayWithStatus]:
    """Retrieves bays in a zone with current physical occupancy and reservation state."""
    return await service.list_bays_with_status(
        db, zone_id, bay_type=bay_type, facility_id=facility_id
    )


@bays_router.get("/{bay_id}", response_model=BayOut)
async def get_bay_details(
    bay_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> BayOut:
    """Retrieves metadata for a parking bay."""
    bay = await repo.get_bay(db, bay_id)
    if not bay:
        from app.errors import NotFound
        raise NotFound("Parking bay not found")
    lat_val = await db.scalar(geo.lat_col(bay.location))
    lon_val = await db.scalar(geo.lon_col(bay.location))
    from app.schemas.common import BayType, LatLon
    return BayOut(
        id=bay.id,
        facility_id=bay.facility_id,
        code=bay.code,
        bay_type=BayType(bay.bay_type),
        location=LatLon(lat=float(lat_val), lon=float(lon_val)),
        permitted_vehicle_categories=[VehicleCategory(c) for c in bay.permitted_vehicle_categories],
        restrictions=bay.restrictions,
        out_of_service=bay.out_of_service,
    )


@bays_router.get("/{bay_id}/status", response_model=BayStatusOut)
async def get_single_bay_status(
    bay_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> BayStatusOut:
    """Retrieves real-time physical occupancy and reservation status for a single bay."""
    return await service.get_bay_status(db, bay_id)


@bays_router.get("/{bay_id}/history", response_model=BayHistoryOut)
async def get_bay_occupancy_history(
    bay_id: uuid.UUID,
    from_ts: UtcDateTime | None = Query(default=None, alias="from"),
    to_ts: UtcDateTime | None = Query(default=None, alias="to"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.FIELD_OPERATOR, Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> BayHistoryOut:
    """Operator endpoint to retrieve state transition history for a bay."""
    now = utcnow()
    eff_from = from_ts if from_ts is not None else now - timedelta(hours=24)
    eff_to = to_ts if to_ts is not None else now

    if (eff_to - eff_from).days > 31:
        raise ValidationFailed("History query range cannot exceed 31 days")
    if eff_from >= eff_to:
        raise ValidationFailed("from timestamp must be earlier than to timestamp")

    rows = await repo.history(db, bay_id, eff_from, eff_to)
    return BayHistoryOut(
        items=[
            OccupancyHistoryItem(
                bay_id=r.bay_id,
                state=r.state,  # type: ignore
                from_ts=r.from_ts,
                to_ts=r.to_ts,
            )
            for r in rows
        ]
    )
