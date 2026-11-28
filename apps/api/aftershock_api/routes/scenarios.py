"""Scenario management endpoints."""
from fastapi import APIRouter, HTTPException
from packages.domain.models import Scenario
from apps.api.aftershock_api.service import run_service

router = APIRouter(prefix="/api/v1/scenarios", tags=["scenarios"])


@router.get("")
async def list_scenarios():
    return list(run_service.scenarios.values())


@router.post("")
async def create_scenario(scenario: Scenario):
    run_service.scenarios[scenario.scenario_id] = scenario
    return {"scenario_id": scenario.scenario_id, "status": "registered"}


@router.get("/{scenario_id}")
async def get_scenario(scenario_id: str):
    scen = run_service.get_scenario(scenario_id)
    if not scen:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scen
