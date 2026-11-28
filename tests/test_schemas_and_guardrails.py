"""Unit tests for Pydantic schemas and deterministic hard safety guardrails."""

import pytest
from datetime import datetime, timedelta

from src.models.schemas import (
    GridCarbonAction,
    MicrogridStorageAction,
    ProductionSchedulingAction,
    MachineScheduleDecision,
    MachineState,
    ErgonomicsShiftAction,
    CooperativeActionPlan,
    ShiftType,
)
from src.orchestrator.guardrails import SafetyGuardrails, SafeBaselineSetpoints
from src.orchestrator.state import FactoryState, WorkOrder


def test_grid_carbon_action_schema_validation():
    """Test valid GridCarbonAction instantiation."""
    action = GridCarbonAction(
        dynamic_pricing_threshold_usd_kwh=0.22,
        grid_draw_limit_kw=750.0,
        curtailment_advisory_active=True,
        carbon_window_recommended=True,
        clean_window_start_minutes_ahead=30,
        clean_window_duration_minutes=90,
        confidence_score=0.95,
        reasoning="Test grid curtailment action",
    )
    assert action.grid_draw_limit_kw == 750.0
    assert action.curtailment_advisory_active is True


def test_bess_reserve_floor_guardrail_at_30_pct():
    """STRICT 30% BESS RESERVE: Discharging when SoC <= 30% must be completely blocked."""
    guardrails = SafetyGuardrails()
    now = datetime.utcnow()

    state = FactoryState(
        timestamp=now,
        bess_soc_pct=28.5,  # Below 30% reserve floor
        grid_guarantee_present=False,
    )

    plan = CooperativeActionPlan(
        tick_id="test_bess_01",
        grid_carbon=SafeBaselineSetpoints.get_fallback_grid_carbon(),
        microgrid_storage=MicrogridStorageAction(
            bess_charge_discharge_kw=-100.0,  # Proposes 100kW discharge!
            target_soc_pct=20.0,
            island_mode_command=False,
            reasoning="Attempting deep discharge",
        ),
        production_scheduling=SafeBaselineSetpoints.get_fallback_production_scheduling(state),
        ergonomics_shift=SafeBaselineSetpoints.get_fallback_ergonomics_shift(ShiftType.DAY),
    )

    sanitized = guardrails.validate_and_sanitize(plan, state)

    # Discharge MUST be blocked (set to 0.0)
    assert sanitized.microgrid_storage.bess_charge_discharge_kw == 0.0
    assert sanitized.passed_guardrails is False
    assert any("BESS Guardrail Violation" in w for w in sanitized.guardrail_warnings)


def test_bess_reserve_floor_clamping_projected_soc():
    """Test clamping discharge setpoint so projected SoC does not breach 30%."""
    guardrails = SafetyGuardrails()
    now = datetime.utcnow()

    # SoC is 33%, Capacity is 500 kWh.
    # Energy above 30% is 3% * 500 = 15 kWh.
    # Over 0.25h (15 min), max allowable discharge is 15 / 0.25 = 60 kW.
    state = FactoryState(
        timestamp=now,
        bess_soc_pct=33.0,
        bess_capacity_kwh=500.0,
        grid_guarantee_present=False,
    )

    plan = CooperativeActionPlan(
        tick_id="test_bess_02",
        grid_carbon=SafeBaselineSetpoints.get_fallback_grid_carbon(),
        microgrid_storage=MicrogridStorageAction(
            bess_charge_discharge_kw=-200.0,  # Proposing 200kW which would drop SoC to ~23%
            target_soc_pct=23.0,
            island_mode_command=False,
            reasoning="Attempting high discharge near floor",
        ),
        production_scheduling=SafeBaselineSetpoints.get_fallback_production_scheduling(state),
        ergonomics_shift=SafeBaselineSetpoints.get_fallback_ergonomics_shift(ShiftType.DAY),
    )

    sanitized = guardrails.validate_and_sanitize(plan, state)

    # Discharge MUST be clamped to 60 kW
    assert sanitized.microgrid_storage.bess_charge_discharge_kw == -60.0
    assert sanitized.microgrid_storage.target_soc_pct == 30.0
    assert any("BESS Guardrail Clamped" in w for w in sanitized.guardrail_warnings)


def test_bess_reserve_with_grid_guarantee():
    """When grid_guarantee_present is True, BESS discharge is permitted below 30%."""
    guardrails = SafetyGuardrails()
    now = datetime.utcnow()

    state = FactoryState(
        timestamp=now,
        bess_soc_pct=35.0,
        grid_guarantee_present=True,  # Utility contract guarantees no blackout
    )

    plan = CooperativeActionPlan(
        tick_id="test_bess_03",
        grid_carbon=SafeBaselineSetpoints.get_fallback_grid_carbon(),
        microgrid_storage=MicrogridStorageAction(
            bess_charge_discharge_kw=-100.0,
            target_soc_pct=25.0,
            island_mode_command=False,
            reasoning="Utility backed discharge",
        ),
        production_scheduling=SafeBaselineSetpoints.get_fallback_production_scheduling(state),
        ergonomics_shift=SafeBaselineSetpoints.get_fallback_ergonomics_shift(ShiftType.DAY),
    )

    sanitized = guardrails.validate_and_sanitize(plan, state)
    # Permitted without BESS violation
    assert sanitized.microgrid_storage.bess_charge_discharge_kw == -100.0


def test_mps_anti_tardiness_guardrail():
    """Anti-Reward-Hacking: Agent cannot PAUSE a machine when deadline is imminent."""
    guardrails = SafetyGuardrails()
    now = datetime.utcnow()

    urgent_order = WorkOrder(
        order_id="WO-URGENT",
        machine_id="CNC_MILL_5AXIS_01",
        part_type="Critical_Shaft",
        duration_minutes=40,
        deadline_utc=now + timedelta(minutes=25),  # Deadline in 25 mins!
        nominal_power_kw=45.0,
    )
    state = FactoryState(timestamp=now, active_orders=[urgent_order])

    plan = CooperativeActionPlan(
        tick_id="test_mps_01",
        grid_carbon=SafeBaselineSetpoints.get_fallback_grid_carbon(),
        microgrid_storage=SafeBaselineSetpoints.get_fallback_microgrid_storage(state.bess_soc_pct),
        production_scheduling=ProductionSchedulingAction(
            decisions=[
                MachineScheduleDecision(
                    machine_id="CNC_MILL_5AXIS_01",
                    job_id="WO-URGENT",
                    action=MachineState.PAUSED,  # Agent tries to pause to save carbon!
                    spindle_speed_pct=50.0,
                    ramp_rate_pct_per_min=10.0,
                    deadline_slack_minutes=25,
                )
            ],
            total_scheduled_load_kw=0.0,
            reasoning="Pausing to save energy",
        ),
        ergonomics_shift=SafeBaselineSetpoints.get_fallback_ergonomics_shift(ShiftType.DAY),
    )

    sanitized = guardrails.validate_and_sanitize(plan, state)

    # Guardrail MUST overturn PAUSE to THROTTLED or RUNNING
    decision = sanitized.production_scheduling.decisions[0]
    assert decision.action == MachineState.THROTTLED
    assert decision.spindle_speed_pct >= 75.0
    assert any("MPS Guardrail Violation" in w for w in sanitized.guardrail_warnings)


def test_thermal_oven_decay_guardrail():
    """Thermal Oven Guardrail: Never permit PAUSE during active thermal treatment."""
    guardrails = SafetyGuardrails()
    now = datetime.utcnow()

    oven_order = WorkOrder(
        order_id="WO-OVEN",
        machine_id="VACUUM_OVEN_01",
        part_type="Carburized_Gears",
        duration_minutes=180,
        deadline_utc=now + timedelta(hours=4),
        nominal_power_kw=110.0,
        preheat_required=True,
    )
    state = FactoryState(timestamp=now, active_orders=[oven_order])

    plan = CooperativeActionPlan(
        tick_id="test_oven_01",
        grid_carbon=SafeBaselineSetpoints.get_fallback_grid_carbon(),
        microgrid_storage=SafeBaselineSetpoints.get_fallback_microgrid_storage(state.bess_soc_pct),
        production_scheduling=ProductionSchedulingAction(
            decisions=[
                MachineScheduleDecision(
                    machine_id="VACUUM_OVEN_01",
                    job_id="WO-OVEN",
                    action=MachineState.PAUSED,  # LLM tries to turn off oven
                    spindle_speed_pct=100.0,
                    ramp_rate_pct_per_min=5.0,
                    deadline_slack_minutes=200,
                )
            ],
            total_scheduled_load_kw=0.0,
            reasoning="Attempting to pause oven",
        ),
        ergonomics_shift=SafeBaselineSetpoints.get_fallback_ergonomics_shift(ShiftType.DAY),
    )

    sanitized = guardrails.validate_and_sanitize(plan, state)

    # Must overturn to RUNNING with thermal_hold_override=True
    dec = sanitized.production_scheduling.decisions[0]
    assert dec.action == MachineState.RUNNING
    assert dec.thermal_hold_override is True
    assert any("Thermal Guardrail Violation" in w for w in sanitized.guardrail_warnings)


def test_ergonomics_temperature_and_night_noise_guardrail():
    """OSHA Ergonomics: Temperature clamped within 18-26 C, night shift noise throttled."""
    guardrails = SafetyGuardrails()
    now = datetime.utcnow()

    state = FactoryState(
        timestamp=now,
        current_shift=ShiftType.NIGHT,
        active_orders=[
            WorkOrder(
                order_id="WO-NIGHT",
                machine_id="CNC_MILL_5AXIS_01",
                part_type="Test_Part",
                duration_minutes=60,
                deadline_utc=now + timedelta(hours=3),
                nominal_power_kw=40.0,
            )
        ],
    )

    plan = CooperativeActionPlan(
        tick_id="test_ergo_01",
        grid_carbon=SafeBaselineSetpoints.get_fallback_grid_carbon(),
        microgrid_storage=SafeBaselineSetpoints.get_fallback_microgrid_storage(state.bess_soc_pct),
        production_scheduling=ProductionSchedulingAction(
            decisions=[
                MachineScheduleDecision(
                    machine_id="CNC_MILL_5AXIS_01",
                    job_id="WO-NIGHT",
                    action=MachineState.RUNNING,
                    spindle_speed_pct=100.0,  # Full speed during night
                    ramp_rate_pct_per_min=10.0,
                    deadline_slack_minutes=120,
                )
            ],
            total_scheduled_load_kw=40.0,
            reasoning="Running CNC at 100%",
        ),
        ergonomics_shift=ErgonomicsShiftAction(
            ventilation_fan_speed_pct=50.0,
            workstation_temp_target_c=15.0,  # Violates 18C minimum!
            shift_buffer_minutes=15,
            noise_throttling_active=False,  # Fails to throttle during night shift!
            active_shift_profile=ShiftType.NIGHT,
            reasoning="Unsafe night settings",
        ),
    )

    sanitized = guardrails.validate_and_sanitize(plan, state)

    # Temperature clamped to 18.0 C
    assert sanitized.ergonomics_shift.workstation_temp_target_c == 18.0
    # Noise throttling enforced
    assert sanitized.ergonomics_shift.noise_throttling_active is True
    # CNC spindle speed throttled to 80%
    assert sanitized.production_scheduling.decisions[0].spindle_speed_pct <= 80.0
