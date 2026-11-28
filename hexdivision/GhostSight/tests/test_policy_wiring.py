"""Tests that scan applies the policy file: size limit, broken file and the audit record."""

import json

from typer.testing import CliRunner

import ghostsight.main as cli
from ghostsight.integrations.nmap_runner import build_nmap_command
from ghostsight.main import app
from ghostsight.security.audit_log import default_audit_path
from ghostsight.security.policy import default_policy_path
from ghostsight.security.scope_manager import default_scope_path

runner = CliRunner()


def _write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def _scope(*entries):
    listed = ", ".join(f'"{entry}"' for entry in entries)
    _write(default_scope_path(), f"[scope]\nallowed = [{listed}]\n")


def _policy(text):
    _write(default_policy_path(), text)


def _records():
    path = default_audit_path()
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines()]


def _stub_scan(monkeypatch):
    calls = []
    monkeypatch.setattr(
        cli, "_start_scan", lambda decision, profile: calls.append(decision.normalised)
    )
    return calls


def test_range_over_the_default_limit_is_refused(monkeypatch):
    _scope("192.168.0.0/16")
    calls = _stub_scan(monkeypatch)
    result = runner.invoke(app, ["scan", "--target", "192.168.0.0/21"])
    assert result.exit_code == 1
    assert calls == []
    assert "policy" in result.output.lower()
    records = _records()
    assert len(records) == 1
    assert records[0]["allowed"] is False
    assert "policy" in records[0]["reason"].lower()


def test_policy_file_can_raise_the_limit(monkeypatch):
    _scope("192.168.0.0/16")
    _policy("[policy]\nmax_target_addresses = 4096\n")
    calls = _stub_scan(monkeypatch)
    result = runner.invoke(app, ["scan", "--target", "192.168.0.0/21"])
    assert result.exit_code == 0
    assert calls == ["192.168.0.0/21"]
    assert _records()[0]["allowed"] is True


def test_policy_file_can_lower_the_limit(monkeypatch):
    _scope("127.0.0.0/24")
    _policy("[policy]\nmax_target_addresses = 1\n")
    calls = _stub_scan(monkeypatch)
    result = runner.invoke(app, ["scan", "--target", "127.0.0.0/30"])
    assert result.exit_code == 1
    assert calls == []
    assert _records()[0]["allowed"] is False


def test_broken_policy_file_stops_the_scan(monkeypatch):
    _scope("127.0.0.1")
    _policy("[policy\n")
    calls = _stub_scan(monkeypatch)
    result = runner.invoke(app, ["scan", "--target", "127.0.0.1"])
    assert result.exit_code == 3
    assert "Policy file problem" in result.output
    assert calls == []
    assert _records() == []


def test_scope_denial_is_recorded_even_with_a_broken_policy(monkeypatch):
    _policy("[policy\n")
    calls = _stub_scan(monkeypatch)
    result = runner.invoke(app, ["scan", "--target", "10.1.2.3"])
    assert result.exit_code == 1
    assert calls == []
    assert _records()[0]["allowed"] is False


def test_allowed_scan_reason_keeps_the_scope_text(monkeypatch):
    _scope("127.0.0.1")
    _stub_scan(monkeypatch)
    runner.invoke(app, ["scan", "--target", "127.0.0.1"])
    reason = _records()[0]["reason"]
    assert "Inside allowed range" in reason
    assert "policy" in reason.lower()


def test_builder_no_longer_applies_the_old_1024_limit():
    assert build_nmap_command("192.168.0.0/21")[-1] == "192.168.0.0/21"
