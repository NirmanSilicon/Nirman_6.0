"""ParkSMART - Shared Common Schemas, Enums, and Models (File 42)."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Annotated, Any

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
)

from app.core.clock import ensure_utc


def _require_aware_utc(v: Any) -> datetime:
    """Validates that a datetime has timezone info and normalizes it to UTC."""
    if isinstance(v, datetime):
        if v.tzinfo is None:
            raise ValueError("Timestamp must include timezone information")
        return ensure_utc(v)
    raise ValueError("Value must be a datetime instance")


UtcDateTime = Annotated[datetime, AfterValidator(_require_aware_utc)]


class DataState(str, Enum):
    LIVE = "live"
    STALE = "stale"
    UNAVAILABLE = "unavailable"
    UNKNOWN = "unknown"


class CrowdLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"
    UNKNOWN = "unknown"


class Provenance(str, Enum):
    OBSERVED = "observed"
    HISTORICAL = "historical"
    FORECAST = "forecast"
    MANUAL = "manual"
    SIMULATED = "simulated"


class ReservationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    EXPIRED = "expired"


class BayType(str, Enum):
    REGULAR = "regular"
    LOADING = "loading"


class VehicleCategory(str, Enum):
    TWO_WHEELER = "two_wheeler"
    CAR = "car"
    AUTO_RICKSHAW = "auto_rickshaw"
    VAN = "van"
    LCV = "lcv"
    TRUCK = "truck"
    HCV = "hcv"
    BUS = "bus"


class Occupancy(str, Enum):
    OCCUPIED = "occupied"
    FREE = "free"
    UNKNOWN = "unknown"


class Reliability(str, Enum):
    UNAVAILABLE = "unavailable"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class PredictionStatus(str, Enum):
    OK = "ok"
    LOW_RELIABILITY = "low_reliability"
    UNAVAILABLE = "unavailable"


def provenance_from_source(source: str | None) -> Provenance:
    """Maps device/event source string to canonical Provenance enum."""
    if not source:
        return Provenance.OBSERVED
    s = source.lower()
    if s in ("edge", "camera", "observed"):
        return Provenance.OBSERVED
    if s in ("simulator", "sim", "synthetic"):
        return Provenance.SIMULATED
    if s == "manual":
        return Provenance.MANUAL
    if s == "forecast":
        return Provenance.FORECAST
    if s == "historical":
        return Provenance.HISTORICAL
    raise ValueError(f"Unknown provenance source: {source}")


class LatLon(BaseModel):
    """Geographic coordinates object for API requests and responses."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in degrees")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude in degrees")


class PageParams(BaseModel):
    """Pagination query parameters."""

    model_config = ConfigDict(extra="forbid")

    limit: int = Field(50, ge=1, le=200, description="Number of items to return")
    offset: int = Field(0, ge=0, description="Offset index for pagination")


class Page[T](BaseModel):
    """Standard paginated response wrapper."""

    model_config = ConfigDict(from_attributes=True)

    items: list[T]
    total: int = Field(..., ge=0)
    limit: int = Field(..., ge=1, le=200)
    offset: int = Field(..., ge=0)


class ErrorBody(BaseModel):
    model_config = ConfigDict(extra="allow")

    code: str
    message: str
    details: Any | None = None
    request_id: str


class ErrorEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error: ErrorBody


class ProvenanceTag(BaseModel):
    """Mixin for models that include provenance metadata."""

    model_config = ConfigDict(from_attributes=True)

    provenance: Provenance = Field(default=Provenance.OBSERVED)
