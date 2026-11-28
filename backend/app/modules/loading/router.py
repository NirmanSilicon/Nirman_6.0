"""ParkSMART - Commercial Loading Reservations API Router (File 73)."""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Role
from app.deps import CurrentUser, get_current_user, get_db, require_roles
from app.modules.businesses import repository as biz_repo
from app.modules.loading import repository as repo
from app.modules.loading import service
from app.modules.parking import service as park_service
from app.schemas.common import Page, UtcDateTime, VehicleCategory
from app.schemas.parking import BayOut, ZoneOut
from app.schemas.reservation import (
    LoadingReservationCreate,
    ReservationOut,
    ReservationReschedule,
    SlotOut,
    SlotQuery,
    StatusUpdate,
)

router = APIRouter()


@router.get("/zones", response_model=list[ZoneOut])
async def list_loading_zones(
    db: AsyncSession = Depends(get_db),
    _user=Depends(
        require_roles(
            Role.BUSINESS_OPERATOR,
            Role.FIELD_OPERATOR,
            Role.MUNICIPAL_ADMIN,
            Role.SYSTEM_ADMIN,
        )
    ),
) -> list[ZoneOut]:
    """Lists zones configured for commercial loading or mixed use."""
    page = await park_service.list_zones(db, active_only=True, limit=200, offset=0)
    return [z for z in page.items if z.kind in ("loading", "mixed")]


@router.get("/zones/{zone_id}/bays", response_model=list[BayOut])
async def list_zone_loading_bays(
    zone_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(
        require_roles(
            Role.BUSINESS_OPERATOR,
            Role.FIELD_OPERATOR,
            Role.MUNICIPAL_ADMIN,
            Role.SYSTEM_ADMIN,
        )
    ),
) -> list[BayOut]:
    """Lists loading bays configured for a specific loading or mixed zone."""
    bays_with_status = await park_service.list_bays_with_status(db, zone_id, bay_type="loading")
    return [bs.bay for bs in bays_with_status]


@router.get("/bays", response_model=list[BayOut])
async def list_free_loading_bays(
    zone_id: uuid.UUID = Query(...),
    start: UtcDateTime = Query(...),
    end: UtcDateTime = Query(...),
    vehicle_category: VehicleCategory = Query(...),
    db: AsyncSession = Depends(get_db),
    _user=Depends(
        require_roles(
            Role.BUSINESS_OPERATOR,
            Role.FIELD_OPERATOR,
            Role.MUNICIPAL_ADMIN,
            Role.SYSTEM_ADMIN,
        )
    ),
) -> list[BayOut]:
    """Queries candidate loading bays free during the specified window."""
    free_bays = await service.free_loading_bays(
        db, zone_id, start, end, vehicle_category.value
    )
    bays_with_status = await park_service.list_bays_with_status(db, zone_id, bay_type="loading")
    free_ids = {b.id for b in free_bays}
    return [bs.bay for bs in bays_with_status if bs.bay.id in free_ids]


@router.get("/slots", response_model=list[SlotOut])
async def find_available_loading_slots(
    zone_id: uuid.UUID = Query(...),
    for_date: date = Query(..., alias="date"),
    vehicle_category: VehicleCategory = Query(...),
    duration_min: int = Query(default=60, gt=0),
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(
        require_roles(
            Role.BUSINESS_OPERATOR,
            Role.FIELD_OPERATOR,
            Role.MUNICIPAL_ADMIN,
            Role.SYSTEM_ADMIN,
        )
    ),
) -> list[SlotOut]:
    """Queries candidate available loading slots on a date."""
    q = SlotQuery(
        zone_id=zone_id,
        date=for_date,
        vehicle_category=vehicle_category,
        duration_min=duration_min,
    )
    return await service.find_slots(db, current, q)


@router.post("/reservations", response_model=ReservationOut, status_code=status.HTTP_201_CREATED)
async def create_loading_reservation(
    body: LoadingReservationCreate,
    business_id: uuid.UUID | None = Query(default=None),
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(
        require_roles(
            Role.BUSINESS_OPERATOR,
            Role.FIELD_OPERATOR,
            Role.MUNICIPAL_ADMIN,
            Role.SYSTEM_ADMIN,
        )
    ),
) -> ReservationOut:
    """Reserves a commercial loading bay for an approved business."""
    return await service.create_loading_reservation(
        db, current, body, business_id=business_id
    )


@router.get("/reservations", response_model=Page[ReservationOut])
async def list_loading_reservations(
    business_id: uuid.UUID | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    from_ts: UtcDateTime | None = Query(default=None, alias="from"),
    to_ts: UtcDateTime | None = Query(default=None, alias="to"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(
        require_roles(
            Role.BUSINESS_OPERATOR,
            Role.FIELD_OPERATOR,
            Role.MUNICIPAL_ADMIN,
            Role.SYSTEM_ADMIN,
        )
    ),
) -> Page[ReservationOut]:
    """Lists loading reservations belonging to the caller's business(es)."""
    is_operator = not current.roles.isdisjoint(
        {Role.FIELD_OPERATOR, Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN}
    )

    if is_operator and business_id is None:
        items, total = await repo.list_all(
            db,
            status=status_filter,
            from_ts=from_ts,
            to_ts=to_ts,
            limit=limit,
            offset=offset,
        )
    else:
        memberships = await biz_repo.list_memberships_for_user(db, current.id)
        accessible_biz_ids = [b.id for b, m in memberships]
        if business_id is not None:
            if business_id not in accessible_biz_ids and not is_operator:
                from app.errors import Forbidden
                raise Forbidden("Not a member of the requested business")
            target_ids = [business_id]
        else:
            target_ids = accessible_biz_ids

        items, total = await repo.list_for_business(
            db,
            business_ids=target_ids,
            status=status_filter,
            from_ts=from_ts,
            to_ts=to_ts,
            limit=limit,
            offset=offset,
        )

    return Page[ReservationOut](
        items=[service._to_loading_out(r) for r in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/reservations/{id}", response_model=ReservationOut)
async def get_loading_reservation(
    id: uuid.UUID,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(
        require_roles(
            Role.BUSINESS_OPERATOR,
            Role.FIELD_OPERATOR,
            Role.MUNICIPAL_ADMIN,
            Role.SYSTEM_ADMIN,
        )
    ),
) -> ReservationOut:
    """Retrieves single loading reservation details."""
    res = await repo.get(db, id)
    if res is None:
        from app.errors import NotFound
        raise NotFound("Loading reservation not found")

    from app.modules.businesses.service import require_member

    await require_member(db, current, res.business_id, owner=False)
    return service._to_loading_out(res)


@router.put("/reservations/{id}/schedule", response_model=ReservationOut)
async def reschedule_loading_reservation(
    id: uuid.UUID,
    body: ReservationReschedule,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.BUSINESS_OPERATOR, Role.SYSTEM_ADMIN)),
) -> ReservationOut:
    """Reschedules active loading reservation time window."""
    return await service.reschedule(db, current, id, body)


@router.post("/reservations/{id}/status", response_model=ReservationOut)
@router.patch("/reservations/{id}/status", response_model=ReservationOut)
async def change_loading_status(
    id: uuid.UUID,
    body: StatusUpdate,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(
        require_roles(
            Role.BUSINESS_OPERATOR,
            Role.FIELD_OPERATOR,
            Role.MUNICIPAL_ADMIN,
            Role.SYSTEM_ADMIN,
        )
    ),
) -> ReservationOut:
    """Transitions loading reservation state (check-in, start, complete, cancel)."""
    return await service.change_status(db, current, id, body)
