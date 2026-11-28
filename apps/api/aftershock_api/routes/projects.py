"""Projects and District endpoints."""
from fastapi import APIRouter, HTTPException
from packages.domain.models import DistrictModel
from packages.graph.builder import build_graph, InvalidModelError
from packages.graph.validator import compute_graph_metrics, validate_model
from apps.api.aftershock_api.service import run_service

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


@router.get("")
async def list_projects():
    return [
        {
            "project_id": d.project_id,
            "name": d.name,
            "asset_count": len(d.assets),
            "dependency_count": len(d.dependencies),
        }
        for d in run_service.districts.values()
    ]


@router.post("")
async def create_project(district: DistrictModel):
    try:
        validate_model(district)
    except InvalidModelError as e:
        raise HTTPException(status_code=422, detail=str(e))
    run_service.districts[district.project_id] = district
    return {"project_id": district.project_id, "status": "loaded"}


@router.get("/{project_id}/assets")
async def get_project_assets(project_id: str):
    district = run_service.get_district(project_id)
    if not district:
        raise HTTPException(status_code=404, detail="Project not found")
    return district.assets


@router.get("/{project_id}/dependencies")
async def get_project_dependencies(project_id: str):
    district = run_service.get_district(project_id)
    if not district:
        raise HTTPException(status_code=404, detail="Project not found")
    return district.dependencies


@router.get("/{project_id}/graph")
async def get_project_graph(project_id: str):
    district = run_service.get_district(project_id)
    if not district:
        raise HTTPException(status_code=404, detail="Project not found")
    g = build_graph(district.assets, district.dependencies)
    metrics = compute_graph_metrics(g)
    return {
        "nodes": [
            {
                "id": a.asset_id,
                "name": a.name,
                "type": a.asset_type,
                "position": a.position.model_dump(),
                "criticality": a.criticality_weight,
                "is_critical": a.is_critical,
                "metrics": metrics.get(a.asset_id, {}),
            }
            for a in district.assets
        ],
        "edges": [
            {
                "id": d.dependency_id,
                "source": d.source_asset_id,
                "target": d.target_asset_id,
                "type": d.dependency_type,
                "mode": d.mode,
                "required_fraction": d.required_fraction,
                "latency_ticks": d.latency_ticks,
                "grace_ticks": d.grace_ticks,
            }
            for d in district.dependencies
        ],
    }
