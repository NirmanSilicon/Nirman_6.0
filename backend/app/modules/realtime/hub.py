"""
ParkSMART - Realtime In-Process Pub/Sub Hub and Buffer (File 93 / M2 Ownership)

Responsibility:
In-process pub/sub hub with a bounded replay ring buffer, subscription management,
channel-based filtering, and integration with PostgreSQL LISTEN/NOTIFY.
"""

from __future__ import annotations

import asyncio
import itertools
import json
import logging
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("parksmart.realtime.hub")

BUFFER_SIZE = 1000  # Bounded ring buffer size (memory safety bound)
LISTEN_CHANNEL = "parksmart_events"
BACKOFF_STEPS_S = (1, 2, 5, 10, 30)


@dataclass(frozen=True)
class HubEvent:
    """Immutable real-time event envelope distributed through the hub."""

    id: str  # Format: "{epoch}-{seq}"
    channel: str  # e.g. "zone:<id>", "ops:devices", "business:<id>", "user:<id>"
    event: str  # e.g. "bay_changed", "zone_summary", "device_health", "resync"
    data: dict[str, Any]
    created_at: float = field(default_factory=time.time)


@dataclass(eq=False)
class Subscription:
    """Active subscriber registration with bounded event queue."""

    channels: set[str]
    queue: asyncio.Queue[HubEvent]
    overflowed: bool = False


def channel_allowed(channels: set[str], channel: str) -> bool:
    """
    Evaluates whether a target channel matches a subscriber's allowed channels:
      - Exact match: e.g. "ops:devices" in channels.
      - Universal wildcard: "*" matches any channel.
      - Zone wildcard: "zone:*" matches any "zone:<zone_id>".
      - Ops wildcard: "ops:*" matches any "ops:<component>".
      - Broadcast match: target "zone:*" matches subscribers with "zone:*" or any "zone:<id>".
    """
    if "*" in channels or channel in channels:
        return True

    # Zone wildcard expansion
    if "zone:*" in channels and channel.startswith("zone:"):
        return True

    # Ops wildcard expansion
    if "ops:*" in channels and channel.startswith("ops:"):
        return True

    # Hub broadcast to all zone subscribers
    return channel == "zone:*" and any(c.startswith("zone:") or c == "zone:*" for c in channels)


class Hub:
    """
    In-process Pub/Sub Hub providing:
      - Fast, non-blocking in-memory event fanout.
      - Bounded circular buffer of recent events for reconnection replay.
      - Epoch-scoped sequence IDs preventing stale cross-restart replay.
      - Automatic slow-consumer detection and overflow signalling.
    """

    def __init__(self, buffer_size: int = BUFFER_SIZE):
        self.epoch: str = uuid.uuid4().hex[:8]
        self._seq = itertools.count(1)
        self._buffer: deque[HubEvent] = deque(maxlen=max(10, buffer_size))
        self._subs: set[Subscription] = set()
        self._closed: bool = False
        self._listener_task: asyncio.Task | None = None

    def subscriber_count(self) -> int:
        """Returns the number of active stream subscriptions."""
        return len(self._subs)

    def subscribe(self, channels: set[str], queue_max: int = 100) -> Subscription:
        """
        Registers a new client stream subscription with a bounded queue.
        Bounded queue prevents slow consumers from causing server memory leaks.
        """
        sub = Subscription(
            channels=set(channels),
            queue=asyncio.Queue(maxsize=max(1, queue_max)),
            overflowed=False,
        )
        self._subs.add(sub)
        logger.debug("Hub: new subscription registered (total=%d)", len(self._subs))
        return sub

    def unsubscribe(self, sub: Subscription) -> None:
        """Removes a stream subscription upon client disconnect or termination."""
        self._subs.discard(sub)
        logger.debug("Hub: subscription discarded (remaining=%d)", len(self._subs))

    def publish(self, channel: str, event: str, data: dict[str, Any]) -> HubEvent:
        """
        Publishes an event to matching subscribers and appends it to the replay buffer.
        Non-blocking: never awaits and never stalls publishers.
        """
        n = next(self._seq)
        event_id = f"{self.epoch}-{n}"
        ev = HubEvent(id=event_id, channel=channel, event=event, data=dict(data))

        # Append to bounded replay buffer
        self._buffer.append(ev)

        # Fanout to allowed subscribers
        for sub in list(self._subs):
            if channel_allowed(sub.channels, channel):
                try:
                    sub.queue.put_nowait(ev)
                except asyncio.QueueFull:
                    # Slow consumer detected: flag overflow so stream sends resync
                    sub.overflowed = True
                    logger.warning("Hub subscriber queue full (channels=%s); marked overflowed", sub.channels)

        return ev

    def replay_after(
        self,
        last_event_id: str | None,
        channels: set[str],
    ) -> list[HubEvent] | None:
        """
        Replays missed events following a client reconnection:
          - Returns [] if last_event_id is None (new connection without replay requested).
          - Returns None if last_event_id has wrong epoch, malformed ID, or sequence is older
            than the ring buffer's oldest preserved item (signals client must resync over REST).
          - Returns matching events strictly newer than requested ID in sequence order.
        """
        if not last_event_id:
            return []

        parts = last_event_id.strip().split("-")
        if len(parts) != 2:
            logger.info("Replay rejected: malformed Last-Event-ID format '%s'", last_event_id)
            return None

        req_epoch, req_seq_str = parts[0], parts[1]
        if req_epoch != self.epoch:
            logger.info("Replay rejected: epoch mismatch (%s != current %s)", req_epoch, self.epoch)
            return None

        try:
            req_seq = int(req_seq_str)
        except ValueError:
            return None

        if not self._buffer:
            # Buffer empty: if client asks for sequence 0 or exact position, return empty list
            return [] if req_seq == 0 else None

        oldest_seq = int(self._buffer[0].id.split("-")[1])
        newest_seq = int(self._buffer[-1].id.split("-")[1])

        # If requested ID is older than what we retained, events were permanently lost
        if req_seq < oldest_seq - 1:
            logger.info("Replay rejected: requested seq %d < oldest buffer seq %d", req_seq, oldest_seq)
            return None

        # If requested ID is from the future (higher than newest)
        if req_seq > newest_seq:
            logger.info("Replay rejected: requested seq %d > newest buffer seq %d", req_seq, newest_seq)
            return None

        # Collect events strictly newer than requested sequence matching channel filter
        replayed: list[HubEvent] = []
        for ev in self._buffer:
            ev_seq = int(ev.id.split("-")[1])
            if ev_seq > req_seq and channel_allowed(channels, ev.channel):
                replayed.append(ev)

        return replayed

    async def run_listener(self, settings: Any = None) -> None:
        """
        Maintains connection to PostgreSQL LISTEN channel for cross-process worker notifications.
        Gracefully handles disconnection with exponential backoff and publishes 'resync' on restore.
        """
        attempt = 0
        while not self._closed:
            try:
                import asyncpg
            except ImportError:
                logger.warning("asyncpg not installed; in-process hub operating in standalone mode.")
                return

            dsn = getattr(settings, "database_url", "")
            if not dsn:
                return
            clean_dsn = dsn.replace("postgresql+asyncpg://", "postgresql://")

            try:
                conn = await asyncpg.connect(clean_dsn)
                attempt = 0

                def notification_callback(_connection, _pid, _channel, payload: str):
                    try:
                        parsed = json.loads(payload)
                        ch = parsed.get("channel", "system")
                        ev = parsed.get("event", "update")
                        data = parsed.get("data", {})
                        self.publish(ch, ev, data)
                    except (json.JSONDecodeError, TypeError, ValueError, AttributeError) as err:
                        logger.warning("Malformed PG notification payload: %s", err)

                await conn.add_listener(LISTEN_CHANNEL, notification_callback)
                logger.info("Hub connected to PostgreSQL LISTEN %s", LISTEN_CHANNEL)

                # Broadcast resync to all zone subscribers after successful reconnect
                self.publish("zone:*", "resync", {})

                while not self._closed and not conn.is_closed():
                    await asyncio.sleep(30)
                    await conn.fetchval("SELECT 1")

                await conn.close()
            except asyncio.CancelledError:
                break
            except Exception:
                wait_sec = BACKOFF_STEPS_S[min(attempt, 4)]
                logger.exception("Hub LISTEN connection dropped; retrying in %ds...", wait_sec)
                attempt += 1
                await asyncio.sleep(wait_sec)

    async def close(self) -> None:
        """Clean shutdown: signals resync to open subscribers and drains resources."""
        self._closed = True
        logger.info("Closing Realtime Hub; publishing shutdown resync to %d subscribers", len(self._subs))
        for sub in list(self._subs):
            try:
                shutdown_ev = HubEvent(
                    id=f"{self.epoch}-0",
                    channel="system",
                    event="resync",
                    data={"reason": "server_shutdown"},
                )
                sub.queue.put_nowait(shutdown_ev)
            except (asyncio.QueueFull, RuntimeError) as err:
                logger.debug("Skipped shutdown resync for subscriber: %s", err)
        self._subs.clear()


_DEFAULT_HUB: Hub | None = None


def get_hub() -> Hub:
    """Returns the singleton default in-process realtime Hub instance."""
    global _DEFAULT_HUB
    if _DEFAULT_HUB is None:
        _DEFAULT_HUB = Hub()
    return _DEFAULT_HUB
