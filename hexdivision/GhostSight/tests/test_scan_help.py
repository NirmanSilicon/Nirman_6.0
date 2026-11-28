"""Test that scan --help mentions the policy file and the audit log."""

from typer.testing import CliRunner

from ghostsight.main import app

runner = CliRunner()


def test_scan_help_mentions_policy_and_audit_log() -> None:
    result = runner.invoke(app, ["scan", "--help"])
    assert result.exit_code == 0
    text = result.output.lower()
    assert "policy" in text
    assert "audit" in text
