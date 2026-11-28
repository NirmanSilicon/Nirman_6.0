"""Unit tests for metrics and optimization."""
from packages.domain.enums import InterventionType
from packages.domain.models import Intervention
from packages.optimization.solver import (
    CandidateAction,
    ResourcePool,
    solve_cpsat_interventions,
    solve_greedy_interventions,
)


def test_cpsat_resource_constraints_enforced():
    candidates = [
        CandidateAction(
            action_id="ACT-01",
            intervention=Intervention(
                intervention_id="INT-01",
                type=InterventionType.PROTECT_ASSET,
                target_asset_id="P-01",
            ),
            cost=5,
            generators_required=1,
            estimated_benefit=10.0,
        ),
        CandidateAction(
            action_id="ACT-02",
            intervention=Intervention(
                intervention_id="INT-02",
                type=InterventionType.DEPLOY_BACKUP,
                target_asset_id="W-01",
            ),
            cost=6,
            generators_required=1,
            estimated_benefit=8.0,
        ),
        CandidateAction(
            action_id="ACT-03",
            intervention=Intervention(
                intervention_id="INT-03",
                type=InterventionType.DEPLOY_BACKUP,
                target_asset_id="H-01",
            ),
            cost=4,
            generators_required=1,
            estimated_benefit=5.0,
        ),
    ]

    # Budget is 10, generators is 1 -> only 1 action can be chosen even if budget allows 2
    resources = ResourcePool(
        budget_units=10,
        mobile_generators=1,
        temporary_pumps=0,
        repair_crews=0,
    )

    result = solve_cpsat_interventions(candidates, resources)
    assert result.status in ("OPTIMAL", "FEASIBLE")
    assert result.generators_used <= 1
    assert result.total_cost <= 10
    # Best single action is ACT-01 with benefit 10.0
    assert "ACT-01" in result.selected_action_ids
    assert len(result.selected_action_ids) == 1
