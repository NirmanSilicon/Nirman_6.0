"""ParkSMART - Modular Payments Extension Service (File 132)."""

from __future__ import annotations

import uuid
from typing import NoReturn

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.errors import AppError
from app.models.ops import FeeConfiguration
from app.modules.payments import repository as repo


async def list_fees(db: AsyncSession, facility_id: uuid.UUID) -> list[FeeConfiguration]:
    """Informational retrieval of active fee configuration."""
    return await repo.fees_effective_at(db, facility_id, utcnow())


async def create_checkout(*args, **kwargs) -> NoReturn:
    raise AppError(501, "NOT_IMPLEMENTED", "Payments are not enabled in this prototype")


async def handle_webhook(*args, **kwargs) -> NoReturn:
    raise AppError(501, "NOT_IMPLEMENTED", "Payments are not enabled in this prototype")


async def list_transactions(*args, **kwargs) -> NoReturn:
    raise AppError(501, "NOT_IMPLEMENTED", "Payments are not enabled in this prototype")
