"""Paired Monte Carlo uncertainty analysis."""
from __future__ import annotations

import numpy as np
from pydantic import BaseModel

from packages.domain.models import DistrictModel, Intervention, Scenario
from packages.simulation.kernel import Simulator
from packages.metrics.calculator import compute_run_metrics, compare_runs


class PairedMonteCarloResult(BaseModel):
    draw_set_id: str
    seeds: list[int]
    num_runs: int
    mean_baseline_nwsl: float
    mean_intervention_nwsl: float
    mean_absolute_improvement: float
    std_improvement: float
    p10_improvement: float
    p50_improvement: float
    p90_improvement: float
    mean_cascade_reduction: float
    runs: list[dict]


def run_paired_monte_carlo(
    district: DistrictModel,
    scenario: Scenario,
    interventions: list[Intervention],
    seeds: list[int],
    draw_set_id: str = "DRAWSET-001",
) -> PairedMonteCarloResult:
    """
    Run paired uncertainty simulations across matching random seeds.
    Guarantees baseline and intervention experience identical random draws.
    """
    pair_runs = []
    abs_improvements = []
    cascade_reductions = []
    base_nwsls = []
    interv_nwsls = []

    for seed in seeds:
        # 1. Baseline run (no interventions)
        base_sim = Simulator(
            district=district,
            scenario=scenario,
            interventions=[],
            seed=seed,
            run_id=f"MC-BASE-{seed}",
        )
        base_sim.run_all()
        base_metrics = compute_run_metrics(
            district=district,
            history=base_sim.history,
            events=base_sim.all_events,
            run_id=base_sim.run_id,
        )

        # 2. Intervention run
        interv_sim = Simulator(
            district=district,
            scenario=scenario,
            interventions=interventions,
            seed=seed,
            run_id=f"MC-INTV-{seed}",
        )
        interv_sim.run_all()
        interv_metrics = compute_run_metrics(
            district=district,
            history=interv_sim.history,
            events=interv_sim.all_events,
            run_id=interv_sim.run_id,
        )

        diff = compare_runs(base_metrics, interv_metrics)
        base_nwsls.append(base_metrics.normalized_weighted_service_loss)
        interv_nwsls.append(interv_metrics.normalized_weighted_service_loss)
        abs_improvements.append(diff["absolute_nwsl_improvement"])
        cascade_reductions.append(diff["cascade_reduction"])

        pair_runs.append({
            "seed": seed,
            "baseline_nwsl": base_metrics.normalized_weighted_service_loss,
            "intervention_nwsl": interv_metrics.normalized_weighted_service_loss,
            "absolute_improvement": diff["absolute_nwsl_improvement"],
            "relative_improvement": diff["relative_nwsl_improvement"],
            "cascade_reduction": diff["cascade_reduction"],
        })

    arr_imp = np.array(abs_improvements)
    return PairedMonteCarloResult(
        draw_set_id=draw_set_id,
        seeds=seeds,
        num_runs=len(seeds),
        mean_baseline_nwsl=round(float(np.mean(base_nwsls)), 4),
        mean_intervention_nwsl=round(float(np.mean(interv_nwsls)), 4),
        mean_absolute_improvement=round(float(np.mean(arr_imp)), 4),
        std_improvement=round(float(np.std(arr_imp)), 4),
        p10_improvement=round(float(np.percentile(arr_imp, 10)), 4),
        p50_improvement=round(float(np.percentile(arr_imp, 50)), 4),
        p90_improvement=round(float(np.percentile(arr_imp, 90)), 4),
        mean_cascade_reduction=round(float(np.mean(cascade_reductions)), 2),
        runs=pair_runs,
    )
