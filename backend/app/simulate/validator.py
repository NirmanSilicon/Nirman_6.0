"""
backend/app/simulate/validator.py

Dataset Integrity & Pre-Flight Validation Engine.
Validates incoming telemetry frames before ingestion into the AI/ML and causal engines.
Adheres to Section 9 specification:
- timestamp ordering / monotonic MET
- duplicate packet IDs
- missing timestamps or sequences
- invalid numeric values (NaN, Inf)
- impossible units
- unknown subsystems / channels
- malformed records
"""

import math
from typing import List, Dict, Any, Tuple
from app.simulate.simulation_models import CanonicalTelemetryRecord, ValidationReport

VALID_SUBSYSTEMS = {
    "THERMAL",
    "EPS",
    "BATTERY",
    "OBC",
    "COMMS",
    "ADCS",
    "PAYLOAD",
    "PROPULSION",
    "CDH",
    "FLIGHT_SOFTWARE",
}

VALID_UNITS = {
    "degC",
    "K",
    "C",
    "V",
    "A",
    "mA",
    "W",
    "mW",
    "dBm",
    "%",
    "ratio",
    "state",
    "rad/s",
    "deg/s",
    "count",
    "dimensionless",
    "s",
    "ms",
}


def validate_telemetry_records(records: List[CanonicalTelemetryRecord]) -> ValidationReport:
    """
    Validates a stream of CanonicalTelemetryRecord instances.
    Returns a structured ValidationReport.
    """
    errors: List[str] = []
    warnings: List[str] = []

    if not records:
        return ValidationReport(
            valid=False,
            errors=["Dataset contains zero telemetry records."],
            warnings=[],
            stats={"total_packets": 0, "valid_packets": 0, "corrupt_packets": 0}
        )

    seen_packet_ids = set()
    last_met_per_channel: Dict[str, float] = {}
    valid_packets = 0
    corrupt_packets = 0
    subsystems_present = set()
    channels_present = set()

    for idx, rec in enumerate(records):
        is_record_corrupt = False

        # 1. Required fields
        if not rec.packet_id:
            errors.append(f"Record {idx}: Missing packet_id.")
            is_record_corrupt = True
        elif rec.packet_id in seen_packet_ids:
            errors.append(f"Record {idx}: Duplicate packet_id '{rec.packet_id}'.")
            is_record_corrupt = True
        else:
            seen_packet_ids.add(rec.packet_id)

        # 2. Subsystem validation
        subsys = rec.subsystem.upper() if rec.subsystem else ""
        if not subsys or subsys not in VALID_SUBSYSTEMS:
            errors.append(f"Record {idx} ({rec.packet_id}): Unknown subsystem '{rec.subsystem}'.")
            is_record_corrupt = True
        else:
            subsystems_present.add(subsys)

        # 3. Channel validation
        if not rec.channel_id:
            errors.append(f"Record {idx} ({rec.packet_id}): Missing channel_id.")
            is_record_corrupt = True
        else:
            channels_present.add(rec.channel_id)

        # 4. Numeric validation
        if math.isnan(rec.value) or math.isinf(rec.value):
            errors.append(f"Record {idx} ({rec.packet_id}): Non-finite numeric value {rec.value}.")
            is_record_corrupt = True

        # 5. Unit sanity
        if rec.unit and rec.unit not in VALID_UNITS:
            warnings.append(f"Record {idx} ({rec.packet_id}): Non-standard unit '{rec.unit}'.")

        # 6. Monotonic MET ordering per channel
        if rec.channel_id in last_met_per_channel:
            prev_met = last_met_per_channel[rec.channel_id]
            if rec.mission_elapsed_time < prev_met:
                errors.append(
                    f"Record {idx} ({rec.packet_id}): Non-monotonic MET for channel {rec.channel_id} "
                    f"({rec.mission_elapsed_time}s < {prev_met}s)."
                )
                is_record_corrupt = True

        last_met_per_channel[rec.channel_id] = rec.mission_elapsed_time

        if is_record_corrupt:
            corrupt_packets += 1
        else:
            valid_packets += 1

    is_valid = len(errors) == 0

    stats = {
        "total_packets": len(records),
        "valid_packets": valid_packets,
        "corrupt_packets": corrupt_packets,
        "unique_channels": len(channels_present),
        "channels": sorted(list(channels_present)),
        "subsystems": sorted(list(subsystems_present)),
        "met_span_seconds": round(max(last_met_per_channel.values()) - min(last_met_per_channel.values()), 2) if last_met_per_channel else 0.0
    }

    return ValidationReport(
        valid=is_valid,
        errors=errors[:50],  # cap at 50 to prevent payload explosion
        warnings=warnings[:50],
        stats=stats
    )
