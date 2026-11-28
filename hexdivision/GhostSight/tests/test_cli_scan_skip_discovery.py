"""Tests for `ghostsight scan --skip-discovery`. Nmap itself is never started here."""

from pathlib import Path

import pytest
from typer.testing import CliRunner

from ghostsight.integrations.nmap_parser import ParsedScan
from ghostsight.integrations.nmap_runner import DEFAULT_PROFILE, ScanProfile
from ghostsight.main import app
from ghostsight.security.scope_manager import ScopeDecision, default_scope_path

runner = CliRunner()

LOOPBACK_SCOPE = '[scope]\nallowed = ["127.0.0.1"]\n'
LOOPBACK_RANGE_SCOPE = '[scope]\nallowed = ["127.0.0.0/24"]\n'


def write_scope_file(content: str) -> Path:
    path = default_scope_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


def record_starts(
    monkeypatch: pytest.MonkeyPatch,
) -> list[tuple[ScopeDecision, ScanProfile, bool]]:
    calls: list[tuple[ScopeDecision, ScanProfile, bool]] = []

    def fake_start(
        decision: ScopeDecision,
        profile: ScanProfile,
        skip_discovery: bool = False,
    ) -> None:
        calls.append((decision, profile, skip_discovery))

    monkeypatch.setattr("ghostsight.main._start_scan", fake_start)
    return calls


def test_the_flag_reaches_the_scan_starter(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = record_starts(monkeypatch)
    write_scope_file(LOOPBACK_SCOPE)
    result = runner.invoke(app, ["scan", "--target", "127.0.0.1", "--skip-discovery"])
    assert result.exit_code == 0
    assert len(calls) == 1
    assert calls[0][2] is True


def test_a_normal_scan_does_not_pass_the_flag(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # This fake has the old two-argument signature, so a third argument would fail.
    seen: list[str | None] = []

    def old_fake_start(decision: ScopeDecision, profile: ScanProfile) -> None:
        seen.append(decision.normalised)

    monkeypatch.setattr("ghostsight.main._start_scan", old_fake_start)
    write_scope_file(LOOPBACK_SCOPE)
    result = runner.invoke(app, ["scan", "--target", "127.0.0.1"])
    assert result.exit_code == 0
    assert seen == ["127.0.0.1"]


def test_the_flag_is_refused_for_a_range(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = record_starts(monkeypatch)
    write_scope_file(LOOPBACK_RANGE_SCOPE)
    result = runner.invoke(
        app, ["scan", "--target", "127.0.0.0/30", "--skip-discovery"]
    )
    assert result.exit_code == 1
    assert "single address" in result.output
    assert calls == []


def test_a_range_without_the_flag_is_still_allowed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = record_starts(monkeypatch)
    write_scope_file(LOOPBACK_RANGE_SCOPE)
    result = runner.invoke(app, ["scan", "--target", "127.0.0.0/30"])
    assert result.exit_code == 0
    assert len(calls) == 1
    assert calls[0][2] is False


def test_a_scan_with_the_flag_reports_that_discovery_was_skipped(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, bool]] = []

    def fake_run(
        target: str,
        profile: ScanProfile = DEFAULT_PROFILE,
        skip_discovery: bool = False,
    ) -> ParsedScan:
        calls.append((target, skip_discovery))
        return ParsedScan(
            services=[],
            hosts_up=0,
            hosts_total=1,
            elapsed_seconds=1.0,
            nmap_version="7.94SVN",
            completed=True,
        )

    monkeypatch.setattr("ghostsight.scanner.run_nmap", fake_run)
    write_scope_file(LOOPBACK_SCOPE)
    result = runner.invoke(app, ["scan", "--target", "127.0.0.1", "--skip-discovery"])
    assert result.exit_code == 0
    assert calls == [("127.0.0.1", True)]
    assert "Host discovery was skipped" in result.output
    assert "No host answered" not in result.output


def test_the_flag_is_listed_in_help() -> None:
    result = runner.invoke(app, ["scan", "--help"])
    assert result.exit_code == 0
    assert "--skip-discovery" in result.output
