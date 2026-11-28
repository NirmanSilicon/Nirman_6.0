"""ParkSMART - Demand Forecasting, Availability, and Recommendation Schemas (File 49)."""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.common import (
    CrowdLevel,
    DataState,
    LatLon,
    PredictionStatus,
    Provenance,
    Reliability,
    UtcDateTime,
)
from app.schemas.parking import ZoneOut


class ForecastPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    target_ts: UtcDateTime
    mean: float
    lower: float | None = None
    upper: float | None = None


class ForecastOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    zone_id: uuid.UUID
    target: Literal["occupancy_pct", "vehicle_count", "pedestrian_count"]
    status: PredictionStatus
    reason: str | None = None
    model_version: str | None = None
    trained_on: Literal["simulated", "observed", "mixed", "none"] | None = None
    generated_at: UtcDateTime | None = None
    interval_level: float | None = None
    points: list[ForecastPoint] = Field(default_factory=list)
    provenance: Provenance = Provenance.FORECAST


class AvailabilityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    zone_id: uuid.UUID
    arrival_time: UtcDateTime | None = None
    origin: LatLon | None = None
    use_travel_time: bool = False

    @model_validator(mode="after")
    def validate_origin_if_travel(self) -> AvailabilityRequest:
        if self.use_travel_time and self.origin is None:
            raise ValueError("origin required when use_travel_time is True")
        return self


class AvailabilityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    zone_id: uuid.UUID
    status: PredictionStatus
    reason: str | None = None
    probability: float | None = Field(default=None, ge=0.0, le=1.0)
    expected_available: float | None = None
    expected_occupancy_pct: float | None = None
    crowd_level: CrowdLevel = CrowdLevel.UNKNOWN
    requested_arrival_time: UtcDateTime
    estimated_arrival_time: UtcDateTime
    generated_at: UtcDateTime
    data_freshness_s: int | None = None
    data_state: DataState = DataState.UNKNOWN
    reliability: Reliability
    uncertainty: dict[str, float | None] | None = None
    method: str
    n_simulations: int | None = None
    provenance: Provenance = Provenance.FORECAST

    @model_validator(mode="after")
    def validate_availability_invariants(self) -> AvailabilityOut:
        if self.status == PredictionStatus.UNAVAILABLE:
            if self.probability is not None:
                raise ValueError("probability must be null when status is unavailable")
            if self.reliability != Reliability.UNAVAILABLE:
                raise ValueError("reliability must be 'unavailable' when status is unavailable")
            if not self.reason:
                raise ValueError("non-empty reason required when status is unavailable")
        elif self.status == PredictionStatus.OK and self.probability is None:
            raise ValueError("probability cannot be null when status is ok")
        return self


class CompareRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    zone_ids: list[uuid.UUID] = Field(..., min_length=2, max_length=10)
    arrival_time: UtcDateTime | None = None
    origin: LatLon | None = None

    @field_validator("zone_ids")
    @classmethod
    def validate_unique_zones(cls, v: list[uuid.UUID]) -> list[uuid.UUID]:
        if len(v) != len(set(v)):
            raise ValueError("zone_ids must be unique")
        return v


class CompareOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[AvailabilityOut]

    @property
    def ranked(self) -> list[AvailabilityOut]:
        return sorted(
            self.items,
            key=lambda x: (x.probability is not None, x.probability or 0.0),
            reverse=True,
        )


class TimeWindow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    start: UtcDateTime
    end: UtcDateTime
    probability: float | None = None
    crowd_level: CrowdLevel = CrowdLevel.UNKNOWN


class RecommendationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    zone: ZoneOut
    rank: int
    probability: float | None = None
    distance_m: float | None = None
    travel_time_s: int | None = None
    score: float
    reasons: list[str] = Field(default_factory=list)


class RecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    origin: LatLon
    arrival_time: UtcDateTime
    items: list[RecommendationItem]
    best_windows: list[TimeWindow] = Field(default_factory=list)
    status: PredictionStatus
