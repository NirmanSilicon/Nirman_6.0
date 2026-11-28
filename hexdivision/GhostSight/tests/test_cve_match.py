"""Tests for combining rule results into one answer per CVE.

Policy is decision 36 h plus a working rule: anything unreadable gives
CANNOT_TELL, never a clean NO_MATCH. A readable MATCH always wins.
"""

from ghostsight.intelligence.cpe_version import ServiceVersion
from ghostsight.intelligence.cve_match import CveMatch, match_cve
from ghostsight.intelligence.nvd_reader import (
    Configuration,
    CveRecord,
    MatchNode,
    MatchRule,
)

TARGET = ServiceVersion(
    part="a",
    vendor="openbsd",
    product="openssh",
    number="9.6",
    update="p1",
)


def name(version: str, update: str, product: str = "openssh") -> str:
    return f"cpe:2.3:a:openbsd:{product}:{version}:{update}:*:*:*:*:*:*"


def make_rule(criteria: str, vulnerable: bool = True) -> MatchRule:
    return MatchRule(
        criteria=criteria,
        vulnerable=vulnerable,
        version_start_including="",
        version_start_excluding="",
        version_end_including="",
        version_end_excluding="",
    )


def hit() -> MatchRule:
    """Gives MATCH for the target 9.6p1."""
    return make_rule(name("9.6", "p1"))


def miss() -> MatchRule:
    """Readable, about this product, gives NO_MATCH."""
    return make_rule(name("9.5", "p1"))


def other() -> MatchRule:
    """About another product, gives NOT_APPLICABLE."""
    return make_rule(name("9.6", "p1", product="dropbear"))


def platform() -> MatchRule:
    """Not marked vulnerable, gives NOT_APPLICABLE."""
    return make_rule(name("9.6", "p1"), vulnerable=False)


def glued() -> MatchRule:
    """Gives VERSION_UNREADABLE."""
    return make_rule(name("4.3p2", "*"))


def garbage() -> MatchRule:
    """Gives NAME_UNREADABLE."""
    return make_rule("garbage")


def node(*rules: MatchRule, operator: str = "OR", negate: bool = False) -> MatchNode:
    return MatchNode(operator=operator, negate=negate, rules=tuple(rules))


def config(*nodes: MatchNode, operator: str = "") -> Configuration:
    return Configuration(operator=operator, nodes=tuple(nodes))


def record(*configurations: Configuration) -> CveRecord:
    return CveRecord(
        cve_id="CVE-2024-0001",
        published="",
        last_modified="",
        status="",
        description="",
        scores=(),
        configurations=tuple(configurations),
    )


def test_matching_rule_gives_match() -> None:
    assert match_cve(record(config(node(hit()))), TARGET) is CveMatch.MATCH


def test_non_matching_rule_gives_no_match() -> None:
    assert match_cve(record(config(node(miss()))), TARGET) is CveMatch.NO_MATCH


def test_no_configurations_gives_no_match() -> None:
    assert match_cve(record(), TARGET) is CveMatch.NO_MATCH


def test_rules_for_other_products_give_no_match() -> None:
    the_record = record(config(node(other(), platform())))
    assert match_cve(the_record, TARGET) is CveMatch.NO_MATCH


def test_match_in_a_later_node() -> None:
    the_record = record(config(node(miss()), node(hit())))
    assert match_cve(the_record, TARGET) is CveMatch.MATCH


def test_match_in_a_later_configuration() -> None:
    the_record = record(config(node(miss())), config(node(hit())))
    assert match_cve(the_record, TARGET) is CveMatch.MATCH


def test_match_wins_over_unreadable_rules() -> None:
    the_record = record(config(node(glued(), garbage())), config(node(hit())))
    assert match_cve(the_record, TARGET) is CveMatch.MATCH


def test_unreadable_version_gives_cannot_tell() -> None:
    the_record = record(config(node(miss(), glued())))
    assert match_cve(the_record, TARGET) is CveMatch.CANNOT_TELL


def test_unreadable_name_gives_cannot_tell() -> None:
    the_record = record(config(node(miss(), garbage())))
    assert match_cve(the_record, TARGET) is CveMatch.CANNOT_TELL


def test_platform_condition_in_an_and_configuration_is_not_checked() -> None:
    the_record = record(config(node(hit()), node(platform()), operator="AND"))
    assert match_cve(the_record, TARGET) is CveMatch.MATCH


def test_negated_node_about_this_product_gives_cannot_tell() -> None:
    the_record = record(config(node(hit(), negate=True)))
    assert match_cve(the_record, TARGET) is CveMatch.CANNOT_TELL


def test_negated_node_about_another_product_is_ignored() -> None:
    the_record = record(config(node(other(), negate=True)))
    assert match_cve(the_record, TARGET) is CveMatch.NO_MATCH


def test_node_with_an_and_operator_gives_cannot_tell() -> None:
    the_record = record(config(node(hit(), operator="AND")))
    assert match_cve(the_record, TARGET) is CveMatch.CANNOT_TELL


def test_odd_node_does_not_hide_a_real_match() -> None:
    the_record = record(config(node(hit(), negate=True), node(hit())))
    assert match_cve(the_record, TARGET) is CveMatch.MATCH


def test_empty_operator_counts_as_or() -> None:
    the_record = record(config(node(hit(), operator="")))
    assert match_cve(the_record, TARGET) is CveMatch.MATCH
