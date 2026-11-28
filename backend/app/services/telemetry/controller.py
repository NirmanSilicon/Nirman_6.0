from __future__ import annotations

import asyncio
from typing import Any

from .simulator import replay_rows


class TelemetryController:
    # In-memory single-process prototype. Multi-worker deployments should use
    # a shared broker such as Redis for session state and message distribution.
    def __init__(self) -> None:
        self.state = "idle"
        self.engine_id: str | None = None
        self.data_source: str | None = None
        self.sequence = 0
        self.error: str | None = None
        self._task: asyncio.Task | None = None
        self._pause_event = asyncio.Event()
        self._pause_event.set()
        self._subscribers: set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()

    def status(self) -> dict[str, Any]:
        return {
            "state": self.state,
            "engine_id": self.engine_id,
            "data_source": self.data_source,
            "sequence": self.sequence,
            "error": self.error,
            "connected_subscribers": len(self._subscribers),
        }

    async def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        self._subscribers.discard(queue)

    async def _broadcast(self, message: dict[str, Any]) -> None:
        for queue in tuple(self._subscribers):
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                pass

    async def start(self, rows: list[dict[str, Any]], engine_id: str, interval_seconds: float, source: str = "CSV_REPLAY") -> None:
        async with self._lock:
            if self._task and not self._task.done():
                raise RuntimeError("A telemetry simulation is already running.")
            if not rows:
                raise ValueError("No telemetry rows were supplied.")
            if not 0 <= interval_seconds <= 60:
                raise ValueError("interval_seconds must be between 0 and 60.")
            self.engine_id = engine_id
            self.data_source = source
            self.sequence = 0
            self.error = None
            self.state = "running"
            self._pause_event.set()
            self._task = asyncio.create_task(self._run(rows, interval_seconds, source))

    async def _run(self, rows: list[dict[str, Any]], interval_seconds: float, source: str) -> None:
        try:
            async for message in replay_rows(rows, interval_seconds, source=source):
                await self._pause_event.wait()
                self.sequence = message["sequence"]
                await self._broadcast(message)
            self.state = "completed"
        except asyncio.CancelledError:
            self.state = "stopped"
            raise
        except Exception as exc:
            self.error = str(exc)
            self.state = "error"

    async def pause(self) -> None:
        if self.state != "running":
            raise RuntimeError("Only a running simulation can be paused.")
        self._pause_event.clear()
        self.state = "paused"

    async def resume(self) -> None:
        if self.state != "paused":
            raise RuntimeError("Only a paused simulation can be resumed.")
        self.state = "running"
        self._pause_event.set()

    async def stop(self) -> None:
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self.state = "stopped"
