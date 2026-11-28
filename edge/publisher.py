"""
ParkSMART - Edge MQTT Telemetry Publisher (File 155 / M2 Ownership)

Responsibility:
Publishes edge vision telemetry (occupancy, crowd, health) to the MQTT broker under:
  parksmart/{zone_id}/{camera_id}/occupancy
  parksmart/{zone_id}/{camera_id}/crowd
  parksmart/{zone_id}/{camera_id}/health

Key Requirements:
- Strictly MQTT QoS 1 for all publications.
- Configurable broker host, port, credentials, and TLS settings (default port 8883 with TLS).
- Configures Last Will and Testament (LWT) on health topic to mark camera offline if disconnected.
- Graceful shutdown publishes offline HealthMessage and disconnects cleanly.
- Never logs credentials or secrets.
"""

from __future__ import annotations

import asyncio
import json
import logging
import ssl
import struct
import uuid
from datetime import UTC, datetime
from typing import Any

from edge.config import MqttConfig

logger = logging.getLogger("parksmart.edge.publisher")


class AsyncMqttClient:
    """
    Lightweight, pure-Python asyncio MQTT 3.1.1 client supporting:
      - TLS/SSL (port 8883) or TCP (port 1883)
      - Username & password authentication
      - QoS 1 publishing with PUBACK acknowledgment
      - Last Will and Testament (LWT)
      - Clean DISCONNECT
    """

    def __init__(
        self,
        host: str,
        port: int,
        client_id: str | None = None,
        username: str | None = None,
        password: str | None = None,
        tls: bool = True,
        ca_file: str | None = None,
        insecure_tls: bool = False,
        keepalive: int = 60,
        lwt_topic: str | None = None,
        lwt_payload: bytes | None = None,
        lwt_qos: int = 1,
    ):
        self.host = host
        self.port = port
        self.client_id = client_id or f"parksmart-edge-{uuid.uuid4().hex[:8]}"
        self.username = username
        self.password = password
        self.tls = tls
        self.ca_file = ca_file
        self.insecure_tls = insecure_tls
        self.keepalive = keepalive
        self.lwt_topic = lwt_topic
        self.lwt_payload = lwt_payload
        self.lwt_qos = lwt_qos

        self.reader: asyncio.StreamReader | None = None
        self.writer: asyncio.StreamWriter | None = None
        self._packet_id: int = 1
        self._connected: bool = False
        self._read_task: asyncio.Task | None = None
        self._puback_waiters: dict[int, asyncio.Future[None]] = {}
        self._closed: bool = False

    def _next_packet_id(self) -> int:
        pid = self._packet_id
        self._packet_id = (self._packet_id % 65535) + 1
        return pid

    @staticmethod
    def _encode_varlen(length: int) -> bytes:
        buf = bytearray()
        while True:
            d = length % 128
            length //= 128
            if length > 0:
                d |= 0x80
            buf.append(d)
            if length == 0:
                break
        return bytes(buf)

    @staticmethod
    async def _decode_varlen(reader: asyncio.StreamReader) -> int:
        multiplier = 1
        value = 0
        while True:
            b = await reader.readexactly(1)
            digit = b[0]
            value += (digit & 0x7F) * multiplier
            multiplier *= 128
            if multiplier > 128 * 128 * 128:
                raise ValueError("Malformed MQTT variable length integer")
            if (digit & 0x80) == 0:
                break
        return value

    async def connect(self) -> None:
        """Establishes TCP/TLS connection and performs MQTT CONNECT/CONNACK handshake."""
        ssl_ctx: ssl.SSLContext | None = None
        if self.tls:
            ssl_ctx = ssl.create_default_context()
            if self.insecure_tls:
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl.CERT_NONE
            elif self.ca_file:
                ssl_ctx.load_verify_locations(cafile=self.ca_file)

        logger.info(
            "Connecting edge MQTT client to %s:%d (tls=%s, client_id=%s)",
            self.host,
            self.port,
            self.tls,
            self.client_id,
        )

        try:
            self.reader, self.writer = await asyncio.wait_for(
                asyncio.open_connection(self.host, self.port, ssl=ssl_ctx),
                timeout=15.0,
            )
        except Exception as e:
            raise ConnectionError(f"Failed to connect to MQTT broker {self.host}:{self.port}: {e}") from e

        # Construct CONNECT packet
        protocol_name = b"MQTT"
        protocol_level = 4  # 3.1.1
        connect_flags = 0x02  # Clean session

        if self.lwt_topic and self.lwt_payload:
            connect_flags |= 0x04  # Will flag
            connect_flags |= (self.lwt_qos & 0x03) << 3  # Will QoS

        if self.username:
            connect_flags |= 0x80
        if self.password:
            connect_flags |= 0x40

        # Variable header
        var_header = (
            struct.pack("!H", len(protocol_name))
            + protocol_name
            + struct.pack("!BBH", protocol_level, connect_flags, self.keepalive)
        )

        # Payload
        cid_bytes = self.client_id.encode("utf-8")
        payload = struct.pack("!H", len(cid_bytes)) + cid_bytes

        if self.lwt_topic and self.lwt_payload:
            topic_bytes = self.lwt_topic.encode("utf-8")
            payload += struct.pack("!H", len(topic_bytes)) + topic_bytes
            payload += struct.pack("!H", len(self.lwt_payload)) + self.lwt_payload

        if self.username:
            u_bytes = self.username.encode("utf-8")
            payload += struct.pack("!H", len(u_bytes)) + u_bytes
        if self.password:
            p_bytes = self.password.encode("utf-8")
            payload += struct.pack("!H", len(p_bytes)) + p_bytes

        rem_len = len(var_header) + len(payload)
        packet = bytes([0x10]) + self._encode_varlen(rem_len) + var_header + payload

        self.writer.write(packet)
        await self.writer.drain()

        # Read CONNACK
        header = await self.reader.readexactly(1)
        if header[0] != 0x20:
            raise ConnectionError(f"Expected CONNACK (0x20), got 0x{header[0]:02x}")
        rem_len = await self._decode_varlen(self.reader)
        ack_body = await self.reader.readexactly(rem_len)
        return_code = ack_body[1]
        if return_code != 0:
            raise ConnectionError(f"MQTT connection refused by broker with code: {return_code}")

        self._connected = True
        self._read_task = asyncio.create_task(self._reader_loop())
        logger.info("Edge MQTT client successfully connected and authenticated.")

    async def _reader_loop(self) -> None:
        """Background reader for incoming PUBACK and PINGRESP packets."""
        try:
            while self._connected and not self._closed and self.reader:
                header = await self.reader.read(1)
                if not header:
                    break
                packet_type = header[0] & 0xF0
                rem_len = await self._decode_varlen(self.reader)
                body = await self.reader.readexactly(rem_len)

                if packet_type == 0x40:  # PUBACK
                    packet_id = struct.unpack("!H", body[:2])[0]
                    fut = self._puback_waiters.pop(packet_id, None)
                    if fut and not fut.done():
                        fut.set_result(None)
                elif packet_type == 0xD0:  # PINGRESP
                    pass
        except asyncio.CancelledError:
            pass
        except (OSError, ValueError, asyncio.IncompleteReadError, RuntimeError) as e:
            if not self._closed:
                logger.warning("MQTT reader encountered error: %s", e)
        finally:
            self._connected = False

    async def publish(self, topic: str, payload: bytes | str, qos: int = 1, timeout: float = 10.0) -> None:
        """Publishes a message to the broker with QoS 1 PUBACK confirmation."""
        if not self._connected or not self.writer:
            raise ConnectionError("Cannot publish: MQTT client is not connected.")

        if isinstance(payload, str):
            payload_bytes = payload.encode("utf-8")
        else:
            payload_bytes = payload

        topic_bytes = topic.encode("utf-8")
        packet_id = self._next_packet_id()

        # Variable header for QoS 1
        var_header = struct.pack("!H", len(topic_bytes)) + topic_bytes + struct.pack("!H", packet_id)
        rem_len = len(var_header) + len(payload_bytes)

        # Fixed header: PUBLISH (0x30) | QoS 1 (0x02) = 0x32
        packet = bytes([0x32]) + self._encode_varlen(rem_len) + var_header + payload_bytes

        loop = asyncio.get_running_loop()
        ack_fut: asyncio.Future[None] = loop.create_future()
        self._puback_waiters[packet_id] = ack_fut

        self.writer.write(packet)
        await self.writer.drain()

        try:
            await asyncio.wait_for(ack_fut, timeout=timeout)
        except TimeoutError:
            self._puback_waiters.pop(packet_id, None)
            raise TimeoutError(f"MQTT publish PUBACK timed out after {timeout}s for packet_id {packet_id}")

    async def disconnect(self) -> None:
        """Sends clean DISCONNECT packet and closes the transport."""
        self._closed = True
        self._connected = False
        if self._read_task:
            self._read_task.cancel()
            try:
                await self._read_task
            except asyncio.CancelledError:
                pass
        if self.writer:
            try:
                self.writer.write(bytes([0xE0, 0x00]))  # DISCONNECT
                await self.writer.drain()
            except (OSError, RuntimeError) as e:
                logger.debug("Ignored error sending MQTT DISCONNECT: %s", e)
            try:
                self.writer.close()
                await self.writer.wait_closed()
            except (OSError, RuntimeError) as e:
                logger.debug("Ignored error closing MQTT transport: %s", e)
            finally:
                self.writer = None
                self.reader = None
        logger.info("Edge MQTT client disconnected.")


class EdgeTelemetryPublisher:
    """
    High-level telemetry publisher managing topic hierarchy, LWT, and QoS 1.
    """

    def __init__(
        self,
        config: MqttConfig,
        camera_id: str,
        zone_id: str,
        dry_run: bool = False,
    ):
        self.config = config
        self.camera_id = str(uuid.UUID(str(camera_id)))
        self.zone_id = str(uuid.UUID(str(zone_id)))
        self.dry_run = dry_run

        # Topics
        self.occupancy_topic = f"parksmart/{self.zone_id}/{self.camera_id}/occupancy"
        self.crowd_topic = f"parksmart/{self.zone_id}/{self.camera_id}/crowd"
        self.health_topic = f"parksmart/{self.zone_id}/{self.camera_id}/health"

        # LWT payload: offline HealthMessage
        lwt_health = {
            "schema_version": 1,
            "msg_id": str(uuid.uuid4()),
            "ts": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "camera_id": self.camera_id,
            "state": "offline",
            "fps": None,
            "errors": ["Camera disconnected unexpectedly (LWT triggered)"],
            "model_version": None,
            "uptime_s": None,
            "provenance": "observed",
        }
        self._lwt_payload_bytes = json.dumps(lwt_health).encode("utf-8")

        self._client: AsyncMqttClient | None = None
        self._published_messages: list[dict[str, Any]] = []  # For verification / testing

    async def start(self) -> None:
        """Connects to the broker unless dry_run is active."""
        if self.dry_run:
            logger.info("Publisher started in dry_run mode; MQTT socket will not connect.")
            return

        self._client = AsyncMqttClient(
            host=self.config.broker_host,
            port=self.config.broker_port,
            client_id=f"parksmart-edge-{self.camera_id[:8]}",
            username=self.config.username,
            password=self.config.password,
            tls=self.config.tls,
            ca_file=self.config.ca_cert,
            insecure_tls=self.config.insecure_tls,
            lwt_topic=self.health_topic,
            lwt_payload=self._lwt_payload_bytes,
            lwt_qos=1,
        )
        await self._client.connect()

    async def publish_occupancy(self, payload: dict[str, Any]) -> None:
        """Publishes an OccupancyMessage with QoS 1."""
        body = json.dumps(payload)
        self._published_messages.append({
            "topic": self.occupancy_topic,
            "payload": payload,
            "delivered": not self.dry_run,
        })
        if not self.dry_run and self._client:
            await self._client.publish(self.occupancy_topic, body, qos=1)
            logger.info("Published occupancy payload (msg_id=%s) to %s (QoS 1)", payload.get("msg_id"), self.occupancy_topic)
        else:
            logger.debug("[DRY-RUN] Occupancy payload validated locally (msg_id=%s); broker delivery skipped", payload.get("msg_id"))

    async def publish_crowd(self, payload: dict[str, Any]) -> None:
        """Publishes a CrowdMessage with QoS 1."""
        body = json.dumps(payload)
        self._published_messages.append({
            "topic": self.crowd_topic,
            "payload": payload,
            "delivered": not self.dry_run,
        })
        if not self.dry_run and self._client:
            await self._client.publish(self.crowd_topic, body, qos=1)
            logger.info("Published crowd payload (msg_id=%s) to %s (QoS 1)", payload.get("msg_id"), self.crowd_topic)
        else:
            logger.debug("[DRY-RUN] Crowd payload validated locally (msg_id=%s); broker delivery skipped", payload.get("msg_id"))

    async def publish_health(self, payload: dict[str, Any]) -> None:
        """Publishes a HealthMessage with QoS 1."""
        body = json.dumps(payload)
        self._published_messages.append({
            "topic": self.health_topic,
            "payload": payload,
            "delivered": not self.dry_run,
        })
        if not self.dry_run and self._client:
            await self._client.publish(self.health_topic, body, qos=1)
            logger.info("Published health payload (msg_id=%s, state=%s) to %s (QoS 1)", payload.get("msg_id"), payload.get("state"), self.health_topic)
        else:
            logger.debug("[DRY-RUN] Health payload validated locally (msg_id=%s, state=%s); broker delivery skipped", payload.get("msg_id"), payload.get("state"))

    async def stop(self) -> None:
        """Sends clean offline HealthMessage and disconnects."""
        if not self.dry_run and self._client:
            try:
                offline_msg = {
                    "schema_version": 1,
                    "msg_id": str(uuid.uuid4()),
                    "ts": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "camera_id": self.camera_id,
                    "state": "offline",
                    "fps": 0.0,
                    "errors": ["Clean shutdown"],
                    "model_version": None,
                    "uptime_s": None,
                    "provenance": "observed",
                }
                await self.publish_health(offline_msg)
            except (OSError, TimeoutError, ConnectionError, RuntimeError) as e:
                logger.warning("Failed to publish clean offline health message: %s", e)
            finally:
                await self._client.disconnect()
                self._client = None
