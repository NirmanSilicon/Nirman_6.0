"""Tests for the Metasploit event name in the audit log."""

from pathlib import Path

import pytest

from ghostsight.security.audit_log import AuditError, append_record


def test_msf_query_is_a_known_event(tmp_path: Path) -> None:
    path = tmp_path / "audit.jsonl"
    append_record(path, "msf-query", "127.0.0.1:55553", True, "read-only query: core.version")
    assert "msf-query" in path.read_text(encoding="utf-8")


def test_an_unknown_event_is_still_refused(tmp_path: Path) -> None:
    path = tmp_path / "audit.jsonl"
    with pytest.raises(AuditError):
        append_record(path, "msf-exploit", "127.0.0.1:55553", True, "not a known event")
