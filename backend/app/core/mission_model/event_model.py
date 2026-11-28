"""
backend/app/core/mission_model/event_model.py

Universal event representation for the AXYRA mission architecture boundary.
Provides unified EventRecord abstraction wrapping raw sensor threshold crossings,
discrete telemetry state changes, software alarms, and AI anomaly classifications.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, Literal, Dict, Any


EventType = Literal["threshold", "state_change", "alarm", "reboot"]
EventSeverity = Literal["info", "warning", "critical"]
TimingConfidence = Literal["documented", "estimated"]
CausalRole = Literal["primary", "propagation", "secondary", "independent", "unknown"]


@dataclass
class EventRecord:
    """
    Standardized telemetry event representation across all mission types.
    Maintains backward compatibility with legacy Event dataclass.
    """
    id: str
    timestamp: str
    component: str
    event_type: EventType
    value: Optional[float]
    description: str
    severity: EventSeverity = "warning"
    timing_confidence: TimingConfidence = "documented"
    parameter: Optional[str] = None
    subsystem: Optional[str] = None
    notes: Optional[str] = None
    raw_status: Optional[str] = "NOMINAL"
    is_anomaly: bool = True
    feature_vector: Dict[str, float] = field(default_factory=dict)
    source: str = "telemetry_stream"
    predicted_value: Optional[float] = None
    residual: Optional[float] = None
    normalized_residual: Optional[float] = None
    anomaly_classification: str = "statistically_abnormal"  # "statistically_abnormal" | "physically_inconsistent" | "both" | "neither"
    is_statistical_anomaly: bool = True
    is_physical_anomaly: bool = False
    physics_evidence: Dict[str, Any] = field(default_factory=dict)
    confidence_tier: str = "INSUFFICIENT EVIDENCE"
    is_out_of_distribution: bool = False
    pattern_status: str = "KNOWN_PATTERN"

    def to_legacy_dict(self) -> Dict[str, Any]:
        """Convert to dict matching legacy event structure."""
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "component": self.component,
            "event_type": self.event_type,
            "value": self.value,
            "description": self.description,
            "severity": self.severity,
            "timing_confidence": self.timing_confidence,
            "notes": self.notes,
            "predicted_value": self.predicted_value,
            "residual": self.residual,
            "normalized_residual": self.normalized_residual,
            "anomaly_classification": self.anomaly_classification,
            "is_statistical_anomaly": self.is_statistical_anomaly,
            "is_physical_anomaly": self.is_physical_anomaly,
            "physics_evidence": self.physics_evidence,
            "confidence_tier": self.confidence_tier,
            "is_out_of_distribution": self.is_out_of_distribution,
            "pattern_status": self.pattern_status,
        }

    @classmethod
    def from_legacy_event(cls, event: Any) -> "EventRecord":
        """Factory from legacy Event dataclass or dictionary."""
        if isinstance(event, dict):
            return cls(
                id=str(event.get("id", "")),
                timestamp=str(event.get("timestamp", "")),
                component=str(event.get("component", "")),
                event_type=event.get("event_type", "threshold"),
                value=event.get("value"),
                description=str(event.get("description", "")),
                severity=event.get("severity", "warning"),
                timing_confidence=event.get("timing_confidence", "documented"),
                notes=event.get("notes"),
                parameter=event.get("parameter"),
                subsystem=event.get("subsystem"),
                predicted_value=event.get("predicted_value"),
                residual=event.get("residual"),
                normalized_residual=event.get("normalized_residual"),
                anomaly_classification=event.get("anomaly_classification", "statistically_abnormal"),
                is_statistical_anomaly=event.get("is_statistical_anomaly", True),
                is_physical_anomaly=event.get("is_physical_anomaly", False),
                physics_evidence=event.get("physics_evidence", {}),
            )
        return cls(
            id=getattr(event, "id", ""),
            timestamp=getattr(event, "timestamp", ""),
            component=getattr(event, "component", ""),
            event_type=getattr(event, "event_type", "threshold"),
            value=getattr(event, "value", None),
            description=getattr(event, "description", ""),
            severity=getattr(event, "severity", "warning"),
            timing_confidence=getattr(event, "timing_confidence", "documented"),
            notes=getattr(event, "notes", None),
            predicted_value=getattr(event, "predicted_value", None),
            residual=getattr(event, "residual", None),
            normalized_residual=getattr(event, "normalized_residual", None),
            anomaly_classification=getattr(event, "anomaly_classification", "statistically_abnormal"),
            is_statistical_anomaly=getattr(event, "is_statistical_anomaly", True),
            is_physical_anomaly=getattr(event, "is_physical_anomaly", False),
            physics_evidence=getattr(event, "physics_evidence", {}),
        )
