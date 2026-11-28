"""Tests that `ghostsight scan` only proceeds for targets the scope manager allows."""

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from ghostsight.integrations.nmap_executor import PROFILE_TIMEOUT_SECONDS, NmapRunError
from ghostsight.integrations.nmap_parser import ParsedScan
from ghostsight.integrations.nmap_runner import DEFAULT_PROFILE, ScanProfile
from ghostsight.main import app
from ghostsight.paths import get_home_dir
from ghostsight.reporting.models import Service
from ghostsight.security.scope_manager import ScopeDecision, default_scope_path

runner = CliRunner()

LOOPBACK_SCOPE = '[scope]\nallowed = ["127.0.0.1"]\n'


def write_scope_file(content: str) -> Path:
    """Write a scope file into the temporary test home and return its path."""
    path = default_scope_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


def record_scans(
    monkeypatch: pytest.MonkeyPatch,
) -> list[tuple[ScopeDecision, ScanProfile]]:
    """Replace the scan starter with a recorder and return its list of calls."""
    calls: list[tuple[ScopeDecision, ScanProfile]] = []

    def fake_start(decision: ScopeDecision, profile: ScanProfile) -> None:
        calls.append((decision, profile))

    monkeypatch.setattr("ghostsight.main._start_scan", fake_start)
    return calls


def install_fake_nmap(
    monkeypatch: pytest.MonkeyPatch,
    completed: bool = True,
    error: Exception | None = None,
) -> list[tuple[str, ScanProfile]]:
    """Fake only the process boundary, so the rest of the scan path is real."""
    calls: list[tuple[str, ScanProfile]] = []

    def fake_run(target: str, profile: ScanProfile = DEFAULT_PROFILE) -> ParsedScan:
        calls.append((target, profile))
        if error is not None:
            raise error
        return ParsedScan(
            services=[
                Service(
                    host=target,
                    port=22,
                    protocol="tcp",
                    name="ssh",
                    version="OpenSSH 9.6p1",
                    extra_info="",
                )
            ],
            hosts_up=1,
            hosts_total=1,
            elapsed_seconds=1.0,
            nmap_version="7.94SVN",
            completed=completed,
        )

    monkeypatch.setattr("ghostsight.scanner.run_nmap", fake_run)
    return calls


def scan_directories() -> list[Path]:
    return sorted((get_home_dir() / "output" / "scans").glob("scan_*"))


def test_target_outside_scope_is_refused_and_never_scanned(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = record_scans(monkeypatch)
    write_scope_file('[scope]\nallowed = ["192.168.56.0/24"]\n')
    result = runner.invoke(app, ["scan", "--target", "8.8.8.8"])
    assert result.exit_code == 1
    assert "Scan refused" in result.output
    assert calls == []


def test_missing_scope_file_refuses_scan(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = record_scans(monkeypatch)
    result = runner.invoke(app, ["scan", "--target", "127.0.0.1"])
    assert result.exit_code == 1
    assert calls == []


def test_broken_scope_file_exits_three_and_never_scans(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = record_scans(monkeypatch)
    write_scope_file("this is = not [valid")
    result = runner.invoke(app, ["scan", "--target", "127.0.0.1"])
    assert result.exit_code == 3
    assert calls == []


def test_hostname_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = record_scans(monkeypatch)
    write_scope_file(LOOPBACK_SCOPE)
    result = runner.invoke(app, ["scan", "--target", "localhost"])
    assert result.exit_code == 1
    assert calls == []


def test_option_like_target_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = record_scans(monkeypatch)
    write_scope_file(LOOPBACK_SCOPE)
    result = runner.invoke(app, ["scan", "--target=-sS"])
    assert result.exit_code == 1
    assert calls == []


def test_allowed_target_reaches_scan_code_as_an_approved_decision(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = record_scans(monkeypatch)
    write_scope_file(LOOPBACK_SCOPE)
    result = runner.invoke(app, ["scan", "--target", " 127.0.0.1 "])
    assert result.exit_code == 0
    assert len(calls) == 1
    decision, profile = calls[0]
    assert decision.allowed is True
    assert decision.normalised == "127.0.0.1"
    assert profile is DEFAULT_PROFILE


def test_refused_target_never_starts_nmap(monkeypatch: pytest.MonkeyPatch) -> None:
    nmap_calls = install_fake_nmap(monkeypatch)
    write_scope_file('[scope]\nallowed = ["192.168.56.0/24"]\n')
    result = runner.invoke(app, ["scan", "--target", "8.8.8.8"])
    assert result.exit_code == 1
    assert nmap_calls == []
    assert scan_directories() == []


def test_allowed_scan_writes_reports_and_marks_authorised(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    nmap_calls = install_fake_nmap(monkeypatch)
    write_scope_file(LOOPBACK_SCOPE)
    result = runner.invoke(app, ["scan", "--target", "127.0.0.1"])
    assert result.exit_code == 0
    assert "Report folder" in result.output
    assert nmap_calls == [("127.0.0.1", ScanProfile.LOW_NOISE)]
    directories = scan_directories()
    assert len(directories) == 1
    assert (directories[0] / "final_report.txt").exists()
    data = json.loads((directories[0] / "scan_data.json").read_text(encoding="utf-8"))
    assert data["authorised"] is True
    assert "ssh" in (directories[0] / "services.txt").read_text(encoding="utf-8")


def test_failed_scan_exits_four_and_writes_nothing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    install_fake_nmap(monkeypatch, error=NmapRunError("Nmap was not found."))
    write_scope_file(LOOPBACK_SCOPE)
    result = runner.invoke(app, ["scan", "--target", "127.0.0.1"])
    assert result.exit_code == 4
    assert "Scan failed" in result.output
    assert scan_directories() == []


def test_incomplete_scan_still_reports_with_a_warning(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    install_fake_nmap(monkeypatch, completed=False)
    write_scope_file(LOOPBACK_SCOPE)
    result = runner.invoke(app, ["scan", "--target", "127.0.0.1"])
    assert result.exit_code == 0
    assert "did not report a clean finish" in " ".join(result.output.split())
    assert len(scan_directories()) == 1


def test_scan_requires_a_target() -> None:
    result = runner.invoke(app, ["scan"])
    assert result.exit_code == 2


@pytest.mark.parametrize("profile", list(ScanProfile))
def test_chosen_profile_reaches_nmap(
    monkeypatch: pytest.MonkeyPatch, profile: ScanProfile
) -> None:
    nmap_calls = install_fake_nmap(monkeypatch)
    write_scope_file(LOOPBACK_SCOPE)
    result = runner.invoke(
        app, ["scan", "--target", "127.0.0.1", "--profile", profile.value]
    )
    assert result.exit_code == 0
    assert nmap_calls == [("127.0.0.1", profile)]


def test_default_profile_is_low_noise(monkeypatch: pytest.MonkeyPatch) -> None:
    nmap_calls = install_fake_nmap(monkeypatch)
    write_scope_file(LOOPBACK_SCOPE)
    runner.invoke(app, ["scan", "--target", "127.0.0.1"])
    assert nmap_calls == [("127.0.0.1", ScanProfile.LOW_NOISE)]


def test_invalid_profile_is_a_usage_error_and_nothing_runs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    nmap_calls = install_fake_nmap(monkeypatch)
    write_scope_file(LOOPBACK_SCOPE)
    result = runner.invoke(
        app, ["scan", "--target", "127.0.0.1", "--profile", "aggressive"]
    )
    assert result.exit_code == 2
    assert nmap_calls == []
    assert scan_directories() == []


def test_refused_target_is_not_scanned_whatever_the_profile(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    nmap_calls = install_fake_nmap(monkeypatch)
    write_scope_file('[scope]\nallowed = ["192.168.56.0/24"]\n')
    result = runner.invoke(
        app, ["scan", "--target", "8.8.8.8", "--profile", "deep"]
    )
    assert result.exit_code == 1
    assert nmap_calls == []
    assert scan_directories() == []


def test_deep_scan_says_how_long_it_may_run(monkeypatch: pytest.MonkeyPatch) -> None:
    install_fake_nmap(monkeypatch)
    write_scope_file(LOOPBACK_SCOPE)
    result = runner.invoke(
        app, ["scan", "--target", "127.0.0.1", "--profile", "deep"]
    )
    minutes = PROFILE_TIMEOUT_SECONDS[ScanProfile.DEEP] // 60
    assert f"after {minutes} minutes at most" in " ".join(result.output.split())


def test_report_data_records_the_chosen_profile(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    install_fake_nmap(monkeypatch)
    write_scope_file(LOOPBACK_SCOPE)
    result = runner.invoke(
        app, ["scan", "--target", "127.0.0.1", "--profile", "deep"]
    )
    assert result.exit_code == 0
    data = json.loads(
        (scan_directories()[0] / "scan_data.json").read_text(encoding="utf-8")
    )
    assert data["profile"] == "deep"
    assert "all 65535 TCP ports" in " ".join(data["notes"])
