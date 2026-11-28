"""ParkSMART - Time and Clock Utilities (File 20)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

try:
    APP_TZ = ZoneInfo("Asia/Kolkata")
except (ZoneInfoNotFoundError, KeyError, OSError):
    APP_TZ = timezone(timedelta(hours=5, minutes=30), name="Asia/Kolkata")
_now_override: datetime | None = None


def set_now(dt: datetime | None) -> None:
    """Sets a test clock override. Raises ValueError if dt is naive."""
    global _now_override
    if dt is not None and dt.tzinfo is None:
        raise ValueError("Naive datetime not allowed for clock override")
    _now_override = dt


def utcnow() -> datetime:
    """Returns the current timezone-aware UTC datetime or the active override."""
    if _now_override is not None:
        return _now_override
    return datetime.now(UTC)


def ensure_utc(dt: datetime) -> datetime:
    """Ensures a datetime is timezone-aware UTC. Rejects naive datetimes."""
    if dt.tzinfo is None:
        raise ValueError("Naive datetime not allowed; must have timezone info")
    return dt.astimezone(UTC)


def floor_to_interval(dt: datetime, minutes: int) -> datetime:
    """Floors dt to the given minute boundary (e.g., 5 or 15). Requires 60 % minutes == 0."""
    if minutes <= 0 or 60 % minutes != 0:
        raise ValueError(f"Interval minutes {minutes} must divide 60 evenly")
    utc_dt = ensure_utc(dt)
    remainder = utc_dt.minute % minutes
    return utc_dt.replace(
        minute=utc_dt.minute - remainder,
        second=0,
        microsecond=0,
    )


def parse_iso_utc(s: str) -> datetime:
    """Parses an ISO-8601 string into a timezone-aware UTC datetime."""
    normalized = s.replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    return ensure_utc(dt)


def local_hour_dow(dt: datetime) -> tuple[int, int]:
    """Converts a UTC datetime to Asia/Kolkata and returns (hour 0..23, weekday 0=Mon..6=Sun)."""
    utc_dt = ensure_utc(dt)
    local_dt = utc_dt.astimezone(APP_TZ)
    return local_dt.hour, local_dt.weekday()


def age_seconds(ts: datetime, now: datetime | None = None) -> float:
    """Computes age in seconds from ts to now. Negative differences (clock skew) clamp to 0.0."""
    current_time = now if now is not None else utcnow()
    delta = (ensure_utc(current_time) - ensure_utc(ts)).total_seconds()
    return max(0.0, float(delta))
