"""Tests for the dry run of `ghostsight validate`."""

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

import ghostsight.main as cli
from ghostsight.integrations import metasploit_rpc as rpc
from ghostsight.integrations.metasploit_queries import ModuleMatch
from ghostsight.main import app
from ghostsight.reporting.generator import generate_scan_reports
from ghostsight.reporting.models import (
    Finding,
    FindingStatus,
    ScanResult,
    Service,
)
from ghostsight.security.audit_log import default_audit_path
from ghostsight.security.policy import default_policy_path
from ghostsight.security.scope_manager import default_scope_path

runner = CliRunner()

TARGET = "10.0.0.5"
MODULE = "auxiliary/scanner/smb/smb_ms17_010"
OTHER = "auxiliary/scanner/smb/other_check"


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
        "scan_id": "validate-001",
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


def match(fullname: str, rank: str) -> ModuleMatch:
    name = fullname.removeprefix("auxiliary/")
    return ModuleMatch("auxiliary", name, fullname, rank, "")


def assert_clean_exit(result, code: int) -> None:
    """The exit code is right and it was a clean exit, not a crash."""
    assert result.exit_code == code
    assert result.exception is None or isinstance(result.exception, SystemExit)


@pytest.fixture
def lookups(monkeypatch: pytest.MonkeyPatch) -> dict:
    """Replace the Metasploit lookups, and make any real check fail loudly."""
    monkeypatch.setenv(rpc.PASSWORD_ENV, "test-password")
    record: dict = {
        "searches": [],
        "infos": [],
        "log_seen": "",
        "error": None,
        "candidates": (match(MODULE, "normal"),),
        "supported": {MODULE: True, OTHER: True},
    }

    def fake_find(settings: object, queries: tuple[str, ...]) -> tuple:
        record["log_seen"] = audit_text()
        record["searches"].append(tuple(queries))
        if record["error"] is not None:
            raise record["error"]
        return record["candidates"]

    def fake_supports(settings: object, module: str) -> bool:
        record["infos"].append(module)
        return record["supported"].get(module, False)

    def no_check(*args: object, **kwargs: object) -> None:
        raise AssertionError("a check was run during a dry run")

    monkeypatch.setattr(cli, "find_candidates", fake_find)
    monkeypatch.setattr(cli, "module_supports_check", fake_supports)
    monkeypatch.setattr("ghostsight.validation.check_run.run_check", no_check)
    monkeypatch.setattr("ghostsight.integrations.metasploit_check.run_check", no_check)
    return record


def test_dry_run_shows_the_plan_and_the_candidates(lookups: dict) -> None:
    store_scan()
    allow()
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 0)
    assert "Finding 1" in result.output
    assert "CVE-2017-0144" in result.output
    assert "Would run: " + MODULE in result.output
    assert len(lookups["searches"]) == 1


def test_dry_run_changes_no_scan_file(lookups: dict) -> None:
    directory = store_scan()
    allow()
    before = snapshot(directory)
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 0)
    assert snapshot(directory) == before


def test_dry_run_says_nothing_was_sent(lookups: dict) -> None:
    store_scan()
    allow()
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 0)
    assert "nothing was sent to the target" in result.output


def test_only_the_first_candidate_with_a_check_would_run(lookups: dict) -> None:
    lookups["candidates"] = (match(MODULE, "great"), match(OTHER, "normal"))
    store_scan()
    allow()
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 0)
    assert result.output.count("Would run:") == 1
    assert "Would run: " + MODULE in result.output


def test_a_candidate_without_a_check_is_shown_as_such(lookups: dict) -> None:
    lookups["supported"] = {MODULE: False}
    store_scan()
    allow()
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 0)
    assert "has no check" in result.output
    assert "Would run:" not in result.output
    assert "Nothing would run" in result.output


def test_no_candidate_is_reported(lookups: dict) -> None:
    lookups["candidates"] = ()
    store_scan()
    allow()
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 0)
    assert "no auxiliary check module was found" in result.output
    assert lookups["infos"] == []


def test_lookups_are_recorded_in_the_audit_log_first(lookups: dict) -> None:
    store_scan()
    allow()
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 0)
    assert "msf-query" in lookups["log_seen"]
    assert [item["event"] for item in records()] == ["msf-query"]


def test_nothing_to_check_needs_no_lookup(lookups: dict) -> None:
    store_scan(findings=[make_finding(FindingStatus.VALIDATED)])
    allow()
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 0)
    assert "No finding can be checked" in result.output
    assert lookups["searches"] == []
    assert records() == []


def test_refused_when_the_target_is_not_in_the_lab_list(lookups: dict) -> None:
    store_scan()
    allow(lab="10.0.0.9")
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 1)
    assert "Cannot validate" in result.output
    assert lookups["searches"] == []
    assert records() == []


def test_refused_when_the_scope_denies_the_target(lookups: dict) -> None:
    store_scan()
    allow(scope="192.168.1.0/24")
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 1)
    assert "Cannot validate" in result.output
    assert lookups["searches"] == []


def test_refused_for_a_demonstration_scan(lookups: dict) -> None:
    store_scan(scanner="none")
    allow()
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 1)
    assert "demonstration" in result.output
    assert lookups["searches"] == []


def test_refused_when_the_scan_was_already_validated(lookups: dict) -> None:
    store_scan(validation_notes=["Checked 10.0.0.5: an earlier note."])
    allow()
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 1)
    assert "already" in result.output
    assert lookups["searches"] == []


def test_a_broken_policy_file_stops_the_command(lookups: dict) -> None:
    store_scan()
    allow()
    write(default_policy_path(), "[lab\n")
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 3)
    assert "Policy file problem" in result.output
    assert lookups["searches"] == []


def test_a_broken_scope_file_stops_the_command(lookups: dict) -> None:
    store_scan()
    allow()
    write(default_scope_path(), "[scope\n")
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 3)
    assert "Scope file problem" in result.output
    assert lookups["searches"] == []


def test_a_missing_scan_is_reported(lookups: dict) -> None:
    allow()
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 2)
    assert "Cannot validate" in result.output


def test_missing_metasploit_password_stops_before_any_lookup(
    lookups: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv(rpc.PASSWORD_ENV, raising=False)
    store_scan()
    allow()
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 2)
    assert lookups["searches"] == []
    assert records() == []


def test_a_metasploit_failure_is_reported(lookups: dict) -> None:
    lookups["error"] = rpc.RpcError(rpc.UNREACHABLE_MESSAGE)
    store_scan()
    allow()
    result = runner.invoke(app, ["validate"])
    assert_clean_exit(result, 4)
    assert "Metasploit query failed" in result.output
