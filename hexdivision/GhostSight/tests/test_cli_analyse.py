"""Tests for `ghostsight analyse`.

The command reads a saved scan and the stored NVD data. It must never use
the network and must not change any file. Scans and cache live in the
throwaway home made by the autouse fixture in conftest.py.
"""

import json
import socket
from typing import Any

import pytest
from typer.testing import CliRunner

from ghostsight.intelligence.analysis import Analysis
from ghostsight.intelligence.nvd_cache import write_cache
from ghostsight.main import app
from ghostsight.paths import get_home_dir
from ghostsight.reporting.generator import get_scans_root
from ghostsight.reporting.models import Finding, FindingStatus, ScanResult, Service

runner = CliRunner()

OPENSSH = "cpe:/a:openbsd:openssh:9.6p1"
FETCHED = "2026-01-01T00:00:00Z"


def save_scan(name: str, **fields: Any) -> None:
    fields.setdefault("target", "127.0.0.1")
    fields.setdefault("scan_id", f"id-{name}")
    scan = ScanResult(started_at=FETCHED, **fields)
    directory = get_scans_root() / name
    directory.mkdir(parents=True)
    (directory / "scan_data.json").write_text(
        json.dumps(scan.to_dict()), encoding="utf-8"
    )


def openssh_service() -> Service:
    return Service(host="127.0.0.1", port=22, protocol="tcp", cpe=[OPENSSH])


def file_snapshot() -> dict[str, bytes]:
    """Every file under the scans and cache folders, with its content."""
    folders = [get_scans_root(), get_home_dir() / "cache"]
    return {
        str(path): path.read_bytes()
        for folder in folders
        for path in folder.rglob("*")
        if path.is_file()
    }


def test_no_scans_exits_2() -> None:
    result = runner.invoke(app, ["analyse"])
    assert result.exit_code == 2
    assert "No scans have been run yet" in result.output


def test_bad_scan_name_exits_2_without_echo() -> None:
    save_scan("scan_001")
    result = runner.invoke(app, ["analyse", "--scan", "../etc"])
    assert result.exit_code == 2
    assert "Not a valid scan name" in result.output
    assert "../etc" not in result.output


def test_missing_named_scan_exits_2() -> None:
    save_scan("scan_001")
    result = runner.invoke(app, ["analyse", "--scan", "scan_002"])
    assert result.exit_code == 2
    assert "No scan with that name was found" in result.output


def test_damaged_scan_file_exits_4() -> None:
    directory = get_scans_root() / "scan_001"
    directory.mkdir(parents=True)
    (directory / "scan_data.json").write_text("not json", encoding="utf-8")
    result = runner.invoke(app, ["analyse"])
    assert result.exit_code == 4
    assert "Cannot analyse" in result.output


def test_missing_cache_says_to_run_nvd_fetch() -> None:
    save_scan("scan_001", services=[openssh_service()])
    result = runner.invoke(app, ["analyse"])
    assert result.exit_code == 0
    assert "ghostsight nvd-fetch --vendor openbsd --product openssh" in result.output
    assert "not a clean result" in result.output


def test_cache_with_no_matching_cve_reports_the_checked_count() -> None:
    save_scan("scan_001", services=[openssh_service()])
    write_cache("openbsd", "openssh", ({"id": "CVE-2024-0001"},), FETCHED)
    result = runner.invoke(app, ["analyse"])
    assert result.exit_code == 0
    assert "CVE records checked: 1" in result.output
    assert "Findings: 0" in result.output


def test_newest_scan_is_the_default() -> None:
    save_scan("scan_001", target="10.0.0.1")
    save_scan("scan_002", target="10.0.0.2")
    result = runner.invoke(app, ["analyse"])
    assert result.exit_code == 0
    assert "10.0.0.2" in result.output
    assert "10.0.0.1" not in result.output


def test_scan_option_picks_that_scan() -> None:
    save_scan("scan_001", target="10.0.0.1")
    save_scan("scan_002", target="10.0.0.2")
    result = runner.invoke(app, ["analyse", "--scan", "scan_001"])
    assert result.exit_code == 0
    assert "10.0.0.1" in result.output
    assert "10.0.0.2" not in result.output


def test_demo_scan_is_marked() -> None:
    save_scan(
        "scan_001",
        scanner="none (demonstration data)",
        scan_id="demo-001",
        target="192.0.2.10",
    )
    result = runner.invoke(app, ["analyse"])
    assert result.exit_code == 0
    assert "DEMONSTRATION DATA" in result.output
    assert "demo-001" in result.output


def test_real_scan_is_not_marked_as_demo() -> None:
    save_scan("scan_001", scan_id="real-001", scanner="nmap")
    result = runner.invoke(app, ["analyse"])
    assert result.exit_code == 0
    assert "real-001" in result.output
    assert "DEMONSTRATION DATA" not in result.output


def test_findings_and_notes_are_printed_literally(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    save_scan("scan_001", services=[openssh_service()])
    finding = Finding(
        title="[bold]x[/bold] CVE",
        status=FindingStatus.POTENTIAL,
        affected_service="port 22/tcp",
        cvss_score=7.5,
        severity="high",
    )
    fake = Analysis(findings=(finding,), notes=("[red]note[/red]",))
    monkeypatch.setattr(
        "ghostsight.main.analyse_services", lambda services, load_cache: fake
    )
    result = runner.invoke(app, ["analyse"])
    assert result.exit_code == 0
    assert "[bold]x[/bold] CVE" in result.output
    assert "[red]note[/red]" in result.output
    assert "Potential vulnerability" in result.output
    assert "7.5 (high)" in result.output
    assert "Findings: 1" in result.output


def test_a_finding_without_one_score_says_not_scored(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    save_scan("scan_001", services=[openssh_service()])
    finding = Finding(title="Unchecked CVEs", status=FindingStatus.UNKNOWN)
    fake = Analysis(findings=(finding,), notes=())
    monkeypatch.setattr(
        "ghostsight.main.analyse_services", lambda services, load_cache: fake
    )
    result = runner.invoke(app, ["analyse"])
    assert result.exit_code == 0
    assert "not scored" in result.output
    assert "Unknown" in result.output


def test_hostile_scan_text_cannot_reach_the_screen() -> None:
    save_scan("scan_001", target="10.0.0.9\x1b[31mred", scan_id="id\nsecond line")
    result = runner.invoke(app, ["analyse"])
    assert result.exit_code == 0
    assert "\x1b" not in result.output
    assert "10.0.0.9?" in result.output
    assert "id?second line" in result.output


def test_analyse_sends_nothing_and_writes_nothing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    save_scan("scan_001", services=[openssh_service()])
    write_cache("openbsd", "openssh", ({"id": "CVE-2024-0001"},), FETCHED)

    def refuse(*args: object, **kwargs: object) -> None:
        raise AssertionError("the network was used")

    monkeypatch.setattr(socket.socket, "connect", refuse)
    before = file_snapshot()
    result = runner.invoke(app, ["analyse"])
    assert result.exit_code == 0
    assert file_snapshot() == before
    assert "Nothing was sent to NVD" in result.output
