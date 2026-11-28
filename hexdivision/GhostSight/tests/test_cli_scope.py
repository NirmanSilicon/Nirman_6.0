"""Tests for the `ghostsight scope` command."""

from pathlib import Path

from typer.testing import CliRunner

from ghostsight.main import app
from ghostsight.security.scope_manager import default_scope_path

runner = CliRunner()


def write_scope_file(content: str) -> Path:
    """Write a scope file into the temporary test home and return its path."""
    path = default_scope_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


def test_allowed_target_exits_zero_and_shows_normalised_value() -> None:
    write_scope_file('[scope]\nallowed = ["192.168.56.0/24"]\n')
    result = runner.invoke(app, ["scope", "192.168.56.10"])
    assert result.exit_code == 0
    assert "ALLOWED" in result.output
    assert "192.168.56.10" in result.output


def test_target_outside_scope_exits_one() -> None:
    write_scope_file('[scope]\nallowed = ["192.168.56.0/24"]\n')
    result = runner.invoke(app, ["scope", "8.8.8.8"])
    assert result.exit_code == 1
    assert "DENIED" in result.output
    assert "ALLOWED" not in result.output


def test_missing_scope_file_denies_and_explains() -> None:
    result = runner.invoke(app, ["scope", "127.0.0.1"])
    assert result.exit_code == 1
    assert "DENIED" in result.output
    assert "scope.example.toml" in result.output


def test_option_like_target_is_denied_not_treated_as_option() -> None:
    write_scope_file('[scope]\nallowed = ["127.0.0.1"]\n')
    result = runner.invoke(app, ["scope", "--", "-sS"])
    assert result.exit_code == 1
    assert "DENIED" in result.output


def test_broken_scope_file_exits_three_and_never_allows() -> None:
    write_scope_file("this is = not [valid")
    result = runner.invoke(app, ["scope", "127.0.0.1"])
    assert result.exit_code == 3
    assert "Scope file problem" in result.output
    assert "ALLOWED" not in result.output


def test_target_with_markup_characters_does_not_crash() -> None:
    write_scope_file('[scope]\nallowed = ["127.0.0.1"]\n')
    result = runner.invoke(app, ["scope", "[/red]"])
    assert result.exit_code == 1
    assert "DENIED" in result.output
