"""
backend/app/simulate/simulation_models.py

Canonical Telemetry Data Models & Schemas for CAELIS.
Defines typed telemetry records, simulation datasets, and validation structures.
Enforces strict provenance (REAL, SIMULATED, DERIVED) and metadata tracking.
"""

import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Literal


ProvenanceType = Literal["REAL", "SIMULATED", "DERIVED"]
QualityType = Literal["VALID", "DEGRADED", "STALE", "CORRUPT", "OUT_OF_BOUNDS"]


@dataclass
class CanonicalTelemetryRecord:
    """
    Canonical spacecraft telemetry record representing a single sensor or state channel observation.
    Adheres to the Section 2 & 3 specification.
    """
    packet_id: str                      # e.g., "PKT-001000"
    mission_id: str                     # e.g., "MISSION-CUBESAT-3U"
    spacecraft_id: str                  # e.g., "SC-01"
    timestamp: str                      # ISO-8601 UTC string
    mission_elapsed_time: float         # Monotonic mission elapsed time in seconds (MET)
    subsystem: str                      # THERMAL, EPS, BATTERY, OBC, COMMS, ADCS, PAYLOAD
    channel_id: str                     # Unique hardware/telemetry channel ID
    signal_name: str                    # Human-readable parameter name
    value: float                        # Observed / simulated numeric value
    unit: str                           # degC, V, A, dBm, %, ratio, state
    quality: QualityType = "VALID"      # Data quality flag
    source_type: ProvenanceType = "SIMULATED"  # Strict provenance indicator
    packet_sequence: int = 0            # Sequential integer packet number
    expected_value: Optional[float] = None  # Expected value from nominal physics model
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CanonicalTelemetryRecord":
        return cls(
            packet_id=str(data.get("packet_id", f"PKT-{uuid.uuid4().hex[:8].upper()}")),
            mission_id=str(data.get("mission_id", "MISSION-CUBESAT-3U")),
            spacecraft_id=str(data.get("spacecraft_id", "SC-01")),
            timestamp=str(data.get("timestamp", datetime.now(timezone.utc).isoformat())),
            mission_elapsed_time=float(data.get("mission_elapsed_time", 0.0)),
            subsystem=str(data.get("subsystem", "UNKNOWN")).upper(),
            channel_id=str(data.get("channel_id", "CH_RAW")),
            signal_name=str(data.get("signal_name", "unnamed_signal")),
            value=float(data.get("value", 0.0)),
            unit=str(data.get("unit", "dimensionless")),
            quality=data.get("quality", "VALID"),
            source_type=data.get("source_type", "SIMULATED"),
            packet_sequence=int(data.get("packet_sequence", 0)),
            expected_value=float(data["expected_value"]) if data.get("expected_value") is not None else None,
            metadata=data.get("metadata", {}) or {}
        )


@dataclass
class SimulationDataset:
    """
    Container for a complete, reproducible simulation run with full configuration and metadata.
    """
    simulation_id: str
    scenario_id: str
    name: str
    description: str
    created_at: str
    random_seed: int
    configuration_version: str
    parameters: Dict[str, Any]
    records: List[CanonicalTelemetryRecord]
    events: List[Dict[str, Any]]
    ground_truth: Dict[str, Any]
    status: str = "GENERATED"
    subsystems: List[str] = field(default_factory=list)
    channels: List[str] = field(default_factory=list)
    summary: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self, include_records: bool = True) -> Dict[str, Any]:
        res = {
            "simulation_id": self.simulation_id,
            "scenario_id": self.scenario_id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at,
            "random_seed": self.random_seed,
            "configuration_version": self.configuration_version,
            "parameters": self.parameters,
            "status": self.status,
            "subsystems": self.subsystems,
            "channels": self.channels,
            "summary": self.summary,
            "total_packets": len(self.records),
            "events_count": len(self.events),
            "ground_truth": self.ground_truth,
        }
        if include_records:
            res["records"] = [r.to_dict() for r in self.records]
            res["events"] = self.events
        return res


@dataclass
class ValidationReport:
    """
    Structured response from dataset integrity validation.
    """
    valid: bool
    errors: List[str]
    warnings: List[str]
    stats: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
