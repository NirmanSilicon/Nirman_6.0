"""ParkSMART - Parking Infrastructure and Discovery Schemas (File 44)."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import (
    BayType,
    DataState,
    LatLon,
    Occupancy,
    Provenance,
    UtcDateTime,
    VehicleCategory,
)


class FeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rate_per_hour: Decimal
    currency: str = "INR"
    bay_type: BayType


class ZoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    city_id: uuid.UUID
    name: str
    kind: Literal["parking", "loading", "mixed"]
    centroid: LatLon
    operating_schedule: dict[str, Any] | None = None
    crowd_thresholds_configured: bool = False
    reservations_enabled: bool = False
    capacity: int = 0
    is_active: bool = True


class FacilityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    zone_id: uuid.UUID
    name: str
    kind: Literal["facility", "roadside"]
    location: LatLon
    supports_reservation: bool = False
    address: str | None = None
    fee: FeeOut | None = None


class BayOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    facility_id: uuid.UUID
    code: str
    bay_type: BayType
    location: LatLon
    permitted_vehicle_categories: list[VehicleCategory]
    restrictions: dict[str, Any] | None = None
    out_of_service: bool = False


class BayStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bay_id: uuid.UUID
    occupancy: Occupancy
    reserved: bool
    observed_at: UtcDateTime | None = None
    data_state: DataState
    provenance: Provenance


class BayWithStatus(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bay: BayOut
    status: BayStatusOut


class ZoneLiveOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    zone_id: uuid.UUID
    available_bays: int | None = None
    occupied_bays: int | None = None
    unknown_bays: int = 0
    data_state: DataState
    observed_at: UtcDateTime | None = None
    provenance: Provenance


class NearbyQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lat: float = Field(..., ge=-90.0, le=90.0)
    lon: float = Field(..., ge=-180.0, le=180.0)
    radius_m: float = Field(1000.0, gt=0, le=20000.0)
    vehicle_category: VehicleCategory | None = None
    only_available: bool = False
    limit: int = Field(20, ge=1, le=50)


class NearbyZoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    zone: ZoneOut
    distance_m: float
    available_bays: int | None = None
    occupied_bays: int | None = None
    unknown_bays: int = 0
    data_state: DataState
    observed_at: UtcDateTime | None = None
    provenance: Provenance
