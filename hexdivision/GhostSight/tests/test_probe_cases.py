"""Regression tests built from two real NVD records seen in the probes.

The rule lists are rebuilt by hand from the status file. The expected
answers are NVD's own: both CVEs were in NVD's answer for 9.6p1, the
first was also in the answer for 9.8p1, and neither was in the answers
for 4.4p1 or 7.4p1. The policy was chosen after seeing these records,
so this is an in-sample check. The real grouping of rules into nodes was
not printed, so each record here is one configuration with one OR node.
"""

import pytest

from ghostsight.intelligence.cpe_version import read_cpe_version
from ghostsight.intelligence.cve_match import CveMatch, match_cve
from ghostsight.intelligence.nvd_reader import (
    Configuration,
    CveRecord,
    MatchNode,
    MatchRule,
)


def rule(
    version: str,
    update: str = "*",
    *,
    start_incl: str = "",
    end_incl: str = "",
    end_excl: str = "",
) -> MatchRule:
    return MatchRule(
        criteria=f"cpe:2.3:a:openbsd:openssh:{version}:{update}:*:*:*:*:*:*",
        vulnerable=True,
        version_start_including=start_incl,
        version_start_excluding="",
        version_end_including=end_incl,
        version_end_excluding=end_excl,
    )


def record(cve_id: str, rules: tuple[MatchRule, ...]) -> CveRecord:
    node = MatchNode(operator="OR", negate=False, rules=rules)
    return CveRecord(
        cve_id=cve_id,
        published="",
        last_modified="",
        status="",
        description="",
        scores=(),
        configurations=(Configuration(operator="", nodes=(node,)),),
    )


def _exact_9_6_to_9_9() -> tuple[MatchRule, ...]:
    rules = [rule("9.5", "p1")]
    for version in ("9.6", "9.7", "9.8", "9.9"):
        rules.append(rule(version, "-"))
        rules.append(rule(version, "p1"))
    return tuple(rules)


RECORDS = {
    "CVE-2024-6387": record(
        "CVE-2024-6387",
        (
            rule("*", end_excl="4.4"),
            rule("*", start_incl="8.6", end_incl="9.8"),
            rule("4.4", "-"),
            rule("8.5", "p1"),
            rule("8.6", "-"),
        ),
    ),
    "CVE-2025-26466": record("CVE-2025-26466", _exact_9_6_to_9_9()),
}

CASES = [
    ("CVE-2024-6387", "cpe:/a:openbsd:openssh:4.4p1", CveMatch.NO_MATCH),
    ("CVE-2024-6387", "cpe:/a:openbsd:openssh:7.4p1", CveMatch.NO_MATCH),
    ("CVE-2024-6387", "cpe:/a:openbsd:openssh:9.6p1", CveMatch.MATCH),
    ("CVE-2024-6387", "cpe:/a:openbsd:openssh:9.8p1", CveMatch.MATCH),
    ("CVE-2025-26466", "cpe:/a:openbsd:openssh:4.4p1", CveMatch.NO_MATCH),
    ("CVE-2025-26466", "cpe:/a:openbsd:openssh:7.4p1", CveMatch.NO_MATCH),
    ("CVE-2025-26466", "cpe:/a:openbsd:openssh:9.6p1", CveMatch.MATCH),
    ("CVE-2025-26466", "cpe:/a:openbsd:openssh:9.8p1", CveMatch.MATCH),
]


@pytest.mark.parametrize(("cve_id", "target_cpe", "expected"), CASES)
def test_probe_case(cve_id: str, target_cpe: str, expected: CveMatch) -> None:
    target = read_cpe_version(target_cpe)
    assert target is not None
    assert match_cve(RECORDS[cve_id], target) is expected
