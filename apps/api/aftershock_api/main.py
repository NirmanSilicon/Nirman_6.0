"""FastAPI application entrypoint for AFTERSHOCK."""
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from apps.api.aftershock_api.bus import event_bus
from apps.api.aftershock_api.service import run_service
from apps.api.aftershock_api.routes import projects, scenarios, runs, optimization, comparisons, simulations

app = FastAPI(
    title="AFTERSHOCK Resilience Lab API",
    description="Deterministic disaster-resilience stress-testing API combining multi-graph dependencies and cascading simulation.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(projects.router)
app.include_router(scenarios.router)
app.include_router(runs.router)
app.include_router(optimization.router)
app.include_router(comparisons.router)
app.include_router(simulations.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "aftershock-api", "version": "0.1.0"}


@app.get("/ready")
async def ready():
    districts_loaded = len(run_service.districts)
    return {
        "status": "ready" if districts_loaded > 0 else "degraded",
        "districts_count": districts_loaded,
        "scenarios_count": len(run_service.scenarios),
    }


@app.websocket("/api/v1/ws/runs/{run_id}")
async def run_websocket_stream(websocket: WebSocket, run_id: str):
    await websocket.accept()
    queue = await event_bus.subscribe(run_id)
    try:
        while True:
            event = await queue.get()
            payload = {
                "schema_version": "1.0",
                "run_id": event.run_id,
                "sequence": event.sequence,
                "tick": event.tick,
                "event_type": event.event_type,
                "event_id": event.event_id,
                "asset_id": event.asset_id,
                "previous_state": event.previous_state,
                "new_state": event.new_state,
                "cause_code": event.cause_code,
                "parent_event_ids": event.parent_event_ids,
                "evidence": event.evidence,
            }
            await websocket.send_json(payload)
    except WebSocketDisconnect:
        pass
    finally:
        await event_bus.unsubscribe(run_id, queue)


@app.websocket("/ws/{client_id}")
async def generic_simulation_websocket(websocket: WebSocket, client_id: str):
    """Guide §4 & §8: Global simulation WebSocket endpoint /ws/{clientId}"""
    await simulations.websocket_endpoint(websocket, client_id)
