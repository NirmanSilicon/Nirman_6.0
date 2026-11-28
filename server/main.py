"""Ashvin event bus for the Nirmaan demo.

One process on the laptop holds the incident stream. Any client posts an event,
every connected client receives it, and everything is written to sqlite so the
log survives a page refresh.

Run:  python -m uvicorn server.main:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

IST = timezone(timedelta(hours=5, minutes=30))
ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "events.db"
WEB_DIR = ROOT / "web"
BACKLOG_LIMIT = 200


def now_ist() -> str:
    return datetime.now(IST).isoformat(timespec="milliseconds")


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                seq        INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id   TEXT NOT NULL,
                type       TEXT NOT NULL,
                source     TEXT,
                device_id  TEXT,
                t_client   TEXT,
                t_server   TEXT,
                data       TEXT
            )
            """
        )


class Incoming(BaseModel):
    type: str = Field(min_length=1)
    event_id: str | None = None
    source: str = "sim"
    device_id: str = "ASH-07"
    t_client: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)


class Hub:
    """Keeps the open sockets and fans one event out to all of them."""

    def __init__(self) -> None:
        self.clients: set[WebSocket] = set()
        self.lock = asyncio.Lock()

    async def join(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self.lock:
            self.clients.add(ws)

    async def leave(self, ws: WebSocket) -> None:
        async with self.lock:
            self.clients.discard(ws)

    async def broadcast(self, message: dict[str, Any]) -> None:
        payload = json.dumps(message)
        async with self.lock:
            targets = list(self.clients)
        dead = []
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        if dead:
            async with self.lock:
                for ws in dead:
                    self.clients.discard(ws)


hub = Hub()


@contextlib.asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Ashvin event bus", lifespan=lifespan)


def store(event: dict[str, Any]) -> dict[str, Any]:
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO events (event_id, type, source, device_id, t_client, t_server, data)"
            " VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                event["event_id"],
                event["type"],
                event["source"],
                event["device_id"],
                event["t_client"],
                event["t_server"],
                json.dumps(event["data"]),
            ),
        )
        event["seq"] = cur.lastrowid
    return event


@app.post("/event")
async def post_event(incoming: Incoming) -> dict[str, Any]:
    event = {
        "seq": None,
        "event_id": incoming.event_id or f"e-{uuid.uuid4().hex[:8]}",
        "type": incoming.type,
        "t_client": incoming.t_client or now_ist(),
        "t_server": now_ist(),
        "source": incoming.source,
        "device_id": incoming.device_id,
        "data": incoming.data,
    }
    event = store(event)
    await hub.broadcast(event)
    return event


@app.get("/events")
def get_events(limit: int = 50) -> dict[str, Any]:
    limit = max(1, min(limit, BACKLOG_LIMIT))
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM events ORDER BY seq DESC LIMIT ?", (limit,)
        ).fetchall()
    events = []
    for row in reversed(rows):
        item = dict(row)
        item["data"] = json.loads(item["data"] or "{}")
        events.append(item)
    return {"count": len(events), "events": events}


@app.post("/reset")
async def reset_events() -> dict[str, Any]:
    with db() as conn:
        cleared = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        conn.execute("DELETE FROM events")
        with contextlib.suppress(sqlite3.OperationalError):
            conn.execute("DELETE FROM sqlite_sequence WHERE name = 'events'")
    stamp = now_ist()
    await hub.broadcast(
        {
            "seq": None,
            "event_id": f"e-{uuid.uuid4().hex[:8]}",
            "type": "system_reset",
            "t_client": stamp,
            "t_server": stamp,
            "source": "server",
            "device_id": "server",
            "data": {"cleared": cleared},
        }
    )
    return {"ok": True, "cleared": cleared}


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "clients": len(hub.clients), "t": now_ist()}


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    await hub.join(ws)
    try:
        with db() as conn:
            rows = conn.execute(
                "SELECT * FROM events ORDER BY seq DESC LIMIT ?", (50,)
            ).fetchall()
        snapshot = []
        for row in reversed(rows):
            item = dict(row)
            item["data"] = json.loads(item["data"] or "{}")
            snapshot.append(item)
        await ws.send_text(json.dumps({"kind": "snapshot", "events": snapshot}))
        while True:
            raw = await ws.receive_text()
            try:
                incoming = Incoming(**json.loads(raw))
            except Exception:
                await ws.send_text(json.dumps({"kind": "error", "message": "bad payload"}))
                continue
            event = {
                "seq": None,
                "event_id": incoming.event_id or f"e-{uuid.uuid4().hex[:8]}",
                "type": incoming.type,
                "t_client": incoming.t_client or now_ist(),
                "t_server": now_ist(),
                "source": incoming.source,
                "device_id": incoming.device_id,
                "data": incoming.data,
            }
            event = store(event)
            await hub.broadcast(event)
    except WebSocketDisconnect:
        pass
    finally:
        await hub.leave(ws)


@app.get("/")
def index() -> FileResponse:
    page = WEB_DIR / "index.html"
    if not page.exists():
        raise HTTPException(status_code=404, detail="web/index.html missing")
    return FileResponse(page)


@app.get("/app.js")
def app_js() -> FileResponse:
    path = WEB_DIR / "app.js"
    if not path.exists():
        raise HTTPException(status_code=404, detail="web/app.js missing")
    return FileResponse(path)


@app.get("/style.css")
def style_css() -> FileResponse:
    path = WEB_DIR / "style.css"
    if not path.exists():
        raise HTTPException(status_code=404, detail="web/style.css missing")
    return FileResponse(path)


@app.get("/sim")
def sim_index() -> FileResponse:
    page = WEB_DIR / "sim" / "index.html"
    if not page.exists():
        raise HTTPException(status_code=404, detail="web/sim/index.html missing")
    return FileResponse(page)


@app.get("/sim/sim.js")
def sim_js() -> FileResponse:
    path = WEB_DIR / "sim" / "sim.js"
    if not path.exists():
        raise HTTPException(status_code=404, detail="web/sim/sim.js missing")
    return FileResponse(path)


@app.get("/sim/sim.css")
def sim_css() -> FileResponse:
    path = WEB_DIR / "sim" / "sim.css"
    if not path.exists():
        raise HTTPException(status_code=404, detail="web/sim/sim.css missing")
    return FileResponse(path)


@app.get("/sim/scene.js")
def sim_scene_js() -> FileResponse:
    path = WEB_DIR / "sim" / "scene.js"
    if not path.exists():
        raise HTTPException(status_code=404, detail="web/sim/scene.js missing")
    return FileResponse(path, media_type="text/javascript")


app.mount(
    "/sim/vendor",
    StaticFiles(directory=WEB_DIR / "sim" / "vendor"),
    name="sim_vendor",
)


@app.get("/hospital")
def hospital_index() -> FileResponse:
    page = WEB_DIR / "hospital" / "index.html"
    if not page.exists():
        raise HTTPException(status_code=404, detail="web/hospital/index.html missing")
    return FileResponse(page)


app.mount(
    "/hospital",
    StaticFiles(directory=WEB_DIR / "hospital"),
    name="hospital",
)
app.mount("/dossier", StaticFiles(directory="web/dossier", html=True), name="dossier")
app.mount("/family", StaticFiles(directory="web/family", html=True), name="family")
