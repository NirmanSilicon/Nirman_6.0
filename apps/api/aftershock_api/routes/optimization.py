"""Defense and recovery optimization endpoints."""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from packages.domain.enums import InterventionType
from packages.domain.models import Intervention
from packages.optimization.solver import (
    CandidateAction,
    ResourcePool,
    solve_cpsat_interventions,
    solve_greedy_interventions,
)
from apps.api.aftershock_api.service import run_service

router = APIRouter(prefix="/api/v1/optimization", tags=["optimization"])


class OptimizeDefenceRequest(BaseModel):
    project_id: str = "DISTRICT-V1"
    resources: ResourcePool = Field(default_factory=ResourcePool)
    use_exact_search: bool = False


@router.post("/defence")
async def optimize_defence(request: OptimizeDefenceRequest):
    district = run_service.get_district(request.project_id)
    candidates: list[CandidateAction] = []

    # Generate candidate catalog based on district assets
    if district:
        for a in district.assets:
            if a.asset_id in ("P-01", "P-02"):
                candidates.append(
                    CandidateAction(
                        action_id=f"ACT-PROTECT-{a.asset_id}",
                        intervention=Intervention(
                            intervention_id=f"INT-PROT-{a.asset_id}",
                            type=InterventionType.PROTECT_ASSET,
                            target_asset_id=a.asset_id,
                            start_tick=0,
                            duration_ticks=60,
                            resource_cost=3,
                            effect={"protection_factor": 0.5},
                        ),
                        cost=3,
                        generators_required=0,
                        pumps_required=0,
                        crews_required=1,
                        estimated_benefit=a.criticality_weight * 1.5,
                    )
                )
            if a.asset_id in ("W-01", "W-02"):
                candidates.append(
                    CandidateAction(
                        action_id=f"ACT-DEPLOY-PUMP-{a.asset_id}",
                        intervention=Intervention(
                            intervention_id=f"INT-PUMP-{a.asset_id}",
                            type=InterventionType.DEPLOY_BACKUP,
                            target_asset_id=a.asset_id,
                            start_tick=0,
                            duration_ticks=60,
                            resource_cost=2,
                            effect={"inventory": 24.0, "max_output": 1.0},
                        ),
                        cost=2,
                        generators_required=1,
                        pumps_required=1,
                        crews_required=0,
                        estimated_benefit=a.criticality_weight * 1.2,
                    )
                )
            if a.asset_id in ("H-01", "H-02"):
                candidates.append(
                    CandidateAction(
                        action_id=f"ACT-DEPLOY-GEN-{a.asset_id}",
                        intervention=Intervention(
                            intervention_id=f"INT-GEN-{a.asset_id}",
                            type=InterventionType.DEPLOY_BACKUP,
                            target_asset_id=a.asset_id,
                            start_tick=0,
                            duration_ticks=60,
                            resource_cost=4,
                            effect={"inventory": 40.0, "max_output": 1.0},
                        ),
                        cost=4,
                        generators_required=1,
                        pumps_required=0,
                        crews_required=1,
                        estimated_benefit=a.criticality_weight * 2.0,
                    )
                )

    # Solve via CP-SAT
    cpsat_res = solve_cpsat_interventions(candidates, request.resources)
    greedy_res = solve_greedy_interventions(candidates, request.resources)

    return {
        "solver": "CP-SAT",
        "solver_status": cpsat_res.status,
        "is_optimal": cpsat_res.is_optimal,
        "selected_actions": cpsat_res.selected_action_ids,
        "interventions": [i.model_dump() for i in cpsat_res.selected_interventions],
        "total_cost": cpsat_res.total_cost,
        "resources_used": {
            "generators": cpsat_res.generators_used,
            "crews": cpsat_res.crews_used,
            "pumps": cpsat_res.pumps_used,
        },
        "greedy_comparison": {
            "status": greedy_res.status,
            "selected_actions": greedy_res.selected_action_ids,
            "total_cost": greedy_res.total_cost,
        },
        "all_candidates": [c.model_dump() for c in candidates],
    }


@router.post("/recovery")
async def optimize_recovery(request: OptimizeDefenceRequest):
    district = run_service.get_district(request.project_id)
    candidates = []
    if district:
        for a in district.assets:
            if a.is_critical or a.asset_id.startswith(("P-", "W-", "H-", "R-")):
                candidates.append(
                    CandidateAction(
                        action_id=f"REPAIR-{a.asset_id}",
                        intervention=Intervention(
                            intervention_id=f"INT-REP-{a.asset_id}",
                            type=InterventionType.REPAIR_ASSET,
                            target_asset_id=a.asset_id,
                            start_tick=5,
                            duration_ticks=10,
                            resource_cost=2,
                            effect={"repair_rate": 0.5},
                        ),
                        cost=2,
                        crews_required=1,
                        estimated_benefit=a.criticality_weight * 1.8,
                    )
                )
    res = solve_cpsat_interventions(candidates, request.resources)
    return {
        "solver_status": res.status,
        "is_optimal": res.is_optimal,
        "schedule": [
            {
                "asset_id": i.target_asset_id,
                "start_tick": i.start_tick,
                "duration_ticks": i.duration_ticks,
                "crews": 1,
            }
            for i in res.selected_interventions
        ],
    }
