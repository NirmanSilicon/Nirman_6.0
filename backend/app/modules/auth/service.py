"""ParkSMART - Authentication Business Rules and Session Service (File 54)."""

from __future__ import annotations

from datetime import timedelta

from argon2 import PasswordHasher
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.clock import utcnow
from app.core.rbac import Role, can_self_register, initial_status, parse_role
from app.core.security import (
    create_access_token,
    hash_password,
    hash_refresh_token,
    needs_rehash,
    new_refresh_token,
    verify_password,
)
from app.errors import (
    AccountPending,
    Conflict,
    Forbidden,
    InvalidCredentials,
    TokenInvalid,
)
from app.models.user import User
from app.modules.audit import service as audit_service
from app.modules.auth import repository as repo
from app.modules.businesses import repository as biz_repo
from app.modules.users import repository as user_repo
from app.schemas.auth import LoginRequest, RegisterRequest, TokenPair, UserOut

# Dummy hash computed once at import to equalize timing for unknown emails
_DUMMY_HASH = PasswordHasher().hash("dummy-constant-time-password-verification-hash")


def _to_user_out(user: User) -> UserOut:
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


async def register(db: AsyncSession, body: RegisterRequest) -> UserOut:
    """Handles new user registration and initial business provisioning."""
    if not can_self_register(body.role):
        raise Forbidden("Role cannot be self-assigned")

    existing = await user_repo.get_user_by_email(db, body.email)
    if existing is not None:
        raise Conflict("Email already registered")

    pwd_hash = hash_password(body.password)
    user_status = initial_status(body.role)

    try:
        user = await user_repo.create_user(
            db,
            email=body.email,
            password_hash=pwd_hash,
            full_name=body.full_name,
            status=user_status,
            role=body.role,
        )

        if body.role == Role.BUSINESS_OPERATOR and body.business_name:
            biz = await biz_repo.create_business(
                db,
                name=body.business_name,
                registration_no=None,
                created_by=user.id,
                status="approved",
            )
            await biz_repo.add_member(
                db,
                business_id=biz.id,
                user_id=user.id,
                member_role="owner",
            )

        roles_list = [r.value for r in [body.role]]
        await audit_service.record(
            db,
            actor_user_id=user.id,
            action="user.register",
            entity_type="app_user",
            entity_id=str(user.id),
            before=None,
            after={"email": user.email, "status": user.status, "roles": roles_list},
        )
        await db.commit()
        await db.refresh(user, attribute_names=["user_roles"])
        return _to_user_out(user)

    except IntegrityError as exc:
        await db.rollback()
        raise Conflict("Email already registered") from exc


async def issue_tokens(db: AsyncSession, user: User) -> TokenPair:
    """Issues fresh access token and inserts rotating refresh token."""
    settings = get_settings()
    roles = [ur.role.name for ur in user.user_roles if ur.role]
    access = create_access_token(user.id, roles)

    raw_refresh, token_hash = new_refresh_token()
    now = utcnow()
    expires_at = now + timedelta(days=settings.refresh_ttl_days)

    await repo.insert_refresh_token(
        db,
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )

    return TokenPair(
        access_token=access,
        refresh_token=raw_refresh,
        token_type="bearer",
        expires_in=settings.access_ttl_min * 60,
    )


async def login(db: AsyncSession, body: LoginRequest) -> TokenPair:
    """Authenticates email and password, returning tokens for approved users."""
    user = await user_repo.get_user_by_email(db, body.email)
    if user is None:
        verify_password(body.password, _DUMMY_HASH)
        raise InvalidCredentials("Invalid email or password")

    if not verify_password(body.password, user.password_hash):
        raise InvalidCredentials("Invalid email or password")

    if not user.is_active:
        raise Forbidden("Account inactive")

    if user.status != "approved":
        if user.status == "pending":
            raise AccountPending("Account awaiting approval")
        raise Forbidden(f"Account {user.status}")

    if needs_rehash(user.password_hash):
        new_hash = hash_password(body.password)
        await user_repo.set_password_hash(db, user.id, new_hash)

    tokens = await issue_tokens(db, user)
    await db.commit()
    return tokens


async def refresh(db: AsyncSession, raw_refresh_token: str) -> TokenPair:
    """Rotates refresh token atomically with theft / reuse detection."""
    now = utcnow()
    token_hash = hash_refresh_token(raw_refresh_token)
    row = await repo.get_for_update(db, token_hash)

    if row is None:
        raise TokenInvalid("Refresh token invalid")

    # Reuse detection: rotated token reused -> revoke entire family
    if row.revoked_at is not None:
        await repo.revoke_all_for_user(db, row.user_id, now=now)
        await db.commit()
        raise TokenInvalid("Refresh token invalid (reuse detected)")

    if row.expires_at <= now:
        raise TokenInvalid("Refresh token expired")

    user = await user_repo.get_user_by_id(db, row.user_id)
    if user is None or not user.is_active:
        raise Forbidden("Account inactive")
    if user.status != "approved":
        if user.status == "pending":
            raise AccountPending("Account awaiting approval")
        raise Forbidden(f"Account {user.status}")

    # Revoke old token and issue fresh pair
    await repo.revoke(db, row, now=now)
    tokens = await issue_tokens(db, user)
    await db.commit()
    return tokens


async def logout(db: AsyncSession, raw_refresh_token: str) -> None:
    """Revokes the given refresh token. Idempotent."""
    token_hash = hash_refresh_token(raw_refresh_token)
    row = await repo.get_for_update(db, token_hash)
    if row is not None and row.revoked_at is None:
        await repo.revoke(db, row)
        await db.commit()
