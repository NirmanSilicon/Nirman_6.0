"""ParkSMART - Operational Analytics and Reporting SQL Repository (File 129)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Float, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forecast import DemandForecast, OccupancyAggregate
from app.models.infra import DeviceHealthEvent, ParkingBay, ParkingFacility
from app.models.occupancy import VehicleCountObservation
from app.models.reservation import LoadingReservation, ParkingReservation


async def reservation_counts(
    db: AsyncSession,
    zone_id: uuid.UUID | None,
    from_ts: datetime,
    to_ts: datetime,
    kind: str,
) -> list[tuple[Any, str, str, int]]:
    """Counts parking and loading reservations grouped by date, kind, and terminal status."""
    results = []
    if kind in ("parking", "all"):
        stmt = (
            select(
                func.date(func.lower(ParkingReservation.during)),
                ParkingReservation.status,
                func.count(ParkingReservation.id),
            )
            .join(ParkingBay, ParkingReservation.bay_id == ParkingBay.id)
            .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
            .where(
                func.lower(ParkingReservation.during) >= from_ts,
                func.lower(ParkingReservation.during) <= to_ts,
            )
        )
        if zone_id is not None:
            stmt = stmt.where(ParkingFacility.zone_id == zone_id)
        stmt = stmt.group_by(func.date(func.lower(ParkingReservation.during)), ParkingReservation.status)
        rows = (await db.execute(stmt)).all()
        for d, s, cnt in rows:
            results.append((d, "parking", s, cnt))

    if kind in ("loading", "all"):
        stmt = (
            select(
                func.date(func.lower(LoadingReservation.during)),
                LoadingReservation.status,
                func.count(LoadingReservation.id),
            )
            .join(ParkingBay, LoadingReservation.bay_id == ParkingBay.id)
            .join(ParkingFacility, ParkingBay.facility_id == ParkingFacility.id)
            .where(
                func.lower(LoadingReservation.during) >= from_ts,
                func.lower(LoadingReservation.during) <= to_ts,
            )
        )
        if zone_id is not None:
            stmt = stmt.where(ParkingFacility.zone_id == zone_id)
        stmt = stmt.group_by(func.date(func.lower(LoadingReservation.during)), LoadingReservation.status)
        rows = (await db.execute(stmt)).all()
        for d, s, cnt in rows:
            results.append((d, "loading", s, cnt))

    return results


async def device_state_intervals(
    db: AsyncSession,
    zone_id: uuid.UUID | None,
    from_ts: datetime,
    to_ts: datetime,
) -> list[tuple[uuid.UUID, str, datetime, datetime]]:
    """Queries device health state changes within interval."""
    stmt = (
        select(
            DeviceHealthEvent.camera_id,
            DeviceHealthEvent.state,
            DeviceHealthEvent.observed_at,
        )
        .where(
            DeviceHealthEvent.observed_at >= from_ts,
            DeviceHealthEvent.observed_at <= to_ts,
        )
        .order_by(DeviceHealthEvent.camera_id, DeviceHealthEvent.observed_at.asc())
    )
    rows = (await db.execute(stmt)).all()
    # Build intervals
    intervals = []
    for r in rows:
        intervals.append((r[0], r[1], r[2], to_ts))
    return intervals


async def observation_counts(
    db: AsyncSession,
    zone_id: uuid.UUID | None,
    from_ts: datetime,
    to_ts: datetime,
) -> list[tuple[uuid.UUID, int, int]]:
    """Calculates observation counts and intervals per camera."""
    stmt = (
        select(
            VehicleCountObservation.camera_id,
            func.count(VehicleCountObservation.id),
            func.avg(VehicleCountObservation.interval_s),
        )
        .where(
            VehicleCountObservation.observed_at >= from_ts,
            VehicleCountObservation.observed_at <= to_ts,
            VehicleCountObservation.camera_id.is_not(None),
        )
        .group_by(VehicleCountObservation.camera_id)
    )
    if zone_id is not None:
        stmt = stmt.where(VehicleCountObservation.zone_id == zone_id)
    rows = (await db.execute(stmt)).all()
    return [(r[0], r[1], int(r[2] or 60)) for r in rows if r[0]]


async def forecast_vs_actual(
    db: AsyncSession,
    zone_id: uuid.UUID,
    target: str,
    from_ts: datetime,
    to_ts: datetime,
) -> list[tuple[datetime, float, float, str]]:
    """Joins generated forecasts with realised aggregates to evaluate forecasting accuracy."""
    target_col_map = {
        "occupancy_pct": OccupancyAggregate.avg_occupancy_pct,
        "vehicle_count": OccupancyAggregate.avg_vehicles,
        "pedestrian_count": OccupancyAggregate.avg_pedestrians,
    }
    actual_col = target_col_map.get(target, OccupancyAggregate.avg_occupancy_pct)

    stmt = (
        select(
            DemandForecast.target_ts,
            DemandForecast.mean,
            cast(actual_col, Float),
            DemandForecast.model_version_id,
        )
        .join(
            OccupancyAggregate,
            (DemandForecast.zone_id == OccupancyAggregate.zone_id)
            & (DemandForecast.target_ts == OccupancyAggregate.bucket_start),
        )
        .where(
            DemandForecast.zone_id == zone_id,
            DemandForecast.target == target,
            DemandForecast.target_ts >= from_ts,
            DemandForecast.target_ts <= to_ts,
            actual_col.is_not(None),
        )
        .order_by(DemandForecast.target_ts.asc())
        .limit(100000)
    )
    rows = (await db.execute(stmt)).all()
    return [(r[0], float(r[1]), float(r[2]), str(r[3])) for r in rows]
