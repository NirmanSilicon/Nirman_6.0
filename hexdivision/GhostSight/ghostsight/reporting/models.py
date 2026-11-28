"""Data model for a GhostSight scan.

These dataclasses describe what a scan produces. They are deliberately
free of any file system or terminal concerns so they can be reused
by the scanner, the intelligence engines and the reporter.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


class FindingStatus(str, Enum):
    """How confident we are that a finding represents a real issue.

    A version match alone never proves a vulnerability, so every
    finding carries its own status and supporting evidence.
    """

    POTENTIAL = "potential"
    LIKELY = "likely"
    VALIDATED = "validated"
    FALSE_POSITIVE = "false_positive"
    UNKNOWN = "unknown"

    @property
    def label(self) -> str:
        """Return a human-readable label for the status."""
        return {
            FindingStatus.POTENTIAL: "Potential vulnerability",
            FindingStatus.LIKELY: "Likely vulnerability",
            FindingStatus.VALIDATED: "Validated vulnerability",
            FindingStatus.FALSE_POSITIVE: "False positive",
            FindingStatus.UNKNOWN: "Unknown",
        }[self]


@dataclass
class Service:
    """A single detected network service.

    version is the combined text shown in reports. product and
    product_version hold Nmap's two attributes as received. Only the
    Nmap parser fills them.
    """

    host: str
    port: int
    protocol: str
    name: str = "unknown"
    version: str = ""
    extra_info: str = ""
    state: str = "open"
    cpe: list[str] = field(default_factory=list)
    product: str = ""
    product_version: str = ""

    def to_dict(self) -> dict[str, Any]:
        """Return a JSON-serialisable representation."""
        return {
            "host": self.host,
            "port": self.port,
            "protocol": self.protocol,
            "name": self.name,
            "version": self.version,
            "product": self.product,
            "product_version": self.product_version,
            "extra_info": self.extra_info,
            "state": self.state,
            "cpe": list(self.cpe),
        }


@dataclass
class Finding:
    """A potential, likely or validated security issue."""

    title: str
    description: str = ""
    severity: str = "unknown"
    confidence: float = 0.0
    status: FindingStatus = FindingStatus.UNKNOWN
    cve_ids: list[str] = field(default_factory=list)
    cvss_score: float | None = None
    evidence: list[str] = field(default_factory=list)
    remediation: str = ""
    affected_service: str = ""

    def to_dict(self) -> dict[str, Any]:
        """Return a JSON-serialisable representation."""
        return {
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "confidence": self.confidence,
            "status": self.status.value,
            "status_label": self.status.label,
            "cve_ids": list(self.cve_ids),
            "cvss_score": self.cvss_score,
            "evidence": list(self.evidence),
            "remediation": self.remediation,
            "affected_service": self.affected_service,
        }


@dataclass
class ScanResult:
    """Everything a single scan produced.

    This object is the in-memory form of scan_data.json.

    analysis_performed is False until a vulnerability analysis step has
    actually run. It lets a report tell "analysed, nothing found" apart
    from "not analysed at all".
    """

    target: str
    scan_id: str
    profile: str = "low-noise"
    started_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    finished_at: str = ""
    duration_seconds: float = 0.0
    scanner: str = "nmap"
    authorised: bool = False
    notes: list[str] = field(default_factory=list)
    services: list[Service] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)
    ai_analysis: str = ""
    validation_notes: list[str] = field(default_factory=list)
    analysis_performed: bool = False

    def to_dict(self) -> dict[str, Any]:
        """Return a JSON-serialisable representation of the whole scan."""
        return {
            "target": self.target,
            "scan_id": self.scan_id,
            "profile": self.profile,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "duration_seconds": self.duration_seconds,
            "scanner": self.scanner,
            "authorised": self.authorised,
            "notes": list(self.notes),
            "services": [service.to_dict() for service in self.services],
            "findings": [finding.to_dict() for finding in self.findings],
            "ai_analysis": self.ai_analysis,
            "validation_notes": list(self.validation_notes),
            "analysis_performed": self.analysis_performed,
        }
