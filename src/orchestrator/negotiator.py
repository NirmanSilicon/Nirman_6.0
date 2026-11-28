"""Dec-POMDP cooperative negotiation loop between the 4 specialized agents."""

import logging
import uuid
from datetime import datetime
from src.models.inference import AgentInferenceEngine
from src.models.schemas import (
    GridCarbonInput,
    MicrogridStorageInput,
    ProductionSchedulingInput,
    ErgonomicsShiftInput,
    CooperativeActionPlan,
)
from src.orchestrator.guardrails import SafetyGuardrails, SafeBaselineSetpoints
from src.orchestrator.state import FactoryState

logger = logging.getLogger("VidyutSync.Negotiator")


class DecPOMDPNegotiator:
    """Orchestrates decentralized cooperative consensus among the 4 agents."""

    def __init__(self, inference_engine: AgentInferenceEngine | None = None):
        self.inference = inference_engine or AgentInferenceEngine()
        self.guardrails = SafetyGuardrails()

    def negotiate_tick(
        self,
        state: FactoryState,
        tick_id: str | None = None,
        execution_mode: str = "shadow",
    ) -> CooperativeActionPlan:
        """Executes a cooperative consensus round across the 4 agents."""
        tick_id = tick_id or f"tick_{uuid.uuid4().hex[:12]}"
        now = state.timestamp

        # --- Phase 1: Grid & Carbon Agent Proposal ---
        grid_input = GridCarbonInput(
            timestamp=now,
            current_carbon_intensity_gco2=state.grid_carbon_intensity_gco2,
            forecast_carbon_intensity_next_4h=state.forecast_carbon_intensity_4h,
            current_tou_tariff_usd_kwh=state.grid_tou_tariff_usd_kwh,
            demand_charge_peak_usd_kw=state.grid_demand_charge_usd_kw,
            current_grid_draw_kw=state.current_grid_draw_kw,
            weather_ensemble_condition="Ensemble_Forecast_Optimal",
        )
        try:
            grid_action = self.inference.infer_grid_carbon(grid_input)
        except Exception as e:
            logger.error(f"Error querying GridCarbon agent: {e}. Using safe fallback.")
            grid_action = SafeBaselineSetpoints.get_fallback_grid_carbon()

        # --- Phase 2: Microgrid Storage Agent Proposal ---
        storage_input = MicrogridStorageInput(
            timestamp=now,
            solar_irradiance_ghi=state.solar_irradiance_ghi,
            wind_speed_mps=4.2,
            pv_generation_kw=state.pv_generation_kw,
            bess_soc_pct=state.bess_soc_pct,
            bess_health_soh_pct=98.5,
            regenerative_braking_kw=state.regenerative_braking_kw,
            grid_guarantee_present=state.grid_guarantee_present,
        )
        try:
            storage_action = self.inference.infer_microgrid_storage(storage_input)
        except Exception as e:
            logger.error(f"Error querying MicrogridStorage agent: {e}. Using safe fallback.")
            storage_action = SafeBaselineSetpoints.get_fallback_microgrid_storage(state.bess_soc_pct)

        # --- Phase 3: Production Scheduling Agent Proposal ---
        snapshots = [order.to_snapshot() for order in state.active_orders]
        # Headroom available is grid limit + BESS discharge (if discharging) + solar PV
        bess_discharge_avail = max(0.0, -storage_action.bess_charge_discharge_kw)
        available_headroom = grid_action.grid_draw_limit_kw + bess_discharge_avail + state.pv_generation_kw

        prod_input = ProductionSchedulingInput(
            timestamp=now,
            active_orders=snapshots,
            thermal_oven_temp_c=state.thermal_oven_temp_c,
            oven_thermal_decay_rate_c_per_hr=state.oven_thermal_decay_rate_c_hr,
            upcoming_batch_deadlines_minutes=[
                max(0, int((o.deadline_utc - now).total_seconds() / 60.0)) for o in state.active_orders
            ],
            grid_draw_headroom_kw=available_headroom,
        )
        try:
            prod_action = self.inference.infer_production_scheduling(prod_input)
        except Exception as e:
            logger.error(f"Error querying ProductionScheduling agent: {e}. Using safe fallback.")
            prod_action = SafeBaselineSetpoints.get_fallback_production_scheduling(state)

        # --- Phase 4: Ergonomics & Shift Agent Proposal ---
        ergo_input = ErgonomicsShiftInput(
            timestamp=now,
            current_shift=state.current_shift,
            minutes_to_shift_handover=state.minutes_to_handover,
            factory_ambient_temp_c=state.factory_ambient_temp_c,
            current_ambient_noise_db=state.ambient_noise_db,
            worker_comfort_min_temp_c=18.0,
            worker_comfort_max_temp_c=26.0,
            active_worker_count=state.active_worker_count,
        )
        try:
            ergo_action = self.inference.infer_ergonomics_shift(ergo_input)
        except Exception as e:
            logger.error(f"Error querying ErgonomicsShift agent: {e}. Using safe fallback.")
            ergo_action = SafeBaselineSetpoints.get_fallback_ergonomics_shift(state.current_shift)

        # Assemble raw joint action plan
        raw_plan = CooperativeActionPlan(
            tick_id=tick_id,
            timestamp=now,
            grid_carbon=grid_action,
            microgrid_storage=storage_action,
            production_scheduling=prod_action,
            ergonomics_shift=ergo_action,
            negotiation_rounds=1,
            execution_mode=execution_mode,
        )

        # --- Phase 5: Deterministic Post-Validation Hard Guardrails ---
        validated_plan = self.guardrails.validate_and_sanitize(raw_plan, state)

        return validated_plan
