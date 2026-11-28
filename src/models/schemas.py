"""Pydantic schemas for the 4 specialized Dec-POMDP LLM models and actions."""

from datetime import datetime
from enum import Enum
from typing import Any
from pydantic import BaseModel, Field, field_validator


# --- Enums ---
class ShiftType(str, Enum):
    DAY = "DAY"                # 06:00 - 14:00
    SWING = "SWING"            # 14:00 - 22:00
    NIGHT = "NIGHT"            # 22:00 - 06:00
    HANDOVER = "HANDOVER"      # Transition intervals between shifts


class MachineState(str, Enum):
    IDLE = "IDLE"
    RUNNING = "RUNNING"
    THROTTLED = "THROTTLED"
    PRE_HEATING = "PRE_HEATING"
    PAUSED = "PAUSED"
    COOLDOWN = "COOLDOWN"


# --- 1. Grid & Carbon Model ---
class GridCarbonInput(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    current_carbon_intensity_gco2: float = Field(..., ge=0.0, description="gCO2/kWh from Electricity Maps/WattTime")
    forecast_carbon_intensity_next_4h: list[float] = Field(default_factory=list, description="Hourly CI forecast")
    current_tou_tariff_usd_kwh: float = Field(..., ge=0.0, description="Real-time TOU energy tariff in $/kWh")
    demand_charge_peak_usd_kw: float = Field(..., ge=0.0, description="Monthly peak demand charge in $/kW")
    current_grid_draw_kw: float = Field(..., ge=0.0, description="Current plant draw from the utility grid")
    weather_ensemble_condition: str = Field("Clear", description="Localized weather outlook")


class GridCarbonAction(BaseModel):
    dynamic_pricing_threshold_usd_kwh: float = Field(
        ..., ge=0.0, le=2.0, description="Internal hurdle price above which load throttling is advised"
    )
    grid_draw_limit_kw: float = Field(
        ..., ge=0.0, le=2000.0, description="Advisory ceiling on power drawn from the utility grid"
    )
    curtailment_advisory_active: bool = Field(
        False, description="Flag indicating high grid stress or extreme carbon intensity"
    )
    carbon_window_recommended: bool = Field(
        False, description="True if next 1-4 hours represents a high-renewables clean energy window"
    )
    clean_window_start_minutes_ahead: int = Field(0, ge=0, description="Look-ahead offset to clean window")
    clean_window_duration_minutes: int = Field(0, ge=0, description="Estimated duration of clean window")
    confidence_score: float = Field(1.0, ge=0.0, le=1.0)
    reasoning: str = Field(..., description="Cooperative rationale for other agents")


# --- 2. Micro-Grid & Storage Model ---
class MicrogridStorageInput(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    solar_irradiance_ghi: float = Field(..., ge=0.0, description="Global Horizontal Irradiance in W/m2")
    wind_speed_mps: float = Field(0.0, ge=0.0, description="Wind speed in m/s")
    pv_generation_kw: float = Field(..., ge=0.0, description="Current rooftop PV inverter generation")
    bess_soc_pct: float = Field(..., ge=0.0, le=100.0, description="Battery State-of-Charge percentage")
    bess_health_soh_pct: float = Field(98.0, ge=0.0, le=100.0, description="Battery State-of-Health")
    regenerative_braking_kw: float = Field(
        0.0, ge=0.0, description="Regenerative energy recovered from CNC braking & crane deceleration"
    )
    grid_guarantee_present: bool = Field(
        False, description="True if firm utility contract guarantees zero outage/blackout"
    )


class MicrogridStorageAction(BaseModel):
    bess_charge_discharge_kw: float = Field(
        ..., ge=-300.0, le=300.0,
        description="BESS power setpoint: positive (+) charges battery, negative (-) discharges into microgrid"
    )
    target_soc_pct: float = Field(..., ge=20.0, le=100.0, description="Target SoC for the end of the window")
    island_mode_command: bool = Field(False, description="Command to disconnect from utility grid and island")
    local_buffer_discharge_rate_kw: float = Field(
        0.0, ge=0.0, le=100.0, description="Discharge rate for supercapacitor / flywheel regenerative buffers"
    )
    reserve_override_requested: bool = Field(
        False, description="Request to breach 30% reserve floor (requires grid guarantee)"
    )
    reasoning: str = Field(..., description="Operational rationale for storage setpoints")


# --- 3. Production Scheduling Model ---
class WorkOrderSnapshot(BaseModel):
    order_id: str
    machine_id: str
    part_type: str
    duration_minutes: int
    deadline_utc: datetime
    priority: int = 1
    nominal_power_kw: float
    preheat_required: bool = False
    current_temp_c: float | None = None
    min_thermal_temp_c: float | None = None


class ProductionSchedulingInput(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    active_orders: list[WorkOrderSnapshot] = Field(default_factory=list)
    thermal_oven_temp_c: float = Field(850.0, description="Current temperature of vacuum carburizing/annealing oven")
    oven_thermal_decay_rate_c_per_hr: float = Field(
        45.0, description="Loss of temperature per hour if heating is disabled"
    )
    upcoming_batch_deadlines_minutes: list[int] = Field(default_factory=list)
    grid_draw_headroom_kw: float = Field(800.0, description="Available power headroom from grid & microgrid")


class MachineScheduleDecision(BaseModel):
    machine_id: str
    job_id: str | None = None
    action: MachineState = MachineState.RUNNING
    spindle_speed_pct: float = Field(100.0, ge=50.0, le=100.0, description="CNC spindle speed throttle percentage")
    ramp_rate_pct_per_min: float = Field(10.0, ge=1.0, le=50.0, description="Power ramping limit")
    preheat_lookahead_minutes: int = Field(0, ge=0, description="Pre-heat minutes scheduled prior to clean window")
    deadline_slack_minutes: int = Field(..., description="Minutes remaining until MPS deadline")
    thermal_hold_override: bool = Field(
        False, description="Override pause to protect oven charge from thermal decay scrap"
    )


class ProductionSchedulingAction(BaseModel):
    decisions: list[MachineScheduleDecision] = Field(default_factory=list)
    total_scheduled_load_kw: float = Field(..., ge=0.0)
    lookahead_preheating_active: bool = Field(False)
    batch_tardiness_risk: bool = Field(False)
    reasoning: str = Field(..., description="Scheduling trade-offs vs carbon/tariff")


# --- 4. Ergonomics & Shift Model ---
class ErgonomicsShiftInput(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    current_shift: ShiftType = ShiftType.DAY
    minutes_to_shift_handover: int = Field(..., ge=0)
    factory_ambient_temp_c: float = Field(22.0, description="Current shop floor ambient temperature")
    current_ambient_noise_db: float = Field(72.0, description="Current sound pressure level in dB(A)")
    worker_comfort_min_temp_c: float = Field(18.0)
    worker_comfort_max_temp_c: float = Field(26.0)
    active_worker_count: int = Field(15, ge=0)


class ErgonomicsShiftAction(BaseModel):
    ventilation_fan_speed_pct: float = Field(50.0, ge=0.0, le=100.0)
    workstation_temp_target_c: float = Field(21.5, ge=10.0, le=35.0, description="Target temp in C (OSHA comfort band is 18-26C)")
    shift_buffer_minutes: int = Field(15, ge=0, le=60, description="Hold non-urgent heavy tasks during handover")
    noise_throttling_active: bool = Field(
        False, description="Enforce reduced noise/vibration limits during night shift or rest period"
    )
    high_thermal_restriction_active: bool = Field(
        False, description="Prevent opening thermal ovens or radiant heat sources while workers assemble nearby"
    )
    active_shift_profile: ShiftType = ShiftType.DAY
    reasoning: str = Field(..., description="Worker comfort and OSHA compliance justification")


# --- Joint Cooperative Plan ---
class CooperativeActionPlan(BaseModel):
    tick_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    grid_carbon: GridCarbonAction
    microgrid_storage: MicrogridStorageAction
    production_scheduling: ProductionSchedulingAction
    ergonomics_shift: ErgonomicsShiftAction
    passed_guardrails: bool = True
    guardrail_warnings: list[str] = Field(default_factory=list)
    guardrail_corrections: dict[str, Any] = Field(default_factory=dict)
    negotiation_rounds: int = 1
    execution_mode: str = "shadow"
