"""FastAPI application entry point.

    uvicorn app.main:app --reload --port 8000
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import analytics, belts, incidents, push, settings_api, sources, stream, ws
from .bus import bus
from .config import settings
from .pipeline.session import manager
from .pipeline.types import CLASS_LABELS
from .store.db import get_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)-28s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # The pipeline threads publish from outside the event loop, so the bus needs
    # a handle on it to marshal messages across.
    bus.bind_loop(asyncio.get_running_loop())
    get_db()
    belts.ensure_default_belt()
    log.info("Conveyor Belt Monitor ready (detector=%s)", settings.detector)

    if settings.source_uri:
        # A configured SOURCE_URI means "this deployment watches this camera" --
        # start it automatically so a restart resumes monitoring unattended.
        try:
            await asyncio.to_thread(manager.start, settings.source_uri)
        except Exception as exc:  # noqa: BLE001
            log.error("Could not auto-start %s: %s", settings.source_uri, exc)

    yield

    await asyncio.to_thread(manager.stop_all)
    get_db().close()
    log.info("Shutdown complete")


app = FastAPI(
    title="Intelligent Conveyor Belt Health Monitor",
    description=(
        "Real-time AI vision monitoring for conveyor belt damage and joint "
        "rupture in iron ore mining."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sources.router)
app.include_router(stream.router)
app.include_router(incidents.router)
app.include_router(analytics.router)
app.include_router(settings_api.router)
app.include_router(ws.router)
app.include_router(belts.router)
app.include_router(push.router)


@app.get("/api/network", tags=["meta"])
async def network() -> dict:
    """This machine's LAN address, so QR labels can point at something a phone
    on the same network can open instead of ``localhost``."""
    import socket

    ip = None
    try:
        # No packet is sent: connecting a UDP socket only picks the outbound
        # interface, whose address is the one other devices can reach.
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))
            ip = s.getsockname()[0]
    except OSError:
        pass
    if ip and (ip.startswith("127.") or ip.startswith("169.254.")):
        ip = None
    return {"lan_ip": ip}


@app.get("/api/health", tags=["meta"])
async def health() -> dict:
    return {
        "status": "ok",
        "detector": settings.detector,
        "classes": CLASS_LABELS,
        "stream": manager.status(),
        "belts_running": [s.belt_id for s in manager.sessions() if s.running],
        "ws_clients": bus.subscriber_count,
    }


# ---- the built dashboard -------------------------------------------------------
# In the Docker image the frontend build sits beside the API (STATIC_DIR), so
# one container serves both on one origin. Mounted last: every /api and /ws
# route above takes precedence. Absent in development, where Vite serves it.
def _mount_dashboard() -> None:
    import os
    from pathlib import Path

    from fastapi.staticfiles import StaticFiles

    static = Path(os.environ.get("STATIC_DIR", "")) if os.environ.get("STATIC_DIR") else None
    if static is not None and (static / "index.html").is_file():
        app.mount("/", StaticFiles(directory=static, html=True), name="dashboard")
        log.info("Serving the dashboard from %s", static)


_mount_dashboard()
