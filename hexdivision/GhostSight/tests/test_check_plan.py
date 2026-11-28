"""Tests for choosing which findings a validation run would check."""

import copy
import dataclasses

import pytest

from ghostsight.reporting.models import Finding, FindingStatus
from ghostsight.validation.check_plan import PlannedCheck, plan_checks


def make(status: FindingStatus, cve_ids: list[str]) -> Finding:
    return Finding(title="example", status=status, cve_ids=list(cve_ids))


def test_no_findings_means_no_plan() -> None:
    assert plan_checks([]) == ()


def test_a_potential_finding_gets_its_cve_query() -> None:
    findings = [make(FindingStatus.POTENTIAL, ["CVE-2017-0144"])]
    assert plan_checks(findings) == (PlannedCheck(0, ("cve:2017-0144",)),)


@pytest.mark.parametrize(
    "status",
    [FindingStatus.POTENTIAL, FindingStatus.LIKELY, FindingStatus.UNKNOWN],
)
def test_undecided_findings_are_planned(status: FindingStatus) -> None:
    plan = plan_checks([make(status, ["CVE-2017-0144"])])
    assert len(plan) == 1


@pytest.mark.parametrize(
    "status", [FindingStatus.VALIDATED, FindingStatus.FALSE_POSITIVE]
)
def test_decided_findings_are_skipped(status: FindingStatus) -> None:
    assert plan_checks([make(status, ["CVE-2017-0144"])]) == ()


def test_a_finding_without_cve_ids_is_skipped() -> None:
    assert plan_checks([make(FindingStatus.POTENTIAL, [])]) == ()


def test_a_finding_with_only_bad_ids_is_skipped() -> None:
    findings = [make(FindingStatus.POTENTIAL, ["not-a-cve", "CVE-1-2"])]
    assert plan_checks(findings) == ()


def test_the_index_is_the_position_in_the_original_list() -> None:
    findings = [
        make(FindingStatus.VALIDATED, ["CVE-2017-0144"]),
        make(FindingStatus.POTENTIAL, ["CVE-2018-1111"]),
    ]
    assert plan_checks(findings) == (PlannedCheck(1, ("cve:2018-1111",)),)


def test_many_ids_are_capped_at_five_queries() -> None:
    ids = [f"CVE-2020-{number}" for number in range(1001, 1008)]
    plan = plan_checks([make(FindingStatus.UNKNOWN, ids)])
    expected = tuple(f"cve:2020-{number}" for number in range(1001, 1006))
    assert plan[0].queries == expected


def test_the_plan_keeps_the_order_of_the_findings() -> None:
    findings = [
        make(FindingStatus.POTENTIAL, ["CVE-2019-0001"]),
        make(FindingStatus.LIKELY, ["CVE-2018-0002"]),
    ]
    assert [item.finding_index for item in plan_checks(findings)] == [0, 1]


def test_planning_does_not_change_the_findings() -> None:
    findings = [make(FindingStatus.POTENTIAL, ["CVE-2017-0144"])]
    before = copy.deepcopy(findings)
    plan_checks(findings)
    assert findings == before


def test_a_planned_check_cannot_be_changed() -> None:
    item = PlannedCheck(0, ("cve:2017-0144",))
    with pytest.raises(dataclasses.FrozenInstanceError):
        item.finding_index = 1  # type: ignore[misc]
