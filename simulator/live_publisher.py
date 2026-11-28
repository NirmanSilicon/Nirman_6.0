"""
ParkSMART - Simulator Live Publisher (File 156 / M2 Ownership)

Responsibility:
Publishes simulated real-time telemetry (occupancy, crowd, health) to the MQTT broker
under the topic tree:
  parksmart/{zone_id}/{camera_id}/occupancy
  parksmart/{zone_id}/{camera_id}/crowd
  parksmart/{zone_id}/{camera_id}/health

Key Constraints & Rules:
- MQTT QoS 1 for all event publications.
- Shared telemetry schemas matching edge detection payloads.
- Strict ISO 8601 UTC timestamps ending in 'Z'.
- Unique UUID msg_id for every message.
- Configurable broker host, port, credentials, TLS settings, zone, camera, and interval.
- Deployed configuration uses TLS on port 8883. Non-TLS allowed only if explicitly configured.
- Clean shutdown sends an offline HealthMessage.
- LWT (Last Will and Testament) configured to mark camera offline if abruptly disconnected.
- Never logs raw passwords or credentials.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import signal
import ssl
import struct
import sys
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable

import numpy as np

from simulator.profiles import (
    PROFILES,
    SIMULATED_NOTICE,
    generate_crowd_message,
    generate_health_message,
    generate_occupancy_message,
    occupancy_fraction,
    pedestrian_level,
    step_bay_states,
)

logger = logging.getLogger("parksmart.simulator.publisher")


# ============================================================================
# Configuration Data Model
# ============================================================================


@dataclass
class CameraTarget:
    """Represents a simulated camera and its monitored bays."""

    camera_id: str
    zone_id: str
    bay_ids: list[str]
    profile_name: str = "commercial_core"
    current_states: dict[str, str] = field(default_factory=dict)


@dataclass
class PublisherConfig:
    """Consolidated configuration for MQTT broker and publisher parameters."""

    broker_host: str = "localhost"
    broker_port: int = 8883
    username: str | None = None
    password: str | None = None
    tls: bool = True
    ca_file: str | None = None
    insecure_tls: bool = False
    interval_s: int = 10
    targets: list[CameraTarget] = field(default_factory=list)
    skew_s: int = 0
    drop_camera: str | None = None
    dry_run: bool = False
    count: int = 0  # 0 = infinite loop
    verify: bool = False


# ============================================================================
# Minimal Async MQTT 3.1.1 Client (Zero external dependency fallback)
# ============================================================================


class AsyncMqtt311Client:
    """
    Lightweight, pure-Python asyncio MQTT 3.1.1 client supporting:
      - TLS/SSL or TCP connections
      - Username & password authentication
      - QoS 1 publishing with PUBACK confirmation
      - Last Will and Testament (LWT)
      - Keepalive PINGREQ/PINGRESP
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
        self.client_id = client_id or f"parksmart-sim-{uuid.uuid4().hex[:8]}"
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

    @classmethod
    async def _read_varlen(cls, reader: asyncio.StreamReader) -> int:
        multiplier = 1
        value = 0
        while True:
            byte = (await reader.readexactly(1))[0]
            value += (byte & 127) * multiplier
            if (byte & 128) == 0:
                break
            multiplier *= 128
            if multiplier > 128 * 128 * 128:
                raise ValueError("Malformed remaining length in MQTT packet")
        return value

    def _build_connect_packet(self) -> bytes:
        flags = 0x02  # Clean Session
        if self.lwt_topic and self.lwt_payload:
            flags |= 0x04 | ((self.lwt_qos & 0x03) << 3)
        if self.username:
            flags |= 0x80
        if self.password:
            flags |= 0x40

        vh = b"\x00\x04MQTT\x04" + bytes([flags]) + struct.pack(">H", self.keepalive)
        payload = bytearray()

        def append_field(val: str | bytes) -> None:
            b = val.encode("utf-8") if isinstance(val, str) else val
            payload.extend(struct.pack(">H", len(b)) + b)

        append_field(self.client_id)
        if self.lwt_topic and self.lwt_payload:
            append_field(self.lwt_topic)
            append_field(self.lwt_payload)
        if self.username:
            append_field(self.username)
        if self.password:
            append_field(self.password)

        body = vh + bytes(payload)
        return b"\x10" + self._encode_varlen(len(body)) + body

    def _build_publish_packet(self, topic: str, payload: bytes, packet_id: int, qos: int = 1) -> bytes:
        topic_bytes = topic.encode("utf-8")
        vh = struct.pack(">H", len(topic_bytes)) + topic_bytes
        if qos > 0:
            vh += struct.pack(">H", packet_id)
        body = vh + payload
        header_byte = 0x30 | ((qos & 0x03) << 1)
        return bytes([header_byte]) + self._encode_varlen(len(body)) + body

    async def connect(self) -> None:
        """Establishes network connection and completes MQTT handshake."""
        ssl_ctx: ssl.SSLContext | None = None
        if self.tls:
            if self.insecure_tls:
                ssl_ctx = ssl.create_default_context()
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl.CERT_NONE
            elif self.ca_file and os.path.exists(self.ca_file):
                ssl_ctx = ssl.create_default_context(cafile=self.ca_file)
            else:
                ssl_ctx = ssl.create_default_context()

        self.reader, self.writer = await asyncio.open_connection(
            host=self.host, port=self.port, ssl=ssl_ctx
        )

        connect_packet = self._build_connect_packet()
        self.writer.write(connect_packet)
        await self.writer.drain()

        # Read CONNACK (0x20, 0x02, session_present, return_code)
        resp_type = (await self.reader.readexactly(1))[0]
        rem_len = await self._read_varlen(self.reader)
        body = await self.reader.readexactly(rem_len)

        if (resp_type & 0xF0) != 0x20:
            raise ConnectionError(f"Expected CONNACK (0x20), got 0x{resp_type:02X}")
        if len(body) < 2 or body[1] != 0:
            rc = body[1] if len(body) >= 2 else -1
            rc_desc = {
                1: "Unacceptable protocol version",
                2: "Identifier rejected",
                3: "Server unavailable",
                4: "Bad user name or password",
                5: "Not authorized",
            }.get(rc, f"Unknown return code {rc}")
            raise ConnectionRefusedError(f"MQTT connection refused by broker: {rc_desc}")

        self._connected = True
        self._closed = False
        self._read_task = asyncio.create_task(self._reader_loop())
        logger.info(
            "MQTT client connected to %s:%d (TLS=%s, client_id=%s)",
            self.host,
            self.port,
            self.tls,
            self.client_id,
        )

    async def _reader_loop(self) -> None:
        """Background loop reading broker packets (PUBACK, PINGRESP)."""
        try:
            assert self.reader is not None
            while not self._closed:
                try:
                    header = await self.reader.readexactly(1)
                except asyncio.IncompleteReadError:
                    break
                pkt_type = header[0] & 0xF0
                rem_len = await self._read_varlen(self.reader)
                body = await self.reader.readexactly(rem_len)

                if pkt_type == 0x40 and len(body) >= 2:
                    # PUBACK
                    pid = struct.unpack(">H", body[:2])[0]
                    fut = self._puback_waiters.pop(pid, None)
                    if fut and not fut.done():
                        fut.set_result(None)
                elif pkt_type == 0xD0:
                    # PINGRESP
                    pass
        except asyncio.CancelledError:
            pass
        except Exception as e:
            if not self._closed:
                logger.warning("MQTT reader encountered error: %s", e)
        finally:
            self._connected = False

    async def publish(self, topic: str, payload: bytes | str, qos: int = 1, timeout: float = 10.0) -> None:
        """Publishes a payload at QoS 1, awaiting PUBACK acknowledgment."""
        if not self._connected or not self.writer:
            raise ConnectionError("Cannot publish: MQTT client is disconnected")

        b_payload = payload.encode("utf-8") if isinstance(payload, str) else payload
        pid = self._next_packet_id()

        loop = asyncio.get_running_loop()
        ack_future: asyncio.Future[None] = loop.create_future()
        self._puback_waiters[pid] = ack_future

        pkt = self._build_publish_packet(topic, b_payload, pid, qos=qos)
        self.writer.write(pkt)
        await self.writer.drain()

        try:
            await asyncio.wait_for(ack_future, timeout=timeout)
        except asyncio.TimeoutError:
            self._puback_waiters.pop(pid, None)
            raise TimeoutError(f"Publish timeout awaiting PUBACK for packet {pid} on topic {topic}")

    async def disconnect(self) -> None:
        """Sends DISCONNECT packet and cleanly closes network streams."""
        self._closed = True
        if self._read_task:
            self._read_task.cancel()
        if self.writer and not self.writer.is_closing():
            try:
                self.writer.write(b"\xe0\x00")  # DISCONNECT
                await self.writer.drain()
            except Exception:
                pass
            try:
                self.writer.close()
                await self.writer.wait_closed()
            except Exception:
                pass
        self._connected = False
        logger.info("MQTT client disconnected cleanly")


# ============================================================================
# Simulator Live Publisher Engine
# ============================================================================


class LivePublisher:
    """
    Orchestrates synthetic parking and crowd message generation and publication
    across all monitored camera targets.
    """

    def __init__(self, config: PublisherConfig):
        self.config = config
        self.rng = np.random.default_rng(seed=100)
        self.stop_event = asyncio.Event()
        self.start_time = time.time()
        self.client: AsyncMqtt311Client | None = None
        self.published_counts: dict[str, int] = {"occupancy": 0, "crowd": 0, "health": 0}

    def stop(self) -> None:
        """Signals the publisher loop to initiate clean termination."""
        self.stop_event.set()

    def _prepare_lwt_payload(self, target: CameraTarget) -> bytes:
        """Constructs the offline HealthMessage for the Last Will and Testament."""
        health = generate_health_message(
            camera_id=target.camera_id,
            state="offline",
            uptime_s=0,
            model_version="yolo26n",
        )
        return json.dumps(health).encode("utf-8")

    async def _init_client(self, primary_target: CameraTarget) -> AsyncMqtt311Client:
        """Initializes and connects the MQTT client with LWT configured."""
        lwt_topic = f"parksmart/{primary_target.zone_id}/{primary_target.camera_id}/health"
        lwt_payload = self._prepare_lwt_payload(primary_target)

        client = AsyncMqtt311Client(
            host=self.config.broker_host,
            port=self.config.broker_port,
            client_id=f"sim-pub-{primary_target.camera_id[:8]}",
            username=self.config.username,
            password=self.config.password,
            tls=self.config.tls,
            ca_file=self.config.ca_file,
            insecure_tls=self.config.insecure_tls,
            lwt_topic=lwt_topic,
            lwt_payload=lwt_payload,
            lwt_qos=1,
        )
        await client.connect()
        return client

    async def publish_target_step(
        self,
        target: CameraTarget,
        client: AsyncMqtt311Client | None,
        now: datetime,
    ) -> dict[str, Any]:
        """
        Executes one simulation step for a camera target:
          1. Steps bay occupancy states.
          2. Generates OccupancyMessage -> publishes to parksmart/{zone}/{cam}/occupancy.
          3. Generates CrowdMessage -> publishes to parksmart/{zone}/{cam}/crowd.
          4. Generates HealthMessage -> publishes to parksmart/{zone}/{cam}/health.
        """
        # If fault injection drops this camera, skip publishing
        if self.config.drop_camera and self.config.drop_camera == target.camera_id:
            logger.warning("[FAULT INJECTION] Dropping messages for camera %s", target.camera_id)
            return {}

        profile = PROFILES.get(target.profile_name, PROFILES["commercial_core"])
        uptime_s = int(time.time() - self.start_time)

        # 1. Compute target fraction and step bay states
        target_frac = occupancy_fraction(profile, now, rng=self.rng)
        target.current_states = step_bay_states(
            target.current_states,
            target_fraction=target_frac,
            bay_ids=target.bay_ids,
            rng=self.rng,
        )

        occupied_count = sum(1 for s in target.current_states.values() if s == "occupied")
        total_bays = len(target.bay_ids)

        # 2. Build Occupancy Message
        occ_msg = generate_occupancy_message(
            camera_id=target.camera_id,
            bay_states=target.current_states,
            ts=now,
            confidence=1.0,
        )
        occ_topic = f"parksmart/{target.zone_id}/{target.camera_id}/occupancy"

        # 3. Build Crowd Message
        k = occupied_count
        vehicle_count = max(0, int(k + self.rng.poisson(1)))
        pedestrian_count = pedestrian_level(profile, vehicle_count, rng=self.rng)
        crowd_msg = generate_crowd_message(
            camera_id=target.camera_id,
            interval_s=self.config.interval_s,
            vehicle_count=vehicle_count,
            pedestrian_count=pedestrian_count,
            quality="ok",
            ts=now,
        )
        crowd_topic = f"parksmart/{target.zone_id}/{target.camera_id}/crowd"

        # 4. Build Health Message
        health_msg = generate_health_message(
            camera_id=target.camera_id,
            state="online",
            fps=15.0,
            uptime_s=uptime_s,
            ts=now,
        )
        health_topic = f"parksmart/{target.zone_id}/{target.camera_id}/health"

        step_results = {
            "occupancy": (occ_topic, occ_msg),
            "crowd": (crowd_topic, crowd_msg),
            "health": (health_topic, health_msg),
        }

        # Publish or Dry Run
        for kind, (topic, msg) in step_results.items():
            payload_str = json.dumps(msg)
            if self.config.dry_run or client is None:
                logger.info("[DRY-RUN][%s] -> Topic: %s (QoS 1)", kind.upper(), topic)
                if self.config.verify:
                    print(f"VERIFY {kind.upper()}: topic={topic} msg_id={msg['msg_id']}")
            else:
                await client.publish(topic, payload_str, qos=1)
                logger.info(
                    "[PUBLISHED][%s] -> Topic: %s | msg_id: %s (QoS 1)",
                    kind.upper(),
                    topic,
                    msg["msg_id"],
                )
            self.published_counts[kind] += 1

        logger.info(
            "Camera %s | Bays: %d/%d occupied (%.1f%%) | Vehicles: %d, Peds: %d | Uptime: %ds",
            target.camera_id[:8],
            occupied_count,
            total_bays,
            (occupied_count / max(1, total_bays)) * 100,
            vehicle_count,
            pedestrian_count,
            uptime_s,
        )
        return step_results

    async def run(self) -> None:
        """Main publisher lifecycle loop handling reconnection and backoff."""
        logger.info("Starting ParkSMART Live Simulator Publisher...")
        logger.info("%s", SIMULATED_NOTICE)

        if not self.config.targets:
            raise ValueError("No camera targets configured for live publishing.")

        primary_target = self.config.targets[0]
        backoff_steps = (1, 2, 5, 10, 30)
        attempt = 0
        cycles_completed = 0

        while not self.stop_event.is_set():
            if self.config.dry_run:
                # Dry run mode does not connect to broker
                now = datetime.now(timezone.utc)
                if self.config.skew_s != 0:
                    now = datetime.fromtimestamp(now.timestamp() + self.config.skew_s, tz=timezone.utc)
                for target in self.config.targets:
                    await self.publish_target_step(target, client=None, now=now)
                cycles_completed += 1
                if self.config.count > 0 and cycles_completed >= self.config.count:
                    break
                try:
                    await asyncio.wait_for(self.stop_event.wait(), timeout=self.config.interval_s)
                except asyncio.TimeoutError:
                    pass
                continue

            # Live MQTT publishing loop with auto-reconnection
            try:
                logger.info(
                    "Connecting to MQTT broker at %s:%d (TLS=%s)...",
                    self.config.broker_host,
                    self.config.broker_port,
                    self.config.tls,
                )
                self.client = await self._init_client(primary_target)
                attempt = 0  # reset backoff upon successful connection

                while not self.stop_event.is_set():
                    loop_start = time.time()
                    now = datetime.now(timezone.utc)
                    if self.config.skew_s != 0:
                        now = datetime.fromtimestamp(now.timestamp() + self.config.skew_s, tz=timezone.utc)

                    for target in self.config.targets:
                        await self.publish_target_step(target, self.client, now)

                    cycles_completed += 1
                    if self.config.count > 0 and cycles_completed >= self.config.count:
                        self.stop()
                        break

                    elapsed = time.time() - loop_start
                    sleep_time = max(0.1, self.config.interval_s - elapsed)
                    try:
                        await asyncio.wait_for(self.stop_event.wait(), timeout=sleep_time)
                    except asyncio.TimeoutError:
                        pass

            except (ConnectionError, TimeoutError, OSError) as e:
                logger.warning("MQTT connection failed/lost (%s). Retrying in %ds...", e, backoff_steps[min(attempt, 4)])
                await self._cleanup_client()
                if self.stop_event.is_set():
                    break
                wait_sec = backoff_steps[min(attempt, 4)]
                attempt += 1
                try:
                    await asyncio.wait_for(self.stop_event.wait(), timeout=wait_sec)
                except asyncio.TimeoutError:
                    pass
            except Exception as e:
                logger.error("Unexpected error in publisher loop: %s", e, exc_info=True)
                await self._cleanup_client()
                if self.stop_event.is_set():
                    break
                await asyncio.sleep(5)
            finally:
                if self.stop_event.is_set():
                    await self._shutdown(primary_target)

    async def _cleanup_client(self) -> None:
        if self.client:
            try:
                await self.client.disconnect()
            except Exception:
                pass
            self.client = None

    async def _shutdown(self, primary_target: CameraTarget) -> None:
        """Sends an explicit offline HealthMessage on shutdown and disconnects."""
        logger.info("Initiating graceful shutdown of live publisher...")
        if self.client and self.client._connected:
            try:
                # Publish explicit offline health state for all targets
                now = datetime.now(timezone.utc)
                for target in self.config.targets:
                    offline_msg = generate_health_message(
                        camera_id=target.camera_id,
                        state="offline",
                        uptime_s=int(time.time() - self.start_time),
                        ts=now,
                    )
                    topic = f"parksmart/{target.zone_id}/{target.camera_id}/health"
                    await self.client.publish(topic, json.dumps(offline_msg), qos=1, timeout=2.0)
                    logger.info("Published final offline health event for camera %s", target.camera_id[:8])
            except Exception as e:
                logger.warning("Failed to publish clean offline health state during shutdown: %s", e)
            await self._cleanup_client()
        logger.info(
            "Publisher stopped. Total published: %d occupancy, %d crowd, %d health.",
            self.published_counts["occupancy"],
            self.published_counts["crowd"],
            self.published_counts["health"],
        )


# ============================================================================
# CLI Configuration & Entry Point
# ============================================================================


def build_default_targets(
    zone_id: str | None,
    camera_id: str | None,
    bay_ids: list[str] | None,
    num_bays: int = 10,
    profile_name: str = "commercial_core",
) -> list[CameraTarget]:
    """Builds camera targets either from provided IDs or deterministic demo fallbacks."""
    z_id = str(uuid.UUID(zone_id)) if zone_id else "11111111-0000-0000-0000-000000000001"
    c_id = str(uuid.UUID(camera_id)) if camera_id else "22222222-0000-0000-0000-000000000001"

    if bay_ids:
        b_ids = [str(uuid.UUID(b.strip())) for b in bay_ids if b.strip()]
    else:
        b_ids = [f"33333333-0000-0000-0000-{i:012d}" for i in range(1, num_bays + 1)]

    return [
        CameraTarget(
            camera_id=c_id,
            zone_id=z_id,
            bay_ids=b_ids,
            profile_name=profile_name,
        )
    ]


def load_secrets_file(path: str) -> list[CameraTarget] | None:
    """Loads camera configurations from SIM_SECRETS_PATH created by seed_demo."""
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        targets = []
        for cam_id, details in data.items():
            targets.append(
                CameraTarget(
                    camera_id=str(uuid.UUID(cam_id)),
                    zone_id=str(uuid.UUID(details["zone_id"])),
                    bay_ids=[str(uuid.UUID(b)) for b in details.get("bay_ids", [])],
                    profile_name=details.get("profile", "commercial_core"),
                )
            )
        return targets if targets else None
    except Exception as e:
        logger.warning("Could not parse secrets file %s: %s", path, e)
        return None


def parse_args(argv: list[str] | None = None) -> PublisherConfig:
    """Parses CLI arguments with environment variable fallbacks."""
    parser = argparse.ArgumentParser(
        description="ParkSMART MQTT Live Telemetry Simulator Publisher",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    # Broker connection arguments
    parser.add_argument(
        "--broker-host",
        default=os.getenv("MQTT_HOST", "localhost"),
        help="MQTT broker hostname or IP address",
    )
    parser.add_argument(
        "--broker-port",
        type=int,
        default=None,
        help="MQTT broker port (defaults to 8883 if TLS, 1883 if --no-tls)",
    )
    parser.add_argument(
        "--username",
        default=os.getenv("MQTT_USERNAME"),
        help="MQTT username",
    )
    parser.add_argument(
        "--password",
        default=os.getenv("MQTT_PASSWORD"),
        help="MQTT password",
    )
    parser.add_argument(
        "--tls",
        action=argparse.BooleanOptionalAction,
        default=(os.getenv("MQTT_TLS", "true").lower() in ("true", "1", "yes")),
        help="Enable TLS connection to broker (default: true)",
    )
    parser.add_argument(
        "--ca-file",
        default=os.getenv("MQTT_CA_FILE"),
        help="Path to CA certificate file for TLS validation",
    )
    parser.add_argument(
        "--insecure",
        action="store_true",
        default=(os.getenv("MQTT_TLS_INSECURE", "false").lower() in ("true", "1", "yes")),
        help="Allow unverified TLS certificates (local dev/testing only)",
    )

    # Simulation arguments
    parser.add_argument(
        "--interval-s",
        type=int,
        default=int(os.getenv("SIM_INTERVAL_S", "10")),
        help="Publishing interval in seconds",
    )
    parser.add_argument(
        "--zone-id",
        default=os.getenv("SIM_ZONE_ID"),
        help="Target Zone UUID (e.g. 11111111-0000-0000-0000-000000000001)",
    )
    parser.add_argument(
        "--camera-id",
        default=os.getenv("SIM_CAMERA_ID"),
        help="Target Camera UUID (e.g. 22222222-0000-0000-0000-000000000001)",
    )
    parser.add_argument(
        "--bay-ids",
        default=os.getenv("SIM_BAY_IDS"),
        help="Comma-separated list of bay UUIDs",
    )
    parser.add_argument(
        "--num-bays",
        type=int,
        default=int(os.getenv("SIM_NUM_BAYS", "10")),
        help="Number of simulated bays if explicit bay-ids are omitted",
    )
    parser.add_argument(
        "--profile",
        default=os.getenv("SIM_PROFILE", "commercial_core"),
        choices=list(PROFILES.keys()),
        help="Demand curve archetype",
    )
    parser.add_argument(
        "--secrets-path",
        default=os.getenv("SIM_SECRETS_PATH", "/tmp/parksmart_sim_secrets.json"),
        help="Path to simulator camera secrets JSON created by seed_demo",
    )

    # Fault injection and testing flags
    parser.add_argument(
        "--drop-camera",
        default=None,
        help="Fault injection: drop all transmissions for this camera UUID",
    )
    parser.add_argument(
        "--skew-s",
        type=int,
        default=0,
        help="Fault injection: offset timestamp by +N seconds to test skew guards",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate and print telemetry payloads without connecting to broker",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=0,
        help="Exit after publishing N cycles (0 = continuous)",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Run verification check on generated messages",
    )

    args = parser.parse_args(argv)

    if args.interval_s <= 0:
        raise ValueError(f"Interval must be greater than 0, got {args.interval_s}")
    agg_window_s = 900
    if agg_window_s % args.interval_s != 0:
        raise ValueError(
            f"Publishing interval ({args.interval_s}s) must evenly divide the 15-minute aggregation window "
            f"({agg_window_s}s)."
        )

    # Determine default port
    if args.broker_port is None:
        port = int(os.getenv("MQTT_PORT", "8883" if args.tls else "1883"))
    else:
        port = args.broker_port

    # Load targets from secrets file if available, else build from flags
    targets = load_secrets_file(args.secrets_path)
    if not targets:
        bays_list = [b.strip() for b in args.bay_ids.split(",")] if args.bay_ids else None
        targets = build_default_targets(
            zone_id=args.zone_id,
            camera_id=args.camera_id,
            bay_ids=bays_list,
            num_bays=args.num_bays,
            profile_name=args.profile,
        )

    return PublisherConfig(
        broker_host=args.broker_host,
        broker_port=port,
        username=args.username,
        password=args.password,
        tls=args.tls,
        ca_file=args.ca_file,
        insecure_tls=args.insecure,
        interval_s=max(1, args.interval_s),
        targets=targets,
        skew_s=args.skew_s,
        drop_camera=args.drop_camera,
        dry_run=args.dry_run,
        count=args.count,
        verify=args.verify,
    )


def setup_signal_handlers(publisher: LivePublisher, loop: asyncio.AbstractEventLoop) -> None:
    """Attaches signal listeners for graceful termination."""
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, publisher.stop)
        except (NotImplementedError, AttributeError):
            # Windows does not support add_signal_handler for all signals
            pass


def main(argv: list[str] | None = None) -> int:
    """CLI Entry point for python -m simulator.live_publisher."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    config = parse_args(argv)
    publisher = LivePublisher(config)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    setup_signal_handlers(publisher, loop)

    try:
        loop.run_until_complete(publisher.run())
        return 0
    except KeyboardInterrupt:
        publisher.stop()
        loop.run_until_complete(publisher._cleanup_client())
        return 0
    finally:
        loop.close()


if __name__ == "__main__":
    sys.exit(main())
