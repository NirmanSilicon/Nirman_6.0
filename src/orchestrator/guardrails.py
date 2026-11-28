"""Deterministic hard safety guardrails and fallback engine for VidyutSync.

Enforces physical boundaries, OSHA ergonomics, and anti-reward-hacking constraints:
1. Strict 30% BESS SoC reserve floor (unless backed by firm grid guarantees)
2. MPS deadline & thermal decay protection (preventing reward hacking)
3. OSHA noise limits (85 dB day, 70 dB night/handover) and 18-26 C thermal comfort
4. Grid peak draw limits
5. Safe baseline setpoint fallback
"""

import copy
import logging
from typing import Any
from pydantic import ValidationError

from src.config import settings
from src.models.schemas import (
    CooperativeActionPlan,
    GridCarbonAction,
    MicrogridStorageAction,
    ProductionSchedulingAction,
    ErgonomicsShiftAction,
    MachineScheduleDecision,
    MachineState,
    ShiftType,
)
from src.orchestrator.state import FactoryState

logger = logging.getLogger("VidyutSync.Guardrails")


class SafeBaselineSetpoints:
    """Safe fallback setpoints when LLM fails schema or issues invalid commands."""

    @staticmethod
    def get_fallback_grid_carbon() -> GridCarbonAction:
        return GridCarbonAction(
            dynamic_pricing_threshold_usd_kwh=0.18,
            grid_draw_limit_kw=settings.MAX_GRID_DRAW_KW * 0.75,
            curtailment_advisory_active=False,
            carbon_window_recommended=False,
            clean_window_start_minutes_ahead=0,
            clean_window_duration_minutes=0,
            confidence_score=0.5,
            reasoning="FALLBACK: Safe default grid draw limits applied.",
        )

    @staticmethod
    def get_fallback_microgrid_storage(soc_pct: float) -> MicrogridStorageAction:
        # Never discharge on fallback
        return MicrogridStorageAction(
            bess_charge_discharge_kw=0.0,
            target_soc_pct=max(settings.BESS_MIN_SOC_FLOOR_PCT, soc_pct),
            island_mode_command=False,
            local_buffer_discharge_rate_kw=0.0,
            reserve_override_requested=False,
            reasoning="FALLBACK: BESS set to float (0 kW) to guarantee reserve safety.",
        )

    @staticmethod
    def get_fallback_production_scheduling(factory_state: FactoryState) -> ProductionSchedulingAction:
        decisions = []
        total_kw = 0.0
        for order in factory_state.active_orders:
            is_oven = "OVEN" in order.machine_id.upper() or order.preheat_required
            action = MachineState.RUNNING if is_oven else MachineState.THROTTLED
            spindle = 100.0 if is_oven else 60.0
            decisions.append(
                MachineScheduleDecision(
                    machine_id=order.machine_id,
                    job_id=order.order_id,
                    action=action,
                    spindle_speed_pct=spindle,
                    ramp_rate_pct_per_min=5.0,
                    preheat_lookahead_minutes=0,
                    deadline_slack_minutes=45,
                    thermal_hold_override=is_oven,
                )
            )
            total_kw += order.nominal_power_kw * (spindle / 100.0)

        return ProductionSchedulingAction(
            decisions=decisions,
            total_scheduled_load_kw=round(total_kw, 1),
            lookahead_preheating_active=False,
            batch_tardiness_risk=False,
            reasoning="FALLBACK: Machine speeds throttled to safe baseline; oven thermal soak maintained.",
        )

    @staticmethod
    def get_fallback_ergonomics_shift(shift_type: ShiftType) -> ErgonomicsShiftAction:
        return ErgonomicsShiftAction(
            ventilation_fan_speed_pct=50.0,
            workstation_temp_target_c=21.5,
            shift_buffer_minutes=15,
            noise_throttling_active=(shift_type == ShiftType.NIGHT),
            high_thermal_restriction_active=False,
            active_shift_profile=shift_type,
            reasoning="FALLBACK: Standard OSHA nominal ventilation and temperature settings.",
        )


class SafetyGuardrails:
    """Enforces deterministic post-validation guardrails on cooperative plans."""

    def __init__(self):
        self.min_bess_soc = settings.BESS_MIN_SOC_FLOOR_PCT
        self.max_grid_draw = settings.MAX_GRID_DRAW_KW
        self.max_noise_day = settings.WORKER_MAX_NOISE_DAY_DB
        self.max_noise_night = settings.WORKER_MAX_NOISE_NIGHT_DB
        self.min_temp = settings.WORKER_MIN_COMFORT_TEMP_C
        self.max_temp = settings.WORKER_MAX_COMFORT_TEMP_C

    def validate_and_sanitize(
        self,
        plan: CooperativeActionPlan,
        state: FactoryState,
    ) -> CooperativeActionPlan:
        """Sanitizes and enforces physical safety rules on the joint action plan."""
        sanitized = copy.deepcopy(plan)
        warnings: list[str] = []
        corrections: dict[str, Any] = {}

        # -------------------------------------------------------------
        # Guardrail 1: Strict 30% BESS Minimum SoC Reserve Floor
        # -------------------------------------------------------------
        bess_action = sanitized.microgrid_storage
        current_soc = state.bess_soc_pct
        grid_guaranteed = state.grid_guarantee_present

        # If battery is discharging (negative setpoint)
        if bess_action.bess_charge_discharge_kw < 0:
            if current_soc <= self.min_bess_soc and not grid_guaranteed:
                warnings.append(
                    f"BESS Guardrail Violation: SoC is {current_soc:.1f}% <= {self.min_bess_soc}%. "
                    f"Discharge prohibited without firm grid guarantee."
                )
                corrections["bess_charge_discharge_kw"] = 0.0
                bess_action.bess_charge_discharge_kw = 0.0
                bess_action.target_soc_pct = max(self.min_bess_soc, current_soc)
            elif not grid_guaranteed:
                # Calculate energy drawn over 15-minute tick (0.25h)
                discharge_kw = abs(bess_action.bess_charge_discharge_kw)
                energy_kwh = discharge_kw * 0.25
                soc_delta_pct = (energy_kwh / state.bess_capacity_kwh) * 100.0
                projected_soc = current_soc - soc_delta_pct

                if projected_soc < self.min_bess_soc:
                    # Clamp discharge power to not breach 30%
                    allowable_energy_kwh = ((current_soc - self.min_bess_soc) / 100.0) * state.bess_capacity_kwh
                    clamped_discharge_kw = max(0.0, allowable_energy_kwh / 0.25)
                    warnings.append(
                        f"BESS Guardrail Clamped: Projected SoC {projected_soc:.1f}% breaches reserve floor. "
                        f"Clamping discharge from {discharge_kw:.1f}kW to {clamped_discharge_kw:.1f}kW."
                    )
                    corrections["bess_charge_discharge_kw"] = -round(clamped_discharge_kw, 1)
                    bess_action.bess_charge_discharge_kw = -round(clamped_discharge_kw, 1)
                    bess_action.target_soc_pct = self.min_bess_soc

        # -------------------------------------------------------------
        # Guardrail 2: Anti-Reward-Hacking & MPS Deadline Protection
        # -------------------------------------------------------------
        sched_action = sanitized.production_scheduling
        for i, decision in enumerate(sched_action.decisions):
            # Find matching work order
            matching_order = next((o for o in state.active_orders if o.machine_id == decision.machine_id), None)
            if matching_order:
                # Calculate real slack to deadline
                now = state.timestamp
                remaining_minutes = (matching_order.deadline_utc - now).total_seconds() / 60.0
                decision.deadline_slack_minutes = int(remaining_minutes)

                # Anti-reward hacking: If slack is tight (< 45 mins), prevent pause
                if remaining_minutes < 45.0 and decision.action == MachineState.PAUSED:
                    warnings.append(
                        f"MPS Guardrail Violation: Order {matching_order.order_id} has only {remaining_minutes:.0f}m "
                        f"slack! Anti-reward-hacking rule overturned PAUSE to THROTTLED to prevent tardiness."
                    )
                    decision.action = MachineState.THROTTLED
                    decision.spindle_speed_pct = max(75.0, decision.spindle_speed_pct)
                    corrections[f"machine_{decision.machine_id}_action"] = "THROTTLED"

                # ---------------------------------------------------------
                # Guardrail 3: Thermal Oven Cooling Decay Scrap Protection
                # ---------------------------------------------------------
                if "OVEN" in decision.machine_id.upper() or matching_order.preheat_required:
                    if decision.action == MachineState.PAUSED:
                        warnings.append(
                            f"Thermal Guardrail Violation: Thermal oven {decision.machine_id} cannot be paused "
                            f"during active carburizing/annealing charge. Holding temperature to prevent scrap."
                        )
                        decision.action = MachineState.RUNNING
                        decision.thermal_hold_override = True
                        corrections[f"oven_{decision.machine_id}_override"] = "RUNNING_HOLD"

        # -------------------------------------------------------------
        # Guardrail 4: OSHA Ergonomics & Noise / Temperature Bands
        # -------------------------------------------------------------
        ergo_action = sanitized.ergonomics_shift
        is_night = ergo_action.active_shift_profile == ShiftType.NIGHT
        is_handover = state.is_handover or (state.minutes_to_handover <= 20)

        # Enforce temperature band 18C - 26C
        if ergo_action.workstation_temp_target_c < self.min_temp:
            warnings.append(f"Ergonomics Guardrail: Clamping temp {ergo_action.workstation_temp_target_c}C to min {self.min_temp}C.")
            corrections["workstation_temp_target_c"] = self.min_temp
            ergo_action.workstation_temp_target_c = self.min_temp
        elif ergo_action.workstation_temp_target_c > self.max_temp:
            warnings.append(f"Ergonomics Guardrail: Clamping temp {ergo_action.workstation_temp_target_c}C to max {self.max_temp}C.")
            corrections["workstation_temp_target_c"] = self.max_temp
            ergo_action.workstation_temp_target_c = self.max_temp

        # Enforce night/handover noise suppression
        if (is_night or is_handover) and not ergo_action.noise_throttling_active:
            warnings.append("Ergonomics Guardrail: Night/Handover active; enforcing noise_throttling_active=True.")
            corrections["noise_throttling_active"] = True
            ergo_action.noise_throttling_active = True

            # Throttle high-speed CNCs during night/handover
            for dec in sched_action.decisions:
                if "CNC" in dec.machine_id.upper() and dec.spindle_speed_pct > 80.0:
                    warnings.append(f"OSHA Decibel Guardrail: Throttling {dec.machine_id} spindle to 80% to keep sound <70dB.")
                    dec.spindle_speed_pct = 80.0
                    corrections[f"spindle_{dec.machine_id}"] = 80.0

        # -------------------------------------------------------------
        # Guardrail 5: Total Grid Draw Ceiling
        # -------------------------------------------------------------
        total_machine_load = sum(
            o.nominal_power_kw * (d.spindle_speed_pct / 100.0 if d.action != MachineState.PAUSED else 0.0)
            for o in state.active_orders
            for d in sched_action.decisions
            if d.machine_id == o.machine_id
        )
        bess_discharge = max(0.0, -bess_action.bess_charge_discharge_kw)
        bess_charge = max(0.0, bess_action.bess_charge_discharge_kw)
        net_grid_draw = total_machine_load + bess_charge - state.pv_generation_kw - bess_discharge

        if net_grid_draw > self.max_grid_draw:
            warnings.append(
                f"Peak Draw Guardrail Violation: Net grid draw {net_grid_draw:.1f}kW exceeds limit {self.max_grid_draw}kW! "
                f"Applying emergency load shedding."
            )
            # Throttle CNC machines
            for dec in sched_action.decisions:
                if "CNC" in dec.machine_id.upper():
                    dec.spindle_speed_pct = max(50.0, dec.spindle_speed_pct * 0.7)
            corrections["emergency_grid_shedding"] = True

        # Update plan metadata
        sanitized.passed_guardrails = len(corrections) == 0
        sanitized.guardrail_warnings = warnings
        sanitized.guardrail_corrections = corrections

        return sanitized
