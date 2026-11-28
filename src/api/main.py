"""FastAPI Application Main Entrypoint for VidyutSync."""

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from src.config import settings
from src.api.routes import router, set_dependencies
from src.api.websockets import ws_manager
from src.orchestrator.engine import VidyutSyncOrchestrator
from src.connectors.database import TimescaleRepository
from src.connectors.mqtt_bus import MQTTBusConnector

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("VidyutSync.Main")

# Global instances
orchestrator = VidyutSyncOrchestrator()
repository = TimescaleRepository()
mqtt_bus = MQTTBusConnector()


async def background_ticker():
    """Background loop executing orchestration ticks at periodic intervals."""
    logger.info(f"Background ticker started (Interval: {settings.TICK_INTERVAL_SECONDS}s)")
    while True:
        try:
            await asyncio.sleep(settings.TICK_INTERVAL_SECONDS)
            logger.info("Executing scheduled periodic orchestration tick...")
            result = orchestrator.execute_tick()

            # Persist and broadcast
            if repository and repository._is_connected:
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

            # Broadcast to WebSockets
            await ws_manager.broadcast(result)

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in background ticker: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown procedures."""
    logger.info("Starting VidyutSync Backend System...")

    # 1. Connect to TimescaleDB
    await repository.connect()

    # 2. Connect to MQTT Broker
    mqtt_bus.start()

    # Wire MQTT incoming telemetry to orchestrator state
    def on_mqtt_telemetry(topic: str, payload: dict):
        if "telemetry" in topic and isinstance(payload, dict):
            orchestrator.update_telemetry(payload)

    mqtt_bus.register_telemetry_listener(on_mqtt_telemetry)

    # 3. Inject global dependencies
    set_dependencies(orchestrator, repository, mqtt_bus)

    # 4. Start background ticker
    ticker_task = asyncio.create_task(background_ticker())

    yield

    # Shutdown
    logger.info("Shutting down VidyutSync...")
    ticker_task.cancel()
    try:
        await ticker_task
    except asyncio.CancelledError:
        pass
    mqtt_bus.stop()
    await repository.disconnect()
    logger.info("VidyutSync Shutdown complete.")


app = FastAPI(
    title="VidyutSync (EcoSync-Industrial) API",
    description="Regenerative micro-grid and renewable load-shifting orchestrator for small/medium manufacturing",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routes
app.include_router(router)


@app.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    """Real-time streaming WebSocket endpoint for UI dashboards & Grafana."""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keepalive / listen for client ping or commands
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


def run_server():
    """CLI runner function."""
    uvicorn.run("src.api.main:app", host=settings.HOST, port=settings.PORT, reload=False)


if __name__ == "__main__":
    run_server()
