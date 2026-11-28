"""Resource-constrained optimization using Google OR-Tools CP-SAT and exact search."""
from __future__ import annotations

from typing import Any, Callable, Optional
from ortools.sat.python import cp_model
from pydantic import BaseModel, Field

from packages.domain.enums import InterventionType
from packages.domain.models import Intervention


class ResourcePool(BaseModel):
    repair_crews: int = Field(default=2, ge=0)
    mobile_generators: int = Field(default=2, ge=0)
    temporary_pumps: int = Field(default=1, ge=0)
    budget_units: int = Field(default=10, ge=0)


class CandidateAction(BaseModel):
    action_id: str
    intervention: Intervention
    cost: int = 1
    generators_required: int = 0
    pumps_required: int = 0
    crews_required: int = 0
    estimated_benefit: float = 1.0


class OptimizationResult(BaseModel):
    status: str  # OPTIMAL, FEASIBLE, INFEASIBLE, UNKNOWN
    is_optimal: bool
    selected_action_ids: list[str]
    selected_interventions: list[Intervention]
    total_cost: int
    generators_used: int
    crews_used: int
    pumps_used: int
    solver_time_seconds: float


def solve_cpsat_interventions(
    candidates: list[CandidateAction],
    resources: ResourcePool,
    max_time_seconds: float = 3.0,
) -> OptimizationResult:
    """
    Solve integer-constrained intervention selection using CP-SAT.
    Strictly preserves status: OPTIMAL vs FEASIBLE vs INFEASIBLE.
    """
    model = cp_model.CpModel()

    choose_vars = {
        action.action_id: model.new_bool_var(f"choose_{action.action_id}")
        for action in candidates
    }

    # Budget constraint
    model.add(
        sum(action.cost * choose_vars[action.action_id] for action in candidates)
        <= resources.budget_units
    )

    # Generators constraint
    model.add(
        sum(action.generators_required * choose_vars[action.action_id] for action in candidates)
        <= resources.mobile_generators
    )

    # Pumps constraint
    model.add(
        sum(action.pumps_required * choose_vars[action.action_id] for action in candidates)
        <= resources.temporary_pumps
    )

    # Repair crews constraint
    model.add(
        sum(action.crews_required * choose_vars[action.action_id] for action in candidates)
        <= resources.repair_crews
    )

    # Maximize integer-scaled estimated benefit
    model.maximize(
        sum(
            int(round(action.estimated_benefit * 1000)) * choose_vars[action.action_id]
            for action in candidates
        )
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max_time_seconds
    status_int = solver.solve(model)
    status_name = solver.status_name(status_int)

    selected_ids: list[str] = []
    selected_interventions: list[Intervention] = []
    total_cost = 0
    gen_used = 0
    crews_used = 0
    pumps_used = 0

    if status_int in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for action in candidates:
            if solver.value(choose_vars[action.action_id]) == 1:
                selected_ids.append(action.action_id)
                selected_interventions.append(action.intervention)
                total_cost += action.cost
                gen_used += action.generators_required
                crews_used += action.crews_required
                pumps_used += action.pumps_required

    return OptimizationResult(
        status=status_name,
        is_optimal=(status_int == cp_model.OPTIMAL),
        selected_action_ids=selected_ids,
        selected_interventions=selected_interventions,
        total_cost=total_cost,
        generators_used=gen_used,
        crews_used=crews_used,
        pumps_used=pumps_used,
        solver_time_seconds=round(solver.wall_time, 4),
    )


def solve_greedy_interventions(
    candidates: list[CandidateAction],
    resources: ResourcePool,
) -> OptimizationResult:
    """Greedy baseline sorting by estimated_benefit / cost."""
    sorted_candidates = sorted(
        candidates,
        key=lambda c: (c.estimated_benefit / max(1, c.cost)),
        reverse=True,
    )

    selected_ids = []
    selected_interventions = []
    budget_rem = resources.budget_units
    gen_rem = resources.mobile_generators
    pumps_rem = resources.temporary_pumps
    crews_rem = resources.repair_crews

    total_cost = 0
    gen_used = 0
    crews_used = 0
    pumps_used = 0

    for action in sorted_candidates:
        if (
            action.cost <= budget_rem
            and action.generators_required <= gen_rem
            and action.pumps_required <= pumps_rem
            and action.crews_required <= crews_rem
        ):
            selected_ids.append(action.action_id)
            selected_interventions.append(action.intervention)
            budget_rem -= action.cost
            gen_rem -= action.generators_required
            pumps_rem -= action.pumps_required
            crews_rem -= action.crews_required

            total_cost += action.cost
            gen_used += action.generators_required
            pumps_used += action.pumps_required
            crews_used += action.crews_required

    return OptimizationResult(
        status="GREEDY_HEURISTIC",
        is_optimal=False,
        selected_action_ids=selected_ids,
        selected_interventions=selected_interventions,
        total_cost=total_cost,
        generators_used=gen_used,
        crews_used=crews_used,
        pumps_used=pumps_used,
        solver_time_seconds=0.001,
    )
