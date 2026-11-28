"""Tests for `ghostsight audit verify`. It only reads the log and never shows its contents."""

import json

from typer.testing import CliRunner

from ghostsight.main import app
from ghostsight.paths import get_home_dir
from ghostsight.security.audit_log import append_record, default_audit_path

runner = CliRunner()


def _add(reason: str = "ok", target: str = "127.0.0.1") -> None:
    append_record(default_audit_path(), "scan", target, True, reason)


def _change_record(number: int) -> None:
    path = default_audit_path()
    lines = path.read_text(encoding="utf-8").splitlines()
    data = json.loads(lines[number - 1])
    data["reason"] = "edited"
    lines[number - 1] = json.dumps(data)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _verify():
    return runner.invoke(app, ["audit", "verify"])


def test_default_path_is_in_the_logs_folder():
    assert default_audit_path() == get_home_dir() / "logs" / "audit.jsonl"


def test_missing_log_is_fine():
    result = _verify()
    assert result.exit_code == 0
    assert "No audit records yet." in result.output


def test_good_log_exits_zero():
    _add()
    _add()
    assert _verify().exit_code == 0


def test_good_log_reports_the_count():
    _add()
    _add()
    _add()
    result = _verify()
    assert result.exit_code == 0
    assert "Records checked: 3" in result.output


def test_changed_record_exits_one():
    _add()
    _add()
    _change_record(2)
    assert _verify().exit_code == 1


def test_changed_record_names_the_record():
    _add()
    _add()
    _change_record(2)
    assert "record 2 was changed." in _verify().output


def test_garbage_line_exits_one_without_echoing_it():
    _add()
    default_audit_path().write_text("not json SECRET-GARBAGE\n", encoding="utf-8")
    result = _verify()
    assert result.exit_code == 1
    assert "record 1 is not a valid audit record." in result.output
    assert "SECRET-GARBAGE" not in result.output


def test_output_never_shows_record_text():
    _add(reason="SECRET-REASON", target="10.9.8.7")
    # Control: the text really is in the file, so the check below can fail.
    assert "SECRET-REASON" in default_audit_path().read_text(encoding="utf-8")
    result = _verify()
    assert result.exit_code == 0
    assert "SECRET-REASON" not in result.output
    assert "10.9.8.7" not in result.output


def test_verify_does_not_change_the_file():
    _add()
    _add()
    before = default_audit_path().read_bytes()
    assert _verify().exit_code == 0
    assert default_audit_path().read_bytes() == before


def test_verify_does_not_create_a_missing_file():
    assert _verify().exit_code == 0
    assert not default_audit_path().exists()


def test_audit_is_listed_in_help():
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "audit" in result.output


def test_audit_help_lists_verify():
    result = runner.invoke(app, ["audit", "--help"])
    assert result.exit_code == 0
    assert "verify" in result.output
