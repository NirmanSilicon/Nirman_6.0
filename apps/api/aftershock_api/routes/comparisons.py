"""Comparison and scenario search endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from packages.domain.models import Intervention
from packages.scenario_search.searcher import search_high_impact_scenarios
from packages.scenario_search.monte_carlo import run_paired_monte_carlo
from packages.metrics.calculator import compare_runs, compute_run_metrics
from apps.api.aftershock_api.service import run_service

router = APIRouter(prefix="/api/v1", tags=["comparisons"])


class ScenarioSearchRequest(BaseModel):
    project_id: str = "DISTRICT-V1"
    scenario_id: str = "FLOOD-BASE-01"
    search_budget: int = 6
    seed: int = 42


class ComparisonRequest(BaseModel):
    project_id: str = "DISTRICT-V1"
    scenario_id: str = "FLOOD-BASE-01"
    seed: int = 1947
    interventions: list[Intervention] = Field(default_factory=list)


class MonteCarloRequest(BaseModel):
    project_id: str = "DISTRICT-V1"
    scenario_id: str = "FLOOD-BASE-01"
    seeds: list[int] = Field(default_factory=lambda: [101, 202, 303, 404, 505])
    interventions: list[Intervention] = Field(default_factory=list)


@router.post("/scenario-search")
async def search_scenarios(request: ScenarioSearchRequest):
    district = run_service.get_district(request.project_id)
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    scenario = run_service.get_scenario(request.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    candidates = search_high_impact_scenarios(
        district=district,
        base_scenario=scenario,
        search_budget=request.search_budget,
        search_seed=request.seed,
    )
    return {
        "search_seed": request.seed,
        "candidates": [c.model_dump() for c in candidates],
    }


@router.post("/comparisons")
async def run_comparison(request: ComparisonRequest):
    district = run_service.get_district(request.project_id)
    scenario = run_service.get_scenario(request.scenario_id)
    if not district or not scenario:
        raise HTTPException(status_code=404, detail="District or scenario not found")

    # 1. Baseline run
    base_rec = await run_service.create_run(
        project_id=request.project_id,
        scenario_id=request.scenario_id,
        seed=request.seed,
        interventions=[],
    )
    base_sim = run_service.active_simulators[base_rec.manifest.run_id]
    base_sim.run_all()
    base_metrics = compute_run_metrics(district, base_sim.history, base_sim.all_events, base_rec.manifest.run_id)
    await run_service.repo.complete_run(base_rec.manifest.run_id, base_metrics)

    # 2. Intervention run
    intv_rec = await run_service.create_run(
        project_id=request.project_id,
        scenario_id=request.scenario_id,
        seed=request.seed,
        interventions=request.interventions,
    )
    intv_sim = run_service.active_simulators[intv_rec.manifest.run_id]
    intv_sim.run_all()
    res_cost = sum(i.resource_cost for i in request.interventions)
    intv_metrics = compute_run_metrics(district, intv_sim.history, intv_sim.all_events, intv_rec.manifest.run_id, resources_consumed=res_cost)
    await run_service.repo.complete_run(intv_rec.manifest.run_id, intv_metrics)

    comparison_data = compare_runs(base_metrics, intv_metrics)
    comparison_id = f"COMP-{base_rec.manifest.run_id}-{intv_rec.manifest.run_id}"

    result = {
        "comparison_id": comparison_id,
        "baseline_run_id": base_rec.manifest.run_id,
        "intervention_run_id": intv_rec.manifest.run_id,
        "baseline_metrics": base_metrics.model_dump(),
        "intervention_metrics": intv_metrics.model_dump(),
        "comparison": comparison_data,
    }
    run_service.comparisons[comparison_id] = result
    return result


@router.get("/comparisons/{comparison_id}")
async def get_comparison(comparison_id: str):
    res = run_service.comparisons.get(comparison_id)
    if not res:
        raise HTTPException(status_code=404, detail="Comparison not found")
    return res


@router.post("/monte-carlo")
async def run_monte_carlo(request: MonteCarloRequest):
    district = run_service.get_district(request.project_id)
    scenario = run_service.get_scenario(request.scenario_id)
    if not district or not scenario:
        raise HTTPException(status_code=404, detail="District or scenario not found")

    res = run_paired_monte_carlo(
        district=district,
        scenario=scenario,
        interventions=request.interventions,
        seeds=request.seeds,
    )
    return res.model_dump()
