"""ParkSMART - Crowd Intelligence and Demand Series Schemas (File 48)."""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.common import (
    CrowdLevel,
    DataState,
    Provenance,
    UtcDateTime,
    VehicleCategory,
)


class CrowdMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1] = 1
    msg_id: uuid.UUID
    ts: UtcDateTime
    camera_id: uuid.UUID
    interval_s: int = Field(..., gt=0)
    vehicle_count: int = Field(..., ge=0)
    vehicle_by_category: dict[VehicleCategory, int] = Field(default_factory=dict)
    pedestrian_count: int = Field(..., ge=0)
    density_per_m2: float | None = Field(default=None, ge=0.0)
    quality: Literal["ok", "degraded", "suspect"] = "ok"

    @model_validator(mode="after")
    def validate_category_sum(self) -> CrowdMessage:
        total_cat = sum(self.vehicle_by_category.values())
        if total_cat > self.vehicle_count:
            raise ValueError(f"Sum of categories ({total_cat}) exceeds total vehicle count ({self.vehicle_count})")
        return self


class CrowdCurrentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    zone_id: uuid.UUID
    level: CrowdLevel
    occupancy_pct: float | None = None
    vehicles: int | None = None
    pedestrians: int | None = None
    observed_at: UtcDateTime | None = None
    data_state: DataState
    provenance: Provenance = Provenance.OBSERVED


class SeriesPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ts: UtcDateTime
    value: float | None = None
    quality: str = "ok"


class SeriesOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    zone_id: uuid.UUID
    metric: Literal["vehicles", "pedestrians", "occupancy_pct", "density"]
    interval_min: int
    points: list[SeriesPoint]
    provenance: Provenance = Provenance.HISTORICAL


class HourStat(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    hour: int = Field(..., ge=0, le=23)
    mean: float | None = None
    p90: float | None = None


class WeekdayStat(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    weekday: int = Field(..., ge=0, le=6)
    mean: float | None = None


class PeakHoursOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    zone_id: uuid.UUID
    metric: str
    by_hour: list[HourStat]
    by_weekday: list[WeekdayStat]
    n_days: int
    provenance: Provenance = Provenance.HISTORICAL
