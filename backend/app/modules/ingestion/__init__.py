"""
ParkSMART - Ingestion Module Package (M2 Ownership)
"""

from app.modules.ingestion.dedup import RecentMessageCache, cache
from app.modules.ingestion.health_monitor import CHECK_INTERVAL_S, HealthMonitor
from app.modules.ingestion.mqtt_consumer import (
    BACKOFF_STEPS_S,
    MAX_PAYLOAD_BYTES,
    QOS,
    TOPIC_FILTERS,
    MqttConsumer,
)
from app.modules.ingestion.service import (
    IngestResult,
    handle_crowd,
    handle_health,
    handle_occupancy,
    source_for_camera,
)
from app.modules.ingestion.state_manager import (
    ApplyResult,
    apply_bay_reading,
    apply_health,
    apply_occupancy,
    derive_data_state,
    touch_camera,
)
from app.modules.ingestion.validator import (
    IngestRejected,
    ValidatedOccupancy,
    check_common,
    parse_utc_timestamp,
    validate_crowd,
    validate_envelope,
    validate_health,
    validate_occupancy,
)

__all__ = [
    "BACKOFF_STEPS_S",
    "CHECK_INTERVAL_S",
    "MAX_PAYLOAD_BYTES",
    "QOS",
    "TOPIC_FILTERS",
    "ApplyResult",
    "HealthMonitor",
    "IngestRejected",
    "IngestResult",
    "MqttConsumer",
    "RecentMessageCache",
    "ValidatedOccupancy",
    "apply_bay_reading",
    "apply_health",
    "apply_occupancy",
    "cache",
    "check_common",
    "derive_data_state",
    "handle_crowd",
    "handle_health",
    "handle_occupancy",
    "parse_utc_timestamp",
    "source_for_camera",
    "touch_camera",
    "validate_crowd",
    "validate_envelope",
    "validate_health",
    "validate_occupancy",
]
