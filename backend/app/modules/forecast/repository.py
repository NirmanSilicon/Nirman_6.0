"""
ParkSMART - Forecast Data Repository (File 109 / M2 Ownership)

Responsibility:
Data access layer for retrieving historical aggregates, caching generated forecasts,
and querying the forecasting model registry.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any

from app.workers.aggregation_job import get_aggregation_store

logger = logging.getLogger("parksmart.forecast.repository")

MIN_HISTORY_DAYS: int = 14  # Minimum days of history for high reliability forecast
MIN_USABLE_DAYS: float = 3.0  # Below this, forecast is completely unavailable


class ForecastRepository:
    """Repository managing forecast caches and history retrieval."""

    def __init__(self) -> None:
        # Cache for latest generated forecasts: (zone_id, target) -> dict
        self._forecast_cache: dict[tuple[str, str], dict[str, Any]] = {}
        # In-memory history cache for zones
        self._zone_history: dict[str, list[dict[str, Any]]] = {}

    def set_zone_history(self, zone_id: str | uuid.UUID, records: list[dict[str, Any]]) -> None:
        zid = str(uuid.UUID(str(zone_id)))
        self._zone_history[zid] = list(records)

    def add_zone_history(self, zone_id: str | uuid.UUID, records: list[dict[str, Any]]) -> None:
        zid = str(uuid.UUID(str(zone_id)))
        if zid not in self._zone_history:
            self._zone_history[zid] = []
        # Prevent duplicate entries by bucket_start when rerun
        existing_starts = {
            str(r.get("bucket_start") or r.get("ts"))
            for r in self._zone_history[zid]
            if r.get("bucket_start") or r.get("ts")
        }
        for r in records:
            bs = str(r.get("bucket_start") or r.get("ts"))
            if bs and bs not in existing_starts:
                existing_starts.add(bs)
                self._zone_history[zid].append(r)
        self._zone_history[zid].sort(key=lambda x: str(x.get("bucket_start") or x.get("ts")))

    def get_zone_history(
        self,
        zone_id: str | uuid.UUID,
        end_time: datetime | None = None,
        max_days: int = 28,
    ) -> list[dict[str, Any]]:
        """
        Retrieves historical hourly aggregates for the zone up to end_time.
        Falls back to aggregation store if available.
        """
        zid = str(uuid.UUID(str(zone_id)))
        records = list(self._zone_history.get(zid, []))

        # Also pull from worker aggregation store if present
        store = get_aggregation_store()
        store_buckets = store.get_zone_history(zid)
        if store_buckets:
            for b in store_buckets:
                records.append(b.to_dict())

        # Deduplicate records by bucket_start
        seen: set[str] = set()
        deduped: list[dict[str, Any]] = []
        for r in records:
            bs = r.get("bucket_start") or r.get("ts")
            if bs and bs not in seen:
                seen.add(bs)
                deduped.append(r)

        # Sort by bucket_start
        deduped.sort(key=lambda x: str(x.get("bucket_start") or x.get("ts")))
        return deduped

    def cache_forecast(self, zone_id: str | uuid.UUID, target: str, forecast: dict[str, Any]) -> None:
        zid = str(uuid.UUID(str(zone_id)))
        self._forecast_cache[(zid, target)] = forecast

    def get_cached_forecast(self, zone_id: str | uuid.UUID, target: str) -> dict[str, Any] | None:
        zid = str(uuid.UUID(str(zone_id)))
        return self._forecast_cache.get((zid, target))

    def get_known_zone_ids(self) -> list[str]:
        """Returns sorted list of known zone UUIDs from history and cache."""
        zones = set(self._zone_history.keys())
        for zid, _ in self._forecast_cache:
            zones.add(zid)
        return sorted(zones)

    def clear(self) -> None:
        self._forecast_cache.clear()
        self._zone_history.clear()


_DEFAULT_REPO = ForecastRepository()


def get_forecast_repository() -> ForecastRepository:
    return _DEFAULT_REPO
