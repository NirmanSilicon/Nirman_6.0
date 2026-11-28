"""Tests for choosing candidate Metasploit modules for a finding."""

import pytest

from ghostsight.integrations.metasploit_queries import ModuleMatch
from ghostsight.validation.module_choice import (
    MAX_CANDIDATES,
    MAX_CVE_QUERIES,
    choose_candidates,
    cve_queries,
)


def match(
    fullname: str, module_type: str = "auxiliary", rank: str = "normal"
) -> ModuleMatch:
    return ModuleMatch(
        module_type=module_type,
        name=fullname.split("/")[-1],
        fullname=fullname,
        rank=rank,
        disclosure_date=None,
    )


def names(found: tuple[ModuleMatch, ...]) -> list[str]:
    return [item.fullname for item in found]


def test_a_valid_id_becomes_a_search_text() -> None:
    assert cve_queries(["CVE-2017-0144"]) == ("cve:2017-0144",)


def test_a_long_number_is_accepted() -> None:
    assert cve_queries(["CVE-2021-1234567"]) == ("cve:2021-1234567",)


@pytest.mark.parametrize(
    "bad",
    [
        "",
        "cve-2017-0144",
        "CVE-17-0144",
        "CVE-2017-012",
        "CVE-2017-0144\n",
        "CVE-2017-0144 ",
        "CVE-2017-0144; id",
        "CVE-\uff12\uff10\uff11\uff17-0144",
        "CVE-2017-12345678",
    ],
)
def test_bad_ids_are_dropped(bad: str) -> None:
    assert cve_queries([bad]) == ()


def test_duplicates_are_removed_and_order_is_kept() -> None:
    ids = ["CVE-2017-0145", "CVE-2017-0144", "CVE-2017-0145"]
    assert cve_queries(ids) == ("cve:2017-0145", "cve:2017-0144")


def test_the_query_list_is_capped() -> None:
    ids = [f"CVE-2020-{n}" for n in range(1000, 1000 + MAX_CVE_QUERIES + 3)]
    result = cve_queries(ids)
    assert len(result) == MAX_CVE_QUERIES
    assert result[0] == "cve:2020-1000"


def test_a_bad_id_does_not_use_up_a_slot() -> None:
    ids = ["bad"] + [f"CVE-2020-{n}" for n in range(1000, 1000 + MAX_CVE_QUERIES)]
    assert len(cve_queries(ids)) == MAX_CVE_QUERIES


def test_no_ids_gives_no_queries() -> None:
    assert cve_queries([]) == ()


def test_only_auxiliary_modules_are_kept() -> None:
    found = [
        match("exploit/windows/smb/x", "exploit"),
        match("post/windows/p", "post"),
        match("payload/windows/q", "payload"),
        match("auxiliary/scanner/smb/y"),
    ]
    assert names(choose_candidates(found)) == ["auxiliary/scanner/smb/y"]


def test_exploits_alone_give_no_candidates() -> None:
    found = [match("exploit/a", "exploit"), match("exploit/b", "exploit")]
    assert choose_candidates(found) == ()


def test_best_rank_comes_first() -> None:
    found = [
        match("auxiliary/c", rank="low"),
        match("auxiliary/a", rank="excellent"),
        match("auxiliary/b", rank="good"),
    ]
    assert names(choose_candidates(found)) == [
        "auxiliary/a",
        "auxiliary/b",
        "auxiliary/c",
    ]


def test_an_unknown_rank_goes_last() -> None:
    found = [match("auxiliary/x", rank="strange"), match("auxiliary/y", rank="manual")]
    assert names(choose_candidates(found)) == ["auxiliary/y", "auxiliary/x"]


def test_the_same_rank_is_ordered_by_name() -> None:
    found = [match("auxiliary/b"), match("auxiliary/a")]
    assert names(choose_candidates(found)) == ["auxiliary/a", "auxiliary/b"]


def test_duplicate_modules_are_removed() -> None:
    found = [match("auxiliary/a"), match("auxiliary/a")]
    assert names(choose_candidates(found)) == ["auxiliary/a"]


def test_the_candidate_list_is_capped() -> None:
    found = [match(f"auxiliary/m{n}") for n in range(MAX_CANDIDATES + 2)]
    assert len(choose_candidates(found)) == MAX_CANDIDATES


def test_no_matches_gives_no_candidates() -> None:
    assert choose_candidates([]) == ()
