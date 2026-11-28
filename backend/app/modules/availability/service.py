"""ParkSMART - Arrival-Time Parking Availability Probability Service (File 110)."""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.clock import floor_to_interval, utcnow
from app.errors import NotFound, ValidationFailed
from app.modules.availability import repository as repo
from app.modules.availability.monte_carlo import simulate
from app.modules.availability.travel_time import estimate_travel_time_s
from app.modules.parking import repository as park_repo
from app.modules.parking import service as park_service
from app.schemas.common import (
    CrowdLevel,
    DataState,
    LatLon,
    PredictionStatus,
    Provenance,
    Reliability,
)
from app.schemas.forecast import (
    AvailabilityOut,
    AvailabilityRequest,
    CompareOut,
    CompareRequest,
)

DEFAULT_N_SIMULATIONS = 2000
MAX_HORIZON_H = 168


def level_for(
    thresholds: dict[str, Any] | None,
    occupancy_pct: float | None,
    pedestrians: int | None,
) -> CrowdLevel:
    """Classifies crowd level into LOW, MODERATE, HIGH, VERY_HIGH against configured thresholds."""
    if not thresholds:
        return CrowdLevel.UNKNOWN

    occ_thresh = thresholds.get("occupancy_pct", {})
    ped_thresh = thresholds.get("pedestrians", {})

    occ_level: CrowdLevel | None = None
    if occupancy_pct is not None and occ_thresh:
        if occupancy_pct >= occ_thresh.get("very_high", 90.0):
            occ_level = CrowdLevel.VERY_HIGH
        elif occupancy_pct >= occ_thresh.get("high", 75.0):
            occ_level = CrowdLevel.HIGH
        elif occupancy_pct >= occ_thresh.get("moderate", 50.0):
            occ_level = CrowdLevel.MODERATE
        else:
            occ_level = CrowdLevel.LOW

    ped_level: CrowdLevel | None = None
    if pedestrians is not None and ped_thresh:
        if pedestrians >= ped_thresh.get("very_high", 100):
            ped_level = CrowdLevel.VERY_HIGH
        elif pedestrians >= ped_thresh.get("high", 60):
            ped_level = CrowdLevel.HIGH
        elif pedestrians >= ped_thresh.get("moderate", 25):
            ped_level = CrowdLevel.MODERATE
        else:
            ped_level = CrowdLevel.LOW

    levels = [l for l in (occ_level, ped_level) if l is not None]
    if not levels:
        return CrowdLevel.UNKNOWN

    order = [CrowdLevel.LOW, CrowdLevel.MODERATE, CrowdLevel.HIGH, CrowdLevel.VERY_HIGH]
    return max(levels, key=lambda l: order.index(l) if l in order else -1)


def seed_for(zone_id: uuid.UUID, arrival_floor: datetime) -> int:
    """Generates a deterministic seed from zone UUID and arrival interval timestamp."""
    data = f"{zone_id}:{arrival_floor.isoformat()}".encode()
    h = hashlib.sha256(data).hexdigest()
    return int(h[:8], 16)


def classify_reliability(
    method: str,
    live_state: DataState,
    trained_on: str | None,
    has_interval: bool,
    n_history_days: int | None = None,
    min_history_days: int = 14,
) -> Reliability:
    """Classifies reliability truthfully without claiming unverified high confidence."""
    if n_history_days is not None and n_history_days < min_history_days:
        return Reliability.LOW
    if trained_on in ("simulated", "none") or not has_interval:
        return Reliability.LOW
    if method.startswith("nowcast") and live_state != DataState.LIVE:
        return Reliability.LOW
    if trained_on in ("observed", "mixed") and has_interval:
        return Reliability.MEDIUM
    return Reliability.LOW


async def estimate(
    db: AsyncSession, req: AvailabilityRequest, *, now: datetime | None = None
) -> AvailabilityOut:
    """Calculates arrival-time probability that at least one regular bay is available."""
    now_dt = now or utcnow()
    settings = get_settings()

    zone_row = await park_repo.get_zone_row(db, req.zone_id)
    if zone_row is None:
        raise NotFound("Zone not found")
    if not zone_row.zone.is_active:
        raise ValidationFailed("Zone is inactive")

    requested = req.arrival_time or now_dt
    if requested < now_dt - timedelta(seconds=30):
        raise ValidationFailed("arrival_time is in the past")
    if requested > now_dt + timedelta(hours=MAX_HORIZON_H):
        raise ValidationFailed("arrival_time beyond forecast horizon of 168 hours")

    # Optional Travel Time estimation
    travel_note: str | None = None
    if req.use_travel_time:
        duration_s = await estimate_travel_time_s(
            req.origin, LatLon(lat=zone_row.lat, lon=zone_row.lon)  # type: ignore
        )
        if duration_s is not None:
            estimated = requested + timedelta(seconds=duration_s)
        else:
            estimated = requested
            travel_note = "travel time unavailable; arrival assumed at requested time"
    else:
        estimated = requested

    capacity = zone_row.capacity
    if capacity <= 0:
        return AvailabilityOut(
            zone_id=req.zone_id,
            status=PredictionStatus.UNAVAILABLE,
            reason="zone has no in-service regular bays",
            probability=None,
            expected_available=None,
            expected_occupancy_pct=None,
            crowd_level=CrowdLevel.UNKNOWN,
            requested_arrival_time=requested,
            estimated_arrival_time=estimated,
            generated_at=now_dt,
            data_freshness_s=None,
            data_state=DataState.UNKNOWN,
            reliability=Reliability.UNAVAILABLE,
            uncertainty=None,
            method="capacity_zero",
            n_simulations=None,
            provenance=Provenance.FORECAST,
        )

    live = await park_service.zone_live_summary(db, req.zone_id, now_dt)
    freshness = (
        int((now_dt - live.observed_at).total_seconds()) if live.observed_at else None
    )

    is_near_term = estimated <= now_dt + timedelta(minutes=settings.agg_interval_min)
    n_hist: int | None = None

    # Method 1: Nowcast (immediate arrival and live telemetry available)
    if is_near_term and live.data_state == DataState.LIVE and live.available is not None:
        total_live = (live.occupied or 0) + live.available
        if total_live > 0:
            center_pct = float((live.occupied or 0) / total_live * 100.0)
        else:
            center_pct = 50.0

        sigma_pct = 15.0  # Baseline empirical spread
        method = "nowcast_binomial_mc"
        trained_on = "observed"
        has_interval = True
        model_ver_id = None

    else:
        # Method 2: Time-series forecasting
        pt_forecast = None
        try:
            from app.modules.forecast import service as forecast_service
            pt_forecast = await forecast_service.point_forecast(
                db, zone_id=req.zone_id, target="occupancy_pct", at=estimated
            )
        except (ImportError, SQLAlchemyError, RuntimeError, ValueError, TypeError, LookupError, OSError):
            pt_forecast = None

        if pt_forecast is None:
            # Fixed fake forecast baseline fallback until Trishala's ML model endpoint is trained
            center_pct = 55.0
            sigma_pct = 15.0
            method = "fake_forecast_baseline_mc"
            trained_on = "simulated"
            has_interval = True
            model_ver_id = "fake-baseline-v1"
        else:
            center_pct = pt_forecast.mean
            sigma_pct = pt_forecast.std if pt_forecast.std is not None else 20.0
            method = "forecast_binomial_mc"
            trained_on = pt_forecast.trained_on
            has_interval = pt_forecast.lower is not None and pt_forecast.upper is not None
            model_ver_id = getattr(pt_forecast, "model_version_id", None)
            n_hist = getattr(pt_forecast, "n_history_days", None)

    seed_val = seed_for(req.zone_id, floor_to_interval(estimated, settings.agg_interval_min))
    sim_res = simulate(
        capacity=capacity,
        center_pct=center_pct,
        sigma_pct=sigma_pct,
        n_simulations=DEFAULT_N_SIMULATIONS,
        seed=seed_val,
    )

    crowd_lvl = level_for(
        zone_row.zone.crowd_thresholds, sim_res.expected_occupancy_pct, None
    )
    reliability = classify_reliability(
        method=method,
        live_state=live.data_state,
        trained_on=trained_on,
        has_interval=has_interval,
        n_history_days=n_hist if not is_near_term else None,
        min_history_days=settings.min_history_days,
    )

    reason = travel_note if travel_note else None
    pred_status = (
        PredictionStatus.LOW_RELIABILITY
        if reliability == Reliability.LOW
        else PredictionStatus.OK
    )

    uncertainty_dict = {"lower": sim_res.p10_available, "upper": sim_res.p90_available}

    # Persist calculation in cache table
    await repo.insert_probability(
        db,
        zone_id=req.zone_id,
        requested_arrival_ts=requested,
        estimated_arrival_ts=estimated,
        total_capacity=capacity,
        expected_occupancy_pct=sim_res.expected_occupancy_pct,
        expected_available=sim_res.expected_available,
        probability=sim_res.probability,
        method=method,
        n_simulations=DEFAULT_N_SIMULATIONS,
        model_version_id=model_ver_id,
        data_freshness_s=freshness,
        reliability=reliability.value,
        generated_at=now_dt,
    )
    await db.commit()

    return AvailabilityOut(
        zone_id=req.zone_id,
        status=pred_status,
        reason=reason,
        probability=sim_res.probability,
        expected_available=sim_res.expected_available,
        expected_occupancy_pct=sim_res.expected_occupancy_pct,
        crowd_level=crowd_lvl,
        requested_arrival_time=requested,
        estimated_arrival_time=estimated,
        generated_at=now_dt,
        data_freshness_s=freshness,
        data_state=live.data_state,
        reliability=reliability,
        uncertainty=uncertainty_dict,
        method=method,
        n_simulations=DEFAULT_N_SIMULATIONS,
        provenance=Provenance.FORECAST,
    )


async def compare(db: AsyncSession, req: CompareRequest) -> CompareOut:
    """Compares parking availability across multiple zones for a given arrival time."""
    now = utcnow()
    items: list[AvailabilityOut] = []
    for zid in req.zone_ids:
        sub_req = AvailabilityRequest(
            zone_id=zid,
            arrival_time=req.arrival_time,
            origin=req.origin,
            use_travel_time=req.origin is not None,
        )
        item = await estimate(db, sub_req, now=now)
        items.append(item)
    items.sort(
        key=lambda x: (x.probability is not None, x.probability or 0.0),
        reverse=True,
    )
    return CompareOut(items=items)
