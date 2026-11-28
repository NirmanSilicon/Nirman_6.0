"""Tests for applying one NVD match rule to one target version.

Policy is decision 36 h. The five results are kept apart on purpose, so
the code that combines results can decide what an unreadable rule means.
"""

import pytest

from ghostsight.intelligence.cpe_version import ServiceVersion
from ghostsight.intelligence.nvd_reader import MatchRule
from ghostsight.intelligence.rule_match import RuleResult, apply_rule

MATCH = RuleResult.MATCH
NO_MATCH = RuleResult.NO_MATCH
NOT_APPLICABLE = RuleResult.NOT_APPLICABLE
VERSION_UNREADABLE = RuleResult.VERSION_UNREADABLE
NAME_UNREADABLE = RuleResult.NAME_UNREADABLE


def name(
    version: str,
    update: str = "*",
    vendor: str = "openbsd",
    product: str = "openssh",
    part: str = "a",
) -> str:
    return f"cpe:2.3:{part}:{vendor}:{product}:{version}:{update}:*:*:*:*:*:*"


def rule(
    criteria: str,
    *,
    vulnerable: bool = True,
    start_incl: str = "",
    start_excl: str = "",
    end_incl: str = "",
    end_excl: str = "",
) -> MatchRule:
    return MatchRule(
        criteria=criteria,
        vulnerable=vulnerable,
        version_start_including=start_incl,
        version_start_excluding=start_excl,
        version_end_including=end_incl,
        version_end_excluding=end_excl,
    )


def target(number: str, update: str = "") -> ServiceVersion:
    return ServiceVersion(
        part="a",
        vendor="openbsd",
        product="openssh",
        number=number,
        update=update,
    )


# (rule version, rule update, target number, target update, expected)
EXACT = [
    ("9.6", "p1", "9.6", "p1", MATCH),
    ("9.6", "-", "9.6", "p1", NO_MATCH),
    ("9.6", "-", "9.6", "", MATCH),
    ("9.6", "p1", "9.6", "", NO_MATCH),
    ("9.5", "p1", "9.6", "p1", NO_MATCH),
    ("9.6", "*", "9.6", "p1", MATCH),
    ("9.6.0", "p1", "9.6", "p1", MATCH),
    ("9.6", "p2", "9.6", "p1", NO_MATCH),
    ("9.6", "beta", "9.6", "p1", VERSION_UNREADABLE),
    ("4.3p2", "*", "9.6", "p1", VERSION_UNREADABLE),
    ("-", "*", "9.6", "p1", VERSION_UNREADABLE),
    ("9.6", "*", "9.6", "", MATCH),
]


@pytest.mark.parametrize(
    ("version", "update", "number", "target_update", "expected"), EXACT
)
def test_exact_rule(
    version: str,
    update: str,
    number: str,
    target_update: str,
    expected: RuleResult,
) -> None:
    result = apply_rule(rule(name(version, update)), target(number, target_update))
    assert result is expected


# (start incl, start excl, end incl, end excl, target number, target update,
#  expected). The rule version is "*" and the rule update is "*".
RANGES = [
    ("", "", "9.8", "", "9.6", "p1", MATCH),
    ("", "", "9.8", "", "9.8", "p1", MATCH),
    ("", "", "9.8", "", "9.9", "p1", NO_MATCH),
    ("", "", "", "9.6", "9.6", "p1", NO_MATCH),
    ("", "", "", "4.4", "4.4", "p1", NO_MATCH),
    ("", "", "", "4.4", "4.3", "", MATCH),
    ("8.6", "", "9.8", "", "8.6", "p1", MATCH),
    ("8.6", "", "9.8", "", "8.5", "p1", NO_MATCH),
    ("", "8.6", "", "", "8.6", "p1", NO_MATCH),
    ("", "8.6", "", "", "8.7", "p1", MATCH),
    ("8.6", "", "", "", "9.9", "p1", MATCH),
    ("", "", "4.3p2", "", "4.4", "p1", VERSION_UNREADABLE),
    ("9.7", "", "4.3p2", "", "9.6", "p1", NO_MATCH),
    ("8.6", "", "9.8", "", "9.10", "p1", NO_MATCH),
]


@pytest.mark.parametrize(
    (
        "start_incl",
        "start_excl",
        "end_incl",
        "end_excl",
        "number",
        "target_update",
        "expected",
    ),
    RANGES,
)
def test_range_rule(
    start_incl: str,
    start_excl: str,
    end_incl: str,
    end_excl: str,
    number: str,
    target_update: str,
    expected: RuleResult,
) -> None:
    the_rule = rule(
        name("*"),
        start_incl=start_incl,
        start_excl=start_excl,
        end_incl=end_incl,
        end_excl=end_excl,
    )
    assert apply_rule(the_rule, target(number, target_update)) is expected



def test_bounds_with_an_exact_version_are_unreadable() -> None:
    the_rule = rule(name("9.6", "p1"), end_incl="9.8")
    assert apply_rule(the_rule, target("9.6", "p1")) is VERSION_UNREADABLE


def test_rule_that_is_not_vulnerable_is_not_applicable() -> None:
    the_rule = rule(name("9.6", "p1"), vulnerable=False)
    assert apply_rule(the_rule, target("9.6", "p1")) is NOT_APPLICABLE


def test_not_vulnerable_is_checked_before_the_name_is_read() -> None:
    the_rule = rule("garbage", vulnerable=False)
    assert apply_rule(the_rule, target("9.6", "p1")) is NOT_APPLICABLE


OTHER_PRODUCTS = [
    name("9.6", "p1", product="dropbear"),
    name("9.6", "p1", vendor="someone"),
    name("9.6", "p1", part="o"),
]


@pytest.mark.parametrize("criteria", OTHER_PRODUCTS)
def test_rule_for_another_product_is_not_applicable(criteria: str) -> None:
    result = apply_rule(rule(criteria), target("9.6", "p1"))
    assert result is NOT_APPLICABLE


def test_vendor_and_product_are_compared_ignoring_case() -> None:
    mixed_case = ServiceVersion(
        part="a",
        vendor="OpenBSD",
        product="OpenSSH",
        number="9.6",
        update="p1",
    )
    assert apply_rule(rule(name("9.6", "p1")), mixed_case) is MATCH


UNSPLITTABLE = [
    "garbage",
    "cpe:/a:openbsd:openssh:9.6p1",
    "cpe:2.3:a:open\\:bsd:openssh:9.6:p1:*:*:*:*:*:*",
]


@pytest.mark.parametrize("criteria", UNSPLITTABLE)
def test_unsplittable_criteria_gives_name_unreadable(criteria: str) -> None:
    result = apply_rule(rule(criteria), target("9.6", "p1"))
    assert result is NAME_UNREADABLE
