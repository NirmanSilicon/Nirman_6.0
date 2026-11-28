"""
Simulation API routes — guide Section 4 & 6.
POST /api/simulations/flood  — trigger flood BFS model
POST /api/simulations/traffic — trigger traffic graph model
GET  /api/assets/city         — GeoJSON city asset catalogue
GET  /api/status              — service health + running sims
WebSocket /ws/{client_id}     — ConnectionManager broadcast pattern
"""
import asyncio
import uuid
import time
from typing import Dict, List, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, BackgroundTasks
from pydantic import BaseModel
import numpy as np

router = APIRouter(prefix="/api", tags=["simulations"])

# ---------------------------------------------------------------------------
# ConnectionManager — guide Section 8 / FastAPI WebSocket pattern
# ---------------------------------------------------------------------------
class ConnectionManager:
    """Holds active WebSocket connections and broadcasts messages."""

    def __init__(self):
        self.active: Dict[str, WebSocket] = {}

    async def connect(self, client_id: str, ws: WebSocket):
        await ws.accept()
        self.active[client_id] = ws

    def disconnect(self, client_id: str):
        self.active.pop(client_id, None)

    async def send(self, client_id: str, message: dict):
        ws = self.active.get(client_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(client_id)

    async def broadcast(self, message: dict):
        dead = []
        for cid, ws in self.active.items():
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(cid)
        for cid in dead:
            self.disconnect(cid)


manager = ConnectionManager()

# Running simulations registry
_running_sims: Dict[str, dict] = {}


# ---------------------------------------------------------------------------
# WebSocket /ws/{client_id}
# ---------------------------------------------------------------------------
@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """Guide §8: clients subscribe, receive sim_start / sim_update / sim_end."""
    await manager.connect(client_id, websocket)
    try:
        while True:
            await asyncio.sleep(30)  # keep-alive ping cycle
            await websocket.send_json({"type": "ping", "client_id": client_id})
    except WebSocketDisconnect:
        manager.disconnect(client_id)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class FloodRequest(BaseModel):
    area: str = "river"
    water_height: float = 5.2
    grid_size: int = 50
    max_steps: int = 20


class TrafficRequest(BaseModel):
    vehicle_count: int = 80
    steps: int = 30
    peak_hour: bool = True


class SimResponse(BaseModel):
    sim_id: str
    status: str
    message: str


# ---------------------------------------------------------------------------
# Flood BFS — guide Section 6.1
# ---------------------------------------------------------------------------
def _run_flood_bfs(sim_id: str, req: FloodRequest):
    """BFS water spread over a 2D height grid. Pushes updates via ConnectionManager."""

    async def _inner():
        N = req.grid_size

        # Build a simple synthetic heightmap: hilly center, low river corridor
        rng = np.random.default_rng(42)
        grid = rng.uniform(0, 10, (N, N)).astype(float)
        # River valley: low center column
        grid[:, N // 2 - 2 : N // 2 + 3] -= 8.0
        grid = np.clip(grid, 0, None)

        # Flood sources: river mouth
        source_points = [(N // 2, N // 2 - 1), (N // 2 - 1, N // 2)]
        flooded = np.zeros((N, N), dtype=bool)
        water_queue = list(source_points)
        water_rate = req.water_height

        await manager.broadcast(
            {"type": "sim_start", "simId": sim_id, "model": "flood", "grid_size": N}
        )
        _running_sims[sim_id] = {"status": "running", "model": "flood", "step": 0}

        for step in range(req.max_steps):
            new_queue = []
            for x, y in water_queue:
                flooded[x, y] = True
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < N and 0 <= ny < N:
                        if not flooded[nx, ny] and grid[nx, ny] <= grid[x, y] + water_rate:
                            new_queue.append((nx, ny))
            water_queue = new_queue

            flooded_cells = int(np.sum(flooded))
            await manager.broadcast(
                {
                    "type": "sim_update",
                    "simId": sim_id,
                    "step": step + 1,
                    "flooded_cells": flooded_cells,
                    "flooded_pct": round(flooded_cells / (N * N) * 100, 2),
                }
            )
            _running_sims[sim_id]["step"] = step + 1
            await asyncio.sleep(0.3)

        await manager.broadcast(
            {"type": "sim_end", "simId": sim_id, "total_flooded": int(np.sum(flooded))}
        )
        _running_sims[sim_id]["status"] = "done"

    asyncio.create_task(_inner())


# ---------------------------------------------------------------------------
# Traffic Graph — guide Section 6.2
# ---------------------------------------------------------------------------
def _run_traffic_sim(sim_id: str, req: TrafficRequest):
    """Simple edge-based vehicle count traffic model."""

    async def _inner():
        # Synthetic road graph: nodes 0..9, random edges
        rng = np.random.default_rng(7)
        edges = [(i, j) for i in range(10) for j in range(10) if i != j and rng.random() < 0.25]
        if not edges:
            edges = [(0, 1), (1, 2), (2, 3), (3, 0)]
        capacity = {e: int(rng.integers(10, 30)) for e in edges}
        vehicles = [rng.choice(len(edges)) for _ in range(req.vehicle_count)]

        await manager.broadcast(
            {"type": "sim_start", "simId": sim_id, "model": "traffic", "vehicles": req.vehicle_count}
        )
        _running_sims[sim_id] = {"status": "running", "model": "traffic", "step": 0}

        for t in range(req.steps):
            # Move each vehicle to random next edge
            vehicles = [rng.integers(0, len(edges)) for _ in vehicles]
            # Count per edge
            counts: Dict[int, int] = {}
            for v in vehicles:
                counts[v] = counts.get(v, 0) + 1

            congestion = []
            for idx, (src, dst) in enumerate(edges):
                cnt = counts.get(idx, 0)
                cap = capacity[(src, dst)]
                density = round(min(1.0, cnt / max(1, cap)), 3)
                if density > 0.4:
                    congestion.append({"roadId": idx, "src": src, "dst": dst, "density": density})

            await manager.broadcast(
                {
                    "type": "sim_update",
                    "simId": sim_id,
                    "step": t + 1,
                    "congestion": congestion[:10],  # top 10
                }
            )
            _running_sims[sim_id]["step"] = t + 1
            await asyncio.sleep(0.2)

        await manager.broadcast({"type": "sim_end", "simId": sim_id})
        _running_sims[sim_id]["status"] = "done"

    asyncio.create_task(_inner())


# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------
@router.post("/simulations/flood", response_model=SimResponse)
async def trigger_flood(req: FloodRequest):
    """Guide §4: POST /api/simulations/flood"""
    sim_id = f"FLOOD-{uuid.uuid4().hex[:8].upper()}"
    _run_flood_bfs(sim_id, req)
    return SimResponse(sim_id=sim_id, status="started", message="Flood BFS simulation started. Listen via WebSocket.")


@router.post("/simulations/traffic", response_model=SimResponse)
async def trigger_traffic(req: TrafficRequest):
    """Guide §4: POST /api/simulations/traffic"""
    sim_id = f"TRAFFIC-{uuid.uuid4().hex[:8].upper()}"
    _run_traffic_sim(sim_id, req)
    return SimResponse(sim_id=sim_id, status="started", message="Traffic simulation started. Listen via WebSocket.")


@router.get("/status")
async def api_status():
    """Guide §4: GET /api/status — service health + simulation list."""
    return {
        "service": "aftershock-api",
        "status": "ok",
        "active_connections": len(manager.active),
        "simulations": {sid: info for sid, info in _running_sims.items()},
    }


@router.get("/assets/city")
async def city_assets():
    """
    Guide §4: GET /api/assets/city — returns GeoJSON city asset catalogue.
    Synthetic city data centred on a fictional 90x90 grid district.
    In production: query PostGIS with ST_AsGeoJSON(geom).
    """
    # 10 landmark buildings with synthetic footprints
    buildings = []
    rng = np.random.default_rng(99)
    for i in range(10):
        cx = float(rng.uniform(10, 80))
        cy = float(rng.uniform(10, 80))
        hw = float(rng.uniform(1, 3))
        hd = float(rng.uniform(1, 3))
        height = float(rng.uniform(10, 60))
        buildings.append(
            {
                "id": i + 1,
                "name": f"Building-{i+1:02d}",
                "geom": {
                    "type": "Polygon",
                    "coordinates": [[
                        [cx - hw, cy - hd], [cx + hw, cy - hd],
                        [cx + hw, cy + hd], [cx - hw, cy + hd],
                        [cx - hw, cy - hd],
                    ]],
                },
                "properties": {"height": round(height, 1), "district": "synthetic"},
            }
        )

    # 6 road segments
    roads = []
    for i, (x1, y1, x2, y2, name) in enumerate([
        (0, 45, 90, 45, "Main Avenue"),
        (45, 0, 45, 90, "Central Boulevard"),
        (0, 20, 90, 20, "Harbor Road"),
        (0, 70, 90, 70, "Northern Bypass"),
        (20, 0, 20, 90, "West Corridor"),
        (70, 0, 70, 90, "East Freeway"),
    ]):
        roads.append(
            {
                "id": i + 1,
                "name": name,
                "lanes": 2 + (i % 3),
                "geom": {
                    "type": "LineString",
                    "coordinates": [[x1, y1], [x2, y2]],
                },
            }
        )

    return {"buildings": buildings, "roads": roads}
