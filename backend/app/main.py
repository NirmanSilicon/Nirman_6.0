import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.api.endpoints import router as api_router
from backend.app.websocket.manager import ws_manager
from backend.app.ingestion.mqtt_client import mqtt_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create DB tables
    Base.metadata.create_all(bind=engine)
    
    # 2. Start background stale-data watchdog
    loop = asyncio.get_event_loop()
    stale_task = asyncio.create_task(ws_manager.check_stale_loop())
    
    # 3. Start MQTT listener
    mqtt_service.start(loop)
    
    yield
    
    # Cleanup
    stale_task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="MechGuard AI-Powered Industrial Machine Health & Worker Safety Monitoring System",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files for Incident Evidence
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

# REST API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Direct root health
@app.get("/health")
def root_health():
    return {"status": "ok", "app": settings.PROJECT_NAME, "version": settings.VERSION}

# WebSocket Endpoints
@app.websocket("/ws/unified")
async def ws_unified_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket, "unified")
    try:
        # Send initial state immediately
        await websocket.send_json(ws_manager.current_state.model_dump())
        while True:
            # Keep socket alive and accept ping/pong or control messages
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "unified")

@app.websocket("/ws/telemetry")
async def ws_telemetry_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket, "telemetry")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "telemetry")

@app.websocket("/ws/diagnostics")
async def ws_diagnostics_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket, "diagnostics")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "diagnostics")

@app.websocket("/ws/safety")
async def ws_safety_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket, "safety")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "safety")

@app.websocket("/ws/risk")
async def ws_risk_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket, "risk")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "risk")
