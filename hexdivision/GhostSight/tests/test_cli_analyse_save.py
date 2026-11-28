"""Tests for `ghostsight analyse --save`."""

import json
import socket
from pathlib import Path

from typer.testing import CliRunner

from ghostsight.intelligence.analysis import Analysis
from ghostsight.main import app
from ghostsight.reporting.generator import generate_scan_reports
from ghostsight.reporting.models import (
    Finding,
    FindingStatus,
    ScanResult,
    Service,
)
from ghostsight.reporting.scan_reader import read_scan_file

runner = CliRunner()

NOTE_PREFIX = "Vulnerability analysis: "


def make_finding(title: str = "CVE-2024-0001: a:b 1.0 may be affected") -> Finding:
    return Finding(
        title=title,
        status=FindingStatus.POTENTIAL,
        cve_ids=["CVE-2024-0001"],
        cvss_score=7.5,
        severity="high",
        affected_service="port 22/tcp",
    )


def store_scan(**fields) -> Path:
    """Write a real scan folder into the isolated home and return it."""
    values = {
        "target": "127.0.0.1",
        "scan_id": "save-001",
        "scanner": "nmap",
        "notes": ["Scanner note."],
        "services": [
            Service(host="127.0.0.1", port=22, protocol="tcp", name="ssh")
        ],
    }
    values.update(fields)
    return generate_scan_reports(ScanResult(**values)).directory


def fake_analysis(checked: int = 1):
    def fake(services, load_cache):
        return Analysis(
            findings=(make_finding(),),
            notes=("CVE records checked: 3.",),
            services_checked=checked,
        )

    return fake


def snapshot(directory: Path) -> dict[str, bytes]:
    return {item.name: item.read_bytes() for item in sorted(directory.iterdir())}


def saved_data(directory: Path) -> dict:
    return json.loads((directory / "scan_data.json").read_text(encoding="utf-8"))


def test_save_writes_findings_and_notes_into_scan_data(monkeypatch):
    directory = store_scan()
    monkeypatch.setattr("ghostsight.main.analyse_services", fake_analysis())

    result = runner.invoke(app, ["analyse", "--save"])

    assert result.exit_code == 0
    data = saved_data(directory)
    assert len(data["findings"]) == 1
    assert data["findings"][0]["cve_ids"] == ["CVE-2024-0001"]
    assert data["analysis_performed"] is True
    assert "Scanner note." in data["notes"]
    assert NOTE_PREFIX + "CVE records checked: 3." in data["notes"]


def test_saved_scan_reads_back_with_its_finding(monkeypatch):
    directory = store_scan()
    monkeypatch.setattr("ghostsight.main.analyse_services", fake_analysis())

    runner.invoke(app, ["analyse", "--save"])

    scan = read_scan_file(directory / "scan_data.json")
    assert scan.analysis_performed is True
    assert scan.findings[0].status == FindingStatus.POTENTIAL
    assert scan.findings[0].cvss_score == 7.5


def test_saving_twice_gives_the_same_file(monkeypatch):
    directory = store_scan()
    monkeypatch.setattr("ghostsight.main.analyse_services", fake_analysis())

    runner.invoke(app, ["analyse", "--save"])
    first = (directory / "scan_data.json").read_bytes()
    runner.invoke(app, ["analyse", "--save"])
    second = (directory / "scan_data.json").read_bytes()

    assert first == second
    assert json.loads(second)["analysis_performed"] is True


def test_save_replaces_earlier_findings(monkeypatch):
    directory = store_scan(findings=[make_finding("Old finding")])
    monkeypatch.setattr("ghostsight.main.analyse_services", fake_analysis())

    runner.invoke(app, ["analyse", "--save"])

    titles = [item["title"] for item in saved_data(directory)["findings"]]
    assert titles == ["CVE-2024-0001: a:b 1.0 may be affected"]


def test_reports_are_regenerated(monkeypatch):
    directory = store_scan()
    monkeypatch.setattr("ghostsight.main.analyse_services", fake_analysis())

    runner.invoke(app, ["analyse", "--save"])

    text = (directory / "vulnerabilities.txt").read_text(encoding="utf-8")
    assert "CVE-2024-0001" in text


def test_demo_scan_is_refused_and_left_unchanged(monkeypatch):
    directory = store_scan(scanner="none (demonstration data)")
    before = snapshot(directory)
    monkeypatch.setattr("ghostsight.main.analyse_services", fake_analysis())

    result = runner.invoke(app, ["analyse", "--save"])

    assert result.exit_code == 2
    assert "demonstration" in result.output.lower()
    assert snapshot(directory) == before


def test_nothing_checked_is_refused_and_left_unchanged():
    directory = store_scan()
    before = snapshot(directory)

    result = runner.invoke(app, ["analyse", "--save"])

    assert result.exit_code == 2
    assert "nothing to save" in result.output.lower()
    assert snapshot(directory) == before


def test_plain_analyse_changes_nothing_and_points_to_save(monkeypatch):
    directory = store_scan()
    before = snapshot(directory)
    monkeypatch.setattr("ghostsight.main.analyse_services", fake_analysis())

    result = runner.invoke(app, ["analyse"])

    assert result.exit_code == 0
    assert snapshot(directory) == before
    assert "no file was changed" in result.output
    assert "--save" in result.output


def test_save_footer_names_the_folder_and_does_not_claim_no_change(monkeypatch):
    store_scan()
    monkeypatch.setattr("ghostsight.main.analyse_services", fake_analysis())

    result = runner.invoke(app, ["analyse", "--save"])

    assert "Saved" in result.output
    assert "scan_001" in result.output
    assert "Nothing was sent to NVD" in result.output
    assert "no file was changed" not in result.output


def test_save_changes_only_the_named_scan(monkeypatch):
    first = store_scan()
    second = store_scan()
    before_second = snapshot(second)
    monkeypatch.setattr("ghostsight.main.analyse_services", fake_analysis())

    result = runner.invoke(app, ["analyse", "--scan", first.name, "--save"])

    assert result.exit_code == 0
    assert len(saved_data(first)["findings"]) == 1
    assert snapshot(second) == before_second


def test_write_failure_gives_a_fixed_message_and_exit_4(monkeypatch):
    directory = store_scan()
    before = snapshot(directory)
    monkeypatch.setattr("ghostsight.main.analyse_services", fake_analysis())

    def broken(scan, directory=None):
        raise OSError("disk full at /secret/place")

    monkeypatch.setattr("ghostsight.main.generate_scan_reports", broken)

    result = runner.invoke(app, ["analyse", "--save"])

    assert result.exit_code == 4
    assert "Cannot save" in result.output
    assert "secret" not in result.output
    assert snapshot(directory) == before


def test_save_sends_nothing(monkeypatch):
    store_scan()
    monkeypatch.setattr("ghostsight.main.analyse_services", fake_analysis())

    def refuse(self, *args, **kwargs):
        raise AssertionError("network use")

    monkeypatch.setattr(socket.socket, "connect", refuse)

    result = runner.invoke(app, ["analyse", "--save"])
    assert result.exit_code == 0
