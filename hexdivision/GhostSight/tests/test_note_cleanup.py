"""Saving an analysis drops the stale "not analysed" note, and the AI
prompt keeps the notes written by an analysis."""

from types import SimpleNamespace

from ghostsight.integrations.nmap_runner import DEFAULT_PROFILE
from ghostsight.intelligence.ai_prompt import build_prompt
from ghostsight.intelligence.analysis import Analysis
from ghostsight.intelligence.analysis_apply import NOTE_PREFIX, apply_analysis
from ghostsight.reporting.models import (
    Finding,
    FindingStatus,
    ScanResult,
    Service,
)
from ghostsight.reporting.notes import NOT_ANALYSED_NOTE
from ghostsight.scanner import build_notes


def make_scan(notes: list[str]) -> ScanResult:
    return ScanResult(
        target="192.0.2.10",
        scan_id="scan_001",
        scanner="nmap",
        services=[Service(host="192.0.2.10", port=22, protocol="tcp")],
        notes=notes,
        analysis_performed=True,
    )


def make_analysis() -> Analysis:
    finding = Finding(title="New finding", status=FindingStatus.POTENTIAL)
    return Analysis(findings=(finding,), notes=("A note.",), services_checked=1)


def note_lines(prompt: str) -> list[str]:
    return [line for line in prompt.splitlines() if line.startswith("note ")]


def test_scan_notes_use_the_shared_text() -> None:
    parsed = SimpleNamespace(completed=True, hosts_up=1, services=[object()])
    notes = build_notes(
        DEFAULT_PROFILE, "the 100 most common TCP ports", parsed  # type: ignore[arg-type]
    )
    assert NOT_ANALYSED_NOTE in notes


def test_saving_drops_the_not_analysed_note() -> None:
    result = apply_analysis(
        make_scan([NOT_ANALYSED_NOTE, "keep me"]), make_analysis()
    )
    assert NOT_ANALYSED_NOTE not in result.notes
    assert "keep me" in result.notes
    assert NOTE_PREFIX + "A note." in result.notes


def test_other_scan_notes_are_kept() -> None:
    result = apply_analysis(make_scan(["keep me"]), make_analysis())
    assert "keep me" in result.notes


def test_analysis_notes_survive_a_long_note_list() -> None:
    boring = [f"boring note {n}" for n in range(6)]
    analysis_note = NOTE_PREFIX + "Port 631/tcp: no data, so it could not be checked."
    prompt = build_prompt(make_scan(boring + [analysis_note]))
    assert "so it could not be checked" in prompt


def test_analysis_notes_are_listed_first() -> None:
    prompt = build_prompt(make_scan(["plain note", NOTE_PREFIX + "analysis note"]))
    lines = note_lines(prompt)
    assert "analysis note" in lines[0]
    assert "plain note" in lines[1]
