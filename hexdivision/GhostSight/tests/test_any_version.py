"""Tests for a bare wildcard rule: every version of the product.

NVD's own answer for 9.6p1 listed three CVEs whose only OpenSSH rule was
`openssh:*` with no bounds. NVD reads that as "every version", so a bare
wildcard on the right product is a match. It is the weakest kind of match,
and the evidence says so.
"""

import pytest

from ghostsight.intelligence.cpe_version import ServiceVersion
from ghostsight.intelligence.cve_match import CveMatch, match_cve
from ghostsight.intelligence.evidence import Basis, build_evidence
from ghostsight.intelligence.nvd_reader import (
    Configuration,
    CveRecord,
    MatchNode,
    MatchRule,
)
from ghostsight.intelligence.rule_match import RuleResult, apply_rule


def target(number: str = "9.6", update: str = "p1") -> ServiceVersion:
    return ServiceVersion(
        part="a", vendor="openbsd", product="openssh", number=number, update=update
    )


def wild(
    update: str = "*",
    product: str = "openssh",
    vulnerable: bool = True,
    end_excluding: str = "",
) -> MatchRule:
    return MatchRule(
        criteria=f"cpe:2.3:a:openbsd:{product}:*:{update}:*:*:*:*:*:*",
        vulnerable=vulnerable,
        version_start_including="",
        version_start_excluding="",
        version_end_including="",
        version_end_excluding=end_excluding,
    )


def one_node(*rules: MatchRule) -> Configuration:
    node = MatchNode(operator="OR", negate=False, rules=tuple(rules))
    return Configuration(operator="", nodes=(node,))


def cve(*configurations: Configuration) -> CveRecord:
    return CveRecord(
        cve_id="CVE-2024-0001",
        published="",
        last_modified="",
        status="",
        description="",
        scores=(),
        configurations=configurations,
    )


# --- one rule ---


def test_bare_wildcard_matches_a_version() -> None:
    assert apply_rule(wild(), target()) is RuleResult.MATCH


def test_bare_wildcard_matches_a_version_with_no_update() -> None:
    assert apply_rule(wild(), target("9.6", "")) is RuleResult.MATCH


def test_bare_wildcard_for_another_product_is_not_applicable() -> None:
    assert apply_rule(wild(product="cups"), target()) is RuleResult.NOT_APPLICABLE


def test_bare_wildcard_that_is_not_vulnerable_is_not_applicable() -> None:
    assert apply_rule(wild(vulnerable=False), target()) is RuleResult.NOT_APPLICABLE


@pytest.mark.parametrize("update", ["p1", "-"])
def test_wildcard_with_a_specific_update_is_unreadable(update: str) -> None:
    # Never seen in real data, so it is not guessed to mean "every version".
    assert apply_rule(wild(update=update), target()) is RuleResult.VERSION_UNREADABLE


def test_wildcard_with_a_bound_is_still_a_range() -> None:
    result = apply_rule(wild(end_excluding="9.0"), target())
    assert result is RuleResult.NO_MATCH


# --- one CVE ---


def test_cve_with_only_a_bare_wildcard_matches() -> None:
    assert match_cve(cve(one_node(wild())), target()) is CveMatch.MATCH


def test_cve_with_a_wildcard_for_another_product_is_no_match() -> None:
    assert match_cve(cve(one_node(wild(product="cups"))), target()) is CveMatch.NO_MATCH


def test_wildcard_still_matches_when_an_and_platform_node_is_present() -> None:
    # Platform conditions are not checked, so the answer is still a match.
    platform = MatchRule(
        criteria="cpe:2.3:o:microsoft:windows:-:*:*:*:*:*:*:*",
        vulnerable=False,
        version_start_including="",
        version_start_excluding="",
        version_end_including="",
        version_end_excluding="",
    )
    software = MatchNode(operator="OR", negate=False, rules=(wild(),))
    system = MatchNode(operator="OR", negate=False, rules=(platform,))
    config = Configuration(operator="AND", nodes=(software, system))
    assert match_cve(cve(config), target()) is CveMatch.MATCH


# --- evidence ---


def test_any_version_basis_has_plain_wording() -> None:
    assert Basis.ANY_VERSION.value == "any version (no version limit)"


def test_wildcard_evidence_names_the_basis_and_keeps_the_caveats() -> None:
    result = build_evidence(cve(one_node(wild())), target())
    assert result.answer is CveMatch.MATCH
    assert [item.basis for item in result.matches] == [Basis.ANY_VERSION]
    assert len(result.caveats) == 2


def test_a_range_with_only_an_end_is_still_an_open_range() -> None:
    rule = MatchRule(
        criteria="cpe:2.3:a:openbsd:openssh:*:*:*:*:*:*:*:*",
        vulnerable=True,
        version_start_including="",
        version_start_excluding="",
        version_end_including="",
        version_end_excluding="10.0",
    )
    result = build_evidence(cve(one_node(rule)), target())
    assert [item.basis for item in result.matches] == [Basis.OPEN_RANGE]


def test_no_version_is_still_cannot_tell_with_a_wildcard() -> None:
    result = build_evidence(cve(one_node(wild())), None)
    assert result.answer is CveMatch.CANNOT_TELL
