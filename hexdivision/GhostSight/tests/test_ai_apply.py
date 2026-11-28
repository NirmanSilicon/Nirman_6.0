"""Tests for storing AI text in a scan. Pure: no files, no network."""

import dataclasses

import pytest

from ghostsight.intelligence.ai_apply import apply_ai_text
from ghostsight.intelligence.analysis_apply import SaveRefusedError
from ghostsight.reporting.models import Finding, FindingStatus, ScanResult, Service


def make_scan(**changes: object) -> ScanResult:
    fields: dict[str, object] = {
        "target": "192.0.2.10",
        "scan_id": "scan_001",
        "scanner": "nmap",
        "services": [Service(host="192.0.2.10", port=22, protocol="tcp")],
        "findings": [Finding(title="A finding", status=FindingStatus.POTENTIAL)],
        "notes": ["A note."],
        "analysis_performed": True,
    }
    fields.update(changes)
    return ScanResult(**fields)  # type: ignore[arg-type]


def test_text_is_stored_in_a_copy() -> None:
    scan = make_scan()
    result = apply_ai_text(scan, "AI text")
    assert result.ai_analysis == "AI text"
    assert result is not scan


def test_original_scan_is_not_changed() -> None:
    scan = make_scan()
    apply_ai_text(scan, "AI text")
    assert scan.ai_analysis == ""


def test_only_ai_analysis_changes() -> None:
    scan = make_scan()
    result = apply_ai_text(scan, "AI text")
    assert dataclasses.replace(result, ai_analysis="") == dataclasses.replace(
        scan, ai_analysis=""
    )


def test_earlier_ai_text_is_replaced() -> None:
    result = apply_ai_text(make_scan(ai_analysis="old text"), "new text")
    assert result.ai_analysis == "new text"


@pytest.mark.parametrize("scanner", ["none (demonstration data)", "none"])
def test_demo_scan_is_refused(scanner: str) -> None:
    with pytest.raises(SaveRefusedError):
        apply_ai_text(make_scan(scanner=scanner), "AI text")


@pytest.mark.parametrize("text", ["", "   ", "\n", None])
def test_empty_text_is_refused(text: object) -> None:
    with pytest.raises(SaveRefusedError):
        apply_ai_text(make_scan(), text)  # type: ignore[arg-type]


@pytest.mark.parametrize("performed", [True, False])
def test_scan_is_accepted_whether_or_not_it_was_analysed(performed: bool) -> None:
    result = apply_ai_text(make_scan(analysis_performed=performed), "AI text")
    assert result.analysis_performed is performed
