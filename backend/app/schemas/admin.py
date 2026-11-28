"""ParkSMART - Administrative and Operational Management Schemas (File 50)."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.geo import point_in_ring, ring_is_closed, ring_self_intersects
from app.core.rbac import Role
from app.schemas.common import BayType, LatLon, Occupancy, UtcDateTime, VehicleCategory


class ThresholdSet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    moderate: float = Field(..., ge=0.0)
    high: float = Field(..., ge=0.0)
    very_high: float = Field(..., ge=0.0)

    @model_validator(mode="after")
    def validate_strictly_increasing(self) -> ThresholdSet:
        if not (self.moderate < self.high < self.very_high):
            raise ValueError("thresholds must be strictly increasing: moderate < high < very_high")
        return self


class CrowdThresholds(BaseModel):
    model_config = ConfigDict(extra="forbid")

    occupancy_pct: ThresholdSet
    pedestrians: ThresholdSet


class ReservationRules(BaseModel):
    model_config = ConfigDict(extra="forbid")

    grace_min: int = Field(..., gt=0)
    pending_ttl_min: int = Field(..., gt=0)
    cancel_cutoff_min: int = Field(..., gt=0)
    overstay_grace_min: int = Field(..., gt=0)


class ZoneUpsert(BaseModel):
    model_config = ConfigDict(extra="forbid")

    city_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=100)
    kind: Literal["parking", "loading", "mixed"]
    centroid: LatLon
    boundary: list[LatLon] | None = None
    operating_schedule: dict[str, Any] | None = None
    crowd_thresholds: CrowdThresholds | None = None
    reservation_rules: ReservationRules | None = None
    is_active: bool = True

    @model_validator(mode="after")
    def validate_boundary_geometry(self) -> ZoneUpsert:
        if self.boundary is not None:
            if len(self.boundary) < 4:
                raise ValueError("boundary must have at least 4 coordinates")
            if not ring_is_closed(self.boundary):
                raise ValueError("boundary must be a closed ring (first == last)")
            if ring_self_intersects(self.boundary):
                raise ValueError("boundary polygon must not self-intersect")
            if not point_in_ring(self.centroid, self.boundary):
                raise ValueError("centroid must lie inside the zone boundary polygon")
        return self


class FacilityUpsert(BaseModel):
    model_config = ConfigDict(extra="forbid")

    zone_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=100)
    kind: Literal["facility", "roadside"] = "facility"
    location: LatLon
    supports_reservation: bool = False
    address: str | None = Field(default=None, max_length=255)


class BayUpsert(BaseModel):
    model_config = ConfigDict(extra="forbid")

    facility_id: uuid.UUID
    code: str = Field(..., min_length=1, max_length=20)
    bay_type: BayType = BayType.REGULAR
    location: LatLon
    permitted_vehicle_categories: list[VehicleCategory] = Field(..., min_length=1)
    operating_schedule: dict[str, Any] | None = None
    restrictions: dict[str, Any] | None = None
    out_of_service: bool = False


class FeeUpsert(BaseModel):
    model_config = ConfigDict(extra="forbid")

    facility_id: uuid.UUID
    bay_type: BayType
    rate_per_hour: Decimal = Field(..., ge=0, decimal_places=2)
    currency: str = Field(default="INR", max_length=3)
    effective_from: UtcDateTime
    effective_to: UtcDateTime | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> FeeUpsert:
        if self.effective_to is not None and self.effective_to <= self.effective_from:
            raise ValueError("effective_to must be after effective_from")
        return self


class UserApproval(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["approved", "suspended"]


class RoleGrant(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Role


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_user_id: uuid.UUID | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    before: dict[str, Any] | None = None
    after: dict[str, Any] | None = None
    request_id: str | None = None
    created_at: UtcDateTime


class ModelVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    version: str
    target: str
    kind: str
    trained_on: str
    trained_at: UtcDateTime | None = None
    status: str
    metrics: dict[str, Any] = Field(default_factory=dict)
    params: dict[str, Any] = Field(default_factory=dict)


class ModelPromote(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model_version_id: uuid.UUID


class ManualOccupancyOverride(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bay_id: uuid.UUID
    state: Occupancy
    reason: str = Field(..., min_length=5, max_length=300)
