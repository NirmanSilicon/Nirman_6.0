"""ParkSMART - Main FastAPI Application Factory and Lifecycle Management (File 11)."""

from __future__ import annotations

import asyncio
import logging
import uuid
from collections.abc import Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.middleware.base import BaseHTTPMiddleware

from app import __version__
from app.config import get_settings
from app.core.rate_limit import RateLimitMiddleware
from app.db.session import SessionFactory, engine
from app.errors import ServiceUnavailable, register_handlers
from app.logging_config import request_id_var, setup_logging

# Routers owned by Backend Platform Lead (Himani)
from app.modules.admin.router import router as admin_router
from app.modules.audit.router import router as audit_router
from app.modules.auth.router import router as auth_router
from app.modules.availability.router import router as availability_router
from app.modules.businesses.router import router as businesses_router
from app.modules.loading.router import router as loading_router
from app.modules.notifications.router import router as notifications_router
from app.modules.parking.router import bays_router, zones_router
from app.modules.payments.router import router as payments_router
from app.modules.recommend.router import router as recommend_router
from app.modules.reports.router import router as reports_router
from app.modules.reservations.router import router as reservations_router
from app.modules.users.router import router as users_router

logger = logging.getLogger(__name__)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Assigns or propagates request correlation ID."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        req_id = request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:12]}"
        token = request_id_var.set(req_id)
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = req_id
            return response
        finally:
            request_id_var.reset(token)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan managing background MQTT consumer and db engine pools."""
    settings = get_settings()

    # Initialize Realtime Hub
    hub = None
    try:
        from app.modules.realtime.hub import Hub
        hub = Hub()
        app.state.hub = hub
    except (ImportError, RuntimeError, OSError, AttributeError, ValueError) as exc:
        logger.warning("Could not initialize Realtime Hub: %s", exc)

    # Initialize MQTT Ingestion Consumer
    consumer_task = None
    consumer = None
    if settings.app_env != "test" and settings.mqtt_enabled:
        try:
            from app.modules.ingestion.mqtt_consumer import MqttConsumer
            consumer = MqttConsumer(settings, SessionFactory, hub)
            app.state.mqtt_consumer = consumer
            consumer_task = asyncio.create_task(consumer.run_forever())
        except (ImportError, RuntimeError, OSError, AttributeError, ValueError) as exc:
            logger.warning("Could not start background MqttConsumer: %s", exc)

    yield

    # Teardown
    if consumer and hasattr(consumer, "stop_event"):
        consumer.stop_event.set()
    if consumer_task:
        try:
            await asyncio.wait_for(consumer_task, timeout=5.0)
        except (TimeoutError, asyncio.CancelledError, OSError, RuntimeError) as exc:
            logger.debug("Error waiting for MqttConsumer shutdown: %s", exc)

    if hub and hasattr(hub, "close"):
        try:
            await hub.close()
        except (OSError, RuntimeError, asyncio.CancelledError) as exc:
            logger.debug("Error closing Realtime Hub: %s", exc)

    await engine.dispose()


def create_app() -> FastAPI:
    """Builds and configures the FastAPI application."""
    settings = get_settings()
    setup_logging(settings.log_level)

    app = FastAPI(
        title="ParkSMART",
        description="Integrated AI-Powered Smart Parking and Commercial Loading Platform",
        version=__version__,
        lifespan=lifespan,
        docs_url="/docs" if settings.app_env != "production" else None,
        redoc_url=None,
    )

    # Middlewares
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list or ["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(RateLimitMiddleware, limit_per_min=settings.rate_limit_per_min)

    # Exception Handlers
    register_handlers(app)

    # Health Probes
    @app.get("/healthz", tags=["health"])
    async def healthz():
        return {"status": "ok"}

    @app.get("/readyz", tags=["health"])
    async def readyz():
        try:
            async with SessionFactory() as session:
                await session.execute(text("SELECT 1"))
            return {"status": "ready"}
        except Exception as exc:
            raise ServiceUnavailable(
                "Database not reachable",
                details={"error": str(exc)},
                code="DB_UNAVAILABLE",
            ) from exc

    # Mount Core Routers under /api/v1
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(users_router, prefix="/api/v1/users", tags=["users"])
    app.include_router(businesses_router, prefix="/api/v1/businesses", tags=["businesses"])
    app.include_router(zones_router, prefix="/api/v1/zones", tags=["zones"])
    app.include_router(bays_router, prefix="/api/v1/bays", tags=["bays"])
    app.include_router(reservations_router, prefix="/api/v1/parking-reservations", tags=["parking-reservations"])
    app.include_router(reservations_router, prefix="/api/v1/reservations", tags=["reservations"])
    app.include_router(loading_router, prefix="/api/v1/loading", tags=["loading"])
    app.include_router(availability_router, prefix="/api/v1/availability", tags=["availability"])
    app.include_router(recommend_router, prefix="/api/v1/recommendations", tags=["recommendations"])
    app.include_router(recommend_router, prefix="/api/v1/recommend", tags=["recommendations"])
    app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["notifications"])
    app.include_router(admin_router, prefix="/api/v1/admin", tags=["admin"])
    app.include_router(audit_router, prefix="/api/v1/audit", tags=["audit"])
    app.include_router(payments_router, prefix="/api/v1/payments", tags=["payments"])
    app.include_router(reports_router, prefix="/api/v1/reports", tags=["reports"])

    # Optional / Satellite Modules (gracefully imported if implemented)
    try:
        from app.modules.realtime.router import router as stream_router
        if stream_router and getattr(stream_router, "routes", None):
            prefix = "" if getattr(stream_router, "prefix", "") == "/api/v1/stream" else "/api/v1/stream"
            app.include_router(stream_router, prefix=prefix, tags=["stream"])
    except (ImportError, RuntimeError, AttributeError, ValueError, OSError) as exc:
        logger.debug("Stream router not mounted: %s", exc)

    try:
        from app.modules.forecast.router import router as forecast_router
        if forecast_router and getattr(forecast_router, "routes", None):
            prefix = "/api/v1" if getattr(forecast_router, "prefix", "") == "/forecast" else "/api/v1/forecast"
            app.include_router(forecast_router, prefix=prefix, tags=["forecast"])
    except (ImportError, RuntimeError, AttributeError, ValueError, OSError) as exc:
        logger.debug("Forecast router not mounted: %s", exc)

    try:
        from app.modules.devices.router import router as devices_router
        if devices_router and getattr(devices_router, "routes", None):
            app.include_router(devices_router, prefix="/api/v1/devices", tags=["devices"])
    except (ImportError, RuntimeError, AttributeError, ValueError, OSError) as exc:
        logger.debug("Devices router not mounted: %s", exc)

    try:
        from app.modules.ingestion.router import router as ingest_router
        if ingest_router and getattr(ingest_router, "routes", None):
            app.include_router(ingest_router, prefix="/api/v1/ingest", tags=["ingest"])
    except (ImportError, RuntimeError, AttributeError, ValueError, OSError) as exc:
        logger.debug("Ingest router not mounted: %s", exc)

    try:
        from app.modules.crowd.router import router as crowd_router
        if crowd_router and getattr(crowd_router, "routes", None):
            app.include_router(crowd_router, prefix="/api/v1/crowd", tags=["crowd"])
    except (ImportError, RuntimeError, AttributeError, ValueError, OSError) as exc:
        logger.debug("Crowd router not mounted: %s", exc)

    try:
        from app.modules.media.router import router as media_router
        if media_router and getattr(media_router, "routes", None):
            app.include_router(media_router, prefix="/api/v1/media", tags=["media"])
    except (ImportError, RuntimeError, AttributeError, ValueError, OSError) as exc:
        logger.debug("Media router not mounted: %s", exc)

    return app


app = create_app()
