"""ParkSMART - Travel Time Estimation via OSRM Integration (File 113)."""

from __future__ import annotations

import logging
import time

import httpx

from app.config import get_settings
from app.schemas.common import LatLon

logger = logging.getLogger(__name__)

OSRM_BASE_URL = "https://router.project-osrm.org"
TIMEOUT_S = 3.0
CACHE_TTL_S = 300.0
CACHE_MAX = 512

# (lat1, lon1, lat2, lon2) -> (timestamp, seconds)
_travel_cache: dict[tuple[float, float, float, float], tuple[float, int]] = {}


async def estimate_travel_time_s(origin: LatLon, dest: LatLon) -> int | None:
    """Estimates driving travel time in seconds between origin and destination."""
    settings = get_settings()
    if settings.map_provider != "osm":
        return None

    # Cache lookup with coordinate rounding to ~10m precision
    key = (
        round(origin.lat, 4),
        round(origin.lon, 4),
        round(dest.lat, 4),
        round(dest.lon, 4),
    )
    now = time.monotonic()

    if key in _travel_cache:
        cached_ts, cached_sec = _travel_cache[key]
        if now - cached_ts < CACHE_TTL_S:
            return cached_sec

    # OSRM expects {lon},{lat};{lon},{lat}
    url = f"{OSRM_BASE_URL}/route/v1/driving/{origin.lon},{origin.lat};{dest.lon},{dest.lat}?overview=false"

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    duration = round(data["routes"][0]["duration"])
                    if len(_travel_cache) >= CACHE_MAX:
                        # Evict oldest entry
                        oldest_key = min(_travel_cache.keys(), key=lambda k: _travel_cache[k][0])
                        del _travel_cache[oldest_key]
                    _travel_cache[key] = (now, duration)
                    return duration
    except (httpx.HTTPError, ValueError, KeyError, TypeError, OSError) as exc:
        logger.warning("OSRM routing service unavailable: %s", str(exc))

    return None
