"""Tests for putting an Analysis into a scan.

The result must be a new scan. It must refuse demo data and refuse an
analysis in which nothing was really checked, and it must not duplicate
its own notes when saved twice.
"""

import pytest

from ghostsight.intelligence.analysis import Analysis
from ghostsight.intelligence.analysis_apply import (
    NOTE_PREFIX,
    SaveRefusedError,
    apply_analysis,
    is_demo_scan,
)
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


def finding(title: str = "CVE-2024-0001: example") -> Finding:
    return Finding(title=title, status=FindingStatus.POTENTIAL)


def analysis(findings=(), notes=(), checked: int = 1) -> Analysis:
    return Analysis(
        findings=tuple(findings), notes=tuple(notes), services_checked=checked
    )


def test_findings_are_replaced_by_the_analysis_findings() -> None:
    result = apply_analysis(make_scan(), analysis([finding("new")]))
    assert [item.title for item in result.findings] == ["new"]


def test_old_findings_are_replaced() -> None:
    scan = make_scan(findings=[finding("old")])
    result = apply_analysis(scan, analysis([finding("new")]))
    assert [item.title for item in result.findings] == ["new"]


def test_analysis_performed_becomes_true() -> None:
    result = apply_analysis(make_scan(), analysis([finding()]))
    assert result.analysis_performed is True


def test_checked_with_no_findings_still_counts_as_performed() -> None:
    result = apply_analysis(make_scan(), analysis([]))
    assert result.analysis_performed is True
    assert result.findings == []


def test_other_fields_are_unchanged() -> None:
    before = make_scan(notes=["n"]).to_dict()
    after = apply_analysis(make_scan(notes=["n"]), analysis([finding()], ["x"])).to_dict()
    changed = {"findings", "notes", "analysis_performed"}
    for key, value in before.items():
        if key not in changed:
            assert after[key] == value


def test_the_original_scan_is_not_changed() -> None:
    scan = make_scan(findings=[finding("old")], notes=["n"])
    snapshot = scan.to_dict()
    apply_analysis(scan, analysis([finding("new")], ["x"]))
    assert scan.to_dict() == snapshot
    assert scan.analysis_performed is False


def test_scan_notes_are_kept_and_analysis_notes_get_a_prefix() -> None:
    scan = make_scan(notes=["from nmap"])
    result = apply_analysis(scan, analysis([], ["a note"]))
    assert result.notes == ["from nmap", NOTE_PREFIX + "a note"]


def test_applying_twice_does_not_duplicate_notes() -> None:
    first = apply_analysis(make_scan(notes=["n"]), analysis([finding()], ["a"]))
    second = apply_analysis(first, analysis([finding()], ["a"]))
    assert second.notes == first.notes
    assert len(second.findings) == 1


def test_a_second_analysis_replaces_the_first_analysis_notes() -> None:
    first = apply_analysis(make_scan(notes=["n"]), analysis([], ["old"]))
    second = apply_analysis(first, analysis([], ["new"]))
    assert second.notes == ["n", NOTE_PREFIX + "new"]


def test_demo_scan_is_refused_even_when_services_were_checked() -> None:
    scan = make_scan(scanner="none (demonstration data)")
    with pytest.raises(SaveRefusedError) as info:
        apply_analysis(scan, analysis([finding()], checked=1))
    assert "demonstration" in str(info.value)


def test_nothing_checked_is_refused() -> None:
    with pytest.raises(SaveRefusedError) as info:
        apply_analysis(make_scan(), analysis([], ["a note"], checked=0))
    assert "nothing to save" in str(info.value)


@pytest.mark.parametrize(
    ("scanner", "expected"),
    [
        ("none (demonstration data)", True),
        ("none", True),
        ("nmap", False),
        ("unknown", False),
        ("", False),
    ],
)
def test_is_demo_scan(scanner: str, expected: bool) -> None:
    assert is_demo_scan(make_scan(scanner=scanner)) is expected
