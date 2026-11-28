"""Tests for keeping validation results safe from a new analysis.

Saving an analysis replaces every finding. If the scan has already been
validated, that would erase the validation results, so it is refused.
"""

import pytest

from ghostsight.intelligence.analysis import Analysis
from ghostsight.intelligence.analysis_apply import SaveRefusedError, apply_analysis
from ghostsight.reporting.models import Finding, FindingStatus, ScanResult, Service


def make_scan(**fields) -> ScanResult:
    fields.setdefault("target", "127.0.0.1")
    fields.setdefault("scan_id", "real-001")
    fields.setdefault("scanner", "nmap")
    fields.setdefault("started_at", "2026-01-01T00:00:00Z")
    fields.setdefault(
        "services", [Service(host="127.0.0.1", port=22, protocol="tcp")]
    )
    return ScanResult(**fields)


def new_analysis() -> Analysis:
    return Analysis(
        findings=(Finding(title="new", status=FindingStatus.POTENTIAL),),
        notes=(),
        services_checked=1,
    )


def validated_scan() -> ScanResult:
    finding = Finding(title="old", status=FindingStatus.VALIDATED)
    return make_scan(
        findings=[finding],
        validation_notes=["Checked 127.0.0.1: result vulnerable."],
    )


def test_a_validated_scan_refuses_a_new_analysis() -> None:
    with pytest.raises(SaveRefusedError, match="validation"):
        apply_analysis(validated_scan(), new_analysis())


def test_the_refused_scan_keeps_its_findings_and_notes() -> None:
    scan = validated_scan()
    with pytest.raises(SaveRefusedError):
        apply_analysis(scan, new_analysis())
    assert [item.title for item in scan.findings] == ["old"]
    assert scan.findings[0].status is FindingStatus.VALIDATED
    assert len(scan.validation_notes) == 1


def test_a_scan_without_validation_notes_can_still_be_analysed() -> None:
    result = apply_analysis(make_scan(), new_analysis())
    assert [item.title for item in result.findings] == ["new"]
