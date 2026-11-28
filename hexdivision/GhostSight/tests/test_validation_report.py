"""Tests for the validation section of the reports."""

from ghostsight.reporting.formatters import format_validation
from ghostsight.reporting.generator import generate_scan_reports
from ghostsight.reporting.models import ScanResult

NOTE = (
    "Checked 10.0.0.5: auxiliary/scanner/smb/smb_ms17_010 result vulnerable. "
    "Finding 1: status validated."
)
TRAFFIC = "Each check above sent real network traffic to the target."
NOT_PROOF = "does not prove the target is secure"
LIKELY = "makes a finding likely, not validated"
UNLISTED = "Findings that could not be checked are not listed here."
LAB_ONLY = "restricted to explicitly authorised, isolated lab environments"
NO_ACTIVITY = "No validation activity was recorded for this scan."


def make_scan(notes: list[str]) -> ScanResult:
    """A small scan with the given validation notes."""
    return ScanResult(
        target="10.0.0.5",
        scan_id="scan-1",
        profile="low-noise",
        started_at="2026-01-01T00:00:00+00:00",
        finished_at="2026-01-01T00:00:01+00:00",
        duration_seconds=1.0,
        scanner="nmap 7.94",
        authorised=True,
        notes=[],
        services=[],
        findings=[],
        ai_analysis="",
        validation_notes=notes,
    )


def test_no_notes_says_nothing_was_recorded() -> None:
    assert NO_ACTIVITY in format_validation(make_scan([]))


def test_no_notes_keeps_the_lab_only_sentence() -> None:
    assert LAB_ONLY in format_validation(make_scan([]))


def test_no_notes_does_not_claim_traffic_was_sent() -> None:
    assert "network traffic" not in format_validation(make_scan([]))


def test_each_note_is_listed() -> None:
    text = format_validation(make_scan([NOTE, "Second note."]))
    assert f"- {NOTE}" in text
    assert "- Second note." in text


def test_results_say_traffic_was_sent() -> None:
    assert TRAFFIC in format_validation(make_scan([NOTE]))


def test_results_say_not_vulnerable_is_not_proof() -> None:
    assert NOT_PROOF in format_validation(make_scan([NOTE]))


def test_results_explain_likely_and_validated() -> None:
    text = format_validation(make_scan([NOTE]))
    assert LIKELY in text
    assert "only way a finding becomes validated" in text


def test_results_say_unchecked_findings_are_not_listed() -> None:
    assert UNLISTED in format_validation(make_scan([NOTE]))


def test_results_keep_the_lab_only_sentence() -> None:
    assert LAB_ONLY in format_validation(make_scan([NOTE]))


def test_control_characters_in_a_note_are_removed() -> None:
    text = format_validation(make_scan(["Checked: bad\x1b[31mred note."]))
    assert "\x1b" not in text


def test_the_generator_writes_the_explanation_to_validation_txt() -> None:
    paths = generate_scan_reports(make_scan([NOTE]))
    text = paths.validation.read_text(encoding="utf-8")
    assert NOTE in text
    assert NOT_PROOF in text
