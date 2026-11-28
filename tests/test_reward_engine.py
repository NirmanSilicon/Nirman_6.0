"""Unit tests for Dec-POMDP composite reward formulation and anti-reward hacking."""

import pytest
from src.models.reward_scorer import DecPOMDPRewardScorer
from src.models.schemas import (
    CooperativeActionPlan,
    MachineScheduleDecision,
    ProductionSchedulingAction,
    ShiftType,
)
from src.orchestrator.guardrails import SafeBaselineSetpoints
from src.orchestrator.reward_engine import OrchestratorRewardEngine
from src.orchestrator.state import FactoryState, WorkOrder


def test_reward_scorer_anti_reward_hacking():
    """Anti-Reward-Hacking: Missed deadlines / tardiness must incur heavy negative penalty."""
    scorer = DecPOMDPRewardScorer(tardiness_penalty_rate=50.0)

    # 1. On-time scenario: slack > 0
    on_time_decisions = [
        MachineScheduleDecision(
            machine_id="CNC_01",
            deadline_slack_minutes=45,
        )
    ]
    r_sched_ontime, hacked_ontime = scorer.calculate_r_schedule(on_time_decisions)
    assert hacked_ontime is False
    assert r_sched_ontime > 0.0

    # 2. Tardy scenario: slack = -30 minutes
    tardy_decisions = [
        MachineScheduleDecision(
            machine_id="CNC_01",
            deadline_slack_minutes=-30,  # 30 minutes late!
        )
    ]
    r_sched_tardy, hacked_tardy = scorer.calculate_r_schedule(tardy_decisions)
    assert hacked_tardy is True
    # Penalty: 30 * 50 = 1500 -> score = -15.0
    assert r_sched_tardy < -5.0


def test_composite_reward_weighting():
    """Verify that R_total adheres strictly to composite weighting."""
    scorer = DecPOMDPRewardScorer(w_carbon=0.35, w_cost=0.30, w_schedule=0.25, w_worker=0.10)

    r_c = scorer.calculate_r_carbon(grid_draw_kw=300.0, carbon_intensity_gco2_kwh=200.0)
    r_cost = scorer.calculate_r_cost(grid_draw_kw=300.0, tou_tariff_usd_kwh=0.10)
    r_s, _ = scorer.calculate_r_schedule([MachineScheduleDecision(machine_id="M1", deadline_slack_minutes=60)])
    r_w = scorer.calculate_r_worker(ShiftType.DAY, ambient_noise_db=72.0, workstation_temp_c=22.0, is_handover=False, high_decibel_active=False)

    expected_total = (0.35 * r_c) + (0.30 * r_cost) + (0.25 * r_s) + (0.10 * r_w)
    plan = CooperativeActionPlan(
        tick_id="test_weights",
        grid_carbon=SafeBaselineSetpoints.get_fallback_grid_carbon(),
        microgrid_storage=SafeBaselineSetpoints.get_fallback_microgrid_storage(50.0),
        production_scheduling=ProductionSchedulingAction(
            decisions=[MachineScheduleDecision(machine_id="M1", deadline_slack_minutes=60)],
            total_scheduled_load_kw=40.0,
            reasoning="test",
        ),
        ergonomics_shift=SafeBaselineSetpoints.get_fallback_ergonomics_shift(ShiftType.DAY),
    )

    breakdown = scorer.score_trajectory(
        action_plan=plan,
        grid_draw_kw=300.0,
        carbon_intensity_gco2_kwh=200.0,
        tou_tariff_usd_kwh=0.10,
        ambient_noise_db=72.0,
        workstation_temp_c=22.0,
    )

    assert abs(breakdown.r_total - expected_total) < 1e-3


def test_reward_engine_rolling_kpis(sample_factory_state):
    """Verify rolling KPIs, emissions saved, and history logging in reward engine."""
    engine = OrchestratorRewardEngine()

    plan = CooperativeActionPlan(
        tick_id="tick_kpi_01",
        grid_carbon=SafeBaselineSetpoints.get_fallback_grid_carbon(),
        microgrid_storage=SafeBaselineSetpoints.get_fallback_microgrid_storage(50.0),
        production_scheduling=SafeBaselineSetpoints.get_fallback_production_scheduling(sample_factory_state),
        ergonomics_shift=SafeBaselineSetpoints.get_fallback_ergonomics_shift(ShiftType.DAY),
    )

    breakdown = engine.evaluate_tick(plan, sample_factory_state)
    assert engine.kpis.total_ticks == 1
    assert engine.kpis.total_emissions_saved_kg > 0.0
    assert len(engine.history) == 1
    assert engine.history[0]["tick_id"] == "tick_kpi_01"
