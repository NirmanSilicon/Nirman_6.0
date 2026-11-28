"""Tests for recording check results in a copy of a scan."""

import copy

import pytest

from ghostsight.intelligence.analysis import Analysis
from ghostsight.intelligence.analysis_apply import SaveRefusedError, apply_analysis
from ghostsight.reporting.models import Finding, FindingStatus, ScanResult, Service
from ghostsight.validation.status_rules import CheckOutcome
from ghostsight.validation.validation_apply import CheckResult, apply_validation

MODULE = "auxiliary/scanner/smb/smb_ms17_010"
TARGET = "10.0.0.5"


def make_scan(**fields) -> ScanResult:
    fields.setdefault("target", TARGET)
    fields.setdefault("scan_id", "real-001")
    fields.setdefault("scanner", "nmap")
    fields.setdefault("started_at", "2026-01-01T00:00:00Z")
    fields.setdefault(
        "services", [Service(host=TARGET, port=445, protocol="tcp")]
    )
    fields.setdefault(
        "findings",
        [
            Finding(
                title="first",
                status=FindingStatus.POTENTIAL,
                evidence=["old line"],
            )
        ],
    )
    return ScanResult(**fields)


def result(outcome: CheckOutcome, index: int = 0) -> CheckResult:
    return CheckResult(index, MODULE, outcome)


@pytest.mark.parametrize(
    ("outcome", "expected"),
    [
        (CheckOutcome.VULNERABLE, FindingStatus.VALIDATED),
        (CheckOutcome.APPEARS_VULNERABLE, FindingStatus.LIKELY),
        (CheckOutcome.DETECTED, FindingStatus.POTENTIAL),
        (CheckOutcome.CANNOT_TELL, FindingStatus.POTENTIAL),
        (CheckOutcome.NOT_VULNERABLE, FindingStatus.FALSE_POSITIVE),
    ],
)
def test_the_status_follows_the_rules(
    outcome: CheckOutcome, expected: FindingStatus
) -> None:
    updated = apply_validation(make_scan(), [result(outcome)])
    assert updated.findings[0].status is expected


@pytest.mark.parametrize("outcome", list(CheckOutcome))
def test_every_result_adds_one_evidence_line(outcome: CheckOutcome) -> None:
    updated = apply_validation(make_scan(), [result(outcome)])
    evidence = updated.findings[0].evidence
    assert len(evidence) == 2
    assert MODULE in evidence[-1]
    assert outcome.value in evidence[-1]


def test_old_evidence_is_kept_in_front() -> None:
    updated = apply_validation(make_scan(), [result(CheckOutcome.VULNERABLE)])
    assert updated.findings[0].evidence[0] == "old line"


def test_a_conflict_is_stated_in_the_evidence_and_the_note() -> None:
    scan = make_scan(
        findings=[Finding(title="first", status=FindingStatus.VALIDATED)]
    )
    updated = apply_validation(scan, [result(CheckOutcome.NOT_VULNERABLE)])
    assert updated.findings[0].status is FindingStatus.VALIDATED
    assert "CONFLICT" in updated.findings[0].evidence[-1]
    assert "Conflict" in updated.validation_notes[0]


def test_a_plain_result_does_not_mention_a_conflict() -> None:
    updated = apply_validation(make_scan(), [result(CheckOutcome.VULNERABLE)])
    assert "conflict" not in updated.findings[0].evidence[-1].lower()
    assert "conflict" not in updated.validation_notes[0].lower()


def test_there_is_one_note_per_result_starting_with_the_target() -> None:
    scan = make_scan(
        findings=[
            Finding(title="a", status=FindingStatus.POTENTIAL),
            Finding(title="b", status=FindingStatus.UNKNOWN),
        ]
    )
    updated = apply_validation(
        scan,
        [result(CheckOutcome.DETECTED, 0), result(CheckOutcome.CANNOT_TELL, 1)],
    )
    assert len(updated.validation_notes) == 2
    assert all(
        note.startswith(f"Checked {TARGET}") for note in updated.validation_notes
    )


def test_findings_without_a_result_are_untouched() -> None:
    scan = make_scan(
        findings=[
            Finding(title="a", status=FindingStatus.POTENTIAL),
            Finding(title="b", status=FindingStatus.POTENTIAL, evidence=["x"]),
        ]
    )
    updated = apply_validation(scan, [result(CheckOutcome.VULNERABLE, 0)])
    assert updated.findings[1] == scan.findings[1]


def test_two_results_for_one_finding_apply_in_order() -> None:
    updated = apply_validation(
        make_scan(),
        [result(CheckOutcome.NOT_VULNERABLE), result(CheckOutcome.VULNERABLE)],
    )
    assert updated.findings[0].status is FindingStatus.VALIDATED
    assert len(updated.findings[0].evidence) == 3
    assert len(updated.validation_notes) == 2


def test_the_scan_passed_in_is_not_changed() -> None:
    scan = make_scan()
    before = copy.deepcopy(scan)
    apply_validation(scan, [result(CheckOutcome.VULNERABLE)])
    assert scan == before


def test_the_ai_text_is_cleared_because_it_is_out_of_date() -> None:
    scan = make_scan(ai_analysis="old explanation")
    updated = apply_validation(scan, [result(CheckOutcome.VULNERABLE)])
    assert updated.ai_analysis == ""


def test_the_scans_own_notes_are_kept() -> None:
    scan = make_scan(notes=["a note"])
    updated = apply_validation(scan, [result(CheckOutcome.DETECTED)])
    assert updated.notes == ["a note"]


def test_a_demonstration_scan_is_refused() -> None:
    scan = make_scan(scanner="none (demonstration data)")
    with pytest.raises(SaveRefusedError, match="demonstration"):
        apply_validation(scan, [result(CheckOutcome.VULNERABLE)])


def test_a_scan_that_already_has_validation_results_is_refused() -> None:
    scan = make_scan(validation_notes=["Checked earlier."])
    with pytest.raises(SaveRefusedError, match="validation results"):
        apply_validation(scan, [result(CheckOutcome.VULNERABLE)])


def test_an_empty_result_list_is_refused() -> None:
    with pytest.raises(SaveRefusedError, match="no check results"):
        apply_validation(make_scan(), [])


@pytest.mark.parametrize("index", [-1, 1, 5])
def test_an_index_with_no_finding_is_refused(index: int) -> None:
    with pytest.raises(SaveRefusedError, match="does not exist"):
        apply_validation(make_scan(), [result(CheckOutcome.VULNERABLE, index)])


def test_after_validation_a_new_analysis_is_refused() -> None:
    updated = apply_validation(make_scan(), [result(CheckOutcome.DETECTED)])
    analysis = Analysis(findings=(), notes=(), services_checked=1)
    with pytest.raises(SaveRefusedError, match="validation results"):
        apply_analysis(updated, analysis)
