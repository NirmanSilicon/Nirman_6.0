"""A range rule that names its own update must not match a different update.

Real data (OpenSSH, probed for 4.4p1 and 9.6p1): NVD lists a CVE whose
range rule says "*:p1" for a p1 target, and does not list CVEs whose
range rule says "*:p2" for a p1 target. So when the number is inside
the range but the update differs, the answer is "cannot tell". Outside
the range both readings agree on no match. Only 4 such rules exist in
the sample, so this is a cautious policy and not a proven NVD rule.
"""

import pytest

from ghostsight.intelligence.cpe_version import ServiceVersion
from ghostsight.intelligence.nvd_reader import MatchRule
from ghostsight.intelligence.rule_match import RuleResult, apply_rule


def target(number: str, update: str) -> ServiceVersion:
    return ServiceVersion(
        part="a",
        vendor="openbsd",
        product="openssh",
        number=number,
        update=update,
    )


def range_rule(update: str, start: str = "") -> MatchRule:
    return MatchRule(
        criteria=f"cpe:2.3:a:openbsd:openssh:*:{update}:*:*:*:*:*:*",
        vulnerable=True,
        version_start_including=start,
        version_start_excluding="",
        version_end_including="7.2",
        version_end_excluding="",
    )


def test_same_update_in_range_matches() -> None:
    result = apply_rule(range_rule("p1"), target("4.4", "p1"))
    assert result is RuleResult.MATCH


def test_different_update_in_range_is_unreadable() -> None:
    result = apply_rule(range_rule("p2"), target("4.4", "p1"))
    assert result is RuleResult.VERSION_UNREADABLE


def test_target_without_update_against_specific_update_is_unreadable() -> None:
    result = apply_rule(range_rule("p2"), target("4.4", ""))
    assert result is RuleResult.VERSION_UNREADABLE


def test_different_update_out_of_range_is_no_match() -> None:
    result = apply_rule(range_rule("p2"), target("9.6", "p1"))
    assert result is RuleResult.NO_MATCH


def test_same_update_out_of_range_is_no_match() -> None:
    result = apply_rule(range_rule("p1"), target("9.6", "p1"))
    assert result is RuleResult.NO_MATCH


@pytest.mark.parametrize("update", ["p1", "p2", ""])
def test_wildcard_update_matches_any_update(update: str) -> None:
    result = apply_rule(range_rule("*"), target("4.4", update))
    assert result is RuleResult.MATCH


@pytest.mark.parametrize("update", ["", "p1"])
def test_dash_update_in_a_range_is_not_guessed(update: str) -> None:
    result = apply_rule(range_rule("-"), target("4.4", update))
    assert result is RuleResult.VERSION_UNREADABLE


def test_start_bound_with_different_update_is_unreadable() -> None:
    result = apply_rule(range_rule("p2", start="4.0"), target("4.4", "p1"))
    assert result is RuleResult.VERSION_UNREADABLE


def test_start_bound_out_of_range_is_no_match() -> None:
    result = apply_rule(range_rule("p2", start="4.0"), target("3.9", "p1"))
    assert result is RuleResult.NO_MATCH
