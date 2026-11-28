"""
ParkSMART - Edge Telemetry Aggregator (File 154 / M2 Ownership)

Responsibility:
Collects per-frame bay readings and crowd counts, aggregates them across configured time
intervals, computes measured FPS and uptime, and builds schema-compliant OccupancyMessage,
CrowdMessage, and HealthMessage payloads.

Strict Requirement:
Produces the exact same payload contracts as simulator.profiles, with:
  provenance: "observed"
"""

from __future__ import annotations

import logging
import time
import uuid
from datetime import UTC, datetime
from typing import Any

from edge.counter import CrowdCounts

logger = logging.getLogger("parksmart.edge.aggregator")


def get_utc_iso_timestamp() -> str:
    """Returns current UTC ISO 8601 timestamp ending in 'Z'."""
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


class TelemetryAggregator:
    """
    Manages telemetry aggregation cycles and constructs payloads with provenance 'observed'.
    """

    def __init__(
        self,
        camera_id: str,
        zone_id: str,
        occupancy_interval_s: int = 10,  # UNVALIDATED
        crowd_interval_s: int = 60,      # UNVALIDATED (must divide 900)
        health_interval_s: int = 30,     # UNVALIDATED
        model_version: str = "yolo26n",
        initial_bay_ids: list[str] | None = None,
    ):
        self.camera_id = str(uuid.UUID(str(camera_id)))
        self.zone_id = str(uuid.UUID(str(zone_id)))
        self.occupancy_interval_s = max(1, int(occupancy_interval_s))
        self.crowd_interval_s = max(1, int(crowd_interval_s))
        self.health_interval_s = max(1, int(health_interval_s))
        self.model_version = model_version

        self._start_time = time.time()
        self._last_occupancy_pub = 0.0
        self._last_crowd_pub = 0.0
        self._last_health_pub = 0.0

        # Current frame state (defaults to "unknown" if initial_bay_ids are provided; NEVER defaults to "free")
        self._latest_bay_readings: list[dict[str, Any]] = [
            {"bay_id": str(uuid.UUID(str(bid))), "state": "unknown", "confidence": 0.0}
            for bid in (initial_bay_ids or [])
        ]
        self._latest_crowd: CrowdCounts | None = None
        self._frame_count = 0
        self._last_fps_time = time.time()
        self._last_fps_frame = 0
        self._measured_fps: float = 0.0
        self._recent_errors: list[str] = []

    @property
    def uptime_s(self) -> int:
        """Returns total seconds elapsed since aggregator startup."""
        return max(0, int(time.time() - self._start_time))

    def record_frame(
        self,
        bay_readings: list[dict[str, Any]],
        crowd: CrowdCounts,
        frame_idx: int,
    ) -> None:
        """Updates internal buffers with fresh frame observations."""
        self._latest_bay_readings = bay_readings
        self._latest_crowd = crowd
        self._frame_count += 1

        # Calculate moving FPS every 2 seconds
        now = time.time()
        dt = now - self._last_fps_time
        if dt >= 2.0:
            df = self._frame_count - self._last_fps_frame
            self._measured_fps = round(df / dt, 2)
            self._last_fps_time = now
            self._last_fps_frame = self._frame_count

    def record_error(self, err_msg: str) -> None:
        """Buffers an error message to report in the next HealthMessage."""
        self._recent_errors.append(str(err_msg)[:200])
        if len(self._recent_errors) > 20:
            self._recent_errors.pop(0)

    # ------------------------------------------------------------------------
    # Publication Trigger Checks
    # ------------------------------------------------------------------------

    def should_publish_occupancy(self, now: float | None = None) -> bool:
        t = now if now is not None else time.time()
        return (t - self._last_occupancy_pub) >= self.occupancy_interval_s

    def should_publish_crowd(self, now: float | None = None) -> bool:
        t = now if now is not None else time.time()
        return (t - self._last_crowd_pub) >= self.crowd_interval_s

    def should_publish_health(self, now: float | None = None) -> bool:
        t = now if now is not None else time.time()
        return (t - self._last_health_pub) >= self.health_interval_s

    # ------------------------------------------------------------------------
    # Payload Builders (with provenance: "observed")
    # ------------------------------------------------------------------------

    def build_occupancy_payload(
        self,
        ts: str | None = None,
        msg_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Builds a schema_version: 1 OccupancyMessage payload with provenance: "observed".
        """
        now_ts = ts or get_utc_iso_timestamp()
        message_id = msg_id or str(uuid.uuid4())

        bays_payload: list[dict[str, Any]] = []
        for b in self._latest_bay_readings:
            bays_payload.append({
                "bay_id": str(uuid.UUID(str(b["bay_id"]))),
                "state": b.get("state", "free"),
                "confidence": round(float(b.get("confidence", 1.0)), 4),
            })

        self._last_occupancy_pub = time.time()

        return {
            "schema_version": 1,
            "msg_id": message_id,
            "ts": now_ts,
            "camera_id": self.camera_id,
            "bays": bays_payload,
            "provenance": "observed",
        }

    def build_crowd_payload(
        self,
        ts: str | None = None,
        msg_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Builds a schema_version: 1 CrowdMessage payload with provenance: "observed".
        """
        now_ts = ts or get_utc_iso_timestamp()
        message_id = msg_id or str(uuid.uuid4())

        crowd_data = self._latest_crowd or CrowdCounts(
            vehicle_count=0,
            vehicle_by_category={"car": 0, "two_wheeler": 0, "bus": 0, "truck": 0, "van": 0},
            pedestrian_count=0,
            density_per_m2=None,
            quality="ok",
        )

        self._last_crowd_pub = time.time()

        return {
            "schema_version": 1,
            "msg_id": message_id,
            "ts": now_ts,
            "camera_id": self.camera_id,
            "interval_s": self.crowd_interval_s,
            "vehicle_count": crowd_data.vehicle_count,
            "vehicle_by_category": crowd_data.vehicle_by_category,
            "pedestrian_count": crowd_data.pedestrian_count,
            "density_per_m2": crowd_data.density_per_m2,
            "quality": crowd_data.quality,
            "provenance": "observed",
        }

    def build_health_payload(
        self,
        state: str = "online",
        ts: str | None = None,
        msg_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Builds a schema_version: 1 HealthMessage payload with provenance: "observed".
        """
        now_ts = ts or get_utc_iso_timestamp()
        message_id = msg_id or str(uuid.uuid4())

        errors = list(self._recent_errors)
        self._recent_errors.clear()
        self._last_health_pub = time.time()

        return {
            "schema_version": 1,
            "msg_id": message_id,
            "ts": now_ts,
            "camera_id": self.camera_id,
            "state": state if state in ("online", "degraded", "offline") else "online",
            "fps": round(float(self._measured_fps), 2) if self._measured_fps > 0 else None,
            "errors": errors,
            "model_version": self.model_version,
            "uptime_s": self.uptime_s,
            "provenance": "observed",
        }
