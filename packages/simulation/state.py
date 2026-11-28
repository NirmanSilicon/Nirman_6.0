"""Simulation state representations."""
from __future__ import annotations

from copy import deepcopy
from typing import Optional
from pydantic import BaseModel, Field

from packages.domain.enums import LogicalState
from packages.domain.models import Asset, BackupResource, SimulationEvent


class AssetRuntimeState(BaseModel):
    asset_id: str
    physical_damage: float = 0.0
    intrinsic_capacity: float = 1.0
    delivered_service: float = 1.0
    logical_state: LogicalState = LogicalState.OPERATIONAL
    active_backups: list[BackupResource] = Field(default_factory=list)
    service_history: list[float] = Field(default_factory=list)
    grace_ticks_remaining: dict[str, int] = Field(default_factory=dict)
    repair_ticks_remaining: Optional[int] = None
    last_event_id: Optional[str] = None
    is_protected: bool = False
    protection_factor: float = 0.0


class SimulationState(BaseModel):
    tick: int = 0
    sequence: int = 0
    assets: dict[str, AssetRuntimeState] = Field(default_factory=dict)
    events: list[SimulationEvent] = Field(default_factory=list)
    recent_events_by_asset: dict[str, str] = Field(default_factory=dict)
    recent_events_by_type: dict[str, str] = Field(default_factory=dict)

    def clone(self) -> SimulationState:
        return deepcopy(self)
