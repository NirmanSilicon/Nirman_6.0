"""
ParkSMART - Periodic Demand Forecasting Worker Job (File 145 / M2 Ownership)

Responsibility:
Periodically runs forecasting models for registered active parking zones,
enforces MIN_HISTORY_DAYS data sufficiency and reliability rules, updates the forecast
cache, and notifies downstream consumers (realtime hub, dashboard, mobile app).
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
import uuid
from pathlib import Path
from typing import Any

# Ensure project root in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent.parent
backend_dir = root_dir / "backend"
for p in (str(root_dir), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.modules.forecast.repository import (
    ForecastRepository,
    get_forecast_repository,
)
from app.modules.forecast.service import generate_forecast_for_zone

logger = logging.getLogger("parksmart.workers.forecast")


async def run_forecast_job_for_zones(
    zone_ids: list[str | uuid.UUID] | None = None,
    target: str = "occupancy_pct",
    horizon_hours: int = 24,
    model_id: str = "historic_average_v1",
    repo: ForecastRepository | None = None,
    notify_hub: bool = True,
) -> dict[str, dict[str, Any]]:
    """
    Executes forecasting job across target zones.
    Caches results in repository and optionally publishes 'forecast_updated' SSE events.

    Parameters:
      zone_ids: Optional list of zone UUIDs. If None or empty, auto-discovers known zones from repository.
      target: Target metric ("occupancy_pct", "vehicle_count", "pedestrian_count").
      horizon_hours: Forecasting horizon in hours (1..168).
      model_id: Baseline model ID to use ("historic_average_v1", "persistence_v1", "seasonal_naive_v1").
      repo: Forecast repository instance.
      notify_hub: Whether to publish event to realtime hub.

    Returns:
      Dict mapping zone UUID string to ForecastOut dict.
    """
    if target not in ("occupancy_pct", "vehicle_count", "pedestrian_count"):
        raise ValueError(
            f"Unsupported target metric: {target}. Must be occupancy_pct, vehicle_count, or pedestrian_count."
        )

    if not (1 <= horizon_hours <= 168):
        raise ValueError(f"Horizon hours must be between 1 and 168, got {horizon_hours}")

    repository = repo or get_forecast_repository()

    if zone_ids is None or len(zone_ids) == 0:
        targets_to_run = repository.get_known_zone_ids()
    else:
        targets_to_run = list(zone_ids)

    results: dict[str, dict[str, Any]] = {}

    for raw_zid in targets_to_run:
        try:
            zid = str(uuid.UUID(str(raw_zid)))
        except (ValueError, TypeError) as e:
            logger.warning("Skipping invalid zone UUID in forecast job: %s (%s)", raw_zid, e)
            continue

        try:
            forecast_data = generate_forecast_for_zone(
                zone_id=zid,
                target=target,
                horizon_hours=horizon_hours,
                model_id=model_id,
                repo=repository,
            )
            results[zid] = forecast_data
            logger.info(
                "Generated forecast for zone %s: status=%s, points=%d, trained_on=%s",
                zid,
                forecast_data["status"],
                len(forecast_data["points"]),
                forecast_data["trained_on"],
            )

            # Emit realtime hub event if available
            if notify_hub:
                try:
                    from app.modules.realtime.hub import get_hub

                    hub = get_hub()
                    hub.publish(
                        channel=f"zone:{zid}",
                        event="forecast_updated",
                        data={
                            "zone_id": zid,
                            "target": target,
                            "status": forecast_data["status"],
                            "model_version": forecast_data["model_version"],
                            "generated_at": forecast_data["generated_at"],
                            "points_count": len(forecast_data["points"]),
                        },
                    )
                except (RuntimeError, ValueError, TypeError, AttributeError) as e:
                    # Hub notification is non-blocking / optional
                    logger.debug("Realtime hub notification skipped for zone %s: %s", zid, e)

        except Exception:
            logger.exception("Failed to generate forecast for zone %s", zid)

    logger.info("Forecast worker job finished. Successfully generated forecasts for %d zones.", len(results))
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Run ParkSMART demand forecasting worker job")
    parser.add_argument("--zones", nargs="*", default=None, help="List of zone UUIDs")
    parser.add_argument("--target", type=str, default="occupancy_pct", help="Target metric (default: occupancy_pct)")
    parser.add_argument("--horizon", type=int, default=24, help="Horizon hours (default: 24)")
    parser.add_argument("--model", type=str, default="historic_average_v1", help="Model ID (default: historic_average_v1)")
    parser.add_argument("--notify", action="store_true", default=False, help="Enable realtime hub notifications")
    args = parser.parse_args()

    asyncio.run(
        run_forecast_job_for_zones(
            zone_ids=args.zones,
            target=args.target,
            horizon_hours=args.horizon,
            model_id=args.model,
            notify_hub=args.notify,
        )
    )


if __name__ == "__main__":
    main()
