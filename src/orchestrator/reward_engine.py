"""Reward engine managing rolling rewards, anti-hacking metrics, and cumulative KPIs."""

from dataclasses import dataclass, field
from datetime import datetime
from src.models.reward_scorer import DecPOMDPRewardScorer, RewardBreakdown
from src.models.schemas import CooperativeActionPlan
from src.orchestrator.state import FactoryState


@dataclass
class CumulativeKPIs:
    total_ticks: int = 0
    total_reward: float = 0.0
    total_emissions_saved_kg: float = 0.0
    total_cost_saved_usd: float = 0.0
    total_tardiness_penalties: int = 0
    reward_hacking_detected_count: int = 0
    guardrail_interventions_count: int = 0


class OrchestratorRewardEngine:
    """Manages reward evaluation and historical KPI aggregation for the orchestrator."""

    def __init__(self):
        self.scorer = DecPOMDPRewardScorer()
        self.kpis = CumulativeKPIs()
        self.history: list[dict] = []

    def evaluate_tick(
        self,
        action_plan: CooperativeActionPlan,
        state: FactoryState,
    ) -> RewardBreakdown:
        """Evaluates reward for the current tick and updates cumulative KPIs."""
        # Calculate actual net grid draw
        total_machine_load = sum(
            o.nominal_power_kw * (d.spindle_speed_pct / 100.0)
            for o in state.active_orders
            for d in action_plan.production_scheduling.decisions
            if d.machine_id == o.machine_id and d.action.value != "PAUSED"
        )
        bess_kw = action_plan.microgrid_storage.bess_charge_discharge_kw
        bess_charge = max(0.0, bess_kw)
        bess_discharge = max(0.0, -bess_kw)

        net_grid_draw = max(
            0.0,
            total_machine_load + bess_charge - state.pv_generation_kw - bess_discharge
        )

        breakdown = self.scorer.score_trajectory(
            action_plan=action_plan,
            grid_draw_kw=net_grid_draw,
            carbon_intensity_gco2_kwh=state.grid_carbon_intensity_gco2,
            tou_tariff_usd_kwh=state.grid_tou_tariff_usd_kwh,
            ambient_noise_db=state.ambient_noise_db,
            workstation_temp_c=action_plan.ergonomics_shift.workstation_temp_target_c,
            is_handover=state.is_handover,
        )

        # Update KPIs
        self.kpis.total_ticks += 1
        self.kpis.total_reward += breakdown.r_total
        if breakdown.is_reward_hacked:
            self.kpis.reward_hacking_detected_count += 1
            self.kpis.total_tardiness_penalties += 1

        if not action_plan.passed_guardrails:
            self.kpis.guardrail_interventions_count += 1

        # Emissions saved vs 600kW baseline over a 15-minute interval (0.25 hr)
        baseline_emissions = 600.0 * state.grid_carbon_intensity_gco2 * 0.25 / 1000.0  # kg
        actual_emissions = net_grid_draw * state.grid_carbon_intensity_gco2 * 0.25 / 1000.0  # kg
        emissions_saved = max(0.0, baseline_emissions - actual_emissions)
        self.kpis.total_emissions_saved_kg += emissions_saved

        # Cost savings vs baseline
        baseline_cost = 600.0 * state.grid_tou_tariff_usd_kwh * 0.25
        actual_cost = net_grid_draw * state.grid_tou_tariff_usd_kwh * 0.25
        cost_saved = max(0.0, baseline_cost - actual_cost)
        self.kpis.total_cost_saved_usd += cost_saved

        # Store in rolling history (keep last 1000 ticks)
        entry = {
            "timestamp": state.timestamp.isoformat(),
            "tick_id": action_plan.tick_id,
            "r_carbon": breakdown.r_carbon,
            "r_cost": breakdown.r_cost,
            "r_schedule": breakdown.r_schedule,
            "r_worker": breakdown.r_worker,
            "r_total": breakdown.r_total,
            "is_reward_hacked": breakdown.is_reward_hacked,
            "net_grid_draw_kw": round(net_grid_draw, 2),
            "emissions_saved_kg": round(emissions_saved, 3),
            "cost_saved_usd": round(cost_saved, 3),
        }
        self.history.append(entry)
        if len(self.history) > 1000:
            self.history.pop(0)

        return breakdown
