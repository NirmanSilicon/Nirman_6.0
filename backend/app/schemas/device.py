"""ParkSMART - Edge Camera and Mapping Schemas (File 46)."""

from __future__ import annotations

import uuid
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import UtcDateTime


class CameraConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    interval_s: int = Field(..., gt=0, description="Inference and reporting interval in seconds")
    conf_threshold: float = Field(0.5, ge=0.0, le=1.0, description="Detection confidence threshold")
    area_m2: float | None = Field(default=None, gt=0, description="Monitored physical surface area in m²")


class CameraCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    zone_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=100)
    config: CameraConfig


class CameraOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    zone_id: uuid.UUID
    name: str
    status: Literal["provisioned", "online", "degraded", "offline", "maintenance"]
    last_seen_at: UtcDateTime | None = None
    config: CameraConfig
    is_active: bool = True


class CameraCreated(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    camera: CameraOut
    device_secret: str = Field(..., description="Shown only once at camera registration")


class MappingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bay_id: uuid.UUID
    roi_polygon: list[tuple[float, float]] = Field(..., min_length=3)

    @field_validator("roi_polygon")
    @classmethod
    def validate_roi(cls, v: list[tuple[float, float]]) -> list[tuple[float, float]]:
        if len(v) < 3:
            raise ValueError("roi_polygon must have at least 3 vertices")
        for x, y in v:
            if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0):
                raise ValueError(f"Coordinate ({x}, {y}) out of normalized [0, 1] range")
        return v


class MappingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    camera_id: uuid.UUID
    bay_id: uuid.UUID
    roi_polygon: list[tuple[float, float]]


class HealthMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1] = 1
    msg_id: uuid.UUID
    ts: UtcDateTime
    camera_id: uuid.UUID
    state: Literal["online", "degraded", "offline"]
    fps: float | None = None
    errors: list[str] = Field(default_factory=list, max_length=20)
    model_version: str | None = None
    uptime_s: int | None = None


class DeviceHealthOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    camera_id: uuid.UUID
    state: str
    observed_at: UtcDateTime
    detail: dict[str, Any] | None = None
