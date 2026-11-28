"""
ParkSMART - Ingestion Validator (File 81 / M2 Ownership)

Responsibility:
Database-aware and clock-aware validation of device messages (occupancy, crowd, health)
beyond basic Pydantic shape checks:
- Strict UTC ISO 8601 timestamp parsing.
- Future skew rejection (MAX_FUTURE_SKEW_S, default 30s).
- Topic / camera / zone alignment.
- Camera active state verification.
- Mapped bay isolation (unmapped bay in payload rejects entire message).
- Confidence thresholding (confidence < conf_threshold maps state to "unknown", never "free").
- Crowd interval divisibility and category sum checks.
- Zero disk persistence for raw frame/vision data.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from app.modules.ingestion import repository as repo


class IngestRejected(Exception):
    """
    Raised when an inbound device message fails database- or clock-aware validation.
    Canonical reasons:
      - bad_topic
      - future_timestamp
      - unknown_camera
      - inactive_camera
      - zone_mismatch
      - camera_mismatch
      - unmapped_bay
      - bad_interval
      - bad_counts
      - invalid_payload
    """

    def __init__(
        self,
        reason: str,
        details: dict[str, Any] | None = None,
        message: str | None = None,
    ):
        self.reason = reason
        self.details = details or {}
        self.message = message or f"Ingestion rejected: {reason}"
        super().__init__(self.message)

    def to_error_envelope(self, request_id: str | None = None) -> dict[str, Any]:
        """Formats the rejection into the standard ParkSMART API error envelope."""
        req_id = request_id or self.details.get("request_id") or f"req-{uuid.uuid4().hex[:12]}"
        return {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": self.message,
                "details": {"reason": self.reason, **self.details},
                "request_id": req_id,
            }
        }


@dataclass(frozen=True)
class ValidatedOccupancy:
    """Validated occupancy message payload ready for state_manager application."""

    msg_id: uuid.UUID
    observed_at: datetime
    readings: list[tuple[uuid.UUID, str, float]]  # (bay_id, final_state, confidence)


# ============================================================================
# Helpers
# ============================================================================


def to_dict(msg: Any) -> dict[str, Any]:
    """Converts Pydantic model, dataclass, or dictionary into a standard Python dict."""
    if hasattr(msg, "model_dump"):
        return msg.model_dump()
    if hasattr(msg, "dict"):
        return msg.dict()
    if isinstance(msg, dict):
        return dict(msg)
    raise IngestRejected("invalid_payload", {"message": "Payload must be a dictionary or model instance"})


def parse_utc_timestamp(ts: Any) -> datetime:
    """
    Parses timestamps consistently into timezone-aware UTC datetime.
    Rejects naive timestamps or invalid format strings.
    """
    if ts is None:
        raise IngestRejected("invalid_payload", {"field": "ts", "message": "Missing required timestamp"})

    if isinstance(ts, datetime):
        if ts.tzinfo is None:
            raise IngestRejected(
                "invalid_payload",
                {"field": "ts", "message": "Timestamp must include timezone (naive datetime rejected)"},
            )
        return ts.astimezone(UTC)

    if isinstance(ts, str):
        cleaned = ts.strip()
        if not cleaned:
            raise IngestRejected("invalid_payload", {"field": "ts", "message": "Timestamp string cannot be empty"})

        # Check for timezone indicator (must have 'Z' or explicit offset)
        if not (cleaned.endswith("Z") or "+" in cleaned[10:] or "-" in cleaned[10:]):
            raise IngestRejected(
                "invalid_payload",
                {"field": "ts", "message": "Timestamp must include explicit timezone (ISO 8601 with 'Z' required)"},
            )

        try:
            dt = datetime.fromisoformat(cleaned)
            return dt.astimezone(UTC)
        except (ValueError, TypeError) as e:
            raise IngestRejected(
                "invalid_payload",
                {"field": "ts", "message": f"Malformed ISO 8601 timestamp: {cleaned} ({e})"},
            )

    raise IngestRejected(
        "invalid_payload",
        {"field": "ts", "message": f"Timestamp must be string or datetime, got {type(ts).__name__}"},
    )


def validate_envelope(payload: dict[str, Any]) -> tuple[int, uuid.UUID, uuid.UUID, datetime]:
    """
    Validates the shared telemetry envelope:
      - schema_version == 1
      - msg_id is valid UUID
      - camera_id is valid UUID
      - ts parses as valid UTC datetime
    """
    # 1. schema_version
    schema_version = payload.get("schema_version")
    if schema_version is None:
        raise IngestRejected("invalid_payload", {"field": "schema_version", "message": "Missing schema_version"})
    if not isinstance(schema_version, int) or isinstance(schema_version, bool) or schema_version != 1:
        raise IngestRejected(
            "invalid_payload",
            {"field": "schema_version", "message": f"Unsupported schema_version {schema_version}; expected 1"},
        )

    # 2. msg_id
    raw_msg_id = payload.get("msg_id")
    if raw_msg_id is None:
        raise IngestRejected("invalid_payload", {"field": "msg_id", "message": "Missing msg_id"})
    try:
        msg_id = uuid.UUID(str(raw_msg_id))
    except (ValueError, TypeError):
        raise IngestRejected(
            "invalid_payload",
            {"field": "msg_id", "message": f"Malformed msg_id UUID: {raw_msg_id}"},
        )

    # 3. camera_id
    raw_camera_id = payload.get("camera_id")
    if raw_camera_id is None:
        raise IngestRejected("invalid_payload", {"field": "camera_id", "message": "Missing camera_id"})
    try:
        camera_id = uuid.UUID(str(raw_camera_id))
    except (ValueError, TypeError):
        raise IngestRejected(
            "invalid_payload",
            {"field": "camera_id", "message": f"Malformed camera_id UUID: {raw_camera_id}"},
        )

    # 4. ts
    observed_at = parse_utc_timestamp(payload.get("ts"))

    return schema_version, msg_id, camera_id, observed_at


# ============================================================================
# Core Validation Functions
# ============================================================================


def check_common(
    camera: Any,
    topic_zone: uuid.UUID | str | None,
    msg_camera_id: uuid.UUID | str,
    ts: datetime | str,
    settings: Any = None,
    now: datetime | None = None,
) -> datetime:
    """
    Validates common camera attributes, topic/camera alignment, and clock skew:
      1. Camera must be active (inactive_camera).
      2. If topic_zone is supplied, must match camera.zone_id (zone_mismatch).
      3. Message camera_id must match camera.id (camera_mismatch).
      4. Timestamp must be UTC aware.
      5. Timestamp must not exceed server clock by more than MAX_FUTURE_SKEW_S (future_timestamp).
    """
    if camera is None:
        raise IngestRejected("unknown_camera", {"message": "Camera record not found"})

    # 1. Camera active check
    is_active = getattr(camera, "is_active", True)
    if not is_active:
        raise IngestRejected("inactive_camera", {"camera_id": str(getattr(camera, "id", msg_camera_id))})

    # 2. Camera mismatch
    cam_id = uuid.UUID(str(getattr(camera, "id", msg_camera_id)))
    msg_cid = uuid.UUID(str(msg_camera_id))
    if msg_cid != cam_id:
        raise IngestRejected(
            "camera_mismatch",
            {"msg_camera_id": str(msg_cid), "camera_id": str(cam_id)},
        )

    # 3. Zone mismatch (if topic zone is specified, e.g. from MQTT)
    if topic_zone is not None:
        t_zone = uuid.UUID(str(topic_zone))
        c_zone = uuid.UUID(str(getattr(camera, "zone_id", topic_zone)))
        if t_zone != c_zone:
            raise IngestRejected(
                "zone_mismatch",
                {"topic_zone": str(t_zone), "camera_zone_id": str(c_zone)},
            )

    # 4. Timestamp parsing
    observed_at = parse_utc_timestamp(ts)

    # 5. Future skew check
    max_skew_s = float(getattr(settings, "max_future_skew_s", 30.0) if settings else 30.0)
    current_time = now if now is not None else datetime.now(UTC)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=UTC)
    else:
        current_time = current_time.astimezone(UTC)

    max_allowed = current_time + timedelta(seconds=max_skew_s)
    if observed_at > max_allowed:
        skew = (observed_at - current_time).total_seconds()
        raise IngestRejected(
            "future_timestamp",
            {
                "observed_at": observed_at.isoformat(),
                "server_time": current_time.isoformat(),
                "skew_s": round(skew, 2),
                "max_skew_s": max_skew_s,
            },
        )

    return observed_at


async def validate_occupancy(
    db: Any,
    camera: Any,
    topic_zone: uuid.UUID | str | None,
    msg: Any,
    settings: Any = None,
    now: datetime | None = None,
) -> ValidatedOccupancy:
    """
    Validates an occupancy payload and remaps confidence thresholds:
      - Validates envelope and common constraints.
      - Enforces bays list length: 1 to 200 items.
      - Rejects duplicate bay_id values.
      - Verifies every bay_id belongs to camera's mapped bays (unmapped_bay).
      - Re-maps state to "unknown" if confidence < conf_threshold (never stores low-confidence free).
    """
    payload = to_dict(msg)
    _, msg_id, camera_id, observed_at = validate_envelope(payload)

    # Validate common camera rules and future skew
    check_common(camera, topic_zone, camera_id, observed_at, settings=settings, now=now)

    # Validate bays array
    raw_bays = payload.get("bays")
    if not isinstance(raw_bays, list) or len(raw_bays) < 1:
        raise IngestRejected("invalid_payload", {"field": "bays", "message": "bays list must contain 1 to 200 items"})
    if len(raw_bays) > 200:
        raise IngestRejected(
            "invalid_payload",
            {"field": "bays", "message": f"bays count exceeds maximum 200 (got {len(raw_bays)})"},
        )

    # Parse and check uniqueness of bay IDs
    seen_bays: set[uuid.UUID] = set()
    parsed_readings: list[tuple[uuid.UUID, str, float]] = []

    for idx, item in enumerate(raw_bays):
        if not isinstance(item, dict):
            raise IngestRejected("invalid_payload", {"field": f"bays[{idx}]", "message": "Reading item must be an object"})

        raw_bay_id = item.get("bay_id")
        if raw_bay_id is None:
            raise IngestRejected("invalid_payload", {"field": f"bays[{idx}].bay_id", "message": "Missing bay_id"})
        try:
            bid = uuid.UUID(str(raw_bay_id))
        except (ValueError, TypeError):
            raise IngestRejected(
                "invalid_payload",
                {"field": f"bays[{idx}].bay_id", "message": f"Malformed bay_id UUID: {raw_bay_id}"},
            )

        if bid in seen_bays:
            raise IngestRejected(
                "invalid_payload",
                {"field": "bays", "message": f"Duplicate bay_id detected in payload: {bid}"},
            )
        seen_bays.add(bid)

        state = item.get("state")
        if state not in ("occupied", "free", "unknown"):
            raise IngestRejected(
                "invalid_payload",
                {"field": f"bays[{idx}].state", "message": f"Invalid state '{state}'; must be occupied, free, or unknown"},
            )

        confidence = item.get("confidence")
        if confidence is None or isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not (0.0 <= confidence <= 1.0):
            raise IngestRejected(
                "invalid_payload",
                {"field": f"bays[{idx}].confidence", "message": f"Confidence must be in [0.0, 1.0], got {confidence}"},
            )

        parsed_readings.append((bid, state, float(confidence)))

    # Fetch camera's mapped bays from database
    mapped_bay_ids = await repo.get_camera_bay_ids(db, camera_id)
    # Check for unmapped bays
    for bid, _, _ in parsed_readings:
        if bid not in mapped_bay_ids:
            raise IngestRejected("unmapped_bay", {"bay_id": str(bid)})

    # Remap confidence against camera threshold
    cam_config = getattr(camera, "config", {}) or {}
    conf_threshold = float(cam_config.get("conf_threshold", 0.5))

    final_readings: list[tuple[uuid.UUID, str, float]] = []
    for bid, state, conf in parsed_readings:
        final_state = state
        if conf < conf_threshold:
            # Low confidence becomes "unknown"; never stored as free or occupied
            final_state = "unknown"
        final_readings.append((bid, final_state, conf))

    return ValidatedOccupancy(
        msg_id=msg_id,
        observed_at=observed_at,
        readings=final_readings,
    )


async def validate_crowd(
    db: Any,
    camera: Any,
    topic_zone: uuid.UUID | str | None,
    msg: Any,
    settings: Any = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """
    Validates a crowd message:
      - Validates envelope and common constraints.
      - Enforces interval_s > 0 and evenly divides agg_interval_min * 60 (bad_interval).
      - Enforces vehicle_count >= 0, pedestrian_count >= 0.
      - Enforces sum(vehicle_by_category) <= vehicle_count (bad_counts).
      - Drops density_per_m2 to None if camera.config lacks area_m2.
    """
    payload = to_dict(msg)
    _, _msg_id, camera_id, observed_at = validate_envelope(payload)

    check_common(camera, topic_zone, camera_id, observed_at, settings=settings, now=now)

    # Interval divisibility check
    interval_s = payload.get("interval_s")
    if interval_s is None or not isinstance(interval_s, int) or isinstance(interval_s, bool) or interval_s <= 0:
        raise IngestRejected("invalid_payload", {"field": "interval_s", "message": "interval_s must be integer > 0"})

    agg_min = int(getattr(settings, "agg_interval_min", 15) if settings else 15)
    agg_s = agg_min * 60
    if agg_s % interval_s != 0:
        raise IngestRejected(
            "bad_interval",
            {"interval_s": interval_s, "agg_interval_s": agg_s},
            message=f"interval_s ({interval_s}) must evenly divide aggregation interval ({agg_s}s)",
        )

    # Counts verification
    vehicle_count = payload.get("vehicle_count")
    if vehicle_count is None or not isinstance(vehicle_count, int) or isinstance(vehicle_count, bool) or vehicle_count < 0:
        raise IngestRejected("invalid_payload", {"field": "vehicle_count", "message": "vehicle_count must be int >= 0"})

    pedestrian_count = payload.get("pedestrian_count")
    if pedestrian_count is None or not isinstance(pedestrian_count, int) or isinstance(pedestrian_count, bool) or pedestrian_count < 0:
        raise IngestRejected("invalid_payload", {"field": "pedestrian_count", "message": "pedestrian_count must be int >= 0"})

    vehicle_by_category = payload.get("vehicle_by_category", {})
    if not isinstance(vehicle_by_category, dict):
        raise IngestRejected("invalid_payload", {"field": "vehicle_by_category", "message": "vehicle_by_category must be a dictionary"})

    cat_sum = 0
    for cat, count in vehicle_by_category.items():
        if not isinstance(count, int) or isinstance(count, bool) or count < 0:
            raise IngestRejected("invalid_payload", {"field": f"vehicle_by_category.{cat}", "message": "Count must be int >= 0"})
        cat_sum += count

    if cat_sum > vehicle_count:
        raise IngestRejected(
            "bad_counts",
            {"sum_categories": cat_sum, "vehicle_count": vehicle_count},
            message=f"Sum of vehicle categories ({cat_sum}) exceeds vehicle_count ({vehicle_count})",
        )

    # Density verification: requires camera area_m2, else drop to None
    cam_config = getattr(camera, "config", {}) or {}
    area_m2 = cam_config.get("area_m2")
    validated_payload = dict(payload)
    if area_m2 is None or float(area_m2) <= 0.0:
        validated_payload["density_per_m2"] = None
    elif validated_payload.get("density_per_m2") is not None:
        validated_payload["density_per_m2"] = float(validated_payload["density_per_m2"])

    # Quality check
    quality = payload.get("quality", "ok")
    if quality not in ("ok", "degraded", "suspect"):
        raise IngestRejected("invalid_payload", {"field": "quality", "message": "quality must be ok, degraded, or suspect"})

    return validated_payload


def validate_health(
    camera: Any,
    topic_zone: uuid.UUID | str | None,
    msg: Any,
    settings: Any = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """
    Validates a device health message:
      - Validates envelope and common constraints.
      - State must be in ("online", "degraded", "offline").
      - Bounded errors list: at most 20 strings, each <= 200 chars.
    """
    payload = to_dict(msg)
    _, _msg_id, camera_id, observed_at = validate_envelope(payload)

    check_common(camera, topic_zone, camera_id, observed_at, settings=settings, now=now)

    state = payload.get("state")
    if state not in ("online", "degraded", "offline"):
        raise IngestRejected(
            "invalid_payload",
            {"field": "state", "message": "Health state must be online, degraded, or offline"},
        )

    errors = payload.get("errors", [])
    if not isinstance(errors, list):
        raise IngestRejected("invalid_payload", {"field": "errors", "message": "errors must be a list"})
    if len(errors) > 20:
        raise IngestRejected("invalid_payload", {"field": "errors", "message": "errors list cannot exceed 20 items"})

    validated_payload = dict(payload)
    validated_payload["errors"] = [str(e)[:200] for e in errors]
    return validated_payload
