"""ParkSMART - Parking Infrastructure and Bay Status Repository (File 67)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import geo
from app.models.infra import (
    Camera,
    CameraBayMapping,
    ParkingBay,
    ParkingFacility,
    Zone,
)
from app.models.occupancy import CurrentBayStatus, OccupancyHistory
from app.models.ops import FeeConfiguration
from app.models.reservation import LoadingReservation, ParkingReservation


@dataclass
class ZoneRow:
    zone: Zone
    lat: float
    lon: float
    capacity: int


@dataclass
class BayStatusRow:
    bay_id: uuid.UUID
    facility_id: uuid.UUID
    code: str
    bay_type: str
    out_of_service: bool
    occupancy: str
    observed_at: datetime | None
    source: str | None
    camera_status: str | None


def _capacity_subquery():
    """Single definition for zone capacity: active regular bays not out-of-service."""
    return (
        select(func.count(ParkingBay.id))
        .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
        .where(
            ParkingFacility.zone_id == Zone.id,
            ParkingFacility.is_active.is_(True),
            ParkingBay.bay_type == "regular",
            ParkingBay.out_of_service.is_(False),
        )
        .scalar_subquery()
    )


async def get_zone_row(db: AsyncSession, zone_id: uuid.UUID) -> ZoneRow | None:
    """Retrieves a single zone with coordinates and derived capacity."""
    stmt = (
        select(
            Zone,
            geo.lat_col(Zone.centroid).label("lat"),
            geo.lon_col(Zone.centroid).label("lon"),
            _capacity_subquery().label("capacity"),
        )
        .where(Zone.id == zone_id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        return None
    return ZoneRow(zone=row[0], lat=row[1], lon=row[2], capacity=row[3] or 0)


async def list_zone_rows(
    db: AsyncSession,
    *,
    city_id: uuid.UUID | None = None,
    kind: str | None = None,
    active_only: bool = True,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[ZoneRow], int]:
    """Retrieves paginated zones with capacity and geographic coordinates."""
    stmt = select(
        Zone,
        geo.lat_col(Zone.centroid).label("lat"),
        geo.lon_col(Zone.centroid).label("lon"),
        _capacity_subquery().label("capacity"),
    )
    count_stmt = select(func.count(Zone.id))

    if city_id is not None:
        stmt = stmt.where(Zone.city_id == city_id)
        count_stmt = count_stmt.where(Zone.city_id == city_id)
    if kind:
        stmt = stmt.where(Zone.kind == kind)
        count_stmt = count_stmt.where(Zone.kind == kind)
    if active_only:
        stmt = stmt.where(Zone.is_active.is_(True))
        count_stmt = count_stmt.where(Zone.is_active.is_(True))

    stmt = stmt.order_by(Zone.name).limit(limit).offset(offset)

    total = (await db.execute(count_stmt)).scalar_one()
    rows = (await db.execute(stmt)).all()
    items = [ZoneRow(zone=r[0], lat=r[1], lon=r[2], capacity=r[3] or 0) for r in rows]
    return items, total


async def nearby_zone_rows(
    db: AsyncSession,
    *,
    lat: float,
    lon: float,
    radius_m: float,
    vehicle_category: str | None = None,
    limit_candidates: int = 50,
) -> list[tuple[ZoneRow, float]]:
    """Finds active zones within distance in meters using PostGIS ST_DWithin on centroid."""
    pt_expr = geo.point_expr_xy(lat, lon)
    dist_expr = func.ST_Distance(Zone.centroid, pt_expr)

    stmt = (
        select(
            Zone,
            geo.lat_col(Zone.centroid).label("lat"),
            geo.lon_col(Zone.centroid).label("lon"),
            _capacity_subquery().label("capacity"),
            dist_expr.label("distance_m"),
        )
        .where(
            Zone.is_active.is_(True),
            func.ST_DWithin(Zone.centroid, pt_expr, radius_m),
        )
    )

    if vehicle_category:
        eligible_subq = (
            select(ParkingBay.id)
            .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
            .where(
                ParkingFacility.zone_id == Zone.id,
                ParkingFacility.is_active.is_(True),
                ParkingBay.out_of_service.is_(False),
                ParkingBay.permitted_vehicle_categories.any(vehicle_category),
            )
            .exists()
        )
        stmt = stmt.where(eligible_subq)

    stmt = stmt.order_by(dist_expr).limit(limit_candidates)
    rows = (await db.execute(stmt)).all()
    return [
        (ZoneRow(zone=r[0], lat=r[1], lon=r[2], capacity=r[3] or 0), float(r[4]))
        for r in rows
    ]


async def list_facilities(db: AsyncSession, zone_id: uuid.UUID) -> list[ParkingFacility]:
    """Retrieves all active parking facilities in a zone."""
    stmt = (
        select(ParkingFacility)
        .where(ParkingFacility.zone_id == zone_id, ParkingFacility.is_active.is_(True))
        .order_by(ParkingFacility.name)
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_facility(db: AsyncSession, facility_id: uuid.UUID) -> ParkingFacility | None:
    """Retrieves facility by UUID."""
    res = await db.execute(
        select(ParkingFacility).where(ParkingFacility.id == facility_id)
    )
    return res.scalar_one_or_none()


async def list_bays(
    db: AsyncSession,
    zone_id: uuid.UUID,
    bay_type: str | None = None,
    facility_id: uuid.UUID | None = None,
) -> list[ParkingBay]:
    """Lists bays in a zone with optional facility and bay_type filtering."""
    stmt = (
        select(ParkingBay)
        .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
        .where(ParkingFacility.zone_id == zone_id)
    )
    if bay_type:
        stmt = stmt.where(ParkingBay.bay_type == bay_type)
    if facility_id:
        stmt = stmt.where(ParkingBay.facility_id == facility_id)
    stmt = stmt.order_by(ParkingBay.code)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def list_bays_with_coords(
    db: AsyncSession,
    zone_id: uuid.UUID,
    bay_type: str | None = None,
    facility_id: uuid.UUID | None = None,
) -> list[tuple[ParkingBay, float, float]]:
    """Lists bays in a zone along with extracted latitude and longitude coordinates."""
    stmt = (
        select(
            ParkingBay,
            geo.lat_col(ParkingBay.location).label("lat"),
            geo.lon_col(ParkingBay.location).label("lon"),
        )
        .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
        .where(ParkingFacility.zone_id == zone_id)
    )
    if bay_type:
        stmt = stmt.where(ParkingBay.bay_type == bay_type)
    if facility_id:
        stmt = stmt.where(ParkingBay.facility_id == facility_id)
    stmt = stmt.order_by(ParkingBay.code)
    rows = (await db.execute(stmt)).all()
    return [
        (
            r[0],
            float(r[1]) if r[1] is not None else 0.0,
            float(r[2]) if r[2] is not None else 0.0,
        )
        for r in rows
    ]


async def get_bay(db: AsyncSession, bay_id: uuid.UUID) -> ParkingBay | None:
    """Retrieves bay by UUID."""
    res = await db.execute(select(ParkingBay).where(ParkingBay.id == bay_id))
    return res.scalar_one_or_none()


async def bay_status_rows(
    db: AsyncSession,
    *,
    zone_id: uuid.UUID | None = None,
    bay_ids: list[uuid.UUID] | None = None,
    regular_only: bool = False,
) -> list[BayStatusRow]:
    """Joins parking bays with current_bay_status and monitoring camera status."""
    stmt = (
        select(
            ParkingBay.id,
            ParkingBay.facility_id,
            ParkingBay.code,
            ParkingBay.bay_type,
            ParkingBay.out_of_service,
            func.coalesce(CurrentBayStatus.occupancy, "unknown").label("occupancy"),
            CurrentBayStatus.observed_at,
            CurrentBayStatus.source,
            Camera.status.label("camera_status"),
        )
        .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
        .outerjoin(CurrentBayStatus, ParkingBay.id == CurrentBayStatus.bay_id)
        .outerjoin(CameraBayMapping, ParkingBay.id == CameraBayMapping.bay_id)
        .outerjoin(Camera, CameraBayMapping.camera_id == Camera.id)
    )

    if zone_id is not None:
        stmt = stmt.where(ParkingFacility.zone_id == zone_id)
    if bay_ids is not None:
        stmt = stmt.where(ParkingBay.id.in_(bay_ids))
    if regular_only:
        stmt = stmt.where(ParkingBay.bay_type == "regular")

    stmt = stmt.order_by(ParkingBay.code)
    rows = (await db.execute(stmt)).all()
    return [
        BayStatusRow(
            bay_id=r[0],
            facility_id=r[1],
            code=r[2],
            bay_type=r[3],
            out_of_service=r[4],
            occupancy=r[5],
            observed_at=r[6],
            source=r[7],
            camera_status=r[8],
        )
        for r in rows
    ]


async def reserved_bay_ids(
    db: AsyncSession, bay_ids: list[uuid.UUID], at: datetime
) -> set[uuid.UUID]:
    """Determines which bays currently have an active reservation covering instant 'at'."""
    if not bay_ids:
        return set()

    active_statuses = ("confirmed", "checked_in", "in_progress")
    p_stmt = select(ParkingReservation.bay_id).where(
        ParkingReservation.bay_id.in_(bay_ids),
        ParkingReservation.status.in_(active_statuses),
        ParkingReservation.during.contains(at),
    )
    l_stmt = select(LoadingReservation.bay_id).where(
        LoadingReservation.bay_id.in_(bay_ids),
        LoadingReservation.status.in_(active_statuses),
        LoadingReservation.during.contains(at),
    )

    p_res = (await db.execute(p_stmt)).scalars().all()
    l_res = (await db.execute(l_stmt)).scalars().all()
    return set(p_res).union(set(l_res))


async def current_fee(
    db: AsyncSession, facility_id: uuid.UUID, bay_type: str, at: datetime
) -> FeeConfiguration | None:
    """Finds current fee configuration effective at the specified instant."""
    stmt = select(FeeConfiguration).where(
        FeeConfiguration.facility_id == facility_id,
        FeeConfiguration.bay_type == bay_type,
        FeeConfiguration.effective_from <= at,
        or_(
            FeeConfiguration.effective_to.is_(None),
            FeeConfiguration.effective_to > at,
        ),
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def eligible_bays(
    db: AsyncSession,
    facility_id: uuid.UUID,
    bay_type: str,
    vehicle_category: str,
) -> list[ParkingBay]:
    """Retrieves eligible in-service bays strictly ordered by code ascending (for auto-pick)."""
    stmt = (
        select(ParkingBay)
        .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
        .where(
            ParkingBay.facility_id == facility_id,
            ParkingBay.bay_type == bay_type,
            ParkingBay.out_of_service.is_(False),
            ParkingFacility.is_active.is_(True),
            ParkingBay.permitted_vehicle_categories.any(vehicle_category),
        )
        .order_by(ParkingBay.code.asc())
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def history(
    db: AsyncSession, bay_id: uuid.UUID, from_ts: datetime, to_ts: datetime
) -> list[OccupancyHistory]:
    """Retrieves continuous occupancy history intervals for a bay."""
    stmt = (
        select(OccupancyHistory)
        .where(
            OccupancyHistory.bay_id == bay_id,
            OccupancyHistory.from_ts < to_ts,
            or_(
                OccupancyHistory.to_ts.is_(None),
                OccupancyHistory.to_ts > from_ts,
            ),
        )
        .order_by(OccupancyHistory.from_ts.asc())
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def insert_current_bay_status(db: AsyncSession, bay_id: uuid.UUID) -> None:
    """Seeds initial row for current_bay_status when a bay is created."""
    stmt = (
        pg_insert(CurrentBayStatus)
        .values(bay_id=bay_id, occupancy="unknown", observed_at=None, source=None)
        .on_conflict_do_nothing(index_elements=["bay_id"])
    )
    await db.execute(stmt)
    await db.flush()


async def bay_has_active_reservation(db: AsyncSession, bay_id: uuid.UUID) -> bool:
    """Checks if bay has any pending, confirmed, checked_in, or in_progress reservations."""
    active_statuses = ("pending", "confirmed", "checked_in", "in_progress")
    p_subq = select(ParkingReservation.id).where(
        ParkingReservation.bay_id == bay_id,
        ParkingReservation.status.in_(active_statuses),
    ).exists()
    l_subq = select(LoadingReservation.id).where(
        LoadingReservation.bay_id == bay_id,
        LoadingReservation.status.in_(active_statuses),
    ).exists()
    stmt = select(select(1).where(or_(p_subq, l_subq)).exists())
    return bool((await db.execute(stmt)).scalar_one())
