"""Tests that allowed scope decisions carry a normalised target."""

import json
from pathlib import Path

from ghostsight.security.scope_manager import Scope, load_scope


def make_scope(tmp_path: Path, entries: list[str]) -> Scope:
    """Write a scope file containing the entries and load it."""
    path = tmp_path / "scope.toml"
    path.write_text(f"[scope]\nallowed = {json.dumps(entries)}\n", encoding="utf-8")
    return load_scope(path)


def test_single_host_is_normalised_to_plain_address(tmp_path: Path) -> None:
    decision = make_scope(tmp_path, ["127.0.0.1"]).check("127.0.0.1")
    assert decision.normalised == "127.0.0.1"


def test_whitespace_is_removed_but_raw_target_is_kept(tmp_path: Path) -> None:
    raw = " 127.0.0.1\n"
    decision = make_scope(tmp_path, ["127.0.0.1"]).check(raw)
    assert decision.allowed is True
    assert decision.target == raw
    assert decision.normalised == "127.0.0.1"


def test_network_keeps_cidr_form(tmp_path: Path) -> None:
    decision = make_scope(tmp_path, ["192.168.56.0/24"]).check("192.168.56.128/25")
    assert decision.normalised == "192.168.56.128/25"


def test_ipv6_is_normalised_to_compressed_form(tmp_path: Path) -> None:
    decision = make_scope(tmp_path, ["::1"]).check("0:0:0:0:0:0:0:1")
    assert decision.allowed is True
    assert decision.normalised == "::1"


def test_denied_target_has_no_normalised_value(tmp_path: Path) -> None:
    decision = make_scope(tmp_path, ["192.168.56.0/24"]).check("8.8.8.8")
    assert decision.allowed is False
    assert decision.normalised is None


def test_malformed_target_has_no_normalised_value(tmp_path: Path) -> None:
    decision = make_scope(tmp_path, ["127.0.0.1"]).check("127.0.0.1 -p-")
    assert decision.allowed is False
    assert decision.normalised is None
