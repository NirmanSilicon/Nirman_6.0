"""Tests for the lab gate: a target must pass both the scope and [lab] allowed."""

from ghostsight.security.policy import Policy
from ghostsight.security.scope_manager import Scope, ScopeDecision, parse_network
from ghostsight.validation.lab_gate import check_lab_gate


def scope_for(*ranges: str) -> Scope:
    return Scope(networks=tuple(parse_network(item) for item in ranges))


def policy_for(*ranges: str) -> Policy:
    return Policy(lab_allowed=tuple(parse_network(item) for item in ranges))


def test_a_target_in_scope_and_in_the_lab_is_allowed() -> None:
    decision = scope_for("10.0.0.0/24").check("10.0.0.5")
    result = check_lab_gate(policy_for("10.0.0.0/24"), decision)
    assert result.allowed is True
    assert "Inside allowed range" in result.reason
    assert "lab range" in result.reason


def test_a_target_in_the_lab_but_outside_the_scope_is_refused() -> None:
    decision = scope_for("10.0.0.0/24").check("10.0.1.5")
    result = check_lab_gate(policy_for("10.0.0.0/16"), decision)
    assert result.allowed is False
    assert result.reason == decision.reason


def test_a_hostname_is_refused() -> None:
    decision = scope_for("10.0.0.0/24").check("lab-pc.local")
    result = check_lab_gate(policy_for("10.0.0.0/24"), decision)
    assert result.allowed is False
    assert "Hostnames" in result.reason


def test_a_target_in_scope_but_not_in_the_lab_is_refused() -> None:
    decision = scope_for("10.0.0.0/24").check("10.0.0.5")
    result = check_lab_gate(policy_for("192.168.0.0/16"), decision)
    assert result.allowed is False
    assert "not inside any range" in result.reason


def test_an_empty_lab_list_refuses_everything() -> None:
    decision = scope_for("10.0.0.0/24").check("10.0.0.5")
    result = check_lab_gate(Policy(), decision)
    assert result.allowed is False
    assert "[lab] allowed" in result.reason


def test_a_range_is_refused_even_when_scope_and_lab_allow_it() -> None:
    decision = scope_for("10.0.0.0/24").check("10.0.0.0/30")
    result = check_lab_gate(policy_for("10.0.0.0/24"), decision)
    assert result.allowed is False
    assert "one address" in result.reason


def test_a_public_address_is_refused_even_when_listed_everywhere() -> None:
    decision = scope_for("8.8.8.0/24").check("8.8.8.8")
    result = check_lab_gate(policy_for("8.8.8.0/24"), decision)
    assert result.allowed is False
    assert "not a private address" in result.reason


def test_a_decision_with_no_normalised_target_is_refused() -> None:
    decision = ScopeDecision("10.0.0.5", True, "Odd.", None)
    result = check_lab_gate(policy_for("10.0.0.0/24"), decision)
    assert result.allowed is False


def test_a_denied_decision_is_refused_even_with_a_target_set() -> None:
    decision = ScopeDecision("10.0.0.5", False, "Denied.", "10.0.0.5")
    result = check_lab_gate(policy_for("10.0.0.0/24"), decision)
    assert result.allowed is False
    assert result.reason == "Denied."


def test_unreadable_normalised_text_is_refused() -> None:
    decision = ScopeDecision("x", True, "Odd.", "not-an-address")
    result = check_lab_gate(policy_for("10.0.0.0/24"), decision)
    assert result.allowed is False
