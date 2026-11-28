"""ParkSMART - Business Portal API Router (File 61)."""

from __future__ import annotations

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Role
from app.deps import CurrentUser, get_current_user, get_db, require_roles
from app.modules.businesses import service
from app.schemas.common import UtcDateTime, VehicleCategory

router = APIRouter()


class BusinessOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    registration_no: str | None = None
    status: str
    member_role: Literal["owner", "staff"] | None = None
    created_at: UtcDateTime


class BusinessUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, max_length=150)
    registration_no: str | None = Field(default=None, max_length=100)


class MemberAdd(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_email: EmailStr
    member_role: Literal["owner", "staff"] = "staff"


class MemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    email: str
    full_name: str
    member_role: Literal["owner", "staff"]


class MemberRoleChange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    member_role: Literal["owner", "staff"]


class VehicleCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plate: str = Field(..., min_length=4, max_length=15)
    category: VehicleCategory


class VehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: uuid.UUID
    plate: str
    category: VehicleCategory


@router.get("", response_model=list[BusinessOut])
async def list_my_businesses(
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.BUSINESS_OPERATOR, Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> list[BusinessOut]:
    """Retrieves businesses that the authenticated user belongs to."""
    biz_list = await service.list_my_businesses(db, current)
    return [
        BusinessOut(
            id=b.id,
            name=b.name,
            registration_no=b.registration_no,
            status=b.status,
            member_role=role,  # type: ignore
            created_at=b.created_at,
        )
        for b, role in biz_list
    ]


@router.get("/{id}", response_model=BusinessOut)
async def get_business(
    id: uuid.UUID,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.BUSINESS_OPERATOR, Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> BusinessOut:
    """Retrieves business profile details."""
    biz, role = await service.get_business(db, current, id)
    return BusinessOut(
        id=biz.id,
        name=biz.name,
        registration_no=biz.registration_no,
        status=biz.status,
        member_role=role,  # type: ignore
        created_at=biz.created_at,
    )


@router.patch("/{id}", response_model=BusinessOut)
async def update_business(
    id: uuid.UUID,
    body: BusinessUpdate,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.BUSINESS_OPERATOR, Role.SYSTEM_ADMIN)),
) -> BusinessOut:
    """Updates business profile metadata (owner only)."""
    biz = await service.update_business(db, current, id, body.name, body.registration_no)
    return BusinessOut(
        id=biz.id,
        name=biz.name,
        registration_no=biz.registration_no,
        status=biz.status,
        member_role="owner",
        created_at=biz.created_at,
    )


@router.get("/{id}/members", response_model=list[MemberOut])
async def list_business_members(
    id: uuid.UUID,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.BUSINESS_OPERATOR, Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> list[MemberOut]:
    """Lists authorized members and staff in the business."""
    members = await service.list_members(db, current, id)
    return [MemberOut.model_validate(m) for m in members]


@router.post("/{id}/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
async def add_business_member(
    id: uuid.UUID,
    body: MemberAdd,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.BUSINESS_OPERATOR, Role.SYSTEM_ADMIN)),
) -> MemberOut:
    """Adds a staff member to the business (owner only)."""
    res = await service.add_member(db, current, id, body.user_email, body.member_role)
    return MemberOut.model_validate(res)


@router.patch("/{id}/members/{user_id}", response_model=MemberOut)
async def change_business_member_role(
    id: uuid.UUID,
    user_id: uuid.UUID,
    body: MemberRoleChange,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.BUSINESS_OPERATOR, Role.SYSTEM_ADMIN)),
) -> MemberOut:
    """Modifies a member's role enforcing single-owner invariant."""
    res = await service.change_member_role(db, current, id, user_id, body.member_role)
    return MemberOut.model_validate(res)


@router.delete("/{id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def remove_business_member(
    id: uuid.UUID,
    user_id: uuid.UUID,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.BUSINESS_OPERATOR, Role.SYSTEM_ADMIN)),
) -> Response:
    """Removes a staff member from the business."""
    await service.remove_member(db, current, id, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{id}/vehicles", response_model=list[VehicleOut])
async def list_business_vehicles(
    id: uuid.UUID,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.BUSINESS_OPERATOR, Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
) -> list[VehicleOut]:
    """Lists registered vehicles belonging to the business."""
    vehicles = await service.list_vehicles(db, current, id)
    return [
        VehicleOut(
            id=v.id,
            business_id=v.business_id,  # type: ignore
            plate=v.plate,
            category=VehicleCategory(v.category),
        )
        for v in vehicles
    ]


@router.post("/{id}/vehicles", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
async def add_business_vehicle(
    id: uuid.UUID,
    body: VehicleCreate,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.BUSINESS_OPERATOR, Role.SYSTEM_ADMIN)),
) -> VehicleOut:
    """Registers a new vehicle under the business."""
    vehicle = await service.add_vehicle(db, current, id, body.plate, body.category.value)
    return VehicleOut(
        id=vehicle.id,
        business_id=vehicle.business_id,  # type: ignore
        plate=vehicle.plate,
        category=VehicleCategory(vehicle.category),
    )


@router.delete("/{id}/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def remove_business_vehicle(
    id: uuid.UUID,
    vehicle_id: uuid.UUID,
    current: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.BUSINESS_OPERATOR, Role.SYSTEM_ADMIN)),
) -> Response:
    """Removes a vehicle from the business fleet."""
    await service.remove_vehicle(db, current, id, vehicle_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
