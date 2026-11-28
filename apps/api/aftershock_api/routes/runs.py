"""Simulation Run lifecycle and retrieval endpoints."""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from packages.domain.models import Intervention
from packages.graph.builder import InvalidModelError
from apps.api.aftershock_api.service import run_service

router = APIRouter(prefix="/api/v1/runs", tags=["runs"])


class CreateRunRequest(BaseModel):
    project_id: str = "DISTRICT-V1"
    scenario_id: str = "FLOOD-BASE-01"
    seed: Optional[int] = None
    interventions: list[Intervention] = Field(default_factory=list)
    run_id: Optional[str] = None


@router.get("")
async def list_runs():
    runs = await run_service.repo.list_runs()
    return [
        {
            "run_id": r.manifest.run_id,
            "project_id": r.manifest.project_id,
            "scenario_id": r.manifest.scenario_id,
            "status": r.status,
            "seed": r.manifest.seed,
            "events_count": len(r.events),
            "metrics": r.metrics.model_dump() if r.metrics else None,
        }
        for r in runs
    ]


@router.post("")
async def create_run(request: CreateRunRequest):
    try:
        record = await run_service.create_run(
            project_id=request.project_id,
            scenario_id=request.scenario_id,
            seed=request.seed,
            interventions=request.interventions,
            run_id=request.run_id,
        )
        return {
            "run_id": record.manifest.run_id,
            "status": record.status,
            "manifest": record.manifest.model_dump(),
        }
    except InvalidModelError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/{run_id}")
async def get_run(run_id: str):
    record = await run_service.repo.get_run(run_id)
    if not record:
        raise HTTPException(status_code=404, detail="Run not found")
    return {
        "run_id": record.manifest.run_id,
        "status": record.status,
        "manifest": record.manifest.model_dump(),
        "metrics": record.metrics.model_dump() if record.metrics else None,
    }


@router.post("/{run_id}/start")
async def start_run(run_id: str, tick_delay: float = 0.02):
    record = await run_service.repo.get_run(run_id)
    if not record:
        raise HTTPException(status_code=404, detail="Run not found")
    run_service.start_background_run(run_id, tick_delay=tick_delay)
    return {"run_id": run_id, "status": "started"}


@router.post("/{run_id}/step")
async def step_run(run_id: str):
    step_data = await run_service.step_single_tick(run_id)
    if step_data is None:
        raise HTTPException(status_code=400, detail="Cannot step: run finished or not found")
    return step_data


@router.post("/{run_id}/cancel")
async def cancel_run(run_id: str):
    task = run_service.active_tasks.get(run_id)
    if task and not task.done():
        task.cancel()
    await run_service.repo.update_status(run_id, "cancelled")
    return {"run_id": run_id, "status": "cancelled"}


@router.get("/{run_id}/snapshot")
async def get_snapshot(run_id: str, tick: Optional[int] = Query(None)):
    snapshot = await run_service.repo.get_snapshot(run_id, tick)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snapshot.model_dump()


@router.get("/{run_id}/events")
async def get_events(
    run_id: str,
    from_sequence: Optional[int] = Query(None),
    to_sequence: Optional[int] = Query(None),
):
    events = await run_service.repo.get_events(run_id, from_sequence, to_sequence)
    return [e.model_dump() for e in events]


@router.get("/{run_id}/metrics")
async def get_metrics(run_id: str):
    record = await run_service.repo.get_run(run_id)
    if not record or not record.metrics:
        # Check if active simulation can compute metrics now
        sim = run_service.active_simulators.get(run_id)
        if sim and record:
            district = run_service.get_district(record.manifest.project_id)
            from packages.metrics.calculator import compute_run_metrics
            metrics = compute_run_metrics(district, sim.history, sim.all_events, run_id)
            return metrics.model_dump()
        raise HTTPException(status_code=404, detail="Metrics not available")
    return record.metrics.model_dump()


@router.get("/{run_id}/causal-chain")
async def get_causal_chain(run_id: str, asset_id: Optional[str] = Query(None)):
    """Reconstruct causal chain of events leading up to asset degradation."""
    record = await run_service.repo.get_run(run_id)
    if not record:
        raise HTTPException(status_code=404, detail="Run not found")

    events = record.events
    events_by_id = {e.event_id: e for e in events}

    if asset_id:
        target_events = [e for e in events if e.asset_id == asset_id]
        if not target_events:
            return {"asset_id": asset_id, "chains": []}

        # Backtrack parents
        chains = []
        for tgt in target_events:
            chain = [tgt.model_dump()]
            current = tgt
            visited = set([tgt.event_id])
            while current.parent_event_ids:
                pid = current.parent_event_ids[0]
                if pid in visited or pid not in events_by_id:
                    break
                visited.add(pid)
                parent_ev = events_by_id[pid]
                chain.insert(0, parent_ev.model_dump())
                current = parent_ev
            chains.append(chain)
        return {"asset_id": asset_id, "chains": chains}

    # Return summary of top causal failures
    return {
        "all_chains": [
            e.model_dump() for e in events if e.event_type in ("direct_damage", "backup_depleted", "asset_degraded", "asset_unavailable")
        ]
    }
