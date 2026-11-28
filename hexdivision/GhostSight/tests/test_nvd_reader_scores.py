"""Tests that the NVD reader refuses impossible CVSS base scores.

A real CVSS base score is a number from 0.0 to 10.0. NaN, infinity, booleans
and out-of-range numbers are dropped, and the CVE still loads.
"""

import json

import pytest

from ghostsight.intelligence.nvd_reader import read_cve

BAD_SCORES = [
    float("nan"),
    float("inf"),
    float("-inf"),
    True,
    False,
    10.1,
    999,
    -0.1,
]
BAD_SCORE_IDS = [
    "nan",
    "inf",
    "minus-inf",
    "true",
    "false",
    "just-over-10",
    "999",
    "negative",
]


def make_cve_with_scores(*base_scores: object) -> dict:
    """A minimal CVE with one V3.1 entry per given base score."""
    entries = []
    for number, base_score in enumerate(base_scores):
        entries.append(
            {
                "source": f"scorer{number}",
                "type": "Secondary",
                "cvssData": {
                    "version": "3.1",
                    "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
                    "baseScore": base_score,
                    "baseSeverity": "NONE",
                },
            }
        )
    return {"id": "CVE-2024-6387", "metrics": {"cvssMetricV31": entries}}


@pytest.mark.parametrize("bad_score", BAD_SCORES, ids=BAD_SCORE_IDS)
def test_impossible_score_is_dropped(bad_score: object) -> None:
    assert read_cve(make_cve_with_scores(bad_score)).scores == ()


def test_a_bad_score_does_not_remove_the_good_ones() -> None:
    raw = make_cve_with_scores(float("nan"), 7.5, 999)
    (score,) = read_cve(raw).scores
    assert score.source == "scorer1"
    assert score.base_score == 7.5


@pytest.mark.parametrize(
    "given, expected",
    [(0, 0.0), (0.0, 0.0), (10, 10.0), (10.0, 10.0), (4.3, 4.3)],
)
def test_scores_from_zero_to_ten_are_accepted(given: object, expected: float) -> None:
    (score,) = read_cve(make_cve_with_scores(given)).scores
    assert score.base_score == expected
    assert isinstance(score.base_score, float)


def test_nan_that_arrives_through_json_is_dropped() -> None:
    text = (
        '{"id": "CVE-2024-6387", "metrics": {"cvssMetricV31": '
        '[{"cvssData": {"version": "3.1", "baseScore": NaN}}]}}'
    )
    assert read_cve(json.loads(text)).scores == ()
