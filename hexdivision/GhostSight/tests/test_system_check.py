"""Tests for ghostsight.system_check."""

import io
import subprocess
import sys
import urllib.error

from ghostsight.system_check import (
    CheckResult,
    CheckStatus,
    check_command,
    check_ollama_server,
    check_python,
    check_workspace,
    has_failures,
)


def test_python_check_passes_on_supported_python():
    assert check_python().status is CheckStatus.OK


def test_missing_optional_command_is_missing(monkeypatch):
    monkeypatch.setattr("ghostsight.system_check.shutil.which", lambda name: None)

    result = check_command("nmap", ["--version"], "Scanning")

    assert result.status is CheckStatus.MISSING


def test_missing_required_command_fails(monkeypatch):
    monkeypatch.setattr("ghostsight.system_check.shutil.which", lambda name: None)

    result = check_command("nmap", ["--version"], "Scanning", required=True)

    assert result.status is CheckStatus.FAIL


def test_command_reports_first_line_of_version_output():
    result = check_command(sys.executable, ["--version"], "Testing")

    assert result.status is CheckStatus.OK
    assert result.detail.startswith("Python")


def test_command_timeout_gives_warning(monkeypatch):
    def fake_run(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd="fake", timeout=5)

    monkeypatch.setattr("ghostsight.system_check.shutil.which", lambda name: "/usr/bin/fake")
    monkeypatch.setattr("ghostsight.system_check.subprocess.run", fake_run)

    result = check_command("fake", ["--version"], "Testing")

    assert result.status is CheckStatus.WARN


def test_unreachable_ollama_is_a_warning_not_a_failure(monkeypatch):
    def fake_urlopen(url, timeout=None):
        raise urllib.error.URLError("connection refused")

    monkeypatch.setattr("ghostsight.system_check.urllib.request.urlopen", fake_urlopen)

    result = check_ollama_server()

    assert result.status is CheckStatus.WARN


def test_ollama_models_are_listed(monkeypatch):
    body = io.BytesIO(b'{"models": [{"name": "example-model:4b"}]}')
    monkeypatch.setattr(
        "ghostsight.system_check.urllib.request.urlopen",
        lambda url, timeout=None: body,
    )

    result = check_ollama_server()

    assert result.status is CheckStatus.OK
    assert "example-model:4b" in result.detail


def test_workspace_ok_when_home_is_writable(isolated_home):
    assert check_workspace().status is CheckStatus.OK


def test_has_failures_only_true_for_fail_status():
    ok = CheckResult("a", CheckStatus.OK, "")
    missing = CheckResult("b", CheckStatus.MISSING, "")
    failed = CheckResult("c", CheckStatus.FAIL, "")

    assert has_failures([ok, missing]) is False
    assert has_failures([ok, failed]) is True
