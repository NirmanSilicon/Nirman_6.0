"""Tests that reports never claim authorisation the data does not record."""

import json

from typer.testing import CliRunner

from ghostsight.main import app
from ghostsight.reporting.formatters import format_final_report
from ghostsight.reporting.models import ScanResult

runner = CliRunner()


def make_scan(authorised: bool, notes: list[str] | None = None) -> ScanResult:
    """Return a minimal scan with the given authorisation flag."""
    return ScanResult(
        target="192.0.2.10",
        scan_id="test-auth",
        authorised=authorised,
        notes=notes or [],
    )


def test_header_says_not_confirmed_when_unauthorised():
    content = format_final_report(make_scan(authorised=False))

    assert "Authorised  : Not confirmed" in content


def test_limitations_do_not_claim_authorisation_when_false():
    content = format_final_report(make_scan(authorised=False))

    assert "Authorisation was NOT confirmed" in content
    assert "records this target as authorised" not in content


def test_limitations_report_recorded_authorisation_when_true():
    content = format_final_report(make_scan(authorised=True))

    assert "Authorised  : Yes" in content
    assert "records this target as authorised" in content
    assert "NOT confirmed" not in content


def test_final_report_includes_notes():
    scan = make_scan(authorised=False, notes=["DEMONSTRATION DATA: example"])
    content = format_final_report(scan)

    assert "NOTES" in content
    assert "DEMONSTRATION DATA: example" in content


def test_report_command_demo_data_is_not_marked_authorised(isolated_home):
    result = runner.invoke(app, ["report", "--target", "192.0.2.10"])

    assert result.exit_code == 0
    scan_dir = isolated_home / "output" / "scans" / "scan_001"
    data = json.loads((scan_dir / "scan_data.json").read_text(encoding="utf-8"))
    final_report = (scan_dir / "final_report.txt").read_text(encoding="utf-8")

    assert data["authorised"] is False
    assert "DEMONSTRATION DATA" in final_report
    assert "Authorised  : Not confirmed" in final_report
