"""Tests for reading scan_data.json back into a ScanResult."""

from pathlib import Path
from typing import Any

import pytest

from ghostsight.reporting.models import (
    Finding,
    FindingStatus,
    ScanResult,
    Service,
)
from ghostsight.reporting.scan_reader import (
    MAX_SCAN_BYTES,
    ScanDataError,
    read_scan_file,
    scan_from_dict,
)


def full_scan() -> ScanResult:
    return ScanResult(
        target="127.0.0.1",
        scan_id="scan-007",
        profile="normal",
        started_at="2026-01-01T00:00:00+00:00",
        finished_at="2026-01-01T00:01:00+00:00",
        duration_seconds=60.0,
        scanner="nmap",
        authorised=True,
        notes=["a note"],
        services=[
            Service(
                host="127.0.0.1",
                port=22,
                protocol="tcp",
                name="ssh",
                version="OpenSSH 9.6p1 Ubuntu",
                extra_info="protocol 2.0",
                state="open",
                cpe=["cpe:/a:openbsd:openssh:9.6p1"],
                product="OpenSSH",
                product_version="9.6p1 Ubuntu",
            )
        ],
        findings=[
            Finding(
                title="t",
                description="d",
                severity="low",
                confidence=0.5,
                status=FindingStatus.POTENTIAL,
                cve_ids=["CVE-1"],
                cvss_score=3.7,
                evidence=["e"],
                remediation="r",
                affected_service="ssh",
            )
        ],
        ai_analysis="text",
        validation_notes=["v"],
        analysis_performed=True,
    )


def good() -> dict[str, Any]:
    return full_scan().to_dict()


# A file written before the cpe, product and analysis_performed fields existed.
OLD_FORMAT: dict[str, Any] = {
    "target": "192.0.2.10",
    "scan_id": "demo-001",
    "profile": "low-noise",
    "started_at": "2026-11-13T19:30:57+00:00",
    "finished_at": "2026-11-13T19:30:57+00:00",
    "duration_seconds": 0.0,
    "scanner": "none (demonstration data)",
    "authorised": False,
    "notes": ["demo"],
    "services": [
        {
            "host": "192.0.2.10",
            "port": 22,
            "protocol": "tcp",
            "name": "ssh",
            "version": "OpenSSH 8.9p1 Ubuntu 3ubuntu0.6",
            "extra_info": "",
            "state": "open",
        }
    ],
    "findings": [
        {
            "title": "Example",
            "severity": "low",
            "confidence": 0.85,
            "status": "potential",
            "status_label": "Potential vulnerability",
            "cve_ids": ["CVE-0000-0000"],
            "cvss_score": 3.7,
        }
    ],
    "ai_analysis": "",
    "validation_notes": [],
}


# --- whole objects --------------------------------------------------------


def test_round_trip_gives_back_the_same_scan() -> None:
    assert scan_from_dict(good()) == full_scan()


def test_round_trip_through_json_text() -> None:
    import json

    data = json.loads(json.dumps(good()))
    assert scan_from_dict(data) == full_scan()


def test_old_format_file_loads_with_defaults() -> None:
    scan = scan_from_dict(OLD_FORMAT)
    assert scan.scan_id == "demo-001"
    assert scan.services[0].cpe == []
    assert scan.services[0].product == ""
    assert scan.services[0].product_version == ""
    assert scan.analysis_performed is False
    assert scan.findings[0].status is FindingStatus.POTENTIAL


def test_whole_number_duration_is_accepted() -> None:
    data = good()
    data["duration_seconds"] = 5
    assert scan_from_dict(data).duration_seconds == 5


def test_unknown_extra_keys_are_ignored() -> None:
    data = good()
    data["from_a_newer_version"] = {"x": 1}
    data["services"][0]["extra"] = 1
    assert scan_from_dict(data) == full_scan()


@pytest.mark.parametrize("data", [[], "text", 5, None])
def test_something_that_is_not_an_object_is_refused(data: object) -> None:
    with pytest.raises(ScanDataError):
        scan_from_dict(data)


@pytest.mark.parametrize("key", ["target", "scan_id", "services"])
def test_missing_required_field_is_refused(key: str) -> None:
    data = good()
    del data[key]
    with pytest.raises(ScanDataError):
        scan_from_dict(data)


@pytest.mark.parametrize(
    "key, value",
    [
        ("target", 5),
        ("scan_id", None),
        ("profile", 1),
        ("duration_seconds", "fast"),
        ("duration_seconds", True),
        ("authorised", "yes"),
        ("authorised", 1),
        ("notes", "text"),
        ("notes", [1]),
        ("services", {}),
        ("findings", "x"),
        ("validation_notes", [None]),
        ("analysis_performed", "no"),
    ],
)
def test_wrong_type_at_the_top_level_is_refused(key: str, value: object) -> None:
    data = good()
    data[key] = value
    with pytest.raises(ScanDataError):
        scan_from_dict(data)


# --- services -------------------------------------------------------------


@pytest.mark.parametrize(
    "key, value",
    [
        ("host", 5),
        ("port", "22"),
        ("port", True),
        ("port", 0),
        ("port", 65536),
        ("protocol", None),
        ("name", 1),
        ("version", []),
        ("cpe", "cpe:/a:x"),
        ("cpe", [5]),
        ("state", 1),
        ("product", 1),
        ("product_version", 2),
        ("extra_info", 3),
    ],
)
def test_bad_service_field_is_refused(key: str, value: object) -> None:
    data = good()
    data["services"][0][key] = value
    with pytest.raises(ScanDataError):
        scan_from_dict(data)


@pytest.mark.parametrize("key", ["host", "port", "protocol"])
def test_service_missing_a_required_field_is_refused(key: str) -> None:
    data = good()
    del data["services"][0][key]
    with pytest.raises(ScanDataError):
        scan_from_dict(data)


def test_service_that_is_not_an_object_is_refused() -> None:
    data = good()
    data["services"] = ["text"]
    with pytest.raises(ScanDataError):
        scan_from_dict(data)


# --- findings -------------------------------------------------------------


@pytest.mark.parametrize(
    "key, value",
    [
        ("title", 5),
        ("status", "bogus"),
        ("status", 5),
        ("confidence", 1.5),
        ("confidence", -0.1),
        ("confidence", "high"),
        ("confidence", True),
        ("confidence", float("nan")),
        ("cvss_score", 11),
        ("cvss_score", "x"),
        ("cvss_score", True),
        ("cvss_score", float("inf")),
        ("cve_ids", "CVE-1"),
        ("cve_ids", [1]),
        ("evidence", "e"),
    ],
)
def test_bad_finding_field_is_refused(key: str, value: object) -> None:
    data = good()
    data["findings"][0][key] = value
    with pytest.raises(ScanDataError):
        scan_from_dict(data)


def test_null_cvss_score_is_kept_as_none() -> None:
    data = good()
    data["findings"][0]["cvss_score"] = None
    assert scan_from_dict(data).findings[0].cvss_score is None


def test_finding_without_a_title_is_refused() -> None:
    data = good()
    del data["findings"][0]["title"]
    with pytest.raises(ScanDataError):
        scan_from_dict(data)


def test_finding_that_is_not_an_object_is_refused() -> None:
    data = good()
    data["findings"] = [5]
    with pytest.raises(ScanDataError):
        scan_from_dict(data)


# --- error messages -------------------------------------------------------


def test_error_names_the_bad_field() -> None:
    data = good()
    data["services"][0]["port"] = 0
    with pytest.raises(ScanDataError) as info:
        scan_from_dict(data)
    assert "port" in str(info.value)


def test_error_does_not_echo_the_bad_value() -> None:
    data = good()
    data["findings"][0]["status"] = "ZZZ-secret-ZZZ"
    with pytest.raises(ScanDataError) as info:
        scan_from_dict(data)
    assert "ZZZ" not in str(info.value)


# --- files ----------------------------------------------------------------


def test_file_round_trip(tmp_path: Path) -> None:
    import json

    path = tmp_path / "scan_data.json"
    path.write_text(json.dumps(good()), encoding="utf-8")
    assert read_scan_file(path) == full_scan()


def test_missing_file_is_a_scan_data_error(tmp_path: Path) -> None:
    with pytest.raises(ScanDataError):
        read_scan_file(tmp_path / "nope.json")


def test_directory_is_a_scan_data_error(tmp_path: Path) -> None:
    with pytest.raises(ScanDataError):
        read_scan_file(tmp_path)


def test_invalid_json_is_a_scan_data_error(tmp_path: Path) -> None:
    path = tmp_path / "scan_data.json"
    path.write_text("{not json", encoding="utf-8")
    with pytest.raises(ScanDataError):
        read_scan_file(path)


def test_invalid_utf8_is_a_scan_data_error(tmp_path: Path) -> None:
    path = tmp_path / "scan_data.json"
    path.write_bytes(b'{"target": "\xff"}')
    with pytest.raises(ScanDataError):
        read_scan_file(path)


def test_oversize_file_is_a_scan_data_error(tmp_path: Path) -> None:
    path = tmp_path / "scan_data.json"
    path.write_bytes(b" " * (MAX_SCAN_BYTES + 1))
    with pytest.raises(ScanDataError):
        read_scan_file(path)


def test_deeply_nested_json_is_a_scan_data_error(tmp_path: Path) -> None:
    path = tmp_path / "scan_data.json"
    path.write_text("[" * 100_000 + "]" * 100_000, encoding="utf-8")
    with pytest.raises(ScanDataError):
        read_scan_file(path)
