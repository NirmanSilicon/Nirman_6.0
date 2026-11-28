"""Tests for the scope manager."""

import json
from pathlib import Path

import pytest

from ghostsight.security.scope_manager import (
    Scope,
    ScopeError,
    default_scope_path,
    load_scope,
)


def make_scope(tmp_path: Path, entries: list[str]) -> Scope:
    """Write a scope file containing the entries and load it."""
    path = tmp_path / "scope.toml"
    path.write_text(f"[scope]\nallowed = {json.dumps(entries)}\n", encoding="utf-8")
    return load_scope(path)


def test_missing_scope_file_denies_everything(tmp_path: Path) -> None:
    scope = load_scope(tmp_path / "does_not_exist.toml")
    decision = scope.check("127.0.0.1")
    assert decision.allowed is False
    assert "No scope" in decision.reason


def test_empty_allowed_list_denies_everything(tmp_path: Path) -> None:
    assert make_scope(tmp_path, []).check("127.0.0.1").allowed is False


def test_single_allowed_ip_is_allowed(tmp_path: Path) -> None:
    assert make_scope(tmp_path, ["127.0.0.1"]).check("127.0.0.1").allowed is True


def test_address_inside_allowed_range_is_allowed(tmp_path: Path) -> None:
    decision = make_scope(tmp_path, ["192.168.56.0/24"]).check("192.168.56.10")
    assert decision.allowed is True
    assert "192.168.56.0/24" in decision.reason


def test_range_inside_allowed_range_is_allowed(tmp_path: Path) -> None:
    scope = make_scope(tmp_path, ["192.168.56.0/24"])
    assert scope.check("192.168.56.128/25").allowed is True


def test_range_larger_than_allowed_range_is_denied(tmp_path: Path) -> None:
    scope = make_scope(tmp_path, ["192.168.56.0/24"])
    assert scope.check("192.168.0.0/16").allowed is False


def test_address_outside_scope_is_denied(tmp_path: Path) -> None:
    scope = make_scope(tmp_path, ["192.168.56.0/24"])
    assert scope.check("192.168.57.10").allowed is False


def test_hostname_is_denied(tmp_path: Path) -> None:
    scope = make_scope(tmp_path, ["127.0.0.1"])
    decision = scope.check("localhost")
    assert decision.allowed is False
    assert "Hostnames" in decision.reason


@pytest.mark.parametrize("target", ["-sS", "127.0.0.1 -p-", "", "127.0.0.1; ls"])
def test_option_like_or_malformed_targets_are_denied(tmp_path: Path, target: str) -> None:
    scope = make_scope(tmp_path, ["127.0.0.1", "192.168.56.0/24"])
    assert scope.check(target).allowed is False


def test_ipv6_target_against_ipv4_scope_is_denied(tmp_path: Path) -> None:
    scope = make_scope(tmp_path, ["127.0.0.1"])
    assert scope.check("::1").allowed is False


def test_ipv6_target_allowed_when_listed(tmp_path: Path) -> None:
    assert make_scope(tmp_path, ["::1"]).check("::1").allowed is True


def test_invalid_toml_raises_scope_error(tmp_path: Path) -> None:
    path = tmp_path / "scope.toml"
    path.write_text("this is = not [valid", encoding="utf-8")
    with pytest.raises(ScopeError):
        load_scope(path)


def test_invalid_scope_entry_raises_scope_error(tmp_path: Path) -> None:
    with pytest.raises(ScopeError):
        make_scope(tmp_path, ["not-an-ip"])


def test_entry_with_host_bits_set_raises_scope_error(tmp_path: Path) -> None:
    with pytest.raises(ScopeError):
        make_scope(tmp_path, ["192.168.56.5/24"])


def test_allowed_must_be_a_list(tmp_path: Path) -> None:
    path = tmp_path / "scope.toml"
    path.write_text('[scope]\nallowed = "127.0.0.1"\n', encoding="utf-8")
    with pytest.raises(ScopeError):
        load_scope(path)


def test_default_scope_path_follows_ghostsight_home(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("GHOSTSIGHT_HOME", str(tmp_path))
    expected = (tmp_path / "config" / "scope.local.toml").resolve()
    assert default_scope_path().resolve() == expected
