"""Tests for the lab target rule (used by Metasploit checks from v0.8.0)."""

import ipaddress

import pytest

from ghostsight.security.policy import Policy, PolicyDecision, evaluate_lab_target


def decide(lab: list[str], target: str) -> PolicyDecision:
    policy = Policy(lab_allowed=tuple(ipaddress.ip_network(text) for text in lab))
    return evaluate_lab_target(policy, ipaddress.ip_network(target))


def test_a_host_inside_a_lab_range_is_allowed() -> None:
    decision = decide(["192.168.56.0/24"], "192.168.56.10")
    assert decision.allowed is True
    assert "192.168.56.0/24" in decision.reason


def test_a_single_host_entry_matches_itself() -> None:
    assert decide(["192.168.56.10/32"], "192.168.56.10").allowed is True


def test_loopback_can_be_a_lab_target() -> None:
    assert decide(["127.0.0.0/8"], "127.0.0.1").allowed is True


def test_any_listed_range_can_match() -> None:
    decision = decide(["10.0.0.0/24", "192.168.56.0/24"], "192.168.56.10")
    assert decision.allowed is True
    assert "192.168.56.0/24" in decision.reason


def test_an_empty_lab_list_refuses_everything() -> None:
    decision = decide([], "192.168.56.10")
    assert decision.allowed is False
    assert "[lab] allowed" in decision.reason


def test_a_host_outside_every_range_is_refused() -> None:
    decision = decide(["192.168.56.0/24"], "192.168.57.10")
    assert decision.allowed is False
    assert "not inside" in decision.reason


def test_more_than_one_address_is_refused() -> None:
    decision = decide(["192.168.56.0/24"], "192.168.56.0/24")
    assert decision.allowed is False
    assert "one address" in decision.reason


def test_a_public_address_is_refused_even_if_listed() -> None:
    decision = decide(["8.8.8.0/24"], "8.8.8.8")
    assert decision.allowed is False
    assert "private" in decision.reason


@pytest.mark.parametrize(
    ("lab", "target"),
    [("fd00::/64", "192.168.56.10"), ("192.168.56.0/24", "fd00::5")],
)
def test_mixed_ip_versions_are_refused(lab: str, target: str) -> None:
    assert decide([lab], target).allowed is False
