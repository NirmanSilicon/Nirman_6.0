"""ParkSMART - Parking Domain Logic and State Derivation Service (File 66)."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, time
from typing import Any
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core import geo
from app.core.clock import utcnow
from app.errors import Conflict, NotFound, ValidationFailed
from app.models.infra import ParkingBay, ParkingFacility, Zone
from app.modules.audit import service as audit_service
from app.modules.ingestion.state_manager import derive_data_state
from app.modules.parking import repository as repo
from app.schemas.admin import BayUpsert, FacilityUpsert, ZoneUpsert
from app.schemas.common import (
    BayType,
    DataState,
    LatLon,
    Occupancy,
    Page,
    Provenance,
    VehicleCategory,
    provenance_from_source,
)
from app.schemas.parking import (
    BayOut,
    BayStatusOut,
    BayWithStatus,
    FacilityOut,
    FeeOut,
    NearbyQuery,
    NearbyZoneOut,
    ZoneOut,
)

DAYS_OF_WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


@dataclass
class ZoneLiveSummary:
    available: int | None
    occupied: int | None
    unknown: int
    data_state: DataState
    observed_at: datetime | None
    provenance: Provenance


def within_schedule(
    schedule: dict[str, Any] | None, start: datetime, end: datetime, tz_str: str = "Asia/Kolkata"
) -> bool:
    """Verifies that [start, end) is completely within one configured open operating interval."""
    if not schedule:
        return True

    tz = ZoneInfo(tz_str)
    local_start = start.astimezone(tz)
    local_end = end.astimezone(tz)

    # Crosses midnight: rejected unless explicit overnight interval exists
    if local_start.date() != local_end.date():
        return False

    day_key = DAYS_OF_WEEK[local_start.weekday()]
    intervals = schedule.get(day_key)
    if not intervals:
        return False

    start_t = local_start.time()
    end_t = local_end.time()

    for item in intervals:
        if not isinstance(item, (list, tuple)) or len(item) != 2:
            continue
        try:
            sh, sm = map(int, item[0].split(":"))
            eh, em = map(int, item[1].split(":"))
            open_from = time(sh, sm)
            open_to = time(eh, em)
            if open_from <= start_t and end_t <= open_to:
                return True
        except (ValueError, TypeError, AttributeError, IndexError) as exc:
            logger.debug("Skipping invalid operating interval %r: %s", item, exc)
            continue

    return False


def effective_schedule(
    bay_schedule: dict[str, Any] | None, zone_schedule: dict[str, Any] | None
) -> dict[str, Any] | None:
    """Inherits zone operating schedule if bay schedule is not explicitly specified."""
    return bay_schedule if bay_schedule is not None else zone_schedule


def _to_zone_out(zr: repo.ZoneRow) -> ZoneOut:
    return ZoneOut(
        id=zr.zone.id,
        city_id=zr.zone.city_id,
        name=zr.zone.name,
        kind=zr.zone.kind,  # type: ignore
        centroid=LatLon(lat=zr.lat, lon=zr.lon),
        operating_schedule=zr.zone.operating_schedule,
        crowd_thresholds_configured=zr.zone.crowd_thresholds is not None,
        reservations_enabled=zr.zone.reservation_rules is not None,
        capacity=zr.capacity,
        is_active=zr.zone.is_active,
    )


async def list_zones(
    db: AsyncSession,
    *,
    city_id: uuid.UUID | None = None,
    kind: str | None = None,
    active_only: bool = True,
    limit: int = 50,
    offset: int = 0,
) -> Page[ZoneOut]:
    """Retrieves paginated zones with capacity and metadata."""
    rows, total = await repo.list_zone_rows(
        db, city_id=city_id, kind=kind, active_only=active_only, limit=limit, offset=offset
    )
    return Page[ZoneOut](
        items=[_to_zone_out(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


async def get_zone(db: AsyncSession, zone_id: uuid.UUID) -> ZoneOut:
    """Retrieves single zone by UUID."""
    zr = await repo.get_zone_row(db, zone_id)
    if zr is None:
        raise NotFound("Zone not found")
    return _to_zone_out(zr)


async def list_facilities(db: AsyncSession, zone_id: uuid.UUID) -> list[FacilityOut]:
    """Lists parking facilities inside a zone with optional fee structures."""
    await get_zone(db, zone_id)
    facs = await repo.list_facilities(db, zone_id)
    out: list[FacilityOut] = []
    now = utcnow()
    for f in facs:
        # Check current regular fee
        fee_row = await repo.current_fee(db, f.id, "regular", now)
        fee_out = (
            FeeOut(
                rate_per_hour=fee_row.rate_per_hour,
                currency=fee_row.currency,
                bay_type=BayType(fee_row.bay_type),
            )
            if fee_row
            else None
        )
        # Location coordinates
        lat_res = await db.scalar(geo.lat_col(f.location))
        lon_res = await db.scalar(geo.lon_col(f.location))
        out.append(
            FacilityOut(
                id=f.id,
                zone_id=f.zone_id,
                name=f.name,
                kind=f.kind,  # type: ignore
                location=LatLon(lat=float(lat_res), lon=float(lon_res)),
                supports_reservation=f.supports_reservation,
                address=f.address,
                fee=fee_out,
            )
        )
    return out


async def get_bay_status(
    db: AsyncSession, bay_id: uuid.UUID, now: datetime | None = None
) -> BayStatusOut:
    """Calculates live bay status and data state freshness."""
    now_dt = now or utcnow()
    settings = get_settings()
    rows = await repo.bay_status_rows(db, bay_ids=[bay_id])
    if not rows:
        raise NotFound("Parking bay not found")
    row = rows[0]

    raw_state_str = derive_data_state(row.observed_at, row.camera_status, now_dt, settings)
    data_state = DataState(raw_state_str)

    # Invariant: If data_state is unavailable or unknown, occupancy MUST be reported as unknown
    if data_state in (DataState.UNAVAILABLE, DataState.UNKNOWN):
        display_occupancy = Occupancy.UNKNOWN
    else:
        display_occupancy = Occupancy(row.occupancy)

    # Check reservation independent of physical occupancy
    reserved_set = await repo.reserved_bay_ids(db, [bay_id], now_dt)
    is_reserved = bay_id in reserved_set

    prov = provenance_from_source(row.source) if row.observed_at else Provenance.OBSERVED

    return BayStatusOut(
        bay_id=bay_id,
        occupancy=display_occupancy,
        reserved=is_reserved,
        observed_at=row.observed_at,
        data_state=data_state,
        provenance=prov,
    )


async def list_bays_with_status(
    db: AsyncSession,
    zone_id: uuid.UUID,
    bay_type: str | None = None,
    facility_id: uuid.UUID | None = None,
) -> list[BayWithStatus]:
    """Retrieves all bays in a zone with their real-time occupancy status."""
    await get_zone(db, zone_id)
    now_dt = utcnow()
    settings = get_settings()

    bay_items = await repo.list_bays_with_coords(db, zone_id, bay_type=bay_type, facility_id=facility_id)
    if not bay_items:
        return []

    bay_ids = [b.id for b, _, _ in bay_items]
    status_rows = await repo.bay_status_rows(db, bay_ids=bay_ids)
    status_map = {r.bay_id: r for r in status_rows}
    reserved_set = await repo.reserved_bay_ids(db, bay_ids, now_dt)

    result: list[BayWithStatus] = []
    for b, lat_val, lon_val in bay_items:
        r = status_map.get(b.id)
        if r:
            st_str = derive_data_state(r.observed_at, r.camera_status, now_dt, settings)
            data_state = DataState(st_str)
            occ = Occupancy.UNKNOWN if data_state in (DataState.UNAVAILABLE, DataState.UNKNOWN) else Occupancy(r.occupancy)
            prov = provenance_from_source(r.source) if r.observed_at else Provenance.OBSERVED
            obs_at = r.observed_at
        else:
            data_state = DataState.UNKNOWN
            occ = Occupancy.UNKNOWN
            prov = Provenance.OBSERVED
            obs_at = None

        bay_out = BayOut(
            id=b.id,
            facility_id=b.facility_id,
            code=b.code,
            bay_type=BayType(b.bay_type),
            location=LatLon(lat=lat_val, lon=lon_val),
            permitted_vehicle_categories=[VehicleCategory(c) for c in b.permitted_vehicle_categories],
            restrictions=b.restrictions,
            out_of_service=b.out_of_service,
        )
        status_out = BayStatusOut(
            bay_id=b.id,
            occupancy=occ,
            reserved=b.id in reserved_set,
            observed_at=obs_at,
            data_state=data_state,
            provenance=prov,
        )
        result.append(BayWithStatus(bay=bay_out, status=status_out))

    return result


async def zone_live_summary(
    db: AsyncSession, zone_id: uuid.UUID, now: datetime | None = None
) -> ZoneLiveSummary:
    """Computes zone-level aggregate occupancy summary across regular in-service bays."""
    now_dt = now or utcnow()
    settings = get_settings()

    # Query only regular in-service bays
    bays = await repo.bay_status_rows(db, zone_id=zone_id, regular_only=True)
    in_service_bays = [b for b in bays if not b.out_of_service]

    live_available = 0
    live_occupied = 0
    unknown_count = 0
    has_live_bay = False
    newest_obs: datetime | None = None
    has_simulated = False

    for b in in_service_bays:
        if b.observed_at and (newest_obs is None or b.observed_at > newest_obs):
            newest_obs = b.observed_at
        if b.source and "sim" in b.source.lower():
            has_simulated = True

        st_str = derive_data_state(b.observed_at, b.camera_status, now_dt, settings)
        data_state = DataState(st_str)

        if data_state == DataState.LIVE:
            has_live_bay = True
            if b.occupancy == "free":
                live_available += 1
            elif b.occupancy == "occupied":
                live_occupied += 1
            else:
                unknown_count += 1
        else:
            unknown_count += 1

    # Derive overall zone data_state
    if has_live_bay:
        zone_data_state = DataState.LIVE
    elif in_service_bays and newest_obs:
        zone_data_state = DataState(derive_data_state(newest_obs, None, now_dt, settings))
    else:
        zone_data_state = DataState.UNKNOWN

    prov = Provenance.SIMULATED if has_simulated else Provenance.OBSERVED

    # Contract: If no bays have live data, available and occupied must be None (never 0!)
    if not has_live_bay:
        return ZoneLiveSummary(
            available=None,
            occupied=None,
            unknown=len(in_service_bays),
            data_state=zone_data_state,
            observed_at=newest_obs,
            provenance=prov,
        )

    return ZoneLiveSummary(
        available=live_available,
        occupied=live_occupied,
        unknown=unknown_count,
        data_state=DataState.LIVE,
        observed_at=newest_obs,
        provenance=prov,
    )


def compute_zone_colour(
    available: int | None,
    capacity: int,
    data_state: DataState,
    threshold: float | None = None,
) -> str:
    """Derives zone display colour:
    - green: free bays are at least 30% of capacity
    - yellow: some but fewer than 30% are free
    - red: none are free
    - grey: data_state is unavailable or unknown.
    The threshold is configurable via Settings.free_bay_green_threshold.
    """
    if data_state in (DataState.UNAVAILABLE, DataState.UNKNOWN) or available is None:
        return "grey"
    if capacity <= 0:
        return "grey"
    if available <= 0:
        return "red"
    thresh = threshold if threshold is not None else get_settings().free_bay_green_threshold
    if (available / capacity) >= thresh:
        return "green"
    return "yellow"


async def nearby_zones(db: AsyncSession, q: NearbyQuery) -> list[NearbyZoneOut]:
    """Searches nearby parking zones within search radius using PostGIS ST_DWithin."""
    now_dt = utcnow()
    cat_str = q.vehicle_category.value if q.vehicle_category else None
    rows = await repo.nearby_zone_rows(
        db,
        lat=q.lat,
        lon=q.lon,
        radius_m=q.radius_m,
        vehicle_category=cat_str,
        limit_candidates=q.limit * 2,
    )

    results: list[NearbyZoneOut] = []
    for zr, dist in rows:
        summary = await zone_live_summary(db, zr.zone.id, now_dt)

        if q.only_available and (summary.available is None or summary.available <= 0):
            # Exclude zones where availability is unknown or zero
            continue

        results.append(
            NearbyZoneOut(
                zone=_to_zone_out(zr),
                distance_m=round(dist, 1),
                available_bays=summary.available,
                occupied_bays=summary.occupied,
                unknown_bays=summary.unknown,
                data_state=summary.data_state,
                observed_at=summary.observed_at,
                provenance=summary.provenance,
            )
        )
        if len(results) >= q.limit:
            break

    return results


async def upsert_zone(
    db: AsyncSession, actor_id: uuid.UUID, body: ZoneUpsert, zone_id: uuid.UUID | None = None
) -> ZoneOut:
    """Creates or updates a zone with spatial coordinates and audit logging."""
    thresholds_dict = body.crowd_thresholds.model_dump() if body.crowd_thresholds else None
    rules_dict = body.reservation_rules.model_dump() if body.reservation_rules else None

    try:
        if zone_id is None:
            # Create
            new_zone = Zone(
                city_id=body.city_id,
                name=body.name,
                kind=body.kind,
                centroid=geo.point_expr(body.centroid),
                boundary=geo.polygon_expr(body.boundary) if body.boundary else None,
                operating_schedule=body.operating_schedule,
                crowd_thresholds=thresholds_dict,
                reservation_rules=rules_dict,
                is_active=body.is_active,
            )
            db.add(new_zone)
            await db.flush()
            target_id = new_zone.id
            before = None
        else:
            # Update
            zr = await repo.get_zone_row(db, zone_id)
            if zr is None:
                raise NotFound("Zone not found")
            z = zr.zone
            before = {
                "name": z.name,
                "kind": z.kind,
                "operating_schedule": z.operating_schedule,
                "crowd_thresholds": z.crowd_thresholds,
                "reservation_rules": z.reservation_rules,
                "is_active": z.is_active,
            }
            z.name = body.name
            z.kind = body.kind
            z.centroid = geo.point_expr(body.centroid)
            z.boundary = geo.polygon_expr(body.boundary) if body.boundary else None
            z.operating_schedule = body.operating_schedule
            z.crowd_thresholds = thresholds_dict
            z.reservation_rules = rules_dict
            z.is_active = body.is_active
            await db.flush()
            target_id = z.id

        await audit_service.record(
            db,
            actor_user_id=actor_id,
            action="zone.upsert",
            entity_type="zone",
            entity_id=str(target_id),
            before=before,
            after={
                "name": body.name,
                "kind": body.kind,
                "reservation_rules": rules_dict,
                "crowd_thresholds": thresholds_dict,
            },
        )
        await db.commit()
        return await get_zone(db, target_id)

    except IntegrityError as exc:
        await db.rollback()
        raise Conflict("Zone with this name already exists in city or invalid boundary") from exc


async def upsert_facility(
    db: AsyncSession, actor_id: uuid.UUID, body: FacilityUpsert, facility_id: uuid.UUID | None = None
) -> FacilityOut:
    """Creates or updates a parking facility."""
    await get_zone(db, body.zone_id)

    try:
        if facility_id is None:
            fac = ParkingFacility(
                zone_id=body.zone_id,
                name=body.name,
                kind=body.kind,
                location=geo.point_expr(body.location),
                supports_reservation=body.supports_reservation,
                address=body.address,
            )
            db.add(fac)
            await db.flush()
            target_id = fac.id
            before = None
        else:
            fac = await repo.get_facility(db, facility_id)
            if fac is None:
                raise NotFound("Facility not found")
            before = {"name": fac.name, "supports_reservation": fac.supports_reservation}
            fac.name = body.name
            fac.kind = body.kind
            fac.location = geo.point_expr(body.location)
            fac.supports_reservation = body.supports_reservation
            fac.address = body.address
            await db.flush()
            target_id = fac.id

        await audit_service.record(
            db,
            actor_user_id=actor_id,
            action="facility.upsert",
            entity_type="parking_facility",
            entity_id=str(target_id),
            before=before,
            after={"name": body.name, "supports_reservation": body.supports_reservation},
        )
        await db.commit()
        return FacilityOut(
            id=fac.id,
            zone_id=fac.zone_id,
            name=fac.name,
            kind=fac.kind,  # type: ignore
            location=body.location,
            supports_reservation=fac.supports_reservation,
            address=fac.address,
            fee=None,
        )
    except IntegrityError as exc:
        await db.rollback()
        raise Conflict("Facility name conflict in zone") from exc


async def upsert_bay(
    db: AsyncSession, actor_id: uuid.UUID, body: BayUpsert, bay_id: uuid.UUID | None = None
) -> BayOut:
    """Creates or updates a parking bay and ensures current_bay_status initialization."""
    fac = await repo.get_facility(db, body.facility_id)
    if fac is None:
        raise NotFound("Facility not found")

    # Invariant: loading bay requires loading or mixed zone
    zone = (await repo.get_zone_row(db, fac.zone_id)).zone
    if body.bay_type == BayType.LOADING and zone.kind not in ("loading", "mixed"):
        raise ValidationFailed("Loading bay requires loading or mixed zone")

    cat_values = [c.value for c in body.permitted_vehicle_categories]

    try:
        if bay_id is None:
            bay = ParkingBay(
                facility_id=body.facility_id,
                code=body.code,
                bay_type=body.bay_type.value,
                location=geo.point_expr(body.location),
                permitted_vehicle_categories=cat_values,
                operating_schedule=body.operating_schedule,
                restrictions=body.restrictions,
                out_of_service=body.out_of_service,
            )
            db.add(bay)
            await db.flush()
            target_id = bay.id
            await repo.insert_current_bay_status(db, target_id)
            before = None
        else:
            bay = await repo.get_bay(db, bay_id)
            if bay is None:
                raise NotFound("Bay not found")
            # If changing bay_type, check if active reservations exist
            if bay.bay_type != body.bay_type.value:
                has_active = await repo.bay_has_active_reservation(db, bay_id)
                if has_active:
                    raise Conflict("Cannot change bay_type while active reservations exist")

            before = {"code": bay.code, "bay_type": bay.bay_type, "out_of_service": bay.out_of_service}
            bay.code = body.code
            bay.bay_type = body.bay_type.value
            bay.location = geo.point_expr(body.location)
            bay.permitted_vehicle_categories = cat_values
            bay.operating_schedule = body.operating_schedule
            bay.restrictions = body.restrictions
            bay.out_of_service = body.out_of_service
            await db.flush()
            target_id = bay.id

        await audit_service.record(
            db,
            actor_user_id=actor_id,
            action="bay.upsert",
            entity_type="parking_bay",
            entity_id=str(target_id),
            before=before,
            after={"code": body.code, "bay_type": body.bay_type.value, "out_of_service": body.out_of_service},
        )
        await db.commit()

        return BayOut(
            id=bay.id,
            facility_id=bay.facility_id,
            code=bay.code,
            bay_type=BayType(bay.bay_type),
            location=body.location,
            permitted_vehicle_categories=body.permitted_vehicle_categories,
            restrictions=bay.restrictions,
            out_of_service=bay.out_of_service,
        )
    except IntegrityError as exc:
        await db.rollback()
        raise Conflict("Bay code already exists in facility") from exc
