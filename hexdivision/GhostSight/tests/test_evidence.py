"""Tests for the evidence step (decision 38 e, decision 36 c).

For one CVE and one service version, say whether it matches, which rules
matched and on what basis, what was not checked, and which score to show.
"""

from dataclasses import FrozenInstanceError

import pytest

from ghostsight.intelligence.cpe_version import read_cpe_version
from ghostsight.intelligence.cve_match import match_cve
from ghostsight.intelligence.evidence import Basis, build_evidence
from ghostsight.intelligence.nvd_reader import (
    Configuration,
    CveRecord,
    CvssScore,
    MatchNode,
    MatchRule,
)
from ghostsight.intelligence.score_choice import choose_scores

TARGET = read_cpe_version("cpe:/a:openbsd:openssh:9.6p1")

EXACT_96 = "cpe:2.3:a:openbsd:openssh:9.6:p1:*:*:*:*:*:*"
EXACT_95 = "cpe:2.3:a:openbsd:openssh:9.5:p1:*:*:*:*:*:*"
EXACT_44 = "cpe:2.3:a:openbsd:openssh:4.4:-:*:*:*:*:*:*"
RANGE = "cpe:2.3:a:openbsd:openssh:*:*:*:*:*:*:*:*"
UNREADABLE = "cpe:2.3:a:openbsd:open\\ssh:9.6:p1:*:*:*:*:*:*"


def rule(
    criteria: str,
    start_including: str = "",
    end_including: str = "",
    end_excluding: str = "",
    vulnerable: bool = True,
) -> MatchRule:
    return MatchRule(
        criteria=criteria,
        vulnerable=vulnerable,
        version_start_including=start_including,
        version_start_excluding="",
        version_end_including=end_including,
        version_end_excluding=end_excluding,
    )


def record(
    *rules: MatchRule,
    scores: tuple[CvssScore, ...] = (),
    negate: bool = False,
    cve_id: str = "CVE-2024-0001",
) -> CveRecord:
    node = MatchNode(operator="OR", negate=negate, rules=tuple(rules))
    return CveRecord(
        cve_id=cve_id,
        published="",
        last_modified="",
        status="",
        description="",
        scores=scores,
        configurations=(Configuration(operator="", nodes=(node,)),),
    )


def test_exact_rule_is_reported_with_exact_basis():
    result = build_evidence(record(rule(EXACT_96)), TARGET)
    assert result.answer.value == "match"
    assert len(result.matches) == 1
    assert result.matches[0].criteria == EXACT_96
    assert result.matches[0].basis is Basis.EXACT


def test_range_with_both_bounds_is_a_bounded_range():
    rec = record(rule(RANGE, start_including="8.6", end_including="9.8"))
    result = build_evidence(rec, TARGET)
    assert result.matches[0].basis is Basis.BOUNDED_RANGE


def test_range_with_only_an_upper_bound_is_open_ended():
    result = build_evidence(record(rule(RANGE, end_excluding="9.8")), TARGET)
    assert result.matches[0].basis is Basis.OPEN_RANGE


def test_range_with_only_a_lower_bound_is_open_ended():
    result = build_evidence(record(rule(RANGE, start_including="9.0")), TARGET)
    assert result.matches[0].basis is Basis.OPEN_RANGE


def test_every_matching_rule_is_listed_in_rule_order():
    rec = record(rule(EXACT_96), rule(RANGE, end_excluding="9.8"))
    result = build_evidence(rec, TARGET)
    assert [m.criteria for m in result.matches] == [EXACT_96, RANGE]
    assert [m.basis for m in result.matches] == [Basis.EXACT, Basis.OPEN_RANGE]


def test_rules_that_do_not_match_are_not_listed():
    rec = record(rule(EXACT_95), rule(RANGE, end_excluding="9.8"))
    result = build_evidence(rec, TARGET)
    assert [m.criteria for m in result.matches] == [RANGE]


def test_no_match_has_no_rules_and_no_caveats():
    result = build_evidence(record(rule(EXACT_44)), TARGET)
    assert result.answer.value == "no match"
    assert result.matches == ()
    assert result.caveats == ()


def test_unreadable_rule_gives_cannot_tell_and_no_listed_rule():
    result = build_evidence(record(rule(UNREADABLE)), TARGET)
    assert result.answer.value == "cannot tell"
    assert result.matches == ()


def test_a_match_carries_the_platform_and_backport_caveats():
    result = build_evidence(record(rule(EXACT_96)), TARGET)
    text = " ".join(result.caveats).lower()
    assert "platform" in text
    assert "backport" in text


def test_cannot_tell_says_it_is_not_a_clean_result():
    result = build_evidence(record(rule(UNREADABLE)), TARGET)
    text = " ".join(result.caveats).lower()
    assert "not a clean result" in text
    assert "platform" in text
    assert "backport" in text


def test_missing_version_gives_cannot_tell_with_a_reason():
    result = build_evidence(record(rule(EXACT_96)), None)
    assert result.answer.value == "cannot tell"
    assert result.matches == ()
    text = " ".join(result.caveats).lower()
    assert "no version" in text
    assert "not a clean result" in text


def test_scores_come_from_choose_scores():
    score = CvssScore(
        source="nvd@nist.gov",
        score_type="Primary",
        cvss_version="3.1",
        base_score=7.5,
        severity="HIGH",
        vector="",
    )
    rec = record(rule(EXACT_96), scores=(score,))
    assert build_evidence(rec, TARGET).scores == choose_scores((score,))


def test_the_cve_id_is_kept():
    rec = record(rule(EXACT_96), cve_id="CVE-2025-26466")
    assert build_evidence(rec, TARGET).cve_id == "CVE-2025-26466"


def test_a_negated_node_never_counts_as_a_match():
    result = build_evidence(record(rule(EXACT_96), negate=True), TARGET)
    assert result.answer.value == "cannot tell"
    assert result.matches == ()


def test_a_rule_that_is_not_vulnerable_is_ignored():
    rec = record(rule(EXACT_96, vulnerable=False))
    result = build_evidence(rec, TARGET)
    assert result.answer.value == "no match"
    assert result.matches == ()


@pytest.mark.parametrize(
    "rec",
    [
        record(rule(EXACT_96)),
        record(rule(EXACT_44)),
        record(rule(UNREADABLE)),
        record(rule(EXACT_96), negate=True),
    ],
)
def test_the_answer_always_agrees_with_match_cve(rec):
    assert build_evidence(rec, TARGET).answer is match_cve(rec, TARGET)


def test_the_result_cannot_be_changed():
    result = build_evidence(record(rule(EXACT_96)), TARGET)
    with pytest.raises(FrozenInstanceError):
        result.answer = None
