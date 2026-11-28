"""Asynchronous event bus for streaming simulation events to WebSocket subscribers."""
from __future__ import annotations

import asyncio
from typing import AsyncGenerator
from packages.domain.models import SimulationEvent


class EventBus:
    def __init__(self):
        self._subscribers: dict[str, list[asyncio.Queue[SimulationEvent]]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, run_id: str) -> asyncio.Queue[SimulationEvent]:
        queue: asyncio.Queue[SimulationEvent] = asyncio.Queue()
        async with self._lock:
            if run_id not in self._subscribers:
                self._subscribers[run_id] = []
            self._subscribers[run_id].append(queue)
        return queue

    async def unsubscribe(self, run_id: str, queue: asyncio.Queue[SimulationEvent]) -> None:
        async with self._lock:
            if run_id in self._subscribers:
                if queue in self._subscribers[run_id]:
                    self._subscribers[run_id].remove(queue)
                if not self._subscribers[run_id]:
                    del self._subscribers[run_id]

    async def publish(self, run_id: str, event: SimulationEvent) -> None:
        async with self._lock:
            queues = list(self._subscribers.get(run_id, []))
        for q in queues:
            await q.put(event)


event_bus = EventBus()
