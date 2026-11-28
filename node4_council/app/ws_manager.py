"""Asyncio-based WebSocket subscriber registry and broadcaster."""

from __future__ import annotations

import asyncio
import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Tracks subscribers and fans messages out to them concurrently."""

    def __init__(self, send_timeout_sec: float = 2.0) -> None:
        self._send_timeout_sec = send_timeout_sec
        # One lock per socket keeps frames from concurrent broadcasts ordered.
        self._clients: dict[WebSocket, asyncio.Lock] = {}

    @property
    def client_count(self) -> int:
        return len(self._clients)

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._clients[websocket] = asyncio.Lock()
        logger.info("WebSocket subscriber connected (%d active)", self.client_count)

    def disconnect(self, websocket: WebSocket) -> None:
        if self._clients.pop(websocket, None) is not None:
            logger.info("WebSocket subscriber removed (%d active)", self.client_count)

    async def broadcast(self, message: str) -> int:
        """Send ``message`` to every subscriber and return the delivery count.

        A subscriber that errors or stalls is dropped without delaying the others
        beyond the send timeout.
        """
        targets = list(self._clients.items())
        results = await asyncio.gather(
            *(self._send(websocket, lock, message) for websocket, lock in targets)
        )
        return sum(results)

    async def _send(self, websocket: WebSocket, lock: asyncio.Lock, message: str) -> bool:
        try:
            async with asyncio.timeout(self._send_timeout_sec):
                async with lock:
                    await websocket.send_text(message)
        except Exception as exc:  # One bad client must not fail the broadcast.
            logger.warning("Dropping WebSocket subscriber (%s)", type(exc).__name__)
            self.disconnect(websocket)
            await self._close(websocket, code=1011)
            return False
        return True

    async def _close(self, websocket: WebSocket, code: int) -> None:
        try:
            async with asyncio.timeout(self._send_timeout_sec):
                await websocket.close(code=code)
        except Exception as exc:  # The peer is usually already gone.
            logger.debug("WebSocket close skipped (%s)", type(exc).__name__)

    async def close_all(self) -> None:
        """Close every subscriber during service shutdown."""
        targets = list(self._clients)
        self._clients.clear()
        await asyncio.gather(*(self._close(websocket, code=1001) for websocket in targets))
