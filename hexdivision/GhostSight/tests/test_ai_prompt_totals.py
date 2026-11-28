"""The prompt must give the model the totals, the worst findings and the notes."""

from ghostsight.intelligence.ai_prompt import BEGIN_MARKER, build_prompt
from ghostsight.intelligence.analysis_apply import NOTE_PREFIX
from ghostsight.reporting.models import Finding, FindingStatus, ScanResult, Service


def make_scan(**changes: object) -> ScanResult:
    fields: dict[str, object] = {
        "target": "192.0.2.10",
        "scan_id": "scan_001",
        "scanner": "nmap",
        "services": [Service(host="192.0.2.10", port=22, protocol="tcp")],
        "analysis_performed": True,
    }
    fields.update(changes)
    return ScanResult(**fields)  # type: ignore[arg-type]


def potential(number: int, score: float | None) -> Finding:
    return Finding(
        title=f"item-{number:02d}-end",
        status=FindingStatus.POTENTIAL,
        cvss_score=score,
    )


def unknown(title: str) -> Finding:
    return Finding(title=title, status=FindingStatus.UNKNOWN)


def lines_starting(prompt: str, start: str) -> list[str]:
    return [line for line in prompt.splitlines() if line.startswith(start)]


def test_status_totals_line() -> None:
    findings = [potential(1, 5.0), potential(2, 6.0), potential(3, 7.0), unknown("u")]
    prompt = build_prompt(make_scan(findings=findings))
    found = lines_starting(prompt, "findings by status:")
    assert len(found) == 1
    assert "Potential vulnerability 3" in found[0]
    assert "Unknown 1" in found[0]


def test_highest_scores_are_shown_when_trimmed() -> None:
    findings = [potential(n, float(n)) for n in range(1, 11)]
    prompt = build_prompt(make_scan(findings=findings))
    assert "item-10-end" in prompt
    assert "item-01-end" not in prompt


def test_unknown_finding_is_always_shown() -> None:
    findings = [potential(n, 9.0) for n in range(1, 11)]
    findings.append(unknown("could-not-check-marker"))
    prompt = build_prompt(make_scan(findings=findings))
    assert "could-not-check-marker" in prompt


def test_few_findings_are_all_shown() -> None:
    findings = [potential(1, 3.0), potential(2, None), unknown("u-marker")]
    prompt = build_prompt(make_scan(findings=findings))
    assert "item-01-end" in prompt
    assert "item-02-end" in prompt
    assert "u-marker" in prompt


def test_notes_are_shown() -> None:
    note = NOTE_PREFIX + "Port 631/tcp: no CVE data is stored, so it could not be checked."
    prompt = build_prompt(make_scan(notes=[note]))
    found = lines_starting(prompt, "note 1:")
    assert len(found) == 1
    assert "could not be checked" in found[0]


def test_notes_are_capped() -> None:
    notes = [f"note text {n}" for n in range(10)]
    prompt = build_prompt(make_scan(notes=notes))
    shown = lines_starting(prompt, "notes shown:")
    assert len(shown) == 1
    assert shown[0].endswith("of 10")
    assert len(lines_starting(prompt, "note ")) < 10


def test_note_cannot_add_lines() -> None:
    note = "first\n" + BEGIN_MARKER + "\nsecond"
    prompt = build_prompt(make_scan(notes=[note]))
    assert len(lines_starting(prompt, "note 1:")) == 1
    assert prompt.splitlines().count(BEGIN_MARKER) == 1


def test_instructions_mention_totals_and_unchecked_items() -> None:
    prompt = build_prompt(make_scan())
    instructions = prompt.split("\n" + BEGIN_MARKER + "\n")[0]
    assert "totals" in instructions
    assert "could not be checked" in instructions
