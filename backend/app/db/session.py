"""ParkSMART - Async Database Engine and Session Factory (File 22)."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings
from app.errors import ServiceUnavailable

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    pool_size=10,
    max_overflow=10,
    pool_pre_ping=True,
)

SessionFactory = async_sessionmaker(
    engine,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Provides an isolated async session with automatic rollback on error."""
    try:
        async with SessionFactory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
    except (TimeoutError, OperationalError) as exc:
        raise ServiceUnavailable(
            "Database not reachable",
            details={"error": str(exc)},
            code="DB_UNAVAILABLE",
        ) from exc


@asynccontextmanager
async def transaction(session: AsyncSession):
    """Context manager for nested transaction savepoints (e.g. candidate bay booking attempts)."""
    async with session.begin_nested():
        yield
