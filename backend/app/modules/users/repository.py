"""ParkSMART - User and Role Persistence Repository (File 59)."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.rbac import Role
from app.models.user import User, UserRole

ROLE_ID_MAP: dict[Role, int] = {
    Role.DRIVER: 1,
    Role.BUSINESS_OPERATOR: 2,
    Role.MUNICIPAL_ADMIN: 3,
    Role.FIELD_OPERATOR: 4,
    Role.SYSTEM_ADMIN: 5,
}

ID_ROLE_MAP: dict[int, Role] = {v: k for k, v in ROLE_ID_MAP.items()}


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    """Retrieves a user by UUID with eagerly loaded roles."""
    stmt = (
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .where(User.id == user_id)
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Retrieves a user by email address (case-insensitive via CITEXT)."""
    stmt = (
        select(User)
        .options(selectinload(User.user_roles).selectinload(UserRole.role))
        .where(User.email == email)
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    *,
    email: str,
    password_hash: str,
    full_name: str,
    phone: str | None = None,
    status: str = "pending",
    role: Role = Role.DRIVER,
    granted_by: uuid.UUID | None = None,
) -> User:
    """Creates a new user and links their initial role."""
    new_user = User(
        email=email,
        password_hash=password_hash,
        full_name=full_name,
        phone=phone,
        status=status,
    )
    db.add(new_user)
    await db.flush()

    role_id = ROLE_ID_MAP.get(role, 1)
    ur = UserRole(
        user_id=new_user.id,
        role_id=role_id,
        granted_by=granted_by,
    )
    db.add(ur)
    await db.flush()

    await db.refresh(new_user, attribute_names=["user_roles"])
    return new_user


async def set_password_hash(db: AsyncSession, user_id: uuid.UUID, password_hash: str) -> None:
    """Updates password hash for a user."""
    await db.execute(
        update(User).where(User.id == user_id).values(password_hash=password_hash)
    )
    await db.flush()


async def update_fields(db: AsyncSession, user: User, fields: dict[str, Any]) -> None:
    """Applies updated fields to a user model."""
    for k, v in fields.items():
        setattr(user, k, v)
    await db.flush()


async def set_status(db: AsyncSession, user: User, status: str) -> None:
    """Updates user account status."""
    user.status = status
    await db.flush()


async def add_role(
    db: AsyncSession, user_id: uuid.UUID, role: Role, granted_by: uuid.UUID | None
) -> bool:
    """Idempotently adds a role to a user."""
    role_id = ROLE_ID_MAP[role]
    stmt = (
        pg_insert(UserRole)
        .values(user_id=user_id, role_id=role_id, granted_by=granted_by)
        .on_conflict_do_nothing(index_elements=["user_id", "role_id"])
    )
    res = await db.execute(stmt)
    await db.flush()
    return bool(res.rowcount > 0)


async def remove_role(db: AsyncSession, user_id: uuid.UUID, role: Role) -> bool:
    """Removes a role from a user."""
    role_id = ROLE_ID_MAP[role]
    stmt = delete(UserRole).where(
        UserRole.user_id == user_id, UserRole.role_id == role_id
    )
    res = await db.execute(stmt)
    await db.flush()
    return bool(res.rowcount > 0)


async def count_with_role(db: AsyncSession, role: Role) -> int:
    """Counts active approved users holding a specific role."""
    role_id = ROLE_ID_MAP[role]
    stmt = (
        select(func.count(User.id))
        .join(UserRole, User.id == UserRole.user_id)
        .where(
            UserRole.role_id == role_id,
            User.status == "approved",
            User.is_active.is_(True),
        )
    )
    return (await db.execute(stmt)).scalar_one()


async def search(
    db: AsyncSession,
    *,
    status: str | None = None,
    role: str | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[User], int]:
    """Searches users with filtering and count."""
    query = select(User).options(selectinload(User.user_roles).selectinload(UserRole.role))
    count_query = select(func.count(User.id))

    if status:
        query = query.where(User.status == status)
        count_query = count_query.where(User.status == status)

    if role:
        role_enum = Role(role.lower())
        role_id = ROLE_ID_MAP[role_enum]
        query = query.join(UserRole, User.id == UserRole.user_id).where(UserRole.role_id == role_id)
        count_query = count_query.join(UserRole, User.id == UserRole.user_id).where(UserRole.role_id == role_id)

    if q:
        safe_q = f"%{q}%"
        cond = or_(User.email.ilike(safe_q), User.full_name.ilike(safe_q))
        query = query.where(cond)
        count_query = count_query.where(cond)

    query = query.order_by(User.created_at.desc(), User.id).limit(limit).offset(offset)

    total = (await db.execute(count_query)).scalar_one()
    items = (await db.execute(query)).scalars().all()
    return list(items), total


async def get_user_ids_with_role(db: AsyncSession, role: Role) -> list[uuid.UUID]:
    """Retrieves all user IDs having the specified role."""
    role_id = ROLE_ID_MAP[role]
    stmt = select(UserRole.user_id).join(User, User.id == UserRole.user_id).where(
        UserRole.role_id == role_id,
        User.status == "approved",
        User.is_active.is_(True),
    )
    return list((await db.execute(stmt)).scalars().all())
