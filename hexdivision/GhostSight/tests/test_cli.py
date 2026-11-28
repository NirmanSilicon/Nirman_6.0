"""Tests for the GhostSight command-line interface."""

from typer.testing import CliRunner

from ghostsight import __version__
from ghostsight.main import app
from ghostsight.system_check import CheckResult, CheckStatus

runner = CliRunner()


def fake_results(tool_status: CheckStatus) -> list[CheckResult]:
    """Return a fixed set of results so tests do not depend on this machine."""
    return [
        CheckResult("Python", CheckStatus.OK, "3.12.3", "Running GhostSight"),
        CheckResult("FakeTool", tool_status, "fake detail", "Testing"),
    ]


def test_version_flag_prints_version():
    result = runner.invoke(app, ["--version"])

    assert result.exit_code == 0
    assert __version__ in result.output


def test_status_shows_table_and_creates_log(isolated_home, monkeypatch):
    monkeypatch.setattr(
        "ghostsight.main.run_all_checks", lambda: fake_results(CheckStatus.MISSING)
    )

    result = runner.invoke(app, ["status"])

    assert result.exit_code == 0
    assert "FakeTool" in result.output
    assert "All required checks passed" in result.output
    assert (isolated_home / "logs" / "ghostsight.log").exists()


def test_status_exits_nonzero_when_required_check_fails(monkeypatch):
    monkeypatch.setattr(
        "ghostsight.main.run_all_checks", lambda: fake_results(CheckStatus.FAIL)
    )

    result = runner.invoke(app, ["status"])

    assert result.exit_code == 1


def test_unknown_command_fails_with_nonzero_exit_code():
    result = runner.invoke(app, ["nonsense"])

    assert result.exit_code != 0
