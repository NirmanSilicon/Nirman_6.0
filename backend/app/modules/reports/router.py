"""ParkSMART - Operational Reports API Router (File 127)."""

from __future__ import annotations

import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.core.clock import utcnow
from app.core.rbac import Role
from app.deps import get_db, require_roles
from app.errors import ValidationFailed
from app.modules.reports import service
from app.schemas.common import UtcDateTime

router = APIRouter()


@router.get("/reservations-summary")
async def get_reservations_summary(
    zone_id: uuid.UUID | None = Query(default=None),
    from_ts: UtcDateTime | None = Query(default=None, alias="from"),
    to_ts: UtcDateTime | None = Query(default=None, alias="to"),
    kind: str = Query(default="all"),
    format: str = Query(default="json"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
):
    """Generates daily reservation performance summary."""
    now = utcnow()
    eff_from = from_ts if from_ts is not None else now - timedelta(days=30)
    eff_to = to_ts if to_ts is not None else now

    if (eff_to - eff_from).days > 366:
        raise ValidationFailed("Report range cannot exceed 366 days")
    if eff_from >= eff_to:
        raise ValidationFailed("from timestamp must be earlier than to timestamp")

    table = await service.reservations_summary(db, zone_id, eff_from, eff_to, kind)
    if format == "csv":
        return StreamingResponse(
            service.to_csv_stream(table),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=reservations-summary.csv"},
        )
    return {
        "columns": table.columns,
        "rows": table.rows,
        "provenance": table.provenance.value,
        "notes": table.notes,
    }


@router.get("/data-quality")
async def get_data_quality_report(
    zone_id: uuid.UUID | None = Query(default=None),
    from_ts: UtcDateTime | None = Query(default=None, alias="from"),
    to_ts: UtcDateTime | None = Query(default=None, alias="to"),
    format: str = Query(default="json"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.FIELD_OPERATOR, Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
):
    """Generates data quality and camera reporting statistics."""
    now = utcnow()
    eff_from = from_ts if from_ts is not None else now - timedelta(days=7)
    eff_to = to_ts if to_ts is not None else now

    table = await service.data_quality(db, zone_id, eff_from, eff_to)
    if format == "csv":
        return StreamingResponse(
            service.to_csv_stream(table),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=data-quality.csv"},
        )
    return {
        "columns": table.columns,
        "rows": table.rows,
        "provenance": table.provenance.value,
        "notes": table.notes,
    }


@router.get("/forecast-evaluation")
async def get_forecast_evaluation_report(
    zone_id: uuid.UUID = Query(...),
    target: str = Query(default="occupancy_pct"),
    from_ts: UtcDateTime | None = Query(default=None, alias="from"),
    to_ts: UtcDateTime | None = Query(default=None, alias="to"),
    format: str = Query(default="json"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles(Role.MUNICIPAL_ADMIN, Role.SYSTEM_ADMIN)),
):
    """Compares historical forecasts against observed outcomes."""
    now = utcnow()
    eff_from = from_ts if from_ts is not None else now - timedelta(days=7)
    eff_to = to_ts if to_ts is not None else now

    table = await service.forecast_evaluation(db, zone_id, target, eff_from, eff_to)
    if format == "csv":
        return StreamingResponse(
            service.to_csv_stream(table),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=forecast-evaluation.csv"},
        )
    return {
        "columns": table.columns,
        "rows": table.rows,
        "provenance": table.provenance.value,
        "notes": table.notes,
    }
