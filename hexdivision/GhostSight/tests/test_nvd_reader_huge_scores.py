"""Tests that an integer too large for a float cannot crash the NVD reader.

JSON allows integers of any size. Converting such a number to a float can
raise OverflowError, so the reader must drop it like any other bad score.
"""

import pytest

from ghostsight.intelligence.nvd_reader import read_cve


@pytest.mark.parametrize(
    "huge",
    [10**400, -(10**400)],
    ids=["huge-positive", "huge-negative"],
)
def test_integer_too_large_for_a_float_is_dropped(huge: int) -> None:
    raw = {
        "id": "CVE-2024-6387",
        "metrics": {
            "cvssMetricV31": [
                {"cvssData": {"version": "3.1", "baseScore": huge}},
            ]
        },
    }
    assert read_cve(raw).scores == ()
