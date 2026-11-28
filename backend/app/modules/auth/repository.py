"""ParkSMART - Refresh Token Repository (File 55)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.models.user import RefreshToken


async def insert_refresh_token(
    db: AsyncSession,
    user_id: uuid.UUID,
    token_hash: str,
    expires_at: datetime,
) -> RefreshToken:
    """Stores a hashed refresh token session."""
    token = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(token)
    await db.flush()
    return token


async def get_for_update(db: AsyncSession, token_hash: str) -> RefreshToken | None:
    """Locks and retrieves a refresh token row for atomic single-use rotation."""
    stmt = (
        select(RefreshToken)
        .where(RefreshToken.token_hash == token_hash)
        .with_for_update()
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def revoke(db: AsyncSession, token: RefreshToken, now: datetime | None = None) -> None:
    """Marks a single refresh token as revoked."""
    if token.revoked_at is None:
        token.revoked_at = now or utcnow()
        await db.flush()


async def revoke_all_for_user(
    db: AsyncSession, user_id: uuid.UUID, now: datetime | None = None
) -> int:
    """Revokes every active refresh token belonging to a user (used on theft/password change)."""
    rev_ts = now or utcnow()
    stmt = (
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=rev_ts)
    )
    res = await db.execute(stmt)
    await db.flush()
    return res.rowcount or 0


async def purge_expired(db: AsyncSession, before: datetime) -> int:
    """Deletes permanently expired refresh tokens."""
    stmt = delete(RefreshToken).where(RefreshToken.expires_at < before)
    res = await db.execute(stmt)
    await db.flush()
    return res.rowcount or 0
