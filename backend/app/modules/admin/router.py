"""ParkSMART - Administrative Control API Router (File 123)."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Role
from app.deps import CurrentUser, get_current_user, get_db, require_roles
from app.modules.admin import repository as repo
from app.modules.admin import service
from app.modules.parking import service as park_service
from app.schemas.admin import (
    BayUpsert,
    FacilityUpsert,
    FeeUpsert,
    ManualOccupancyOverride,
    ModelPromote,
    ModelVersionOut,
    RoleGrant,
    UserApproval,
    ZoneUpsert,
)
from app.schemas.auth import UserOut
from app.schemas.common import Page
from app.schemas.parking import BayOut, BayStatusOut, FacilityOut, FeeOut, ZoneOut

router = APIRouter()


class BusinessAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    registration_no: str | None = None
    status: str
    owner_email: str | None = None
    created_at: Any = None


@router.post("/users/{user_id}/status", response_model=UserOut)
async def set_user_account_status(
    user_id: uuid.UUID,
    body: UserApproval,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> UserOut:
    """Approves or suspends user account."""
    return await service.set_user_status(db, current, user_id, body)


@router.post("/users/{user_id}/roles", response_model=UserOut)
async def grant_user_role(
    user_id: uuid.UUID,
    body: RoleGrant,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.SYSTEM_ADMIN)),
) -> UserOut:
    """Grants role to user account (system_admin only)."""
    return await service.grant_role(db, current, user_id, body)


@router.delete("/users/{user_id}/roles/{role}", response_model=UserOut)
async def revoke_user_role(
    user_id: uuid.UUID,
    role: str,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.SYSTEM_ADMIN)),
) -> UserOut:
    """Revokes role from user account (system_admin only)."""
    from app.core.rbac import parse_role
    role_enum = parse_role(role)
    return await service.revoke_role(db, current, user_id, role_enum)


@router.get("/businesses", response_model=Page[BusinessAdminOut])
async def list_businesses_admin(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> Page[BusinessAdminOut]:
    """Lists businesses with owner details for administrative review."""
    rows, total = await repo.businesses_with_owner(
        db, status=status_filter, limit=limit, offset=offset
    )
    items = [
        BusinessAdminOut(
            id=b.id,
            name=b.name,
            registration_no=b.registration_no,
            status=b.status,
            owner_email=email,
            created_at=b.created_at,
        )
        for b, email in rows
    ]
    return Page[BusinessAdminOut](items=items, total=total, limit=limit, offset=offset)


@router.post("/businesses/{id}/status", response_model=dict[str, Any])
async def set_business_approval_status(
    id: uuid.UUID,
    body: dict[str, str],
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> dict[str, Any]:
    """Approves or suspends a commercial business account."""
    status_val = body.get("status", "pending")
    return await service.set_business_status(db, current, id, status_val)


@router.put("/zones", response_model=ZoneOut)
async def create_parking_zone(
    body: ZoneUpsert,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> ZoneOut:
    """Creates a new parking or loading zone."""
    return await park_service.upsert_zone(db, current.id, body, zone_id=None)


@router.put("/zones/{id}", response_model=ZoneOut)
async def update_parking_zone(
    id: uuid.UUID,
    body: ZoneUpsert,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> ZoneOut:
    """Updates parking or loading zone metadata, boundary, and rules."""
    return await park_service.upsert_zone(db, current.id, body, zone_id=id)


@router.put("/facilities", response_model=FacilityOut)
async def create_parking_facility(
    body: FacilityUpsert,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> FacilityOut:
    """Creates a parking facility inside a zone."""
    return await park_service.upsert_facility(db, current.id, body, facility_id=None)


@router.put("/facilities/{id}", response_model=FacilityOut)
async def update_parking_facility(
    id: uuid.UUID,
    body: FacilityUpsert,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> FacilityOut:
    """Updates parking facility metadata and coordinates."""
    return await park_service.upsert_facility(db, current.id, body, facility_id=id)


@router.put("/bays", response_model=BayOut)
async def create_parking_bay(
    body: BayUpsert,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> BayOut:
    """Creates a parking or commercial loading bay."""
    return await park_service.upsert_bay(db, current.id, body, bay_id=None)


@router.put("/bays/{id}", response_model=BayOut)
async def update_parking_bay(
    id: uuid.UUID,
    body: BayUpsert,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> BayOut:
    """Updates parking bay configuration and permissions."""
    return await park_service.upsert_bay(db, current.id, body, bay_id=id)


@router.put("/fees", response_model=FeeOut)
async def configure_facility_fee(
    body: FeeUpsert,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> FeeOut:
    """Configures hourly rate schedule for a parking facility."""
    return await service.upsert_fee(db, current, body)


@router.post("/occupancy-override", response_model=BayStatusOut)
async def manual_bay_override(
    body: ManualOccupancyOverride,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.FIELD_OPERATOR, Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> BayStatusOut:
    """Forces manual override on bay occupancy with audit trail."""
    return await service.manual_override(db, current, body)


@router.post("/models/promote", response_model=ModelVersionOut)
async def promote_forecasting_model(
    body: ModelPromote,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> ModelVersionOut:
    """Promotes candidate time-series forecasting model to active status."""
    return await service.promote_model(db, current, body)
