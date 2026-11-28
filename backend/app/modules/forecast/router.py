"""
ParkSMART - Forecasting REST API Router (File 107 / M2 Ownership)

Endpoints:
  GET /forecast/zones/{id} - Get 24-hour demand/occupancy forecast for a zone.
  GET /forecast/models     - Get forecasting model registry and capabilities.

Access Rules:
- Drivers and all approved users can call GET /forecast/zones/{id}.
- Peak hours shown to drivers are derived from highest forecast hours.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from app.modules.forecast import service

logger = logging.getLogger("parksmart.forecast.router")

try:
    from fastapi import APIRouter, HTTPException, Query, status  # type: ignore
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False
    APIRouter = None  # type: ignore


if HAS_FASTAPI:
    router = APIRouter(prefix="/forecast", tags=["Forecast"])

    @router.get("/zones/{zone_id}", response_model=None)
    async def get_zone_forecast_endpoint(
        zone_id: str,
        target: str = Query("occupancy_pct", description="Target metric (occupancy_pct, vehicle_count, pedestrian_count)"),
        horizon_h: int | None = Query(None, description="Forecast horizon in hours (1..168)"),
        horizon_hours: int | None = Query(None, description="Forecast horizon in hours (alias)"),
        from_ts: str | None = Query(None, alias="from", description="Forecast start timestamp in ISO UTC"),
        model_id: str = Query("historic_average_v1", description="Baseline forecasting model ID"),
    ) -> dict[str, Any]:
        """
        Retrieves demand/occupancy forecast for a specific parking zone.
        Accessible to all authenticated users (drivers, operators, admins).
        """
        try:
            zid = uuid.UUID(zone_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid zone UUID: {zone_id}")

        if target not in ("occupancy_pct", "vehicle_count", "pedestrian_count"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported target metric: {target}. Must be occupancy_pct, vehicle_count, or pedestrian_count.",
            )

        known_models = {m["model_id"] for m in service.AVAILABLE_MODELS}
        known_models.update({"seasonal_naive_168h_v1", "seasonal_naive_24h_v1"})
        if model_id not in known_models:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown model_id: {model_id}. Available: {sorted(known_models)}",
            )

        # Resolve horizon_h and horizon_hours aliases
        if horizon_h is not None and horizon_hours is not None:
            if horizon_h != horizon_hours:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Conflicting horizon parameters: horizon_h={horizon_h} and horizon_hours={horizon_hours}",
                )
            resolved_horizon = horizon_h
        elif horizon_h is not None:
            resolved_horizon = horizon_h
        elif horizon_hours is not None:
            resolved_horizon = horizon_hours
        else:
            resolved_horizon = 24

        if not (1 <= resolved_horizon <= 168):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Horizon must be between 1 and 168 hours, got {resolved_horizon}",
            )

        start_dt = None
        if from_ts:
            from app.modules.forecast.baselines import parse_to_utc
            try:
                start_dt = parse_to_utc(from_ts)
            except (ValueError, TypeError) as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid ISO timestamp: {from_ts}") from e

        return service.generate_forecast_for_zone(
            zone_id=zid,
            target=target,
            horizon_hours=resolved_horizon,
            start_time=start_dt,
            model_id=model_id,
        )

    @router.get("/models", response_model=None)
    async def get_forecast_models_endpoint() -> dict[str, Any]:
        """
        Returns model registry metadata including baseline models, active status,
        and minimum required history days.
        """
        return service.list_registered_models()

else:
    router = None  # type: ignore


# Pure-Python handlers for direct invocation / testing
def handle_get_zone_forecast(
    zone_id: str | uuid.UUID,
    target: str = "occupancy_pct",
    horizon_hours: int | None = None,
    horizon_h: int | None = None,
    from_ts: Any = None,
    model_id: str = "historic_average_v1",
    repo: Any = None,
) -> dict[str, Any]:
    """Pure-Python handler for GET /forecast/zones/{id}."""
    try:
        zid = str(uuid.UUID(str(zone_id)))
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid zone UUID: {zone_id}") from e

    if target not in ("occupancy_pct", "vehicle_count", "pedestrian_count"):
        raise ValueError(f"Unsupported target metric: {target}")

    known_models = {m["model_id"] for m in service.AVAILABLE_MODELS}
    known_models.update({"seasonal_naive_168h_v1", "seasonal_naive_24h_v1"})
    if model_id not in known_models:
        raise ValueError(f"Unknown model_id: {model_id}. Available: {sorted(known_models)}")

    # Resolve horizon_h and horizon_hours aliases
    if horizon_h is not None and horizon_hours is not None:
        if horizon_h != horizon_hours:
            raise ValueError(
                f"Conflicting horizon parameters: horizon_h={horizon_h} and horizon_hours={horizon_hours}"
            )
        resolved_horizon = horizon_h
    elif horizon_h is not None:
        resolved_horizon = horizon_h
    elif horizon_hours is not None:
        resolved_horizon = horizon_hours
    else:
        resolved_horizon = 24

    if not (1 <= resolved_horizon <= 168):
        raise ValueError(f"Horizon must be between 1 and 168 hours, got {resolved_horizon}")

    start_dt = None
    if from_ts:
        from app.modules.forecast.baselines import parse_to_utc
        try:
            start_dt = parse_to_utc(from_ts)
        except Exception as e:
            raise ValueError(f"Invalid ISO timestamp for from: {from_ts}") from e

    return service.generate_forecast_for_zone(
        zone_id=zid,
        target=target,
        horizon_hours=resolved_horizon,
        start_time=start_dt,
        model_id=model_id,
        repo=repo,
    )


def handle_get_forecast_models() -> dict[str, Any]:
    """Pure-Python handler for GET /forecast/models."""
    return service.list_registered_models()
