"""
ParkSMART - Ingestion MQTT Consumer (File 80 / M2 Ownership)

Responsibility:
Long-lived MQTT subscriber that converts broker messages into validated ingestion calls:
- Subscribes to topic filters: parksmart/+/+/occupancy, crowd, health at QoS 1.
- Topic format enforcement: exactly 4 segments, UUID zone, UUID camera.
- Maximum payload limit: 262,144 bytes.
- Routes messages to ingestion service and commits transactions.
- Reconnection with exponential backoff on broker outages.
- Never logs credentials, payload contents, or device secrets.
- Never persists frames or detection crops to disk.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Any

from app.modules.ingestion import repository as repo
from app.modules.ingestion import service
from app.modules.ingestion.service import IngestResult
from app.modules.ingestion.validator import IngestRejected

logger = logging.getLogger("parksmart.ingestion.mqtt_consumer")

TOPIC_FILTERS = [
    "parksmart/+/+/occupancy",
    "parksmart/+/+/crowd",
    "parksmart/+/+/health",
]
QOS = 1
MAX_PAYLOAD_BYTES = 262144  # 256 KB
BACKOFF_STEPS_S = (1, 2, 5, 10, 30)


class MqttConsumer:
    """
    Background MQTT ingestion subscriber connecting broker traffic to the
    state_manager and database pipeline.
    """

    def __init__(
        self,
        settings: Any = None,
        session_factory: Any = None,
        hub: Any = None,
    ):
        self.settings = settings
        self.session_factory = session_factory
        self.hub = hub
        self.stop_event = asyncio.Event()
        self.connected: bool = False
        self.stats: dict[str, int] = {
            "received": 0,
            "accepted": 0,
            "duplicates": 0,
            "rejected_invalid": 0,
            "rejected_future": 0,
            "rejected_unknown_camera": 0,
            "errors": 0,
        }

    def stop(self) -> None:
        """Signals the background subscriber loop to terminate."""
        self.stop_event.set()

    def parse_topic(self, topic: str) -> tuple[uuid.UUID, uuid.UUID, str]:
        """
        Parses and verifies MQTT topic:
        Format: parksmart/{zone_id}/{camera_id}/{kind}
        Requires exactly 4 segments; segments 1 & 2 must be valid UUIDs;
        segment 3 must be in ('occupancy', 'crowd', 'health').
        """
        parts = topic.strip("/").split("/")
        if len(parts) != 4:
            raise IngestRejected(
                "bad_topic",
                {"topic": topic, "message": f"Expected 4 topic segments, got {len(parts)}"},
            )
        if parts[0] != "parksmart":
            raise IngestRejected(
                "bad_topic",
                {"topic": topic, "message": f"Topic root must be 'parksmart', got '{parts[0]}'"},
            )

        try:
            zone_id = uuid.UUID(parts[1])
        except (ValueError, TypeError):
            raise IngestRejected(
                "bad_topic",
                {"topic": topic, "message": f"Invalid zone UUID segment: {parts[1]}"},
            )

        try:
            camera_id = uuid.UUID(parts[2])
        except (ValueError, TypeError):
            raise IngestRejected(
                "bad_topic",
                {"topic": topic, "message": f"Invalid camera UUID segment: {parts[2]}"},
            )

        kind = parts[3].lower()
        if kind not in ("occupancy", "crowd", "health"):
            raise IngestRejected(
                "bad_topic",
                {"topic": topic, "message": f"Invalid topic kind: '{kind}'"},
            )

        return zone_id, camera_id, kind

    async def process_message(
        self,
        topic: str,
        payload: bytes | str,
        now: datetime | None = None,
    ) -> IngestResult | None:
        """
        Core worker processing an inbound MQTT message through the full
        validation, deduplication, and database pipeline.
        Can be called directly by integration tests or live MQTT client.
        """
        if self.session_factory is not None:
            res = self.session_factory()
            if hasattr(res, "__aenter__"):
                async with res as session:
                    return await self._process_with_session(session, topic, payload, now)
            return await self._process_with_session(res, topic, payload, now)
        return await self._process_with_session(None, topic, payload, now)

    async def _process_with_session(
        self,
        session: Any,
        topic: str,
        payload: bytes | str,
        now: datetime | None = None,
    ) -> IngestResult | None:
        """Internal worker executing message validation and persistence within an active session."""
        self.stats["received"] += 1

        raw_bytes = payload.encode("utf-8") if isinstance(payload, str) else payload
        if len(raw_bytes) > MAX_PAYLOAD_BYTES:
            self.stats["rejected_invalid"] += 1
            logger.warning(
                "Rejected payload exceeding MAX_PAYLOAD_BYTES (%d > %d) on topic %s",
                len(raw_bytes),
                MAX_PAYLOAD_BYTES,
                topic,
            )
            return None

        # Parse JSON
        try:
            data = json.loads(raw_bytes.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as e:
            self.stats["rejected_invalid"] += 1
            logger.warning("Malformed JSON payload on topic %s: %s", topic, e)
            return None

        # Parse Topic
        try:
            zone_id, camera_id, kind = self.parse_topic(topic)
        except IngestRejected as e:
            self.stats["rejected_invalid"] += 1
            logger.warning("Rejected invalid topic format %s: %s", topic, e)
            return None

        # Load Camera
        camera = await repo.get_camera(session, camera_id)
        if camera is None:
            self.stats["rejected_unknown_camera"] += 1
            logger.warning("Rejected message for unknown/unregistered camera %s on %s", camera_id, topic)
            return None

        # Check camera active and zone alignment
        is_active = getattr(camera, "is_active", True)
        if not is_active:
            self.stats["rejected_invalid"] += 1
            logger.warning("Rejected message from inactive camera %s on %s", camera_id, topic)
            return None

        camera_zone_id = getattr(camera, "zone_id", None)
        if camera_zone_id and uuid.UUID(str(camera_zone_id)) != zone_id:
            self.stats["rejected_invalid"] += 1
            logger.warning(
                "Rejected topic zone mismatch for camera %s (topic: %s, camera: %s)",
                camera_id,
                zone_id,
                camera_zone_id,
            )
            return None

        # Process by message kind
        try:
            if kind == "occupancy":
                result = await service.handle_occupancy(
                    session,
                    camera,
                    data,
                    hub=self.hub,
                    now=now,
                    topic_zone=zone_id,
                    settings=self.settings,
                )
            elif kind == "crowd":
                result = await service.handle_crowd(
                    session,
                    camera,
                    data,
                    hub=self.hub,
                    now=now,
                    topic_zone=zone_id,
                    settings=self.settings,
                )
            elif kind == "health":
                from_lwt = False
                if isinstance(data, dict) and data.get("state") == "offline":
                    from_lwt = True
                result = await service.handle_health(
                    session,
                    camera,
                    data,
                    hub=self.hub,
                    now=now,
                    topic_zone=zone_id,
                    settings=self.settings,
                    from_lwt=from_lwt,
                )
            else:
                return None

            # Update stats
            if result.duplicate:
                self.stats["duplicates"] += 1
                logger.info("[MQTT CONSUMER] Duplicate message processed idempotently on %s", topic)
            else:
                self.stats["accepted"] += 1
                logger.info(
                    "[MQTT CONSUMER] Accepted %s on %s (applied=%d, stale=%d)",
                    kind.upper(),
                    topic,
                    result.applied_bays,
                    result.stale_bays,
                )

            # Commit session if applicable
            if hasattr(session, "commit"):
                if asyncio.iscoroutinefunction(session.commit):
                    await session.commit()
                else:
                    session.commit()

            # Publish realtime events only after database transaction commits
            if self.hub is not None and result and result.events:
                zone_channel = f"zone:{zone_id}" if zone_id else "system"
                for ev in result.events:
                    try:
                        ev_name = ev.get("event", "update")
                        ev_data = ev.get("data", {})
                        if hasattr(self.hub, "publish"):
                            res_pub = self.hub.publish(zone_channel, ev_name, ev_data)
                            if asyncio.iscoroutine(res_pub):
                                await res_pub
                    except (RuntimeError, ValueError, TypeError, OSError, AttributeError) as pub_err:
                        logger.error("Failed to publish event to hub: %s", pub_err)

            return result

        except IngestRejected as e:
            if hasattr(session, "rollback"):
                if asyncio.iscoroutinefunction(session.rollback):
                    await session.rollback()
                else:
                    session.rollback()

            if e.reason == "future_timestamp":
                self.stats["rejected_future"] += 1
                logger.warning("[MQTT CONSUMER] Rejected future timestamp on %s: %s", topic, e)
            else:
                self.stats["rejected_invalid"] += 1
                logger.warning("[MQTT CONSUMER] Ingestion rejected on %s: %s", topic, e)
            return None

        except Exception:
            if hasattr(session, "rollback"):
                if asyncio.iscoroutinefunction(session.rollback):
                    await session.rollback()
                else:
                    session.rollback()

            self.stats["errors"] += 1
            logger.exception("[MQTT CONSUMER] Error handling message on %s", topic)
            return None

    async def _handle(self, topic: str, payload: bytes | str) -> None:
        """Handler invoked for live MQTT messages."""
        await self.process_message(topic, payload)

    async def _session(self) -> None:
        """Manages single MQTT broker connection session using aiomqtt if available."""
        try:
            import aiomqtt
        except ImportError:
            logger.warning("aiomqtt library not installed; live MQTT listening loop deferred to container.")
            await asyncio.sleep(5)
            return

        hostname = getattr(self.settings, "mqtt_host", "mosquitto")
        port = int(getattr(self.settings, "mqtt_port", 8883))
        username = getattr(self.settings, "mqtt_username", None)
        password = getattr(self.settings, "mqtt_password", None)
        use_tls = bool(getattr(self.settings, "mqtt_tls", True))
        ca_file = getattr(self.settings, "mqtt_ca_file", None)

        tls_params = None
        if use_tls:
            tls_params = aiomqtt.TLSParameters(ca_certs=ca_file) if ca_file else aiomqtt.TLSParameters()

        async with aiomqtt.Client(
            hostname=hostname,
            port=port,
            username=username,
            password=password,
            tls_params=tls_params,
            identifier="parksmart-backend",
        ) as client:
            self.connected = True
            logger.info("MqttConsumer connected to broker %s:%d (TLS=%s)", hostname, port, use_tls)
            for f in TOPIC_FILTERS:
                await client.subscribe(f, qos=QOS)

            async for message in client.messages:
                if self.stop_event.is_set():
                    break
                try:
                    await self._handle(str(message.topic), message.payload)
                except Exception:
                    logger.exception("Error in message handler")

        self.connected = False

    async def run_forever(self) -> None:
        """Resilient background loop with exponential backoff on broker outages."""
        attempt = 0
        while not self.stop_event.is_set():
            try:
                await self._session()
                attempt = 0
            except (asyncio.CancelledError, KeyboardInterrupt):
                break
            except Exception:
                self.connected = False
                wait_sec = BACKOFF_STEPS_S[min(attempt, 4)]
                logger.exception(
                    "MQTT consumer disconnected/unavailable. Retrying in %ds (attempt %d)...",
                    wait_sec,
                    attempt + 1,
                )
                attempt += 1
                try:
                    await asyncio.wait_for(self.stop_event.wait(), timeout=wait_sec)
                except TimeoutError:
                    pass
