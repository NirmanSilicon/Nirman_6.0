"""Tests for `ghostsight validate --confirm`, with a fake check runner."""

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

import ghostsight.main as cli
from ghostsight.integrations import metasploit_rpc as rpc
from ghostsight.intelligence.analysis_apply import SaveRefusedError
from ghostsight.main import app
from ghostsight.reporting.generator import generate_scan_reports
from ghostsight.reporting.models import (
    Finding,
    FindingStatus,
    ScanResult,
    Service,
)
from ghostsight.reporting.scan_reader import read_scan_file
from ghostsight.security.audit_log import AuditError, default_audit_path
from ghostsight.security.policy import default_policy_path
from ghostsight.security.scope_manager import default_scope_path
from ghostsight.validation.check_run import CheckRun
from ghostsight.validation.status_rules import CheckOutcome
from ghostsight.validation.validation_apply import CheckResult

runner = CliRunner()

TARGET = "10.0.0.5"
MODULE = "auxiliary/scanner/smb/smb_ms17_010"
RESULT = CheckResult(0, MODULE, CheckOutcome.VULNERABLE)
CONFIRM = ["validate", "--confirm"]


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def allow(scope: str = TARGET, lab: str = TARGET) -> None:
    """Write a scope file and a policy file into the isolated home."""
    write(default_scope_path(), f'[scope]\nallowed = ["{scope}"]\n')
    write(
        default_policy_path(),
        f'[policy]\nmax_target_addresses = 1024\n\n[lab]\nallowed = ["{lab}"]\n',
    )


def make_finding(status: FindingStatus = FindingStatus.POTENTIAL) -> Finding:
    return Finding(
        title="CVE-2017-0144: smb may be affected",
        status=status,
        cve_ids=["CVE-2017-0144"],
        affected_service="port 445/tcp",
    )


def store_scan(**fields) -> Path:
    """Write a real scan folder into the isolated home and return it."""
    values = {
        "target": TARGET,
        "scan_id": "confirm-001",
        "scanner": "nmap",
        "services": [
            Service(host=TARGET, port=445, protocol="tcp", name="microsoft-ds")
        ],
        "findings": [make_finding()],
    }
    values.update(fields)
    return generate_scan_reports(ScanResult(**values)).directory


def snapshot(directory: Path) -> dict[str, bytes]:
    return {item.name: item.read_bytes() for item in sorted(directory.iterdir())}


def audit_text() -> str:
    path = default_audit_path()
    return path.read_text(encoding="utf-8") if path.exists() else ""


def records() -> list[dict]:
    return [json.loads(line) for line in audit_text().splitlines()]


def assert_clean_exit(result, code: int) -> None:
    """The exit code is right and it was a clean exit, not a crash."""
    assert result.exit_code == code
    assert result.exception is None or isinstance(result.exception, SystemExit)


@pytest.fixture
def checks(monkeypatch: pytest.MonkeyPatch) -> dict:
    """Replace the check runner with a fake. Nothing real is ever sent."""
    monkeypatch.setenv(rpc.PASSWORD_ENV, "test-password")
    record: dict = {
        "calls": [],
        "log_seen": "",
        "error": None,
        "run": CheckRun(results=(RESULT,), skipped=()),
    }

    def fake_run(settings: object, target: str, plan: tuple) -> CheckRun:
        record["log_seen"] = audit_text()
        record["calls"].append((target, plan))
        if record["error"] is not None:
            raise record["error"]
        return record["run"]

    def no_lookup(*args: object, **kwargs: object) -> None:
        raise AssertionError("a lookup was made outside the check runner")

    monkeypatch.setattr(cli, "run_planned_checks", fake_run)
    monkeypatch.setattr(cli, "find_candidates", no_lookup)
    return record


def test_confirm_saves_the_result_into_the_scan(checks: dict) -> None:
    directory = store_scan()
    allow()
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 0)
    scan = read_scan_file(directory / "scan_data.json")
    assert scan.findings[0].status == FindingStatus.VALIDATED
    assert len(scan.validation_notes) == 1
    assert any(MODULE in line for line in scan.findings[0].evidence)


def test_confirm_shows_the_results_and_says_traffic_was_sent(checks: dict) -> None:
    store_scan()
    allow()
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 0)
    assert "Finding 1: " + MODULE + " result vulnerable" in result.output
    assert "Checks were sent to the target" in result.output
    assert "were updated" in result.output


def test_audit_record_is_written_before_the_checks_run(checks: dict) -> None:
    store_scan()
    allow()
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 0)
    assert "validate-check" in checks["log_seen"]
    assert [item["event"] for item in records()] == ["validate-check"]


def test_audit_record_names_the_target(checks: dict) -> None:
    store_scan()
    allow()
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 0)
    assert records()[0]["target"] == TARGET
    assert records()[0]["allowed"] is True


def test_checks_get_the_normalised_target_and_the_plan(checks: dict) -> None:
    store_scan()
    allow()
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 0)
    assert len(checks["calls"]) == 1
    target, plan = checks["calls"][0]
    assert target == TARGET
    assert plan[0].finding_index == 0
    assert plan[0].queries == ("cve:2017-0144",)


def test_without_confirm_nothing_runs(
    checks: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(cli, "find_candidates", lambda settings, queries: ())
    directory = store_scan()
    allow()
    before = snapshot(directory)
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 0)
    assert checks["calls"] == []
    assert snapshot(directory) == before
    assert "validate-check" not in audit_text()


def test_a_second_confirm_run_is_refused(checks: dict) -> None:
    store_scan()
    allow()
    first = runner.invoke(app, CONFIRM)
    assert_clean_exit(first, 0)
    second = runner.invoke(app, CONFIRM)
    assert_clean_exit(second, 1)
    assert "already" in second.output
    assert len(checks["calls"]) == 1


def test_skipped_findings_are_shown(checks: dict) -> None:
    note = "Finding 2: no candidate module has a check."
    checks["run"] = CheckRun(results=(RESULT,), skipped=(note,))
    store_scan()
    allow()
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 0)
    assert note in result.output


def test_no_results_means_nothing_is_saved(checks: dict) -> None:
    note = "Finding 1: no candidate module has a check."
    checks["run"] = CheckRun(results=(), skipped=(note,))
    directory = store_scan()
    allow()
    before = snapshot(directory)
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 0)
    assert note in result.output
    assert "nothing was saved" in result.output
    assert snapshot(directory) == before


def test_nothing_to_check_sends_nothing(checks: dict) -> None:
    store_scan(findings=[make_finding(FindingStatus.VALIDATED)])
    allow()
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 0)
    assert "No finding can be checked" in result.output
    assert checks["calls"] == []
    assert records() == []


def test_refused_lab_target_runs_nothing(checks: dict) -> None:
    directory = store_scan()
    allow(lab="10.0.0.9")
    before = snapshot(directory)
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 1)
    assert checks["calls"] == []
    assert records() == []
    assert snapshot(directory) == before


def test_refused_demonstration_scan_runs_nothing(checks: dict) -> None:
    store_scan(scanner="none")
    allow()
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 1)
    assert checks["calls"] == []
    assert records() == []


def test_refused_validated_scan_runs_nothing(checks: dict) -> None:
    store_scan(validation_notes=["Checked 10.0.0.5: an earlier note."])
    allow()
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 1)
    assert checks["calls"] == []
    assert records() == []


def test_audit_failure_stops_before_the_checks(
    checks: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken(*args: object, **kwargs: object) -> None:
        raise AuditError("Audit log problem.")

    directory = store_scan()
    allow()
    before = snapshot(directory)
    monkeypatch.setattr(cli, "append_record", broken)
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 5)
    assert checks["calls"] == []
    assert snapshot(directory) == before


def test_missing_password_stops_before_the_audit_record(
    checks: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv(rpc.PASSWORD_ENV, raising=False)
    store_scan()
    allow()
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 2)
    assert checks["calls"] == []
    assert records() == []


def test_a_metasploit_failure_saves_nothing(checks: dict) -> None:
    checks["error"] = rpc.RpcError(rpc.UNREACHABLE_MESSAGE)
    directory = store_scan()
    allow()
    before = snapshot(directory)
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 4)
    assert "Metasploit query failed" in result.output
    assert snapshot(directory) == before


def test_a_refused_save_exits_2(
    checks: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    def refuse(scan: object, results: object) -> None:
        raise SaveRefusedError("Refused for this test.")

    directory = store_scan()
    allow()
    before = snapshot(directory)
    monkeypatch.setattr(cli, "apply_validation", refuse)
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 2)
    assert "Not saved" in result.output
    assert snapshot(directory) == before


def test_a_write_failure_exits_4(
    checks: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken(scan: object, directory: object = None) -> None:
        raise OSError("disk full")

    store_scan()
    allow()
    monkeypatch.setattr(cli, "generate_scan_reports", broken)
    result = runner.invoke(app, CONFIRM)
    assert_clean_exit(result, 4)
    assert "Cannot save" in result.output
