"""ParkSMART - Administrative Operations Service (File 124)."""

from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.core.rbac import Role
from app.deps import CurrentUser
from app.errors import Conflict, Forbidden, NotFound, ValidationFailed
from app.modules.admin import repository as repo
from app.modules.audit import service as audit_service
from app.modules.auth import repository as auth_repo
from app.modules.businesses import repository as biz_repo
from app.modules.notifications import service as notif_service
from app.modules.parking import service as park_service
from app.modules.users import repository as user_repo
from app.modules.users.service import _to_user_out
from app.schemas.admin import (
    FeeUpsert,
    ManualOccupancyOverride,
    ModelPromote,
    ModelVersionOut,
    RoleGrant,
    UserApproval,
)
from app.schemas.auth import UserOut
from app.schemas.parking import BayStatusOut, FeeOut


async def set_user_status(
    db: AsyncSession, actor: CurrentUser, user_id: uuid.UUID, body: UserApproval
) -> UserOut:
    """Approves or suspends user accounts with privilege boundaries and last-admin guard."""
    if actor.id == user_id:
        raise Forbidden("Cannot change own account status")

    user = await user_repo.get_user_by_id(db, user_id)
    if user is None:
        raise NotFound("User not found")

    user_roles = [r.name for r in [ur.role for ur in user.user_roles if ur.role]]
    is_sys_admin = Role.SYSTEM_ADMIN in actor.roles

    # Municipal admins may only approve/suspend drivers or business operators
    if not is_sys_admin and not set(user_roles).issubset({"driver", "business_operator"}):
        raise Forbidden("Insufficient role for this account: municipal admin cannot modify privileged roles")

    if body.status == "approved" and not user_roles:
        raise ValidationFailed("User has no role assigned")

    # Last-admin protection when suspending
    if body.status == "suspended" and "system_admin" in user_roles:
        from app.modules.users.repository import ROLE_ID_MAP

        sys_role_id = ROLE_ID_MAP[Role.SYSTEM_ADMIN]
        locked_admin_ids = await repo.lock_user_roles(db, sys_role_id)
        if len(locked_admin_ids) <= 1:
            raise Conflict("Cannot suspend the last system_admin")

    before = {"status": user.status}
    await user_repo.set_status(db, user, body.status)

    if body.status == "suspended":
        await auth_repo.revoke_all_for_user(db, user.id)

    await audit_service.record(
        db,
        actor_user_id=actor.id,
        action="admin.user_status",
        entity_type="app_user",
        entity_id=str(user.id),
        before=before,
        after={"status": body.status},
    )
    await notif_service.notify_user(
        db,
        user_id=user.id,
        kind="account_status",
        title="Account Status Updated",
        body=f"Your account status is now {body.status}.",
    )
    await db.commit()
    await db.refresh(user, attribute_names=["user_roles"])
    return _to_user_out(user)


async def grant_role(
    db: AsyncSession, actor: CurrentUser, user_id: uuid.UUID, body: RoleGrant
) -> UserOut:
    """Grants a role to a user (system_admin only)."""
    user = await user_repo.get_user_by_id(db, user_id)
    if user is None:
        raise NotFound("User not found")

    await user_repo.add_role(db, user_id, body.role, granted_by=actor.id)
    await audit_service.record(
        db,
        actor_user_id=actor.id,
        action="admin.role_grant",
        entity_type="user_role",
        entity_id=f"{user_id}:{body.role.value}",
        before=None,
        after={"role": body.role.value},
    )
    await db.commit()
    await db.refresh(user, attribute_names=["user_roles"])
    return _to_user_out(user)


async def revoke_role(
    db: AsyncSession, actor: CurrentUser, user_id: uuid.UUID, role: Role
) -> UserOut:
    """Revokes a role enforcing last-system_admin and at-least-one-role invariants."""
    user = await user_repo.get_user_by_id(db, user_id)
    if user is None:
        raise NotFound("User not found")

    user_roles = [ur.role.name for ur in user.user_roles if ur.role]

    if role == Role.SYSTEM_ADMIN and "system_admin" in user_roles:
        from app.modules.users.repository import ROLE_ID_MAP

        sys_role_id = ROLE_ID_MAP[Role.SYSTEM_ADMIN]
        locked = await repo.lock_user_roles(db, sys_role_id)
        if len(locked) <= 1:
            raise Conflict("Cannot revoke system_admin from the last system_admin")

    if len(user_roles) <= 1 and role.value in user_roles:
        raise Conflict("User must keep at least one role")

    await user_repo.remove_role(db, user_id, role)
    await audit_service.record(
        db,
        actor_user_id=actor.id,
        action="admin.role_revoke",
        entity_type="user_role",
        entity_id=f"{user_id}:{role.value}",
        before={"role": role.value},
        after=None,
    )
    await db.commit()
    await db.refresh(user, attribute_names=["user_roles"])
    return _to_user_out(user)


async def set_business_status(
    db: AsyncSession, actor: CurrentUser, business_id: uuid.UUID, status: str
) -> dict[str, Any]:
    """Approves or suspends a commercial business."""
    biz = await biz_repo.get_business(db, business_id)
    if biz is None:
        raise NotFound("Business not found")

    before = {"status": biz.status}
    await biz_repo.set_status(db, biz, status)
    await audit_service.record(
        db,
        actor_user_id=actor.id,
        action="business.status",
        entity_type="business",
        entity_id=str(business_id),
        before=before,
        after={"status": status},
    )
    await db.commit()
    return {
        "id": biz.id,
        "name": biz.name,
        "registration_no": biz.registration_no,
        "status": biz.status,
    }


async def upsert_fee(
    db: AsyncSession, actor: CurrentUser, body: FeeUpsert
) -> FeeOut:
    """Configures hourly parking/loading fees preventing overlapping validity ranges."""
    fac = await park_service.repo.get_facility(db, body.facility_id)
    if fac is None:
        raise NotFound("Facility not found")

    active_fees = await repo.active_fee_rows_for_update(db, body.facility_id, body.bay_type.value)
    for f in active_fees:
        f_end = f.effective_to or utcnow() + timedelta(days=3650)
        b_end = body.effective_to or utcnow() + timedelta(days=3650)
        # Check interval overlap
        if not (b_end <= f.effective_from or body.effective_from >= f_end):
            raise Conflict("Fee period overlaps with existing active fee configuration")

    fee = await repo.insert_fee(
        db,
        facility_id=body.facility_id,
        bay_type=body.bay_type.value,
        rate_per_hour=body.rate_per_hour,
        currency=body.currency,
        effective_from=body.effective_from,
        effective_to=body.effective_to,
        created_by=actor.id,
    )
    await audit_service.record(
        db,
        actor_user_id=actor.id,
        action="fee.upsert",
        entity_type="fee_configuration",
        entity_id=str(fee.id),
        before=None,
        after={"rate": str(body.rate_per_hour), "bay_type": body.bay_type.value},
    )
    await db.commit()
    return FeeOut(
        rate_per_hour=fee.rate_per_hour,
        currency=fee.currency,
        bay_type=body.bay_type,
    )


async def manual_override(
    db: AsyncSession, actor: CurrentUser, body: ManualOccupancyOverride
) -> BayStatusOut:
    """Manually overrides bay occupancy and marks provenance as 'manual'."""
    from app.modules.ingestion import service as ingestion_service

    await ingestion_service.apply_manual_override(db, actor.id, body)
    return await park_service.get_bay_status(db, body.bay_id)


async def promote_model(
    db: AsyncSession, actor: CurrentUser, body: ModelPromote
) -> ModelVersionOut:
    """Promotes a candidate forecast model version to active status."""
    from app.modules.forecast import repository as forecast_repo

    model = await forecast_repo.promote(db, body.model_version_id)
    await audit_service.record(
        db,
        actor_user_id=actor.id,
        action="model.promote",
        entity_type="forecast_model_version",
        entity_id=str(model.id),
        before=None,
        after={"name": model.name, "version": model.version, "target": model.target},
    )
    await db.commit()
    return ModelVersionOut(
        id=model.id,
        name=model.name,
        version=model.version,
        target=model.target,
        kind=model.kind,
        trained_on=model.trained_on,
        trained_at=model.trained_at,
        status=model.status,
        metrics=model.metrics,
        params=model.params,
    )
