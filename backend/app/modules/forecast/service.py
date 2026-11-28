"""
ParkSMART - Demand Forecasting Service (File 108 / M2 Ownership)

Responsibility:
Business logic for generating demand and occupancy forecasts, enforcing
MIN_HISTORY_DAYS data sufficiency rules, and returning schema-compliant ForecastOut models.

Honesty Rules:
- If history < MIN_USABLE_DAYS (3 days): returns status "unavailable".
- If 3 <= history < MIN_HISTORY_DAYS (14 days): returns status "low_reliability".
- Label trained_on accurately: "simulated", "observed", "mixed", or "none".
- All outputs stamped with provenance: "forecast".
"""

from __future__ import annotations

import logging
import math
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from app.modules.forecast.baselines import (
    HistoricAverageBaseline,
    PersistenceBaseline,
    SeasonalNaiveBaseline,
    parse_to_utc,
)
from app.modules.forecast.repository import (
    MIN_HISTORY_DAYS,
    MIN_USABLE_DAYS,
    ForecastRepository,
    get_forecast_repository,
)

logger = logging.getLogger("parksmart.forecast.service")

AVAILABLE_MODELS = [
    {
        "model_id": "historic_average_v1",
        "name": "Historical Day-Hour Average Baseline",
        "version": "1.0.0",
        "status": "active",
        "target": "occupancy_pct",
        "min_history_days": MIN_HISTORY_DAYS,
        "description": "Computes historical averages by day-of-week and hour-of-day with 90% confidence bounds.",
        "provenance": "forecast",
    },
    {
        "model_id": "persistence_v1",
        "name": "Recent Week Persistence Baseline",
        "version": "1.0.0",
        "status": "available",
        "target": "occupancy_pct",
        "min_history_days": 7,
        "description": "Projects values from the identical weekday and hour from 7 days prior.",
        "provenance": "forecast",
    },
    {
        "model_id": "seasonal_naive_v1",
        "name": "Weekly Seasonal Naive Baseline",
        "version": "1.0.0",
        "status": "available",
        "target": "occupancy_pct",
        "min_history_days": 7,
        "description": "Projects values from matching seasonal lag (168h weekly or 24h daily) with empirical residual uncertainty.",
        "provenance": "forecast",
    },
]


def determine_trained_on(records: list[dict[str, Any]]) -> str:
    """Determines whether the training dataset is simulated, observed, mixed, or none."""
    if not records:
        return "none"
    provs = {r.get("provenance") for r in records if r.get("provenance")}
    if "simulated" in provs and "observed" in provs:
        return "mixed"
    if "simulated" in provs:
        return "simulated"
    if "observed" in provs:
        return "observed"
    return "simulated"


def calculate_history_span_days(records: list[dict[str, Any]]) -> float:
    """Calculates total temporal span in days of the historical records."""
    if not records:
        return 0.0
    timestamps: list[datetime] = []
    for r in records:
        raw = r.get("bucket_start") or r.get("ts")
        if raw:
            timestamps.append(parse_to_utc(raw))
    if len(timestamps) < 2:
        return 0.0
    # Include 1-hour bucket duration for discrete time intervals
    span_s = (max(timestamps) - min(timestamps)).total_seconds() + 3600.0
    return span_s / 86400.0


def generate_forecast_for_zone(
    zone_id: str | uuid.UUID,
    target: str = "occupancy_pct",
    horizon_hours: int = 24,
    start_time: datetime | None = None,
    model_id: str = "historic_average_v1",
    repo: ForecastRepository | None = None,
) -> dict[str, Any]:
    """
    Generates a 24-hour ahead forecast for a zone, applying MIN_HISTORY_DAYS validation.

    Status rules:
      - History < 3.0 days: status="unavailable", reason="insufficient_history", points=[]
      - 3.0 <= History < 14.0 days: status="low_reliability", reason="history_below_minimum_14_days"
      - History >= 14.0 days: status="ok", reason=None
    """
    repository = repo or get_forecast_repository()
    zid = str(uuid.UUID(str(zone_id)))
    now_utc = start_time if start_time else datetime.now(UTC)
    if now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=UTC)
    else:
        now_utc = now_utc.astimezone(UTC)

    # 1. Fetch history
    history = repository.get_zone_history(zid, end_time=now_utc)
    history_days = calculate_history_span_days(history)
    trained_on = determine_trained_on(history)

    # Base payload structure
    generated_at_iso = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    # Target timestamps: next horizon_hours aligned to discrete hour boundaries
    start_floored = now_utc.replace(minute=0, second=0, microsecond=0)
    target_timestamps = [
        (start_floored + timedelta(hours=h + 1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        for h in range(horizon_hours)
    ]

    # Rule A: Completely insufficient history
    if history_days < MIN_USABLE_DAYS:
        logger.warning(
            "Zone %s has insufficient history (%.1f days < %.1f min usable days); returning unavailable",
            zid,
            history_days,
            MIN_USABLE_DAYS,
        )
        return {
            "zone_id": zid,
            "target": target,
            "status": "unavailable",
            "reason": "insufficient_history",
            "model_version": None,
            "trained_on": trained_on,
            "generated_at": generated_at_iso,
            "interval_level": None,
            "points": [],
            "provenance": "forecast",
        }

    # Rule B: Fit baseline model
    if model_id == "persistence_v1":
        model = PersistenceBaseline(target_metric=target)
    elif model_id in ("seasonal_naive_v1", "seasonal_naive_168h_v1"):
        model = SeasonalNaiveBaseline(target_metric=target, season_hours=168)
    elif model_id == "seasonal_naive_24h_v1":
        model = SeasonalNaiveBaseline(target_metric=target, season_hours=24)
    else:
        model = HistoricAverageBaseline(target_metric=target)
    model.fit(history)
    raw_points = model.predict(target_timestamps, confidence_level=0.90)
    points_dict = [p.to_dict() for p in raw_points]

    # Rule C: Reliability assessment based on MIN_HISTORY_DAYS
    if history_days < MIN_HISTORY_DAYS:
        status = "low_reliability"
        reason = f"history_days_{history_days:.1f}_below_min_{MIN_HISTORY_DAYS}"
        logger.info("Zone %s history is below MIN_HISTORY_DAYS (%.1f < %d); returning low_reliability", zid, history_days, MIN_HISTORY_DAYS)
    else:
        status = "ok"
        reason = None

    result = {
        "zone_id": zid,
        "target": target,
        "status": status,
        "reason": reason,
        "model_version": model.model_version,
        "trained_on": trained_on,
        "generated_at": generated_at_iso,
        "interval_level": 90,
        "points": points_dict,
        "provenance": "forecast",
    }

    # Cache result
    repository.cache_forecast(zid, target, result)
    return result


def list_registered_models() -> dict[str, Any]:
    """Returns the list of available forecasting models."""
    return {"models": list(AVAILABLE_MODELS)}


@dataclass(frozen=True)
class PointForecast:
    """
    Single point forecast consumed downstream by availability.monte_carlo (File 100/112).
    """

    mean: float
    std: float | None
    lower: float | None
    upper: float | None
    interval_level: float | None
    model_version: str
    trained_on: str
    n_history_days: int


async def point_forecast(
    db: Any = None,
    zone_id: str | uuid.UUID = "",
    target: str = "occupancy_pct",
    at: datetime | None = None,
    repo: ForecastRepository | None = None,
) -> PointForecast | None:
    """
    Downstream integration point for modules.availability.service.
    Floors target timestamp, fits baseline on available history, and returns a PointForecast
    or None if forecasting is unavailable (e.g. insufficient history < MIN_USABLE_DAYS).
    """
    repository = repo or get_forecast_repository()
    zid = str(uuid.UUID(str(zone_id)))
    target_dt = at if at else datetime.now(UTC)
    if target_dt.tzinfo is None:
        target_dt = target_dt.replace(tzinfo=UTC)
    else:
        target_dt = target_dt.astimezone(UTC)

    target_floored = target_dt.replace(minute=0, second=0, microsecond=0)

    # Check history span
    history = repository.get_zone_history(zid, end_time=target_dt)
    history_days = calculate_history_span_days(history)
    if history_days < MIN_USABLE_DAYS:
        logger.warning(
            "point_forecast for zone %s unavailable: history %.1f < %.1f days",
            zid,
            history_days,
            MIN_USABLE_DAYS,
        )
        return None

    trained_on = determine_trained_on(history)
    model = HistoricAverageBaseline(target_metric=target)
    model.fit(history)

    pts = model.predict([target_floored], confidence_level=0.90)
    if not pts:
        return None

    pt = pts[0]
    # Residual standard error: unclipped standard deviation, guaranteed finite and positive
    raw_std = model.get_residual_std(target_floored)
    if not math.isfinite(raw_std) or raw_std <= 0:
        raw_std = 5.0
    std = round(max(0.1, float(raw_std)), 2)

    return PointForecast(
        mean=round(pt.mean, 2),
        std=std,
        lower=pt.lower,
        upper=pt.upper,
        interval_level=0.90,
        model_version=model.model_version,
        trained_on=trained_on,
        n_history_days=int(history_days),
    )

