"""Tests for the policy file loader: defaults, limits, the lab list and refusing bad files."""

import dataclasses
import ipaddress
from pathlib import Path

import pytest

from ghostsight.paths import get_home_dir
from ghostsight.security.policy import (
    DEFAULT_MAX_TARGET_ADDRESSES,
    LARGEST_ALLOWED_LIMIT,
    Policy,
    PolicyError,
    default_policy_path,
    load_policy,
)


def _write(tmp_path: Path, text: str) -> Path:
    path = tmp_path / "policy.local.toml"
    path.write_text(text, encoding="utf-8")
    return path


def test_default_path_is_in_the_config_folder():
    assert default_policy_path() == get_home_dir() / "config" / "policy.local.toml"


def test_missing_file_gives_the_defaults(tmp_path):
    policy = load_policy(tmp_path / "missing.toml")
    assert policy == Policy()
    assert policy.max_target_addresses == 1024
    assert policy.lab_allowed == ()
    assert load_policy() == Policy()


def test_empty_file_gives_the_defaults(tmp_path):
    assert load_policy(_write(tmp_path, "")) == Policy()


def test_reads_the_limit(tmp_path):
    policy = load_policy(_write(tmp_path, "[policy]\nmax_target_addresses = 256\n"))
    assert policy.max_target_addresses == 256
    assert policy.lab_allowed == ()


def test_reads_the_lab_list(tmp_path):
    text = '[lab]\nallowed = ["192.168.56.10", "192.168.57.0/24"]\n'
    policy = load_policy(_write(tmp_path, text))
    assert policy.lab_allowed == (
        ipaddress.ip_network("192.168.56.10/32"),
        ipaddress.ip_network("192.168.57.0/24"),
    )
    assert policy.max_target_addresses == DEFAULT_MAX_TARGET_ADDRESSES


@pytest.mark.parametrize("value", ["0", "-1", "65537"])
def test_limit_outside_the_range_is_refused(tmp_path, value):
    with pytest.raises(PolicyError) as error:
        load_policy(_write(tmp_path, f"[policy]\nmax_target_addresses = {value}\n"))
    assert "policy.local.toml" in str(error.value)


@pytest.mark.parametrize("value", [1, LARGEST_ALLOWED_LIMIT])
def test_limit_at_the_edges_is_accepted(tmp_path, value):
    policy = load_policy(_write(tmp_path, f"[policy]\nmax_target_addresses = {value}\n"))
    assert policy.max_target_addresses == value


@pytest.mark.parametrize("value", ["true", '"1024"', "1024.0"])
def test_limit_that_is_not_a_whole_number_is_refused(tmp_path, value):
    with pytest.raises(PolicyError):
        load_policy(_write(tmp_path, f"[policy]\nmax_target_addresses = {value}\n"))


def test_lab_that_is_not_a_list_is_refused(tmp_path):
    with pytest.raises(PolicyError):
        load_policy(_write(tmp_path, '[lab]\nallowed = "127.0.0.1"\n'))


def test_lab_entry_that_is_not_a_string_is_refused(tmp_path):
    with pytest.raises(PolicyError):
        load_policy(_write(tmp_path, "[lab]\nallowed = [5]\n"))


def test_lab_hostname_is_refused(tmp_path):
    with pytest.raises(PolicyError):
        load_policy(_write(tmp_path, '[lab]\nallowed = ["example.com"]\n'))


def test_broken_toml_is_refused(tmp_path):
    with pytest.raises(PolicyError):
        load_policy(_write(tmp_path, "[policy\nmax_target_addresses = 5\n"))


def test_file_that_is_not_text_is_refused(tmp_path):
    path = tmp_path / "policy.local.toml"
    path.write_bytes(b"\xff\xfe\x00\x80")
    with pytest.raises(PolicyError):
        load_policy(path)


def test_policy_section_that_is_not_a_table_is_refused(tmp_path):
    with pytest.raises(PolicyError):
        load_policy(_write(tmp_path, "policy = 5\n"))


def test_unknown_key_is_refused(tmp_path):
    with pytest.raises(PolicyError):
        load_policy(_write(tmp_path, "[policy]\nmax_target_adress = 5\n"))


def test_unknown_section_is_refused(tmp_path):
    with pytest.raises(PolicyError):
        load_policy(_write(tmp_path, "[extras]\nx = 1\n"))


def test_policy_cannot_be_changed():
    policy = Policy()
    with pytest.raises(dataclasses.FrozenInstanceError):
        policy.max_target_addresses = 5


def test_example_file_is_valid_and_holds_the_defaults():
    example = Path(__file__).parent.parent / "config" / "policy.example.toml"
    assert "max_target_addresses" in example.read_text(encoding="utf-8")
    assert load_policy(example) == Policy()
