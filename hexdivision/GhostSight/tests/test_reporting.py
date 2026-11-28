"""Tests for the GhostSight reporting layer."""

import json

from ghostsight.reporting.generator import (
    build_report_paths,
    create_scan_directory,
    generate_scan_reports,
    next_scan_number,
    write_scan_data,
)
from ghostsight.reporting.models import (
    Finding,
    FindingStatus,
    ScanResult,
    Service,
)


def make_scan() -> ScanResult:
    """Return a small but complete ScanResult for testing."""
    return ScanResult(
        target="192.0.2.10",
        scan_id="test-001",
        profile="low-noise",
        started_at="2026-01-01T00:00:00+00:00",
        finished_at="2026-01-01T00:01:00+00:00",
        duration_seconds=60.0,
        scanner="nmap",
        authorised=True,
        notes=["Example note."],
        services=[
            Service(
                host="192.0.2.10",
                port=22,
                protocol="tcp",
                name="ssh",
                version="OpenSSH 8.9p1",
            )
        ],
        findings=[
            Finding(
                title="Example finding",
                description="Demonstration only.",
                severity="medium",
                confidence=0.5,
                status=FindingStatus.POTENTIAL,
                cve_ids=["CVE-2024-0001"],
                cvss_score=5.3,
                evidence=["Banner: OpenSSH 8.9p1"],
                remediation="Update the software.",
                affected_service="ssh",
            )
        ],
    )


def test_scan_directory_names_increment(isolated_home):
    first = create_scan_directory()
    second = create_scan_directory()

    assert first.name == "scan_001"
    assert second.name == "scan_002"


def test_next_scan_number_is_one_for_empty_root(isolated_home):
    root = isolated_home / "output" / "scans"

    assert next_scan_number(root) == 1


def test_generate_scan_reports_writes_all_files(isolated_home):
    scan = make_scan()
    paths = generate_scan_reports(scan)

    for path in paths.all_files():
        assert path.exists()
        assert path.stat().st_size > 0


def test_scan_data_json_round_trip(isolated_home):
    scan = make_scan()
    paths = generate_scan_reports(scan)

    data = json.loads(paths.scan_data.read_text(encoding="utf-8"))

    assert data["target"] == "192.0.2.10"
    assert data["services"][0]["port"] == 22
    assert data["findings"][0]["status"] == "potential"


def test_final_report_contains_key_sections(isolated_home):
    scan = make_scan()
    paths = generate_scan_reports(scan)
    content = paths.final_report.read_text(encoding="utf-8")

    assert "SUMMARY" in content
    assert "WHAT WAS FOUND" in content
    assert "LIMITATIONS AND UNCERTAINTY" in content
    assert "192.0.2.10" in content


def test_missing_version_is_marked_not_detected(isolated_home):
    scan = make_scan()
    scan.services[0].version = ""
    paths = generate_scan_reports(scan)
    content = paths.services.read_text(encoding="utf-8")

    assert "Not detected" in content


def test_write_scan_data_creates_json_file(isolated_home):
    scan = make_scan()
    directory = create_scan_directory()
    paths = build_report_paths(directory)

    write_scan_data(scan, paths)

    assert json.loads(paths.scan_data.read_text(encoding="utf-8"))["scan_id"] == "test-001"


def test_findings_are_not_claimed_as_proven(isolated_home):
    scan = make_scan()
    paths = generate_scan_reports(scan)
    content = paths.vulnerabilities.read_text(encoding="utf-8")

    assert "Potential vulnerability" in content
    assert "not proof of a vulnerability" in content
