"""Tests for the audit log: hash chain, fail-closed writing and tamper detection."""

import json
import stat
from datetime import UTC, datetime
from pathlib import Path

import pytest

from ghostsight.security.audit_log import (
    GENESIS_HASH,
    AuditError,
    append_record,
    verify_chain,
)

NOW = datetime(2026, 1, 2, 3, 4, 5, tzinfo=UTC)


def _log_path(tmp_path: Path) -> Path:
    return tmp_path / "logs" / "audit.jsonl"


def _add(path: Path, reason: str = "ok", target: str = "127.0.0.1"):
    return append_record(path, "scan", target, True, reason, now=NOW)


def _three(path: Path) -> None:
    _add(path, "one")
    _add(path, "two")
    _add(path, "three")


def _lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8").splitlines()


def _write_lines(path: Path, lines: list[str]) -> None:
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def test_first_record_starts_the_chain(tmp_path):
    record = _add(_log_path(tmp_path))
    assert record.previous_hash == GENESIS_HASH
    assert len(record.hash) == 64
    assert record.hash != GENESIS_HASH


def test_second_record_links_to_the_first(tmp_path):
    path = _log_path(tmp_path)
    first = _add(path)
    second = _add(path)
    assert second.previous_hash == first.hash
    assert second.hash != first.hash


def test_each_record_is_one_line(tmp_path):
    path = _log_path(tmp_path)
    _three(path)
    assert len(_lines(path)) == 3


def test_verify_accepts_an_untouched_log(tmp_path):
    path = _log_path(tmp_path)
    _three(path)
    check = verify_chain(path)
    assert check.ok
    assert check.count == 3


def test_verify_accepts_a_missing_file(tmp_path):
    check = verify_chain(_log_path(tmp_path))
    assert check.ok
    assert check.count == 0


def test_changed_text_is_detected(tmp_path):
    path = _log_path(tmp_path)
    _three(path)
    lines = _lines(path)
    data = json.loads(lines[1])
    data["reason"] = "edited"
    lines[1] = json.dumps(data)
    _write_lines(path, lines)
    check = verify_chain(path)
    assert not check.ok
    assert "record 2" in check.problem


def test_removed_middle_record_is_detected(tmp_path):
    path = _log_path(tmp_path)
    _three(path)
    lines = _lines(path)
    del lines[1]
    _write_lines(path, lines)
    check = verify_chain(path)
    assert not check.ok
    assert "record 2" in check.problem


def test_reordered_records_are_detected(tmp_path):
    path = _log_path(tmp_path)
    _three(path)
    lines = _lines(path)
    lines[0], lines[1] = lines[1], lines[0]
    _write_lines(path, lines)
    check = verify_chain(path)
    assert not check.ok
    assert "record 1" in check.problem


def test_removing_the_last_record_is_not_detected(tmp_path):
    # A known limit: nothing comes after the last record to point back at it.
    path = _log_path(tmp_path)
    _three(path)
    _write_lines(path, _lines(path)[:2])
    check = verify_chain(path)
    assert check.ok
    assert check.count == 2


def test_unreadable_line_is_reported(tmp_path):
    path = _log_path(tmp_path)
    _add(path)
    path.write_text("not json\n", encoding="utf-8")
    check = verify_chain(path)
    assert not check.ok
    assert "record 1" in check.problem


def test_unknown_event_is_refused_and_nothing_is_written(tmp_path):
    path = _log_path(tmp_path)
    with pytest.raises(AuditError):
        append_record(path, "launch-rocket", "127.0.0.1", True, "ok", now=NOW)
    assert not path.exists()


def test_long_text_is_cut(tmp_path):
    path = _log_path(tmp_path)
    record = _add(path, reason="r" * 5000, target="t" * 5000)
    assert len(record.target) == 200
    assert len(record.reason) == 500
    assert verify_chain(path).ok


def test_newline_in_text_stays_on_one_line(tmp_path):
    path = _log_path(tmp_path)
    _add(path, reason="a\nb")
    lines = _lines(path)
    assert len(lines) == 1
    assert json.loads(lines[0])["reason"] == "a\nb"
    assert verify_chain(path).ok


def test_new_file_is_owner_only(tmp_path):
    path = _log_path(tmp_path)
    _add(path)
    assert stat.S_IMODE(path.stat().st_mode) == 0o600


def test_unwritable_location_is_refused(tmp_path):
    blocker = tmp_path / "blocker"
    blocker.write_text("this is a file, not a folder", encoding="utf-8")
    with pytest.raises(AuditError):
        _add(blocker / "audit.jsonl")


def test_damaged_last_line_blocks_appending(tmp_path):
    path = _log_path(tmp_path)
    _add(path)
    with path.open("a", encoding="utf-8") as handle:
        handle.write("garbage\n")
    before = path.read_text(encoding="utf-8")
    with pytest.raises(AuditError):
        _add(path)
    assert path.read_text(encoding="utf-8") == before


def test_time_is_utc_text(tmp_path):
    record = _add(_log_path(tmp_path))
    assert record.time == "2026-01-02T03:04:05Z"


def test_record_has_the_expected_keys(tmp_path):
    path = _log_path(tmp_path)
    _add(path)
    keys = set(json.loads(_lines(path)[0]))
    assert keys == {"time", "event", "target", "allowed", "reason", "previous_hash", "hash"}
