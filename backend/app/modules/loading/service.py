"""ParkSMART - Commercial Loading Reservation Service (File 74)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.deps import CurrentUser
from app.errors import (
    BookingOverlap,
    Conflict,
    Forbidden,
    NotFound,
    ValidationFailed,
)
from app.models.infra import ParkingBay
from app.models.reservation import LoadingReservation
from app.modules.audit import service as audit_service
from app.modules.businesses.service import resolve_business_for_user
from app.modules.loading import repository as repo
from app.modules.parking import repository as park_repo
from app.modules.parking.service import effective_schedule, within_schedule
from app.modules.reservations.service import (
    ALLOWED_TRANSITIONS,
    OPERATOR_ROLES,
    new_reference,
)
from app.schemas.common import ReservationStatus
from app.schemas.reservation import (
    LoadingReservationCreate,
    ReservationOut,
    ReservationReschedule,
    SlotOut,
    SlotQuery,
    StatusUpdate,
)

OVERLAP_CONSTRAINT = "ex_loading_reservation_no_overlap"


def _to_loading_out(res: LoadingReservation) -> ReservationOut:
    return ReservationOut(
        id=res.id,
        reference=res.reference,
        kind="loading",
        bay_id=res.bay_id,
        status=ReservationStatus(res.status),
        start=res.during.lower,
        end=res.during.upper,
        vehicle_category=res.vehicle_category,  # type: ignore
        business_id=res.business_id,
        delivery_info=res.delivery_info,
        created_at=res.created_at,
        updated_at=res.updated_at,
        checked_in_at=res.checked_in_at,
        started_at=res.started_at,
        completed_at=res.completed_at,
        cancelled_at=res.cancelled_at,
    )


async def create_loading_reservation(
    db: AsyncSession,
    current: CurrentUser,
    body: LoadingReservationCreate,
    business_id: uuid.UUID | None = None,
) -> ReservationOut:
    """Transactionally reserves a commercial loading slot for an approved business."""
    now = utcnow()
    if body.start < now - timedelta(seconds=30):
        raise ValidationFailed("Reservation start time cannot be in the past")
    if body.end <= body.start:
        raise ValidationFailed("Reservation end time must be after start time")

    biz = await resolve_business_for_user(db, current, business_id)
    if biz.status != "approved":
        raise Forbidden("Business not approved")

    zone_row = await park_repo.get_zone_row(db, body.zone_id)
    if zone_row is None or not zone_row.zone.is_active:
        raise NotFound("Zone not found or inactive")
    if zone_row.zone.kind not in ("loading", "mixed"):
        raise ValidationFailed("Zone has no loading bays")

    if zone_row.zone.reservation_rules is None:
        raise ValidationFailed("zone reservation_rules not configured")

    city = zone_row.zone.city
    tz_str = city.tz if city else "Asia/Kolkata"

    # Determine candidate bays
    if body.bay_id is not None:
        bay = await park_repo.get_bay(db, body.bay_id)
        if bay is None or bay.out_of_service:
            raise NotFound("Loading bay not found or out of service")
        if bay.bay_type != "loading":
            raise ValidationFailed("Bay is not a loading bay")
        if body.vehicle_category.value not in bay.permitted_vehicle_categories:
            raise ValidationFailed("Bay does not permit this vehicle category")
        candidate_bays = [bay]
    else:
        # Auto-pick across all loading facilities in zone in ascending code order
        facilities = await park_repo.list_facilities(db, body.zone_id)
        all_loading_bays: list[ParkingBay] = []
        for f in facilities:
            fbays = await park_repo.eligible_bays(
                db, f.id, "loading", body.vehicle_category.value
            )
            all_loading_bays.extend(fbays)
        candidate_bays = sorted(all_loading_bays, key=lambda b: b.code)

    if not candidate_bays:
        raise ValidationFailed("No eligible loading bay available for this category")

    # Filter candidate bays by operating schedule
    valid_bays = [
        b
        for b in candidate_bays
        if within_schedule(
            effective_schedule(b.operating_schedule, zone_row.zone.operating_schedule),
            body.start,
            body.end,
            tz_str,
        )
    ]
    if not valid_bays:
        raise ValidationFailed("Outside operating hours")

    delivery_dict = body.delivery_info.model_dump()

    # Attempt insertion in ascending bay code order inside savepoints
    for candidate_bay in valid_bays:
        for attempt in range(3):
            ref = new_reference()
            try:
                async with db.begin_nested():
                    res = await repo.insert_reservation(
                        db,
                        reference=ref,
                        bay_id=candidate_bay.id,
                        business_id=biz.id,
                        created_by=current.id,
                        vehicle_id=body.vehicle_id,
                        vehicle_category=body.vehicle_category.value,
                        start=body.start,
                        end=body.end,
                        status="confirmed",
                        delivery_info=delivery_dict,
                    )
                    await park_repo.history_repo if False else None
                    from app.modules.reservations import repository as res_repo

                    await res_repo.insert_history(
                        db,
                        reservation_type="loading",
                        reservation_id=res.id,
                        from_status=None,
                        to_status="confirmed",
                        changed_by=current.id,
                        reason="Initial creation",
                    )
                    await audit_service.record(
                        db,
                        actor_user_id=current.id,
                        action="loading_reservation.create",
                        entity_type="loading_reservation",
                        entity_id=str(res.id),
                        before=None,
                        after={
                            "reference": ref,
                            "bay_id": str(candidate_bay.id),
                            "business_id": str(biz.id),
                        },
                    )
                # Commit outer transaction
                await db.commit()
                await db.refresh(res)
                return _to_loading_out(res)

            except IntegrityError as exc:
                err_msg = str(exc).lower()
                if OVERLAP_CONSTRAINT in err_msg or "23p01" in err_msg:
                    break
                if "uq_loading_reservation_reference" in err_msg and attempt < 2:
                    continue
                await db.rollback()
                raise Conflict("Database integrity error on loading reservation create") from exc

    raise BookingOverlap("No bay available for the requested time")


async def find_slots(db: AsyncSession, current: CurrentUser, q: SlotQuery) -> list[SlotOut]:
    """Finds advisory candidate available loading slots for a given zone and date."""
    zone_row = await park_repo.get_zone_row(db, q.zone_id)
    if zone_row is None:
        raise NotFound("Zone not found")
    if zone_row.zone.reservation_rules is None:
        raise ValidationFailed("zone reservation_rules not configured")

    city = zone_row.zone.city
    tz = ZoneInfo(city.tz if city else "Asia/Kolkata")
    now = utcnow()

    facilities = await park_repo.list_facilities(db, q.zone_id)
    all_bays: list[ParkingBay] = []
    for f in facilities:
        fbays = await park_repo.eligible_bays(db, f.id, "loading", q.vehicle_category.value)
        all_bays.extend(fbays)

    if not all_bays:
        return []

    day_local_start = datetime.combine(q.date, datetime.min.time(), tzinfo=tz)
    day_local_end = datetime.combine(q.date, datetime.max.time(), tzinfo=tz)
    day_start_utc = day_local_start.astimezone(ZoneInfo("UTC"))
    day_end_utc = day_local_end.astimezone(ZoneInfo("UTC"))

    bay_ids = [b.id for b in all_bays]
    busy = await repo.busy_ranges(db, bay_ids, day_start_utc, day_end_utc)

    slots: list[SlotOut] = []
    step = timedelta(minutes=q.duration_min)

    for bay in all_bays:
        cur_t = day_start_utc
        bay_busy = busy.get(bay.id, [])
        sched = effective_schedule(bay.operating_schedule, zone_row.zone.operating_schedule)

        while cur_t + step <= day_end_utc:
            slot_end = cur_t + step
            if cur_t >= now and within_schedule(sched, cur_t, slot_end, tz.key):
                collides = any(
                    not (slot_end <= b_start or cur_t >= b_end)
                    for b_start, b_end in bay_busy
                )
                if not collides:
                    slots.append(SlotOut(bay_id=bay.id, start=cur_t, end=slot_end))
            cur_t += step

    return slots


async def free_loading_bays(
    db: AsyncSession,
    zone_id: uuid.UUID,
    start: datetime,
    end: datetime,
    category: str,
) -> list[ParkingBay]:
    """Finds all bays in a loading zone that are free during the requested window."""
    facilities = await park_repo.list_facilities(db, zone_id)
    candidate_bays: list[ParkingBay] = []
    for f in facilities:
        bays = await park_repo.eligible_bays(db, f.id, "loading", category)
        candidate_bays.extend(bays)

    busy = await repo.busy_bays(db, zone_id, start, end)
    return [b for b in candidate_bays if b.id not in busy]


async def change_status(
    db: AsyncSession,
    current: CurrentUser,
    reservation_id: uuid.UUID,
    body: StatusUpdate,
) -> ReservationOut:
    """Transitions loading reservation state and updates check-in / start timestamps."""
    now = utcnow()
    res = await repo.get_for_update(db, reservation_id)
    if res is None:
        raise NotFound("Loading reservation not found")

    from app.modules.businesses.service import require_member

    membership = await require_member(db, current, res.business_id, owner=False)
    is_operator = not current.roles.isdisjoint(OPERATOR_ROLES)
    if membership is None and not is_operator:
        raise Forbidden("Not authorized to modify this loading reservation")

    to_st = body.to_status.value
    cur_st = res.status

    if to_st in ("no_show", "expired"):
        raise Forbidden("Status is system-only and cannot be manually set")

    allowed_next = ALLOWED_TRANSITIONS.get(cur_st, set())
    if to_st not in allowed_next:
        raise Conflict(
            f"Invalid status transition from {cur_st} to {to_st}",
            {"from": cur_st, "to": to_st},
        )

    # Check business approval status unless cancelling
    from app.modules.businesses import repository as biz_repo

    biz = await biz_repo.get_business(db, res.business_id)
    if biz and biz.status != "approved" and to_st != "cancelled":
        raise Forbidden("Business not approved")

    # Load zone rules
    bay = await park_repo.get_bay(db, res.bay_id)
    fac = await park_repo.get_facility(db, bay.facility_id) if bay else None
    zone_row = await park_repo.get_zone_row(db, fac.zone_id) if fac else None
    rules = zone_row.zone.reservation_rules if zone_row else None

    grace_min = rules.get("grace_min", 15) if rules else 15
    cancel_cutoff_min = rules.get("cancel_cutoff_min", 30) if rules else 30

    timestamps: dict[str, datetime] = {}
    if to_st == "checked_in":
        if now > res.during.lower + timedelta(minutes=grace_min) or now >= res.during.upper:
            raise Conflict("Check-in window closed")
        timestamps["checked_in_at"] = now
    elif to_st == "in_progress":
        timestamps["started_at"] = now
    elif to_st == "completed":
        timestamps["completed_at"] = now
    elif to_st == "cancelled":
        if not is_operator and now > res.during.lower - timedelta(minutes=cancel_cutoff_min):
            raise Conflict("Cancellation cutoff passed")
        timestamps["cancelled_at"] = now

    await repo.update_status(
        db,
        res,
        to_st,
        timestamps=timestamps,
        cancel_reason=body.reason,
    )

    from app.modules.reservations import repository as res_repo

    await res_repo.insert_history(
        db,
        reservation_type="loading",
        reservation_id=res.id,
        from_status=cur_st,
        to_status=to_st,
        changed_by=current.id,
        reason=body.reason,
    )
    await audit_service.record(
        db,
        actor_user_id=current.id,
        action="loading_reservation.status",
        entity_type="loading_reservation",
        entity_id=str(res.id),
        before={"status": cur_st},
        after={"status": to_st, "reason": body.reason},
    )
    await db.commit()
    await db.refresh(res)
    return _to_loading_out(res)


async def reschedule(
    db: AsyncSession,
    current: CurrentUser,
    reservation_id: uuid.UUID,
    body: ReservationReschedule,
) -> ReservationOut:
    """Reschedules time range for an active loading reservation."""
    now = utcnow()
    if body.start < now:
        raise ValidationFailed("New start time cannot be in the past")
    if body.end <= body.start:
        raise ValidationFailed("New end time must be after start time")

    res = await repo.get_for_update(db, reservation_id)
    if res is None:
        raise NotFound("Loading reservation not found")

    from app.modules.businesses.service import require_member

    await require_member(db, current, res.business_id, owner=True)

    if res.status not in ("pending", "confirmed"):
        raise Conflict("Only pending or confirmed reservations can be rescheduled")

    bay = await park_repo.get_bay(db, res.bay_id)
    fac = await park_repo.get_facility(db, bay.facility_id) if bay else None
    zone_row = await park_repo.get_zone_row(db, fac.zone_id) if fac else None
    rules = zone_row.zone.reservation_rules if zone_row else None
    cancel_cutoff = rules.get("cancel_cutoff_min", 30) if rules else 30

    if now > res.during.lower - timedelta(minutes=cancel_cutoff):
        raise Conflict("Cancellation cutoff passed; cannot reschedule")

    city = zone_row.zone.city if zone_row else None
    tz_str = city.tz if city else "Asia/Kolkata"
    sched = effective_schedule(bay.operating_schedule, zone_row.zone.operating_schedule)
    if not within_schedule(sched, body.start, body.end, tz_str):
        raise ValidationFailed("New time is outside operating hours")

    old_during = f"[{res.during.lower.isoformat()}, {res.during.upper.isoformat()})"
    try:
        async with db.begin_nested():
            await repo.update_during(db, res, body.start, body.end)
            from app.modules.reservations import repository as res_repo

            await res_repo.insert_history(
                db,
                reservation_type="loading",
                reservation_id=res.id,
                from_status=res.status,
                to_status=res.status,
                changed_by=current.id,
                reason="rescheduled",
            )
            await audit_service.record(
                db,
                actor_user_id=current.id,
                action="loading_reservation.reschedule",
                entity_type="loading_reservation",
                entity_id=str(res.id),
                before={"during": old_during},
                after={"during": f"[{body.start.isoformat()}, {body.end.isoformat()})"},
            )
        await db.commit()
        await db.refresh(res)
        return _to_loading_out(res)
    except IntegrityError as exc:
        err_msg = str(exc).lower()
        if OVERLAP_CONSTRAINT in err_msg or "23p01" in err_msg:
            raise BookingOverlap("The requested new time window is not available") from exc
        raise Conflict("Reschedule failed due to constraint violation") from exc


async def system_transition(
    db: AsyncSession, reservation_id: uuid.UUID, to_status: str, reason: str
) -> bool:
    """Applies automated time-driven loading transitions."""
    res = await repo.get_for_update(db, reservation_id)
    if res is None:
        return False

    cur_st = res.status
    allowed_next = ALLOWED_TRANSITIONS.get(cur_st, set())
    if to_status not in allowed_next:
        return False

    timestamps: dict[str, datetime] = {}
    if to_status == "completed":
        timestamps["completed_at"] = utcnow()

    await repo.update_status(
        db,
        res,
        to_status,
        timestamps=timestamps,
        cancel_reason=reason,
    )
    from app.modules.reservations import repository as res_repo

    await res_repo.insert_history(
        db,
        reservation_type="loading",
        reservation_id=res.id,
        from_status=cur_st,
        to_status=to_status,
        changed_by=None,
        reason=reason,
    )
    await db.commit()
    return True
