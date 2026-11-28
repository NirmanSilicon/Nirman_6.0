"""Tests for evaluate_scan: the size limit comes from the policy, and the reason says why."""

import dataclasses
import ipaddress

import pytest

from ghostsight.security.policy import Policy, PolicyDecision, evaluate_scan


def _network(text):
    return ipaddress.ip_network(text)


def test_range_at_the_default_limit_is_allowed():
    decision = evaluate_scan(Policy(), _network("192.168.0.0/22"))
    assert decision.allowed is True
    assert "1024" in decision.reason


def test_range_over_the_default_limit_is_denied():
    decision = evaluate_scan(Policy(), _network("192.168.0.0/21"))
    assert decision.allowed is False
    assert "2048" in decision.reason
    assert "1024" in decision.reason


def test_limit_comes_from_the_policy():
    strict = Policy(max_target_addresses=1)
    assert evaluate_scan(strict, _network("127.0.0.1/32")).allowed is True
    assert evaluate_scan(strict, _network("127.0.0.0/31")).allowed is False
    loose = Policy(max_target_addresses=4096)
    assert evaluate_scan(loose, _network("192.168.0.0/21")).allowed is True


def test_huge_ipv6_range_is_denied():
    assert evaluate_scan(Policy(), _network("2001:db8::/64")).allowed is False


def test_denial_names_the_policy():
    decision = evaluate_scan(Policy(), _network("10.0.0.0/8"))
    assert decision.reason.startswith("Refused by policy:")


def test_decision_cannot_be_changed():
    decision = PolicyDecision(allowed=True, reason="x")
    with pytest.raises(dataclasses.FrozenInstanceError):
        decision.allowed = False
