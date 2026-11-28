"""
ParkSMART - Edge Device Local Health Monitor & Watchdog (File 156 / M2 Ownership)

Responsibility:
Local hardware and runtime health monitor for the edge camera node:
- Tracks video capture rate, frame drop frequency, and process uptime.
- Evaluates operational state: 'online', 'degraded', 'offline'.
- Monitors health metrics without storing camera frames or crops (zero disk leakage).
- Generates structured schema_version 1 HealthMessage payloads with provenance: "observed".
- Supports clean recovery from offline/degraded states back to online.
- Invariant: A camera offline or degraded event NEVER marks parking bays as free.
"""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

logger = logging.getLogger("parksmart.edge.health")

# UNVALIDATED: Default degraded threshold (50% target FPS). Requires empirical deployment telemetry in Bhubaneswar.
DEFAULT_FPS_DEGRADED_THRESHOLD: float = 0.5


@dataclass
class EdgeHealthStatus:
    """Current health state snapshot of the edge vision client."""

    state: str  # "online" | "degraded" | "offline"
    measured_fps: float
    target_fps: float
    uptime_s: int
    dropped_frames: int
    errors: list[str] = field(default_factory=list)
    model_version: str | None = "yolo26n"

    def to_dict(self) -> dict[str, Any]:
        return {
            "state": self.state,
            "measured_fps": round(float(self.measured_fps), 2),
            "target_fps": round(float(self.target_fps), 2),
            "uptime_s": self.uptime_s,
            "dropped_frames": self.dropped_frames,
            "errors": list(self.errors),
            "model_version": self.model_version,
        }


class EdgeHealthMonitor:
    """
    Monitors edge client performance, frame pacing, and hardware health.
    """

    def __init__(
        self,
        camera_id: str | uuid.UUID,
        target_fps: float = 5.0,
        model_version: str = "yolo26n",
        fps_degraded_threshold: float = DEFAULT_FPS_DEGRADED_THRESHOLD,
    ):
        self.camera_id = str(uuid.UUID(str(camera_id)))
        self.target_fps = max(0.1, float(target_fps))
        self.model_version = model_version
        # UNVALIDATED: Configurable degraded threshold; placeholder for Bhubaneswar deployment
        self.fps_degraded_threshold = max(0.01, min(1.0, float(fps_degraded_threshold)))

        self._start_time = time.time()
        self._frame_count = 0
        self._dropped_frames = 0
        self._last_fps_time = time.time()
        self._last_fps_frame = 0
        self._current_fps = self.target_fps
        self._errors: list[str] = []
        self._is_capturing = True

    @property
    def uptime_s(self) -> int:
        return max(0, int(time.time() - self._start_time))

    @property
    def is_capturing(self) -> bool:
        return self._is_capturing

    def record_frame(self) -> None:
        """Records a successful frame capture and processing step."""
        self._frame_count += 1
        now = time.time()
        dt = now - self._last_fps_time
        if dt >= 1.0:
            df = self._frame_count - self._last_fps_frame
            self._current_fps = round(df / dt, 2)
            self._last_fps_time = now
            self._last_fps_frame = self._frame_count

    def record_dropped_frame(self, reason: str = "capture_timeout") -> None:
        """Records a dropped or unreadable frame."""
        self._dropped_frames += 1
        self.record_error(f"Frame dropped: {reason}")

    def record_error(self, err_msg: str) -> None:
        """Buffers an error message (bounded to max 20 entries, max 200 chars each)."""
        clean_err = str(err_msg)[:200]
        self._errors.append(clean_err)
        if len(self._errors) > 20:
            self._errors.pop(0)

    def set_camera_offline(self, reason: str = "stream_disconnected") -> None:
        """Marks camera capture as offline."""
        self._is_capturing = False
        self.record_error(f"Camera offline: {reason}")
        logger.warning("Camera %s marked offline: %s", self.camera_id, reason)

    def set_camera_online(self) -> None:
        """Recovers camera capture back to online operation."""
        self._is_capturing = True
        self._current_fps = self.target_fps
        self._last_fps_time = time.time()
        self._last_fps_frame = self._frame_count
        # Clear critical offline error entries upon successful recovery
        self._errors = [e for e in self._errors if "Camera offline" not in e]
        logger.info("Camera %s recovered and marked online", self.camera_id)

    def reset(self) -> None:
        """Resets health monitor counters and timestamps."""
        self._start_time = time.time()
        self._frame_count = 0
        self._dropped_frames = 0
        self._last_fps_time = time.time()
        self._last_fps_frame = 0
        self._current_fps = self.target_fps
        self._errors.clear()
        self._is_capturing = True

    def evaluate_status(self) -> EdgeHealthStatus:
        """
        Determines current operational state:
          - 'offline' if video capture stopped completely.
          - 'degraded' if FPS dropped below degraded threshold or recent errors occurred.
          - 'online' if operating normally within nominal parameters.
        """
        if not self._is_capturing:
            state = "offline"
        elif self._current_fps < (self.target_fps * self.fps_degraded_threshold) or len(self._errors) > 5:
            state = "degraded"
        else:
            state = "online"

        return EdgeHealthStatus(
            state=state,
            measured_fps=self._current_fps if self._is_capturing else 0.0,
            target_fps=self.target_fps,
            uptime_s=self.uptime_s,
            dropped_frames=self._dropped_frames,
            errors=list(self._errors),
            model_version=self.model_version,
        )

    def build_health_message(
        self,
        msg_id: str | None = None,
        ts: str | None = None,
    ) -> dict[str, Any]:
        """
        Constructs a schema_version 1 HealthMessage payload with provenance: "observed".
        Adheres strictly to backend validate_health constraints:
        - state in ("online", "degraded", "offline")
        - errors: max 20 strings, each <= 200 chars
        - fps: None when state is offline, float otherwise
        - zero camera frames or crops stored to disk
        """
        status = self.evaluate_status()
        message_id = msg_id or str(uuid.uuid4())
        now_ts = ts or datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

        return {
            "schema_version": 1,
            "msg_id": message_id,
            "ts": now_ts,
            "camera_id": self.camera_id,
            "state": status.state,
            "fps": status.measured_fps if status.state != "offline" else None,
            "errors": status.errors[:20],
            "model_version": status.model_version,
            "uptime_s": status.uptime_s,
            "provenance": "observed",
        }
