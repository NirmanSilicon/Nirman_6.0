"""FastAPI API routes for VidyutSync."""

import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from src.api.schemas import (
    HealthResponse,
    TelemetryIngestRequest,
    WorkOrderCreateRequest,
    OrchestrationTickRequest,
    ModeSwitchRequest,
    OperatorOverrideRequest,
    MetricsSummaryResponse,
)
from src.api.websockets import ws_manager
from src.orchestrator.engine import VidyutSyncOrchestrator
from src.orchestrator.state import WorkOrder
from src.connectors.database import TimescaleRepository
from src.connectors.mqtt_bus import MQTTBusConnector

router = APIRouter(prefix="/api/v1")

# Global singleton dependencies injected on startup
orchestrator: VidyutSyncOrchestrator | None = None
repository: TimescaleRepository | None = None
mqtt_bus: MQTTBusConnector | None = None


def set_dependencies(orch: VidyutSyncOrchestrator, repo: TimescaleRepository, mqtt: MQTTBusConnector):
    global orchestrator, repository, mqtt_bus
    orchestrator = orch
    repository = repo
    mqtt_bus = mqtt


@router.get("/health", response_model=HealthResponse)
async def get_health():
    """Liveness & readiness probe."""
    timescale_up = repository._is_connected if repository else False
    mqtt_up = mqtt_bus._is_connected if mqtt_bus else False
    mode = orchestrator.mode if orchestrator else "unknown"

    return HealthResponse(
        status="healthy",
        version="0.1.0",
        mode=mode,
        timescale_connected=timescale_up,
        mqtt_connected=mqtt_up,
    )


@router.post("/telemetry")
async def ingest_telemetry(payload: TelemetryIngestRequest):
    """Ingests external telemetry packet from sensors or edge devices."""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not ready")

    # Map to internal telemetry field if applicable
    metric_map = {
        "carbon_intensity": "grid_carbon_intensity_gco2",
        "tou_tariff": "grid_tou_tariff_usd_kwh",
        "solar_ghi": "solar_irradiance_ghi",
        "pv_power": "pv_generation_kw",
        "bess_soc": "bess_soc_pct",
        "ambient_noise": "ambient_noise_db",
        "ambient_temp": "factory_ambient_temp_c",
        "oven_temp": "thermal_oven_temp_c",
    }
    field_name = metric_map.get(payload.metric, payload.metric)
    orchestrator.update_telemetry({field_name: payload.value})

    # Persist in TimescaleDB
    if repository:
        await repository.record_telemetry(
            asset_id=payload.asset_id,
            metric=payload.metric,
            value=payload.value,
            unit=payload.unit,
            dt=payload.timestamp or datetime.utcnow(),
        )

    # Broadcast via MQTT
    if mqtt_bus:
        mqtt_bus.publish_telemetry(payload.asset_id, payload.model_dump())

    return {"status": "ingested", "metric": payload.metric, "value": payload.value}


@router.post("/workorders")
async def create_work_order(req: WorkOrderCreateRequest):
    """Submits a new ERP work order into the active queue."""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not ready")

    order = WorkOrder(
        order_id=req.order_id,
        machine_id=req.machine_id,
        part_type=req.part_type,
        duration_minutes=req.duration_minutes,
        deadline_utc=req.deadline_utc,
        priority=req.priority,
        nominal_power_kw=req.nominal_power_kw,
        preheat_required=req.preheat_required,
    )
    orchestrator.add_work_order(order)
    return {"status": "created", "order_id": req.order_id}


@router.post("/orchestrator/tick")
async def trigger_tick(req: OrchestrationTickRequest | None = None):
    """Triggers an instantaneous Dec-POMDP negotiation tick."""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not ready")

    override = req.state_override if req else None
    result = orchestrator.execute_tick(state_override=override)

    # Persist decisions and rewards to TimescaleDB
    if repository:
        for agent_name, action_data in result["actions"].items():
            await repository.record_decision(
                tick_id=result["tick_id"],
                agent_name=agent_name,
                action_payload=action_data,
                passed_guardrails=result["passed_guardrails"],
                modifications=result["guardrail_corrections"],
                mode=result["mode"],
            )

        r = result["rewards"]
        await repository.record_reward(
            tick_id=result["tick_id"],
            r_carbon=r["r_carbon"],
            r_cost=r["r_cost"],
            r_schedule=r["r_schedule"],
            r_worker=r["r_worker"],
            r_total=r["r_total"],
        )

    # If live_pilot mode, publish control setpoints over MQTT
    if orchestrator.mode == "live_pilot" and mqtt_bus:
        bess_action = result["actions"]["microgrid_storage"]
        mqtt_bus.publish_control_setpoint("bess", {
            "charge_discharge_kw": bess_action["bess_charge_discharge_kw"],
            "target_soc": bess_action["target_soc_pct"],
        })

        for dec in result["actions"]["production_scheduling"]["decisions"]:
            mqtt_bus.publish_control_setpoint(dec["machine_id"], {
                "action": dec["action"],
                "spindle_speed_pct": dec["spindle_speed_pct"],
            })

    # Broadcast to WebSocket dashboard
    asyncio.create_task(ws_manager.broadcast(result))

    return result


@router.get("/orchestrator/status")
async def get_status():
    """Returns current factory telemetry, mode, active orders, and overrides."""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not ready")

    return {
        "mode": orchestrator.mode,
        "timestamp": orchestrator.state.timestamp.isoformat(),
        "telemetry": {
            "grid_ci": orchestrator.state.grid_carbon_intensity_gco2,
            "tou_tariff": orchestrator.state.grid_tou_tariff_usd_kwh,
            "bess_soc": orchestrator.state.bess_soc_pct,
            "pv_generation_kw": orchestrator.state.pv_generation_kw,
            "ambient_noise_db": orchestrator.state.ambient_noise_db,
            "ambient_temp_c": orchestrator.state.factory_ambient_temp_c,
            "current_shift": orchestrator.state.current_shift.value,
        },
        "active_orders": [o.model_dump() for o in orchestrator.state.active_orders],
        "active_overrides": orchestrator.state.active_operator_overrides,
        "kpis": {
            "total_ticks": orchestrator.reward_engine.kpis.total_ticks,
            "total_reward": round(orchestrator.reward_engine.kpis.total_reward, 3),
            "total_emissions_saved_kg": round(orchestrator.reward_engine.kpis.total_emissions_saved_kg, 2),
            "total_cost_saved_usd": round(orchestrator.reward_engine.kpis.total_cost_saved_usd, 2),
            "reward_hacking_detected": orchestrator.reward_engine.kpis.reward_hacking_detected_count,
            "guardrail_interventions": orchestrator.reward_engine.kpis.guardrail_interventions_count,
        },
    }


@router.post("/orchestrator/mode")
async def switch_mode(req: ModeSwitchRequest):
    """Switches orchestrator execution mode between 'shadow' and 'live_pilot'."""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not ready")

    new_mode = orchestrator.set_execution_mode(req.mode)
    return {"status": "updated", "mode": new_mode}


@router.post("/orchestrator/override")
async def apply_override(req: OperatorOverrideRequest):
    """Sets an operator manual override for an asset."""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not ready")

    override = orchestrator.apply_operator_override(req.asset_id, req.setpoints, req.notes)
    return {"status": "applied", "override": override}


@router.delete("/orchestrator/override/{asset_id}")
async def clear_override(asset_id: str):
    """Clears an active operator override."""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not ready")

    cleared = orchestrator.clear_operator_override(asset_id)
    if not cleared:
        raise HTTPException(status_code=404, detail="Override not found")
    return {"status": "cleared", "asset_id": asset_id}


@router.get("/metrics/rewards")
async def get_metrics_rewards(limit: int = 50):
    """Returns recent reward trajectory for Grafana visualization."""
    if not repository:
        raise HTTPException(status_code=503, detail="Database repository not ready")
    return await repository.get_recent_rewards(limit=limit)


@router.get("/metrics/summary", response_model=MetricsSummaryResponse)
async def get_metrics_summary():
    """Aggregated KPIs for operational dashboard."""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not ready")

    return MetricsSummaryResponse(
        mode=orchestrator.mode,
        kpis={
            "total_ticks": orchestrator.reward_engine.kpis.total_ticks,
            "total_reward": round(orchestrator.reward_engine.kpis.total_reward, 3),
            "total_emissions_saved_kg": round(orchestrator.reward_engine.kpis.total_emissions_saved_kg, 2),
            "total_cost_saved_usd": round(orchestrator.reward_engine.kpis.total_cost_saved_usd, 2),
            "reward_hacking_detected": orchestrator.reward_engine.kpis.reward_hacking_detected_count,
            "guardrail_interventions": orchestrator.reward_engine.kpis.guardrail_interventions_count,
        },
        latest_state=orchestrator.state.model_dump(),
        active_overrides_count=len(orchestrator.state.active_operator_overrides),
    )
