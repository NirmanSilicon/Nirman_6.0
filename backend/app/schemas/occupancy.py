"""ParkSMART - Occupancy Message and History Schemas (File 47)."""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import Occupancy, Provenance, UtcDateTime


class BayReading(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bay_id: uuid.UUID
    state: Occupancy
    confidence: float = Field(..., ge=0.0, le=1.0)


class OccupancyMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1] = 1
    msg_id: uuid.UUID
    ts: UtcDateTime
    camera_id: uuid.UUID
    bays: list[BayReading] = Field(..., min_length=1, max_length=200)

    @field_validator("bays")
    @classmethod
    def validate_unique_bays(cls, v: list[BayReading]) -> list[BayReading]:
        seen = set()
        for b in v:
            if b.bay_id in seen:
                raise ValueError(f"duplicate bay_id {b.bay_id} in readings")
            seen.add(b.bay_id)
        return v


class OccupancyHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bay_id: uuid.UUID
    state: Literal["occupied", "free"]
    from_ts: UtcDateTime
    to_ts: UtcDateTime | None = None


class BayHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[OccupancyHistoryItem]
    provenance: Provenance = Provenance.OBSERVED
