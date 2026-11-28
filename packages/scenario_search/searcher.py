"""Stress-testing scenario search agent."""
from __future__ import annotations

import uuid
from typing import Optional
import numpy as np
from pydantic import BaseModel

from packages.domain.models import DistrictModel, FloodSource, Scenario
from packages.simulation.kernel import Simulator
from packages.metrics.calculator import compute_run_metrics


class ScenarioCandidate(BaseModel):
    candidate_id: str
    scenario: Scenario
    impact_nwsl: float
    cascade_size: int
    eval_seed: int


def search_high_impact_scenarios(
    district: DistrictModel,
    base_scenario: Scenario,
    search_budget: int = 10,
    search_seed: int = 42,
    x_range: tuple[float, float] = (5.0, 75.0),
    y_range: tuple[float, float] = (5.0, 75.0),
    radius_range: tuple[float, float] = (10.0, 30.0),
    intensity_range: tuple[float, float] = (0.5, 1.0),
) -> list[ScenarioCandidate]:
    """
    Search for high-impact synthetic flood scenarios.
    Uses reproducible random parameter exploration and ranks by NWSL.
    """
    rng = np.random.default_rng(search_seed)
    candidates: list[ScenarioCandidate] = []

    for i in range(search_budget):
        cx = float(rng.uniform(*x_range))
        cy = float(rng.uniform(*y_range))
        rad = float(rng.uniform(*radius_range))
        intensity = float(rng.uniform(*intensity_range))
        start_t = int(rng.integers(1, 10))
        peak_t = start_t + int(rng.integers(5, 15))
        end_t = peak_t + int(rng.integers(15, 35))

        test_source = FloodSource(
            center_x=round(cx, 1),
            center_y=round(cy, 1),
            radius=round(rad, 1),
            peak_intensity=round(intensity, 2),
            start_tick=start_t,
            peak_tick=peak_t,
            end_tick=end_t,
        )

        cand_scenario = Scenario(
            scenario_id=f"SCEN-CAND-{i+1:03d}",
            name=f"Stress Test Candidate #{i+1} (x={cx:.1f}, y={cy:.1f})",
            hazard_type="synthetic_flood",
            flood_sources=[test_source],
            seed=base_scenario.seed,
            horizon_ticks=min(60, base_scenario.horizon_ticks),
            tick_seconds=base_scenario.tick_seconds,
        )

        # Run simulator
        sim = Simulator(
            district=district,
            scenario=cand_scenario,
            seed=base_scenario.seed,
            run_id=f"SEARCH-RUN-{i+1}",
        )
        sim.run_all()

        metrics = compute_run_metrics(
            district=district,
            history=sim.history,
            events=sim.all_events,
            run_id=sim.run_id,
        )

        candidates.append(
            ScenarioCandidate(
                candidate_id=f"CAND-{i+1:03d}",
                scenario=cand_scenario,
                impact_nwsl=metrics.normalized_weighted_service_loss,
                cascade_size=metrics.cascade_size,
                eval_seed=base_scenario.seed,
            )
        )

    # Rank highest impact first
    candidates.sort(key=lambda c: c.impact_nwsl, reverse=True)
    return candidates
