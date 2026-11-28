"""Domain models for AFTERSHOCK."""
from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field

from packages.domain.enums import (
    AssetType,
    LogicalState,
    DependencyType,
    DependencyMode,
    InterventionType,
)


class Position(BaseModel):
    x: float
    y: float
    z: float = 0.0


class BackupResource(BaseModel):
    resource_type: str = "backup_power"
    remaining_inventory: float = Field(ge=0)
    max_output_per_tick: float = Field(default=1.0, ge=0)
    conversion_efficiency: float = Field(default=1.0, gt=0, le=1.0)
    is_active: bool = False


class Asset(BaseModel):
    asset_id: str
    asset_type: AssetType
    name: str
    position: Position
    physical_damage: float = Field(default=0.0, ge=0.0, le=1.0)
    nominal_capacity: float = Field(default=1.0, ge=0.0)
    intrinsic_capacity_fraction: float = Field(default=1.0, ge=0.0, le=1.0)
    delivered_service_fraction: float = Field(default=1.0, ge=0.0, le=1.0)
    minimum_operational_service: float = Field(default=0.6, ge=0.0, le=1.0)
    criticality_weight: float = Field(default=1.0, ge=0.0)
    is_critical: bool = False
    vulnerability_scale: float = Field(default=1.0, ge=0.0)
    resistance_threshold: float = Field(default=0.1, ge=0.0, le=1.0)
    backup: list[BackupResource] = Field(default_factory=list)
    logical_state: LogicalState = LogicalState.OPERATIONAL


class Dependency(BaseModel):
    dependency_id: str
    source_asset_id: str
    target_asset_id: str
    dependency_type: DependencyType
    mode: DependencyMode
    required_fraction: float = Field(default=1.0, ge=0.0, le=1.0)
    minimum_fraction: float = Field(default=0.5, ge=0.0, le=1.0)
    latency_ticks: int = Field(default=0, ge=0)
    grace_ticks: int = Field(default=0, ge=0)
    importance: float = Field(default=1.0, ge=0.0)
    alternative_group: Optional[str] = None


class FloodSource(BaseModel):
    center_x: float
    center_y: float
    radius: float
    peak_intensity: float
    start_tick: int
    peak_tick: int
    end_tick: int


class Scenario(BaseModel):
    scenario_id: str
    name: str
    hazard_type: str = "synthetic_flood"
    flood_sources: list[FloodSource]
    seed: int = 1947
    horizon_ticks: int = 360
    tick_seconds: int = 60


class Intervention(BaseModel):
    intervention_id: str
    type: InterventionType
    target_asset_id: str
    start_tick: int = 0
    duration_ticks: int = 60
    resource_cost: int = 1
    effect: dict[str, float] = Field(default_factory=dict)


class SimulationEvent(BaseModel):
    event_id: str
    run_id: str
    sequence: int
    tick: int
    event_type: str
    asset_id: Optional[str] = None
    dependency_id: Optional[str] = None
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    cause_code: str
    parent_event_ids: list[str] = Field(default_factory=list)
    evidence: dict[str, Any] = Field(default_factory=dict)


class RunManifest(BaseModel):
    run_id: str
    project_id: str
    scenario_id: str
    seed: int
    tick_seconds: int = 60
    horizon_ticks: int = 360
    simulator_version: str = "0.1.0"
    model_hash: str
    scenario_hash: str
    interventions: list[Intervention] = Field(default_factory=list)
    uncertainty_draw_set_id: Optional[str] = None


class RunMetrics(BaseModel):
    run_id: str
    weighted_service_loss: float
    normalized_weighted_service_loss: float
    cascade_size: int
    critical_service_availability_timeline: list[float]
    final_critical_service_availability: float
    recovery_time: Optional[int] = None
    recovery_time_censored: bool = False
    resources_consumed: int = 0
    total_events: int = 0


class DistrictModel(BaseModel):
    project_id: str
    name: str
    assets: list[Asset]
    dependencies: list[Dependency]
