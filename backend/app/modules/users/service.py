"""ParkSMART - User Profile and Management Service (File 58)."""

from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import parse_role
from app.core.security import hash_password, verify_password
from app.errors import InvalidCredentials, NotFound, ValidationFailed
from app.models.user import User
from app.modules.audit import service as audit_service
from app.modules.auth import repository as auth_repo
from app.modules.users import repository as repo
from app.schemas.auth import PasswordChange, UserOut, UserUpdate
from app.schemas.common import Page

PHONE_REGEX = re.compile(r"^[0-9+\-() ]{1,20}$")


def _to_user_out(user: User) -> UserOut:
    """Converts User model to UserOut schema."""
    roles = [parse_role(ur.role.name) for ur in user.user_roles if ur.role]
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        status=user.status,
        roles=roles,
        created_at=user.created_at,
    )


async def get_profile(db: AsyncSession, user_id: uuid.UUID) -> UserOut:
    """Retrieves user profile schema by UUID."""
    user = await repo.get_user_by_id(db, user_id)
    if user is None:
        raise NotFound("User not found")
    return _to_user_out(user)


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User:
    """Retrieves raw User model by UUID."""
    user = await repo.get_user_by_id(db, user_id)
    if user is None:
        raise NotFound("User not found")
    return user


async def update_profile(db: AsyncSession, user_id: uuid.UUID, body: UserUpdate) -> UserOut:
    """Updates user full name or phone number with audit logging."""
    user = await get_user(db, user_id)
    before_snapshot = {"full_name": user.full_name, "phone": user.phone}
    updates: dict[str, Any] = {}

    if body.full_name is not None:
        name = body.full_name.strip()
        if not name:
            raise ValidationFailed("Full name cannot be empty")
        updates["full_name"] = name

    if body.phone is not None:
        phone_val = body.phone.strip()
        if phone_val and not PHONE_REGEX.match(phone_val):
            raise ValidationFailed("Phone format invalid")
        updates["phone"] = phone_val or None

    if not updates:
        return _to_user_out(user)

    await repo.update_fields(db, user, updates)
    after_snapshot = {"full_name": user.full_name, "phone": user.phone}

    await audit_service.record(
        db,
        actor_user_id=user_id,
        action="user.update_profile",
        entity_type="app_user",
        entity_id=str(user_id),
        before=before_snapshot,
        after=after_snapshot,
    )
    await db.commit()
    await db.refresh(user, attribute_names=["user_roles"])
    return _to_user_out(user)


async def change_password(db: AsyncSession, user_id: uuid.UUID, body: PasswordChange) -> None:
    """Changes password, revokes all active refresh tokens, and audits the action."""
    user = await get_user(db, user_id)

    if not verify_password(body.current_password, user.password_hash):
        raise InvalidCredentials("Current password is incorrect")

    if body.new_password == body.current_password:
        raise ValidationFailed("New password must differ from current password")

    new_hash = hash_password(body.new_password)
    await repo.set_password_hash(db, user_id, new_hash)
    await auth_repo.revoke_all_for_user(db, user_id)

    await audit_service.record(
        db,
        actor_user_id=user_id,
        action="user.change_password",
        entity_type="app_user",
        entity_id=str(user_id),
        before=None,
        after=None,
    )
    await db.commit()


async def list_users(
    db: AsyncSession,
    *,
    status: str | None = None,
    role: str | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> Page[UserOut]:
    """Lists users with filtering for administrators."""
    if role:
        # validate role string
        parse_role(role)

    capped_limit = min(limit, 200)
    users, total = await repo.search(
        db, status=status, role=role, q=q, limit=capped_limit, offset=offset
    )
    return Page[UserOut](
        items=[_to_user_out(u) for u in users],
        total=total,
        limit=capped_limit,
        offset=offset,
    )
