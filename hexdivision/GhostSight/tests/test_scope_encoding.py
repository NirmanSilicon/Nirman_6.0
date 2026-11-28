"""Tests that a scope file that is not text gives a clear error, not a crash."""

import pytest
from typer.testing import CliRunner

from ghostsight.main import app
from ghostsight.security.audit_log import default_audit_path
from ghostsight.security.scope_manager import ScopeError, default_scope_path, load_scope

runner = CliRunner()


def test_non_text_scope_file_raises_scope_error(tmp_path) -> None:
    path = tmp_path / "scope.toml"
    path.write_bytes(b"\xff\xfe\n")
    with pytest.raises(ScopeError):
        load_scope(path)


def test_valid_scope_file_still_loads(tmp_path) -> None:
    path = tmp_path / "scope.toml"
    path.write_text('[scope]\nallowed = ["127.0.0.1"]\n', encoding="utf-8")
    assert len(load_scope(path).networks) == 1


def test_scan_exits_3_for_a_non_text_scope_file() -> None:
    path = default_scope_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"\xff\xfe\n")
    result = runner.invoke(app, ["scan", "--target", "127.0.0.1"])
    assert result.exit_code == 3
    assert not default_audit_path().exists()
