"""Choose which findings a validation run would check.

Pure module: no network, no files. Findings that are already validated or
marked false positive are skipped. A finding with no usable CVE id is skipped,
because there is nothing to search Metasploit for.
"""

from collections.abc import Sequence
from dataclasses import dataclass

from ghostsight.reporting.models import Finding, FindingStatus
from ghostsight.validation.module_choice import cve_queries

CHECKABLE_STATUSES = frozenset(
    {FindingStatus.POTENTIAL, FindingStatus.LIKELY, FindingStatus.UNKNOWN}
)


@dataclass(frozen=True)
class PlannedCheck:
    """One finding to check: its position in the list and its search queries."""

    finding_index: int
    queries: tuple[str, ...]


def plan_checks(findings: Sequence[Finding]) -> tuple[PlannedCheck, ...]:
    """Return the findings worth checking, in their original order."""
    plan: list[PlannedCheck] = []
    for index, finding in enumerate(findings):
        if finding.status not in CHECKABLE_STATUSES:
            continue
        queries = cve_queries(finding.cve_ids)
        if queries:
            plan.append(PlannedCheck(index, queries))
    return tuple(plan)
