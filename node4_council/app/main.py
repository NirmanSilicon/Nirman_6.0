"""FastAPI entry point for NanoShield Node 4.

Run from the ``node4_council`` directory with ``python -m app.main``.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app import __version__
from app.config import get_settings
from app.council_graph import get_council_graph, run_council
from app.graph_rag import close_neo4j_driver
from app.schemas import CopilotRecommendation, DriftAlert
from app.ws_manager import ConnectionManager

settings = get_settings()
logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("node4")
manager = ConnectionManager()


class HealthStatus(BaseModel):
    status: str
    service: str
    version: str
    active_websocket_clients: int
    use_mock_graph_rag: bool
    llm_provider: str


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    get_council_graph()  # Compile now so wiring errors surface at startup.
    logger.info(
        "Node 4 council ready (mock_graph_rag=%s, llm_provider=%s)",
        settings.use_mock_graph_rag,
        settings.llm_provider,
    )
    try:
        yield
    finally:
        await manager.close_all()
        await close_neo4j_driver()


app = FastAPI(
    title="NanoShield Node 4 - Multi-Agent Council",
    version=__version__,
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_allow_origins),
    # Browsers forbid credentialed requests with a wildcard origin.
    allow_credentials="*" not in settings.cors_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def invalid_request(_: Request, exc: RequestValidationError) -> JSONResponse:
    """Return 422 without echoing input; echoed NaN/Infinity cannot be serialised."""
    errors = [
        {"type": error["type"], "loc": list(error["loc"]), "msg": error["msg"]}
        for error in exc.errors()
    ]
    logger.warning("Rejected invalid request: %s", errors)
    return JSONResponse(status_code=422, content={"detail": errors})


@app.get("/health", response_model=HealthStatus)
async def health() -> HealthStatus:
    return HealthStatus(
        status="ok",
        service="node4-council",
        version=__version__,
        active_websocket_clients=manager.client_count,
        use_mock_graph_rag=settings.use_mock_graph_rag,
        llm_provider=settings.llm_provider,
    )


@app.websocket("/ws/recommendations")
async def recommendations_stream(websocket: WebSocket) -> None:
    """Subscribe to ``COPILOT_RECOMMENDATION`` broadcasts."""
    await manager.connect(websocket)
    try:
        # Inbound frames are ignored; reading is how disconnects are detected.
        while (await websocket.receive())["type"] != "websocket.disconnect":
            pass
    except (WebSocketDisconnect, RuntimeError):
        logger.debug("WebSocket subscriber closed the stream")
    finally:
        manager.disconnect(websocket)


@app.post("/api/v1/trigger-council", response_model=CopilotRecommendation)
async def trigger_council(alert: DriftAlert) -> CopilotRecommendation:
    """Run the council, broadcast the recommendation and return it."""
    logger.info(
        "Council triggered by %s (%s / %s)",
        alert.alert_id,
        alert.chamber_id,
        alert.suspected_subsystem,
    )
    recommendation = await run_council(alert)
    delivered = await manager.broadcast(recommendation.model_dump_json())
    logger.info(
        "Recommendation for %s broadcast to %d subscriber(s)", alert.alert_id, delivered
    )
    return recommendation


def main() -> None:
    uvicorn.run(
        app,
        host=settings.node4_host,
        port=settings.node4_port,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
