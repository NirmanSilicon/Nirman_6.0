"""Tests for the ghostsight msf commands (read-only Metasploit questions)."""

import pytest
from typer.testing import CliRunner

from ghostsight import main
from ghostsight.integrations import metasploit_rpc as rpc
from ghostsight.integrations.metasploit_queries import ModuleMatch, MsfVersion, SearchResult
from ghostsight.security.audit_log import AuditError, default_audit_path

runner = CliRunner()
SECRET_QUERY = "secret-query-text"
ALL_COMMANDS = [["msf", "version"], ["msf", "stats"], ["msf", "search", "x"]]


def audit_text() -> str:
    path = default_audit_path()
    return path.read_text(encoding="utf-8") if path.exists() else ""


@pytest.fixture
def calls(monkeypatch: pytest.MonkeyPatch) -> dict:
    """Replace the three queries with fakes that note when, and with what, they ran."""
    monkeypatch.setenv(rpc.PASSWORD_ENV, "test-password")
    match = ModuleMatch(
        "exploit", "windows/smb/x", "exploit/windows/smb/x", "average", "2017-03-14"
    )
    record: dict = {
        "version": [],
        "stats": [],
        "search": [],
        "error": None,
        "log_seen": "",
        "result": SearchResult((match,), 1, False),
    }

    def note(name: str, extra: tuple) -> None:
        record["log_seen"] = audit_text()
        record[name].append(extra)
        if record["error"] is not None:
            raise record["error"]

    def fake_version(settings: object) -> MsfVersion:
        note("version", ())
        return MsfVersion("6.4.126-dev-", "3.4.4", "1.0")

    def fake_stats(settings: object) -> dict[str, int]:
        note("stats", ())
        return {"exploits": 2635, "auxiliary": 1329}

    def fake_search(settings: object, query: str) -> SearchResult:
        note("search", (query,))
        return record["result"]

    monkeypatch.setattr(main, "get_version", fake_version)
    monkeypatch.setattr(main, "get_module_stats", fake_stats)
    monkeypatch.setattr(main, "search_modules", fake_search)
    return record


def test_version_prints_the_version_and_logs_first(calls: dict) -> None:
    result = runner.invoke(main.app, ["msf", "version"])
    assert result.exit_code == 0
    assert "6.4.126-dev-" in result.output
    assert len(calls["version"]) == 1
    assert "msf-query" in calls["log_seen"]
    assert "core.version" in calls["log_seen"]


def test_stats_prints_the_counts_and_logs_first(calls: dict) -> None:
    result = runner.invoke(main.app, ["msf", "stats"])
    assert result.exit_code == 0
    assert "exploits" in result.output
    assert "2635" in result.output
    assert "core.module_stats" in calls["log_seen"]


def test_search_logs_the_method_but_not_the_query_text(calls: dict) -> None:
    result = runner.invoke(main.app, ["msf", "search", SECRET_QUERY])
    assert result.exit_code == 0
    assert calls["search"] == [(SECRET_QUERY,)]
    assert "windows/smb/x" in result.output
    assert "module.search" in calls["log_seen"]
    assert SECRET_QUERY not in calls["log_seen"]
    assert SECRET_QUERY not in audit_text()


def test_search_says_when_the_list_was_cut_short(calls: dict) -> None:
    calls["result"] = SearchResult(calls["result"].matches, 241, True)
    result = runner.invoke(main.app, ["msf", "search", "smb"])
    assert result.exit_code == 0
    assert "241" in result.output


def test_a_missing_password_stops_before_any_log_or_call(
    calls: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv(rpc.PASSWORD_ENV)
    result = runner.invoke(main.app, ["msf", "version"])
    assert result.exit_code == 2
    assert "Metasploit settings problem" in result.output
    assert calls["version"] == []
    assert audit_text() == ""


@pytest.mark.parametrize("args", ALL_COMMANDS)
def test_a_failing_audit_log_blocks_the_query(
    calls: dict, monkeypatch: pytest.MonkeyPatch, args: list[str]
) -> None:
    def broken(*_args: object, **_kwargs: object) -> None:
        raise AuditError("The audit log cannot be written.")

    monkeypatch.setattr(main, "append_record", broken)
    result = runner.invoke(main.app, args)
    assert result.exit_code == 5
    assert "Refused" in result.output
    assert calls["version"] == calls["stats"] == calls["search"] == []


@pytest.mark.parametrize("args", ALL_COMMANDS)
def test_a_failed_query_exits_4_after_the_record_is_written(
    calls: dict, args: list[str]
) -> None:
    calls["error"] = rpc.RpcError("Metasploit could not be reached.")
    result = runner.invoke(main.app, args)
    assert result.exit_code == 4
    assert "could not be reached" in result.output
    assert "msf-query" in audit_text()
