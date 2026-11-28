"""ParkSMART - Parking and Commercial Loading Reservation Schemas (File 45)."""

from __future__ import annotations

import uuid
from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.common import ReservationStatus, UtcDateTime, VehicleCategory


class DeliveryInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str | None = Field(default=None, max_length=500)
    expected_arrival: UtcDateTime | None = None
    goods_type: str | None = Field(default=None, max_length=100)


class ParkingReservationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    facility_id: uuid.UUID
    start: UtcDateTime
    end: UtcDateTime
    vehicle_category: VehicleCategory
    vehicle_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def validate_range(self) -> ParkingReservationCreate:
        if self.end <= self.start:
            raise ValueError("end must be after start")
        return self


class LoadingReservationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    zone_id: uuid.UUID
    bay_id: uuid.UUID | None = None
    start: UtcDateTime
    end: UtcDateTime
    vehicle_category: VehicleCategory
    vehicle_id: uuid.UUID | None = None
    delivery_info: DeliveryInfo = Field(default_factory=DeliveryInfo)

    @model_validator(mode="after")
    def validate_range(self) -> LoadingReservationCreate:
        if self.end <= self.start:
            raise ValueError("end must be after start")
        return self


class ReservationReschedule(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start: UtcDateTime
    end: UtcDateTime

    @model_validator(mode="after")
    def validate_range(self) -> ReservationReschedule:
        if self.end <= self.start:
            raise ValueError("end must be after start")
        return self


class StatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    to_status: ReservationStatus
    reason: str | None = Field(default=None, max_length=300)


class ReservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reference: str
    kind: Literal["parking", "loading"]
    bay_id: uuid.UUID
    status: ReservationStatus
    start: UtcDateTime
    end: UtcDateTime
    vehicle_category: VehicleCategory
    business_id: uuid.UUID | None = None
    delivery_info: dict[str, Any] | None = None
    created_at: UtcDateTime
    updated_at: UtcDateTime
    checked_in_at: UtcDateTime | None = None
    started_at: UtcDateTime | None = None
    completed_at: UtcDateTime | None = None
    cancelled_at: UtcDateTime | None = None


class SlotQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")

    zone_id: uuid.UUID
    date: date
    vehicle_category: VehicleCategory
    duration_min: int = Field(..., gt=0)


class SlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bay_id: uuid.UUID
    start: UtcDateTime
    end: UtcDateTime


class StatusHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    from_status: str | None
    to_status: str
    changed_by: uuid.UUID | None
    reason: str | None
    changed_at: UtcDateTime
