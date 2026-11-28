"""Reward formulation and scoring module for Dec-POMDP cooperative agents.

Mathematical Formulation:
R_total = w_1 * R_carbon + w_2 * R_cost + w_3 * R_schedule + w_4 * R_worker
"""

from dataclasses import dataclass
from src.config import settings
from src.models.schemas import (
    CooperativeActionPlan,
    ShiftType,
)


@dataclass
class RewardBreakdown:
    r_carbon: float
    r_cost: float
    r_schedule: float
    r_worker: float
    r_total: float
    is_reward_hacked: bool
    diagnostics: dict


class DecPOMDPRewardScorer:
    """Evaluates the composite multi-objective reward for joint agent decisions."""

    def __init__(
        self,
        w_carbon: float | None = None,
        w_cost: float | None = None,
        w_schedule: float | None = None,
        w_worker: float | None = None,
        tardiness_penalty_rate: float | None = None,
    ):
        self.w_carbon = w_carbon if w_carbon is not None else settings.REWARD_WEIGHT_CARBON
        self.w_cost = w_cost if w_cost is not None else settings.REWARD_WEIGHT_COST
        self.w_schedule = w_schedule if w_schedule is not None else settings.REWARD_WEIGHT_SCHEDULE
        self.w_worker = w_worker if w_worker is not None else settings.REWARD_WEIGHT_WORKER
        self.tardiness_penalty_rate = (
            tardiness_penalty_rate if tardiness_penalty_rate is not None else settings.MPS_TARDINESS_PENALTY_RATE
        )

    def calculate_r_carbon(
        self,
        grid_draw_kw: float,
        carbon_intensity_gco2_kwh: float,
        baseline_draw_kw: float = 600.0,
        baseline_ci: float = 450.0,
    ) -> float:
        """R_carbon: Penalizes grid draw weighted by carbon intensity: - (P_grid * CI).

        Normalized against baseline plant draw and standard regional grid CI.
        Score is centered around 0: positive if cleaner than baseline, negative if dirtier.
        """
        actual_emissions_ghr = max(0.0, grid_draw_kw) * carbon_intensity_gco2_kwh
        baseline_emissions_ghr = baseline_draw_kw * baseline_ci
        # Relative improvement or penalty
        score = (baseline_emissions_ghr - actual_emissions_ghr) / baseline_emissions_ghr
        return float(max(-5.0, min(2.0, score)))

    def calculate_r_cost(
        self,
        grid_draw_kw: float,
        tou_tariff_usd_kwh: float,
        peak_demand_threshold_kw: float = 800.0,
        demand_charge_usd_kw: float = 18.0,
    ) -> float:
        """R_cost: Captures TOU tariffs and demand-charge penalties for exceeding peak threshold."""
        # 1-hour equivalent energy cost
        hourly_energy_cost = max(0.0, grid_draw_kw) * tou_tariff_usd_kwh
        # Demand charge penalty if exceeding threshold
        excess_kw = max(0.0, grid_draw_kw - peak_demand_threshold_kw)
        demand_penalty = excess_kw * (demand_charge_usd_kw / 30.0)  # amortized daily
        total_cost_penalty = hourly_energy_cost + demand_penalty
        # Baseline reference $150/hr
        score = (150.0 - total_cost_penalty) / 150.0
        return float(max(-5.0, min(2.0, score)))

    def calculate_r_schedule(
        self,
        decisions: list,
        tardiness_tolerance_minutes: int = 0,
    ) -> tuple[float, bool]:
        """R_schedule: Heavily penalizes missed MPS milestones / tardiness to prevent reward hacking.

        Reward hacking occurs if agents turn off machines to save energy/carbon while delaying delivery.
        """
        total_tardiness_minutes = 0.0
        completed_or_on_track_count = 0
        is_reward_hacked = False

        for dec in decisions:
            slack = getattr(dec, "deadline_slack_minutes", 0)
            if slack < tardiness_tolerance_minutes:
                tardiness = abs(slack - tardiness_tolerance_minutes)
                total_tardiness_minutes += tardiness
            else:
                completed_or_on_track_count += 1

        if total_tardiness_minutes > 0:
            # Severe linear/exponential penalty to counter carbon/cost savings
            penalty = total_tardiness_minutes * self.tardiness_penalty_rate
            score = -min(20.0, penalty / 100.0)
            is_reward_hacked = True
        else:
            # Reward smooth milestone progress
            score = 1.0 + (completed_or_on_track_count * 0.1)

        return float(score), is_reward_hacked

    def calculate_r_worker(
        self,
        shift_type: ShiftType,
        ambient_noise_db: float,
        workstation_temp_c: float,
        is_handover: bool,
        high_decibel_active: bool,
    ) -> float:
        """R_worker: Penalizes high noise/vibration or unsafe thermal swings."""
        penalty = 0.0

        # 1. Noise check
        noise_limit = 70.0 if (shift_type == ShiftType.NIGHT or is_handover) else 85.0
        if ambient_noise_db > noise_limit:
            penalty += (ambient_noise_db - noise_limit) * 0.2

        # 2. Thermal comfort check (18 - 26 C band)
        if workstation_temp_c < 18.0:
            penalty += (18.0 - workstation_temp_c) * 0.25
        elif workstation_temp_c > 26.0:
            penalty += (workstation_temp_c - 26.0) * 0.25

        # 3. Handover safety check
        if is_handover and high_decibel_active:
            penalty += 1.5  # High risk safety violation during shift handover

        score = 1.0 - penalty
        return float(max(-5.0, min(1.5, score)))

    def score_trajectory(
        self,
        action_plan: CooperativeActionPlan,
        grid_draw_kw: float,
        carbon_intensity_gco2_kwh: float,
        tou_tariff_usd_kwh: float,
        ambient_noise_db: float,
        workstation_temp_c: float,
        is_handover: bool = False,
    ) -> RewardBreakdown:
        """Calculates total composite reward and provides full diagnostics."""
        r_carbon = self.calculate_r_carbon(grid_draw_kw, carbon_intensity_gco2_kwh)
        r_cost = self.calculate_r_cost(grid_draw_kw, tou_tariff_usd_kwh)
        r_schedule, is_hacked = self.calculate_r_schedule(action_plan.production_scheduling.decisions)
        r_worker = self.calculate_r_worker(
            shift_type=action_plan.ergonomics_shift.active_shift_profile,
            ambient_noise_db=ambient_noise_db,
            workstation_temp_c=workstation_temp_c,
            is_handover=is_handover,
            high_decibel_active=(ambient_noise_db > 75.0),
        )

        r_total = (
            self.w_carbon * r_carbon
            + self.w_cost * r_cost
            + self.w_schedule * r_schedule
            + self.w_worker * r_worker
        )

        return RewardBreakdown(
            r_carbon=round(r_carbon, 4),
            r_cost=round(r_cost, 4),
            r_schedule=round(r_schedule, 4),
            r_worker=round(r_worker, 4),
            r_total=round(r_total, 4),
            is_reward_hacked=is_hacked,
            diagnostics={
                "grid_draw_kw": grid_draw_kw,
                "ci_gco2_kwh": carbon_intensity_gco2_kwh,
                "tou_tariff_usd_kwh": tou_tariff_usd_kwh,
                "ambient_noise_db": ambient_noise_db,
                "workstation_temp_c": workstation_temp_c,
                "weights": {
                    "w1_carbon": self.w_carbon,
                    "w2_cost": self.w_cost,
                    "w3_schedule": self.w_schedule,
                    "w4_worker": self.w_worker,
                },
            },
        )
