"""Tests for choosing which CVSS score a finding shows (decision 36 b).

Policy: show the NVD Primary score, V3.1 before V2. With no Primary
score, show every Secondary score. Never average, maximise or minimise.
Say so when sources disagree (compared within one CVSS version only).
"""

from dataclasses import FrozenInstanceError

import pytest

from ghostsight.intelligence.nvd_reader import CvssScore
from ghostsight.intelligence.score_choice import choose_scores

NVD = "nvd@nist.gov"
MITRE = "cve@mitre.org"
REDHAT = "secalert@redhat.com"


def score(source: str, kind: str, version: str, base: float) -> CvssScore:
    return CvssScore(
        source=source,
        score_type=kind,
        cvss_version=version,
        base_score=base,
        severity="HIGH",
        vector="",
    )


PRIMARY_V31 = score(NVD, "Primary", "3.1", 7.5)
PRIMARY_V2 = score(NVD, "Primary", "2.0", 5.0)


def test_primary_v31_is_shown_alone():
    choice = choose_scores((PRIMARY_V31,))
    assert choice.shown == (PRIMARY_V31,)
    assert "disagree" not in choice.note.lower()


def test_primary_note_names_the_score_type_and_version():
    note = choose_scores((PRIMARY_V31,)).note
    assert "primary" in note.lower()
    assert "3.1" in note


@pytest.mark.parametrize(
    "order",
    [(PRIMARY_V31, PRIMARY_V2), (PRIMARY_V2, PRIMARY_V31)],
)
def test_primary_v31_beats_primary_v2_in_either_order(order):
    assert choose_scores(order).shown == (PRIMARY_V31,)


def test_primary_v2_is_shown_when_there_is_no_v31():
    assert choose_scores((PRIMARY_V2,)).shown == (PRIMARY_V2,)


def test_primary_v2_beats_a_secondary_v31():
    secondary = score(MITRE, "Secondary", "3.1", 9.8)
    assert choose_scores((secondary, PRIMARY_V2)).shown == (PRIMARY_V2,)


def test_without_primary_every_secondary_is_shown():
    first = score(MITRE, "Secondary", "3.1", 7.5)
    second = score(REDHAT, "Secondary", "3.1", 7.5)
    assert choose_scores((first, second)).shown == (first, second)


def test_without_primary_the_note_says_so():
    only = score(MITRE, "Secondary", "3.1", 7.5)
    assert "no primary" in choose_scores((only,)).note.lower()


def test_no_scores_shows_nothing():
    assert choose_scores(()).shown == ()


def test_no_scores_note_says_this_is_not_a_clean_result():
    note = choose_scores(()).note.lower()
    assert "no score" in note
    assert "does not mean" in note


def test_disagreement_is_stated_with_the_other_source_and_score():
    other = score(MITRE, "Secondary", "3.1", 2.2)
    choice = choose_scores((PRIMARY_V31, other))
    assert choice.shown == (PRIMARY_V31,)
    assert "disagree" in choice.note.lower()
    assert MITRE in choice.note
    assert "2.2" in choice.note


def test_agreeing_sources_are_not_reported_as_disagreeing():
    other = score(MITRE, "Secondary", "3.1", 7.5)
    assert "disagree" not in choose_scores((PRIMARY_V31, other)).note.lower()


def test_scores_from_different_cvss_versions_are_not_compared():
    other = score(MITRE, "Secondary", "2.0", 2.2)
    assert "disagree" not in choose_scores((PRIMARY_V31, other)).note.lower()


def test_secondary_only_disagreement_is_stated():
    first = score(MITRE, "Secondary", "3.1", 9.8)
    second = score(REDHAT, "Secondary", "3.1", 5.3)
    assert "disagree" in choose_scores((first, second)).note.lower()


def test_secondary_only_agreement_is_not_reported_as_disagreement():
    first = score(MITRE, "Secondary", "3.1", 7.5)
    second = score(REDHAT, "Secondary", "3.1", 7.5)
    assert "disagree" not in choose_scores((first, second)).note.lower()


def test_shown_scores_are_always_original_entries():
    scores = (
        score(MITRE, "Secondary", "3.1", 9.8),
        score(REDHAT, "Secondary", "3.1", 5.3),
        score("other@example.org", "Secondary", "3.1", 2.2),
    )
    choice = choose_scores(scores)
    assert all(shown in scores for shown in choice.shown)


def test_the_result_cannot_be_changed():
    choice = choose_scores((PRIMARY_V31,))
    with pytest.raises(FrozenInstanceError):
        choice.note = "changed"
