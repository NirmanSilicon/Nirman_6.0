"""ParkSMART - Business and Fleet Management Service (File 62)."""

from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Role
from app.deps import CurrentUser
from app.errors import Conflict, Forbidden, NotFound, ValidationFailed
from app.models.business import Business, BusinessMember, Vehicle
from app.modules.audit import service as audit_service
from app.modules.businesses import repository as repo
from app.modules.users import repository as user_repo

PLATE_REGEX = re.compile(r"^[A-Z0-9 -]{4,15}$")


async def require_member(
    db: AsyncSession,
    current: CurrentUser,
    business_id: uuid.UUID,
    *,
    owner: bool = False,
) -> BusinessMember | None:
    """Verifies membership or administrative override."""
    is_admin = not current.roles.isdisjoint({Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN})
    membership = await repo.get_membership(db, business_id, current.id)

    if membership is None:
        if is_admin:
            return None
        biz = await repo.get_business(db, business_id)
        if biz is None:
            raise NotFound("Business not found")
        raise Forbidden("Not a member of this business")

    if owner and membership.member_role != "owner" and not is_admin:
        raise Forbidden("Owner role required for this action")

    return membership


async def list_my_businesses(
    db: AsyncSession, current: CurrentUser
) -> list[tuple[Business, str]]:
    """Retrieves all businesses associated with the caller."""
    memberships = await repo.list_memberships_for_user(db, current.id)
    return [(b, m.member_role) for b, m in memberships]


async def get_business(
    db: AsyncSession, current: CurrentUser, business_id: uuid.UUID
) -> tuple[Business, str | None]:
    """Retrieves business entity and caller's member role."""
    membership = await require_member(db, current, business_id, owner=False)
    biz = await repo.get_business(db, business_id)
    if biz is None:
        raise NotFound("Business not found")
    role = membership.member_role if membership else None
    return biz, role


async def update_business(
    db: AsyncSession,
    current: CurrentUser,
    business_id: uuid.UUID,
    name: str | None,
    registration_no: str | None,
) -> Business:
    """Updates business profile metadata."""
    await require_member(db, current, business_id, owner=True)
    biz = await repo.get_business(db, business_id)
    if biz is None:
        raise NotFound("Business not found")

    if biz.status == "suspended":
        raise Forbidden("Business suspended")

    before = {"name": biz.name, "registration_no": biz.registration_no}
    if name is not None:
        stripped_name = name.strip()
        if not stripped_name:
            raise ValidationFailed("Business name cannot be empty")
        biz.name = stripped_name

    if registration_no is not None:
        biz.registration_no = registration_no.strip() or None

    after = {"name": biz.name, "registration_no": biz.registration_no}
    await audit_service.record(
        db,
        actor_user_id=current.id,
        action="business.update",
        entity_type="business",
        entity_id=str(business_id),
        before=before,
        after=after,
    )
    await db.commit()
    await db.refresh(biz)
    return biz


async def list_members(
    db: AsyncSession, current: CurrentUser, business_id: uuid.UUID
) -> list[dict[str, Any]]:
    """Lists all members in the business."""
    await require_member(db, current, business_id, owner=False)
    members_data = await repo.list_members(db, business_id)
    return [
        {
            "user_id": m.user_id,
            "email": u.email,
            "full_name": u.full_name,
            "member_role": m.member_role,
        }
        for m, u in members_data
    ]


async def add_member(
    db: AsyncSession,
    current: CurrentUser,
    business_id: uuid.UUID,
    user_email: str,
    member_role: str,
) -> dict[str, Any]:
    """Adds a staff member to a business."""
    await require_member(db, current, business_id, owner=True)

    if member_role == "owner":
        raise Conflict("Business already has an owner; use single-owner structure")

    target_user = await user_repo.get_user_by_email(db, user_email.strip())
    if target_user is None:
        raise NotFound("User not found")

    if target_user.status != "approved":
        raise ValidationFailed("User account is not approved")

    existing = await repo.get_membership(db, business_id, target_user.id)
    if existing is not None:
        raise Conflict("User is already a member of this business")

    membership = await repo.add_member(
        db,
        business_id=business_id,
        user_id=target_user.id,
        member_role=member_role,
    )

    await audit_service.record(
        db,
        actor_user_id=current.id,
        action="business.member_add",
        entity_type="business_member",
        entity_id=f"{business_id}:{target_user.id}",
        before=None,
        after={"role": member_role, "email": target_user.email},
    )
    await db.commit()

    return {
        "user_id": target_user.id,
        "email": target_user.email,
        "full_name": target_user.full_name,
        "member_role": membership.member_role,
    }


async def change_member_role(
    db: AsyncSession,
    current: CurrentUser,
    business_id: uuid.UUID,
    target_user_id: uuid.UUID,
    new_role: str,
) -> dict[str, Any]:
    """Updates member role enforcing single-owner invariant."""
    await require_member(db, current, business_id, owner=True)

    all_members = await repo.lock_members(db, business_id)
    target = next((m for m in all_members if m.user_id == target_user_id), None)
    if target is None:
        raise NotFound("Member not found in this business")

    if target.member_role == "owner" and new_role != "owner":
        raise Conflict("Business must keep exactly one owner")

    if target.member_role != "owner" and new_role == "owner":
        raise Conflict("Promoting a second owner is not allowed; exactly one owner permitted")

    await repo.update_member_role(db, target, new_role)
    target_user = await user_repo.get_user_by_id(db, target_user_id)

    await audit_service.record(
        db,
        actor_user_id=current.id,
        action="business.member_role_change",
        entity_type="business_member",
        entity_id=f"{business_id}:{target_user_id}",
        before={"role": target.member_role},
        after={"role": new_role},
    )
    await db.commit()

    return {
        "user_id": target.user_id,
        "email": target_user.email if target_user else "",
        "full_name": target_user.full_name if target_user else "",
        "member_role": new_role,
    }


async def remove_member(
    db: AsyncSession,
    current: CurrentUser,
    business_id: uuid.UUID,
    target_user_id: uuid.UUID,
) -> None:
    """Removes a member from business enforcing single-owner invariant."""
    all_members = await repo.lock_members(db, business_id)
    target = next((m for m in all_members if m.user_id == target_user_id), None)
    if target is None:
        raise NotFound("Member not found in this business")

    # Authorize: owner may remove staff; member may remove self
    is_owner = any(m.user_id == current.id and m.member_role == "owner" for m in all_members)
    is_self = current.id == target_user_id
    if not (is_owner or is_self):
        raise Forbidden("Insufficient permissions to remove this member")

    if target.member_role == "owner":
        raise Conflict("Business must keep exactly one owner; owner cannot be removed")

    await repo.delete_member(db, target)
    await audit_service.record(
        db,
        actor_user_id=current.id,
        action="business.member_remove",
        entity_type="business_member",
        entity_id=f"{business_id}:{target_user_id}",
        before={"role": target.member_role},
        after=None,
    )
    await db.commit()


async def list_vehicles(
    db: AsyncSession, current: CurrentUser, business_id: uuid.UUID
) -> list[Vehicle]:
    """Lists vehicles owned by a business."""
    await require_member(db, current, business_id, owner=False)
    return await repo.list_vehicles(db, business_id)


async def add_vehicle(
    db: AsyncSession,
    current: CurrentUser,
    business_id: uuid.UUID,
    plate: str,
    category: str,
) -> Vehicle:
    """Registers a new vehicle under a business."""
    await require_member(db, current, business_id, owner=True)
    biz = await repo.get_business(db, business_id)
    if biz is None:
        raise NotFound("Business not found")
    if biz.status != "approved":
        raise Forbidden("Business not approved")

    clean_plate = plate.strip().upper()
    if not PLATE_REGEX.match(clean_plate):
        raise ValidationFailed("Vehicle plate number format invalid")

    try:
        vehicle = await repo.insert_vehicle(db, business_id, clean_plate, category)
        await audit_service.record(
            db,
            actor_user_id=current.id,
            action="vehicle.create",
            entity_type="vehicle",
            entity_id=str(vehicle.id),
            before=None,
            after={"plate": clean_plate, "category": category, "business_id": str(business_id)},
        )
        await db.commit()
        await db.refresh(vehicle)
        return vehicle
    except IntegrityError as exc:
        await db.rollback()
        raise Conflict("Vehicle already registered under this business") from exc


async def remove_vehicle(
    db: AsyncSession,
    current: CurrentUser,
    business_id: uuid.UUID,
    vehicle_id: uuid.UUID,
) -> None:
    """Deletes a business vehicle if it has no active reservations."""
    await require_member(db, current, business_id, owner=True)
    vehicle = await repo.get_vehicle(db, business_id, vehicle_id)
    if vehicle is None:
        raise NotFound("Vehicle not found")

    has_active = await repo.vehicle_has_active_reservations(db, vehicle_id)
    if has_active:
        raise Conflict("Vehicle has active reservations and cannot be deleted")

    await repo.delete_vehicle(db, vehicle)
    await audit_service.record(
        db,
        actor_user_id=current.id,
        action="vehicle.delete",
        entity_type="vehicle",
        entity_id=str(vehicle_id),
        before={"plate": vehicle.plate},
        after=None,
    )
    await db.commit()


async def resolve_business_for_user(
    db: AsyncSession, current: CurrentUser, business_id: uuid.UUID | None
) -> Business:
    """Resolves business context for user booking loading bays."""
    memberships = await repo.list_memberships_for_user(db, current.id)
    if not memberships:
        raise Forbidden("No business membership found for this account")

    if business_id is not None:
        match = next((b for b, m in memberships if b.id == business_id), None)
        if match is None:
            raise Forbidden("Not a member of the requested business")
        return match

    if len(memberships) == 1:
        return memberships[0][0]

    raise ValidationFailed("business_id is required when you belong to several businesses")
