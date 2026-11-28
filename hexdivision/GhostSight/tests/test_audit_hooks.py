"""Tests that actions are written to the audit log first, and that a broken log refuses them."""

import json

import pytest
import typer
from typer.testing import CliRunner

import ghostsight.main as cli
from ghostsight.main import app
from ghostsight.security.audit_log import default_audit_path, verify_chain
from ghostsight.security.scope_manager import default_scope_path

runner = CliRunner()

NVD_ARGS = ["nvd-fetch", "--vendor", "openbsd", "--product", "openssh", "--yes"]


def _records() -> list[dict]:
    path = default_audit_path()
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines()]


def _break_log() -> None:
    """Put a folder where the log file should be, so it cannot be read or written."""
    default_audit_path().mkdir(parents=True)


def _allow_loopback() -> None:
    path = default_scope_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('[scope]\nallowed = ["127.0.0.1"]\n')


def _stub_scan(monkeypatch) -> list:
    calls = []

    def fake_start(decision, profile):
        calls.append(len(_records()))

    monkeypatch.setattr(cli, "_start_scan", fake_start)
    return calls


def _stub_download(monkeypatch) -> list:
    calls = []

    def fake_update(*args):
        calls.append(args)
        return 5

    monkeypatch.setattr(cli, "update_cache", fake_update)
    return calls


def _stub_save(monkeypatch, apply_name: str) -> list:
    calls = []
    monkeypatch.setattr(cli, apply_name, lambda scan, thing: "updated")
    monkeypatch.setattr(
        cli, "generate_scan_reports", lambda updated, directory: calls.append(directory)
    )
    return calls


def _refuse(scan, thing):
    raise cli.SaveRefusedError("refused")


# scan


def test_allowed_scan_is_recorded(monkeypatch):
    _allow_loopback()
    calls = _stub_scan(monkeypatch)
    result = runner.invoke(app, ["scan", "--target", "127.0.0.1"])
    assert result.exit_code == 0
    records = _records()
    assert len(records) == 1
    assert records[0]["event"] == "scan"
    assert records[0]["target"] == "127.0.0.1"
    assert records[0]["allowed"] is True
    assert verify_chain(default_audit_path()).ok
    assert len(calls) == 1


def test_denied_scan_is_recorded(monkeypatch):
    calls = _stub_scan(monkeypatch)
    result = runner.invoke(app, ["scan", "--target", "10.1.2.3"])
    assert result.exit_code == 1
    records = _records()
    assert len(records) == 1
    assert records[0]["target"] == "10.1.2.3"
    assert records[0]["allowed"] is False
    assert calls == []


def test_record_is_written_before_the_scan_starts(monkeypatch):
    _allow_loopback()
    calls = _stub_scan(monkeypatch)
    runner.invoke(app, ["scan", "--target", "127.0.0.1"])
    assert calls == [1]


def test_scan_is_refused_when_the_log_is_broken(monkeypatch):
    _allow_loopback()
    calls = _stub_scan(monkeypatch)
    _break_log()
    result = runner.invoke(app, ["scan", "--target", "127.0.0.1"])
    assert result.exit_code == 5
    assert calls == []


def test_scope_command_writes_nothing():
    _allow_loopback()
    result = runner.invoke(app, ["scope", "127.0.0.1"])
    assert result.exit_code == 0
    assert not default_audit_path().exists()


# nvd-fetch


def test_nvd_fetch_is_recorded(monkeypatch):
    calls = _stub_download(monkeypatch)
    result = runner.invoke(app, NVD_ARGS)
    assert result.exit_code == 0
    records = _records()
    assert len(records) == 1
    assert records[0]["event"] == "nvd-fetch"
    assert records[0]["target"] == "openbsd:openssh"
    assert records[0]["allowed"] is True
    assert len(calls) == 1


def test_nvd_fetch_is_refused_when_the_log_is_broken(monkeypatch):
    calls = _stub_download(monkeypatch)
    _break_log()
    result = runner.invoke(app, NVD_ARGS)
    assert result.exit_code == 5
    assert calls == []


def test_declined_nvd_fetch_is_not_recorded(monkeypatch):
    calls = _stub_download(monkeypatch)
    args = ["nvd-fetch", "--vendor", "openbsd", "--product", "openssh"]
    result = runner.invoke(app, args, input="n\n")
    assert result.exit_code == 1
    assert _records() == []
    assert calls == []


def test_unsafe_name_is_not_recorded(monkeypatch):
    calls = _stub_download(monkeypatch)
    args = ["nvd-fetch", "--vendor", "../x", "--product", "openssh", "--yes"]
    result = runner.invoke(app, args)
    assert result.exit_code == 2
    assert "Not a safe" in result.output
    assert _records() == []
    assert calls == []


# analyse --save


def test_analysis_save_is_recorded(monkeypatch, tmp_path):
    calls = _stub_save(monkeypatch, "apply_analysis")
    cli._save_analysis(None, None, tmp_path / "scan_001")
    records = _records()
    assert [(r["event"], r["target"], r["allowed"]) for r in records] == [
        ("analyse-save", "scan_001", True)
    ]
    assert len(calls) == 1


def test_analysis_save_is_refused_when_the_log_is_broken(monkeypatch, tmp_path):
    calls = _stub_save(monkeypatch, "apply_analysis")
    _break_log()
    with pytest.raises(typer.Exit) as stop:
        cli._save_analysis(None, None, tmp_path / "scan_001")
    assert stop.value.exit_code == 5
    assert calls == []


def test_refused_analysis_save_is_not_recorded(monkeypatch, tmp_path):
    monkeypatch.setattr(cli, "apply_analysis", _refuse)
    with pytest.raises(typer.Exit) as stop:
        cli._save_analysis(None, None, tmp_path / "scan_001")
    assert stop.value.exit_code == 2
    assert _records() == []


# explain --save


def test_ai_text_save_is_recorded(monkeypatch, tmp_path):
    calls = _stub_save(monkeypatch, "apply_ai_text")
    cli._save_ai_text(None, "text", tmp_path / "scan_001")
    records = _records()
    assert [(r["event"], r["target"], r["allowed"]) for r in records] == [
        ("explain-save", "scan_001", True)
    ]
    assert len(calls) == 1


def test_ai_text_save_is_refused_when_the_log_is_broken(monkeypatch, tmp_path):
    calls = _stub_save(monkeypatch, "apply_ai_text")
    _break_log()
    with pytest.raises(typer.Exit) as stop:
        cli._save_ai_text(None, "text", tmp_path / "scan_001")
    assert stop.value.exit_code == 5
    assert calls == []


def test_refused_ai_text_save_is_not_recorded(monkeypatch, tmp_path):
    monkeypatch.setattr(cli, "apply_ai_text", _refuse)
    with pytest.raises(typer.Exit) as stop:
        cli._save_ai_text(None, "text", tmp_path / "scan_001")
    assert stop.value.exit_code == 2

