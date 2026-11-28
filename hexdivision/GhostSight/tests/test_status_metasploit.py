"""Tests for the Metasploit row in `ghostsight status`.

The check must only look for the programs. It must never start them.
"""

import pytest

from ghostsight import system_check
from ghostsight.system_check import CheckStatus


def _which_returning(found: set[str]):
    """Build a fake shutil.which that knows only the given names."""

    def fake_which(name: str) -> str | None:
        return f"/fake/bin/{name}" if name in found else None

    return fake_which


def test_both_programs_found_is_ok(monkeypatch: pytest.MonkeyPatch) -> None:
    found = {"msfconsole", "msfrpcd"}
    monkeypatch.setattr(system_check.shutil, "which", _which_returning(found))
    result = system_check.check_metasploit()
    assert result.name == "metasploit"
    assert result.status is CheckStatus.OK
    assert "not started" in result.detail


def test_neither_program_is_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(system_check.shutil, "which", _which_returning(set()))
    result = system_check.check_metasploit()
    assert result.status is CheckStatus.MISSING
    assert result.detail == "not installed"


def test_missing_rpc_program_is_a_warning(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        system_check.shutil, "which", _which_returning({"msfconsole"})
    )
    result = system_check.check_metasploit()
    assert result.status is CheckStatus.WARN
    assert "msfrpcd" in result.detail


def test_check_never_starts_a_program(monkeypatch: pytest.MonkeyPatch) -> None:
    found = {"msfconsole", "msfrpcd"}
    monkeypatch.setattr(system_check.shutil, "which", _which_returning(found))

    def forbidden(*args: object, **kwargs: object) -> None:
        raise AssertionError("a program was started")

    monkeypatch.setattr(system_check.subprocess, "run", forbidden)
    result = system_check.check_metasploit()
    assert result.status is CheckStatus.OK


def test_status_lists_metasploit() -> None:
    names = [result.name for result in system_check.run_all_checks()]
    assert "metasploit" in names
