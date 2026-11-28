"""Saving a new analysis must clear AI text written for the old findings."""

from ghostsight.intelligence.analysis import Analysis
from ghostsight.intelligence.analysis_apply import apply_analysis
from ghostsight.reporting.models import Finding, FindingStatus, ScanResult, Service


def make_scan(**changes: object) -> ScanResult:
    fields: dict[str, object] = {
        "target": "192.0.2.10",
        "scan_id": "scan_001",
        "scanner": "nmap",
        "services": [Service(host="192.0.2.10", port=22, protocol="tcp")],
        "ai_analysis": "AI-GENERATED TEXT - NOT PROOF\nold text",
    }
    fields.update(changes)
    return ScanResult(**fields)  # type: ignore[arg-type]


def make_analysis() -> Analysis:
    finding = Finding(title="New finding", status=FindingStatus.POTENTIAL)
    return Analysis(findings=(finding,), notes=("A note.",), services_checked=1)


def test_old_ai_text_is_cleared() -> None:
    result = apply_analysis(make_scan(), make_analysis())
    assert result.ai_analysis == ""


def test_original_scan_keeps_its_ai_text() -> None:
    scan = make_scan()
    apply_analysis(scan, make_analysis())
    assert "old text" in scan.ai_analysis


def test_new_findings_are_stored() -> None:
    result = apply_analysis(make_scan(), make_analysis())
    assert [finding.title for finding in result.findings] == ["New finding"]
    assert result.analysis_performed is True
