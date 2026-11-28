"""
ParkSMART - Realtime Server-Sent Events Router (File 90 / M2 Ownership)

Responsibility:
HTTP layer for Server-Sent Events stream: GET /api/v1/stream
Handles bearer authentication, channel authorization, Last-Event-ID replay,
heartbeat pings, token expiration notifications, and clean disconnects.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import AsyncGenerator
from typing import Any

from app.modules.realtime import service
from app.modules.realtime.hub import Hub
from app.modules.realtime.service import (
    CurrentUser,
    Unauthorized,
    decode_access_token,
)

logger = logging.getLogger("parksmart.realtime.router")

HEARTBEAT_S = 15  # SSE heartbeat interval in seconds
QUEUE_MAX = 100  # Max events buffered per client stream before overflow


def format_sse(event: str, data: dict[str, Any], event_id: str | None = None) -> str:
    """Formats an event payload adhering to W3C Server-Sent Events wire format."""
    lines: list[str] = []
    if event_id:
        lines.append(f"id: {event_id}")
    lines.append(f"event: {event}")
    data_str = json.dumps(data, separators=(",", ":"))
    lines.append(f"data: {data_str}")
    return "\n".join(lines) + "\n\n"


async def stream_generator(
    hub: Hub,
    user: CurrentUser,
    channels: set[str],
    last_event_id: str | None = None,
    exp_timestamp: float | None = None,
    heartbeat_s: float = HEARTBEAT_S,
    request: Any = None,
) -> AsyncGenerator[str, None]:
    """
    Core Server-Sent Events asynchronous generator:
      - Subscribes client to allowed channels in the Hub.
      - Replays missed events if a valid Last-Event-ID is provided.
      - Emits 'resync' if requested history is unavailable or queue overflows.
      - Emits ': ping' heartbeat every 15 seconds.
      - Emits 'auth_expired' and terminates when the access token reaches expiration.
      - Drains resources and unsubscribes cleanly upon client disconnect.
    """
    sub = hub.subscribe(channels=channels, queue_max=QUEUE_MAX)
    try:
        # 1. Last-Event-ID Replay
        if last_event_id:
            replayed = hub.replay_after(last_event_id, channels)
            if replayed is None:
                # Requested history is unavailable or invalid: instruct client to resync
                yield format_sse("resync", {"reason": "history_unavailable"})
            else:
                for ev in replayed:
                    yield format_sse(ev.event, ev.data, event_id=ev.id)

        # 2. Main Streaming Loop
        while True:
            # Check for client disconnect
            if request is not None and hasattr(request, "is_disconnected"):
                is_disc = request.is_disconnected()
                if asyncio.iscoroutine(is_disc):
                    if await is_disc:
                        break
                elif is_disc:
                    break

            now_ts = time.time()
            if exp_timestamp is not None:
                seconds_until_exp = exp_timestamp - now_ts
                if seconds_until_exp <= 0.0:
                    logger.info("SSE stream: access token expired for user %s", user.id)
                    yield format_sse("auth_expired", {"reason": "token_expired"})
                    break
                timeout = min(float(heartbeat_s), max(0.01, seconds_until_exp))
            else:
                timeout = float(heartbeat_s)

            # Wait for next event or heartbeat timeout
            try:
                ev = await asyncio.wait_for(sub.queue.get(), timeout=timeout)
                # Check for queue overflow (slow consumer)
                if sub.overflowed:
                    logger.warning("SSE stream overflowed for user %s; sending resync", user.id)
                    yield format_sse("resync", {"reason": "buffer_overflow"})
                    break

                yield format_sse(ev.event, ev.data, event_id=ev.id)

            except TimeoutError:
                # Timeout reached: check if token expired during wait
                if exp_timestamp is not None and time.time() >= exp_timestamp:
                    yield format_sse("auth_expired", {"reason": "token_expired"})
                    break
                # Emit heartbeat comment line
                yield ": ping\n\n"

    finally:
        hub.unsubscribe(sub)
        logger.debug("SSE stream generator closed for user %s", user.id)


def extract_bearer_token(auth_header: str | None) -> str:
    """
    Extracts Bearer token strictly from the Authorization header.
    Query string tokens and cookies are strictly ignored for security.
    """
    if not auth_header:
        raise Unauthorized("Missing bearer token in Authorization header")

    parts = auth_header.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise Unauthorized("Authorization header must follow 'Bearer <token>' format")

    return parts[1]


# ============================================================================
# FastAPI Endpoint Integration (Active when FastAPI is loaded)
# ============================================================================

try:
    from fastapi import APIRouter, Header, Request
    from fastapi.responses import StreamingResponse

    router = APIRouter(prefix="/api/v1/stream", tags=["realtime"])

    @router.get("", response_class=StreamingResponse)
    async def sse_stream_endpoint(
        request: Request,
        authorization: str | None = Header(None, alias="Authorization"),
        last_event_id: str | None = Header(None, alias="Last-Event-ID"),
    ) -> StreamingResponse:
        """
        Server-Sent Events endpoint: GET /api/v1/stream
        Authenticates via Bearer header, queries channel authorization,
        releases the database connection, and streams events.
        """
        # 1. Authenticate bearer token
        token = extract_bearer_token(authorization)
        claims = decode_access_token(token)

        # 2. Database session check (releases connection before streaming begins)
        db = getattr(request.app.state, "db", None) if hasattr(request, "app") else None
        user = await service.authenticate_stream(db, claims)
        channels = await service.channels_for_user(db, user)

        # 3. Read Hub from application state
        hub = getattr(request.app.state, "hub", None) if hasattr(request, "app") else None
        if hub is None:
            # Fallback singleton hub if not explicitly attached
            hub = Hub()

        exp_ts = float(claims.get("exp")) if claims.get("exp") else None

        gen = stream_generator(
            hub=hub,
            user=user,
            channels=channels,
            last_event_id=last_event_id,
            exp_timestamp=exp_ts,
            heartbeat_s=HEARTBEAT_S,
            request=request,
        )

        return StreamingResponse(
            gen,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )

except ImportError:
    # Fallback APIRouter shim for non-FastAPI testing environments
    class APIRouter:  # type: ignore
        def __init__(self, *args, **kwargs):
            self.routes = []

        def get(self, *args, **kwargs):
            def decorator(fn):
                return fn

            return decorator

    router = APIRouter()
