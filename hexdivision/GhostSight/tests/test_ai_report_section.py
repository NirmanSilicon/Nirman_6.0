"""The AI Analysis report section: placeholder wording and stored text."""

from ghostsight.reporting.formatters import format_ai_analysis
from ghostsight.reporting.models import ScanResult


def make_scan(**changes: object) -> ScanResult:
    return ScanResult(target="192.0.2.10", scan_id="scan_001", **changes)  # type: ignore[arg-type]


def test_placeholder_points_to_the_explain_command() -> None:
    assert "ghostsight explain" in format_ai_analysis(make_scan())


def test_placeholder_no_longer_says_scheduled() -> None:
    assert "scheduled" not in format_ai_analysis(make_scan())


def test_stored_text_is_shown_instead_of_the_placeholder() -> None:
    text = format_ai_analysis(
        make_scan(ai_analysis="AI-GENERATED TEXT - NOT PROOF\nbody")
    )
    assert "AI-GENERATED TEXT - NOT PROOF" in text
    assert "not available" not in text
