"""Read scan_data.json back into a ScanResult.

The file is treated as untrusted. It can be edited, damaged or written by
an older version, so every field is checked and nothing is guessed. Every
problem raises ScanDataError. The messages name the field and the entry
number but never repeat the bad value.

Fields that older files lack get a default. Fields that identify the scan
(target, scan_id, services, and a service's host, port and protocol, and a
finding's title) are required, because a file without them is damaged.

This module only reads. It uses no network and writes no files.
"""

import json
from pathlib import Path
from typing import Any

from ghostsight.reporting.models import (
    Finding,
    FindingStatus,
    ScanResult,
    Service,
)

# A guess, not a measurement. A normal scan file is a few kilobytes.
MAX_SCAN_BYTES = 16 * 1024 * 1024

# One year. A finite upper bound keeps the comparison simple and rejects NaN.
MAX_DURATION_SECONDS = 365 * 24 * 3600.0

_MISSING: Any = object()


class ScanDataError(ValueError):
    """The scan file is missing, unreadable or does not have the expected shape."""


def _field(obj: dict[str, Any], key: str, where: str, default: Any) -> Any:
    if key in obj:
        return obj[key]
    if default is _MISSING:
        raise ScanDataError(f"{where}: the required field '{key}' is missing.")
    return default


def _text(obj: dict[str, Any], key: str, where: str, default: Any = _MISSING) -> str:
    value = _field(obj, key, where, default)
    if not isinstance(value, str):
        raise ScanDataError(f"{where}: '{key}' must be text.")
    return value


def _text_list(obj: dict[str, Any], key: str, where: str) -> list[str]:
    value = _field(obj, key, where, [])
    if not isinstance(value, list) or not all(isinstance(i, str) for i in value):
        raise ScanDataError(f"{where}: '{key}' must be a list of text.")
    return list(value)


def _flag(obj: dict[str, Any], key: str, where: str) -> bool:
    value = _field(obj, key, where, False)
    if not isinstance(value, bool):
        raise ScanDataError(f"{where}: '{key}' must be true or false.")
    return value


def _number(
    obj: dict[str, Any], key: str, where: str, low: float, high: float
) -> float:
    """Read a number in [low, high]. A bool is not a number here."""
    value = _field(obj, key, where, 0.0)
    if type(value) is not int and type(value) is not float:
        raise ScanDataError(f"{where}: '{key}' must be a number.")
    # The comparison is false for NaN, so NaN is refused too.
    if not low <= value <= high:
        raise ScanDataError(f"{where}: '{key}' must be from {low:g} to {high:g}.")
    return float(value)


def _list_of_objects(
    data: dict[str, Any], key: str, required: bool
) -> list[dict[str, Any]]:
    value = _field(data, key, "scan", _MISSING if required else [])
    if not isinstance(value, list):
        raise ScanDataError(f"scan: '{key}' must be a list.")
    for index, item in enumerate(value, start=1):
        if not isinstance(item, dict):
            raise ScanDataError(f"scan: {key} entry {index} is not an object.")
    return value


def _service(item: dict[str, Any], number: int) -> Service:
    where = f"service {number}"
    port = _field(item, "port", where, _MISSING)
    if type(port) is not int or not 1 <= port <= 65535:
        raise ScanDataError(f"{where}: 'port' must be a whole number from 1 to 65535.")
    return Service(
        host=_text(item, "host", where),
        port=port,
        protocol=_text(item, "protocol", where),
        name=_text(item, "name", where, "unknown"),
        version=_text(item, "version", where, ""),
        extra_info=_text(item, "extra_info", where, ""),
        state=_text(item, "state", where, "open"),
        cpe=_text_list(item, "cpe", where),
        product=_text(item, "product", where, ""),
        product_version=_text(item, "product_version", where, ""),
    )


def _finding(item: dict[str, Any], number: int) -> Finding:
    where = f"finding {number}"
    raw_status = _text(item, "status", where, FindingStatus.UNKNOWN.value)
    try:
        status = FindingStatus(raw_status)
    except ValueError:
        raise ScanDataError(f"{where}: 'status' is not a known status.") from None

    score = None
    if item.get("cvss_score") is not None:
        score = _number(item, "cvss_score", where, 0.0, 10.0)

    return Finding(
        title=_text(item, "title", where),
        description=_text(item, "description", where, ""),
        severity=_text(item, "severity", where, "unknown"),
        confidence=_number(item, "confidence", where, 0.0, 1.0),
        status=status,
        cve_ids=_text_list(item, "cve_ids", where),
        cvss_score=score,
        evidence=_text_list(item, "evidence", where),
        remediation=_text(item, "remediation", where, ""),
        affected_service=_text(item, "affected_service", where, ""),
    )


def scan_from_dict(data: object) -> ScanResult:
    """Build a ScanResult from parsed JSON, or raise ScanDataError."""
    if not isinstance(data, dict):
        raise ScanDataError("scan: the data is not a JSON object.")
    where = "scan"
    services = _list_of_objects(data, "services", required=True)
    findings = _list_of_objects(data, "findings", required=False)
    return ScanResult(
        target=_text(data, "target", where),
        scan_id=_text(data, "scan_id", where),
        profile=_text(data, "profile", where, "unknown"),
        started_at=_text(data, "started_at", where, ""),
        finished_at=_text(data, "finished_at", where, ""),
        duration_seconds=_number(data, "duration_seconds", where, 0.0, MAX_DURATION_SECONDS),
        scanner=_text(data, "scanner", where, "unknown"),
        authorised=_flag(data, "authorised", where),
        notes=_text_list(data, "notes", where),
        services=[_service(item, n) for n, item in enumerate(services, start=1)],
        findings=[_finding(item, n) for n, item in enumerate(findings, start=1)],
        ai_analysis=_text(data, "ai_analysis", where, ""),
        validation_notes=_text_list(data, "validation_notes", where),
        analysis_performed=_flag(data, "analysis_performed", where),
    )


def read_scan_file(path: Path) -> ScanResult:
    """Read and check a scan_data.json file, or raise ScanDataError."""
    try:
        with path.open("rb") as handle:
            raw = handle.read(MAX_SCAN_BYTES + 1)
    except OSError as error:
        raise ScanDataError(
            f"The scan file could not be read ({type(error).__name__})."
        ) from error
    if len(raw) > MAX_SCAN_BYTES:
        raise ScanDataError("The scan file is larger than the size limit.")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise ScanDataError("The scan file is not valid UTF-8 text.") from None
    try:
        data = json.loads(text)
    except (ValueError, RecursionError):
        raise ScanDataError("The scan file is not valid JSON.") from None
    return scan_from_dict(data)
