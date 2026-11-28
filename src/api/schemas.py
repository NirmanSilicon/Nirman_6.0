"""API Request & Response schemas for FastAPI endpoints."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field

from src.models.schemas import ShiftType


class HealthResponse(BaseModel):
    status: str
    version: str
    mode: str
    timescale_connected: bool
    mqtt_connected: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TelemetryIngestRequest(BaseModel):
    asset_id: str
    metric: str
    value: float
    unit: str = ""
    timestamp: datetime | None = None


class WorkOrderCreateRequest(BaseModel):
    order_id: str
    machine_id: str
    part_type: str
    duration_minutes: int
    deadline_utc: datetime
    priority: int = 1
    nominal_power_kw: float = 45.0
    preheat_required: bool = False


class OrchestrationTickRequest(BaseModel):
    state_override: dict[str, Any] | None = None


class ModeSwitchRequest(BaseModel):
    mode: str = Field(..., pattern="^(shadow|live_pilot)$", description="Target execution mode")


class OperatorOverrideRequest(BaseModel):
    asset_id: str
    setpoints: dict[str, Any]
    notes: str = ""


class MetricsSummaryResponse(BaseModel):
    mode: str
    kpis: dict[str, Any]
    latest_state: dict[str, Any]
    active_overrides_count: int
