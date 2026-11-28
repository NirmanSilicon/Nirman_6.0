"""Tests for the validation event name in the audit log."""

from pathlib import Path

import pytest

from ghostsight.security.audit_log import AuditError, append_record

TARGET = "10.0.0.5"
REASON = "Running Metasploit checks."


def test_validate_check_is_a_known_event(tmp_path: Path) -> None:
    path = tmp_path / "audit.jsonl"
    append_record(path, "validate-check", TARGET, True, REASON)
    assert "validate-check" in path.read_text(encoding="utf-8")


def test_a_similar_validation_event_is_still_refused(tmp_path: Path) -> None:
    path = tmp_path / "audit.jsonl"
    with pytest.raises(AuditError):
        append_record(path, "validate-execute", TARGET, True, REASON)
    assert not path.exists()
