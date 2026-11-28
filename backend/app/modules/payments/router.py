"""ParkSMART - Payments API Router (File 131)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db
from app.errors import AppError
from app.modules.payments import service
from app.schemas.common import BayType
from app.schemas.parking import FeeOut

router = APIRouter()


@router.get("/fees", response_model=list[FeeOut])
async def list_facility_fees(
    facility_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> list[FeeOut]:
    """Informational lookup of current parking fee configuration."""
    fees = await service.list_fees(db, facility_id)
    return [
        FeeOut(
            rate_per_hour=f.rate_per_hour,
            currency=f.currency,
            bay_type=BayType(f.bay_type),
        )
        for f in fees
    ]


@router.post("/checkout", status_code=501)
async def create_payment_checkout() -> None:
    raise AppError(501, "NOT_IMPLEMENTED", "Payments are not enabled in this prototype")


@router.post("/webhook", status_code=501)
async def payment_gateway_webhook() -> None:
    raise AppError(501, "NOT_IMPLEMENTED", "Payments are not enabled in this prototype")


@router.get("/transactions", status_code=501)
async def list_payment_transactions() -> None:
    raise AppError(501, "NOT_IMPLEMENTED", "Payments are not enabled in this prototype")
