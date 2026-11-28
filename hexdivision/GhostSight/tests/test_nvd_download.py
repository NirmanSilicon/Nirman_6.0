"""Tests for the NVD downloader. No network: a fake fetcher is passed in.

The rule under test: a download returns every CVE that NVD says exists
for the product, or raises DownloadError and returns nothing. A partial
set must never reach the cache, because a missing CVE would read as
"no CVE".
"""

import json

import pytest

from ghostsight.intelligence.nvd_cache import UnsafeNameError
from ghostsight.intelligence.nvd_download import (
    NVD_URL,
    PAUSE_SECONDS,
    DownloadError,
    download_cves,
)
from ghostsight.paths import get_home_dir


def cve(cve_id: str) -> dict:
    return {"id": cve_id, "descriptions": []}


def page(total: object, ids: list[str]) -> bytes:
    body = {
        "resultsPerPage": len(ids),
        "startIndex": 0,
        "totalResults": total,
        "format": "NVD_CVE",
        "version": "2.0",
        "timestamp": "2026-01-01T00:00:00.000",
        "vulnerabilities": [{"cve": cve(cve_id)} for cve_id in ids],
    }
    return json.dumps(body).encode("utf-8")


class FakeNvd:
    """Hands out prepared replies in order and records every URL asked for."""

    def __init__(self, replies: list) -> None:
        self.replies = replies
        self.urls: list[str] = []

    def __call__(self, url: str) -> bytes:
        self.urls.append(url)
        if len(self.urls) > len(self.replies):
            raise AssertionError("downloader asked for more pages than expected")
        reply = self.replies[len(self.urls) - 1]
        if isinstance(reply, Exception):
            raise reply
        return reply


class EndlessNvd:
    """Always says there are 1000 records and hands out one new one."""

    def __init__(self) -> None:
        self.calls = 0

    def __call__(self, url: str) -> bytes:
        self.calls += 1
        return page(1000, [f"CVE-{self.calls}"])


def run(fetch, vendor: str = "openbsd", product: str = "openssh") -> tuple[dict, ...]:
    return download_cves(vendor, product, fetch, lambda seconds: None)


def ids_of(cves: tuple[dict, ...]) -> list[str]:
    return [item["id"] for item in cves]


def test_single_page_returns_the_inner_cve_objects() -> None:
    fake = FakeNvd([page(2, ["CVE-1", "CVE-2"])])
    result = run(fake)
    assert result == (cve("CVE-1"), cve("CVE-2"))
    assert len(fake.urls) == 1


def test_several_pages_are_joined_in_order() -> None:
    fake = FakeNvd(
        [
            page(5, ["CVE-1", "CVE-2"]),
            page(5, ["CVE-3", "CVE-4"]),
            page(5, ["CVE-5"]),
        ]
    )
    assert ids_of(run(fake)) == ["CVE-1", "CVE-2", "CVE-3", "CVE-4", "CVE-5"]
    assert len(fake.urls) == 3


def test_url_asks_for_one_product_by_name() -> None:
    fake = FakeNvd([page(1, ["CVE-1"])])
    run(fake)
    url = fake.urls[0]
    assert url.startswith(NVD_URL + "?")
    assert "virtualMatchString=cpe:2.3:a:openbsd:openssh" in url
    assert "startIndex=0" in url
    assert "resultsPerPage=" in url


def test_next_page_starts_after_the_records_already_received() -> None:
    fake = FakeNvd(
        [
            page(5, ["CVE-1", "CVE-2"]),
            page(5, ["CVE-3", "CVE-4"]),
            page(5, ["CVE-5"]),
        ]
    )
    run(fake)
    assert "startIndex=0" in fake.urls[0]
    assert "startIndex=2" in fake.urls[1]
    assert "startIndex=4" in fake.urls[2]


def test_names_are_lowercased_in_the_url() -> None:
    fake = FakeNvd([page(1, ["CVE-1"])])
    run(fake, "OpenBSD", "OpenSSH")
    assert "cpe:2.3:a:openbsd:openssh" in fake.urls[0]
    assert "OpenBSD" not in fake.urls[0]


def test_pauses_between_pages_but_not_before_the_first_or_after_the_last() -> None:
    sleeps: list[float] = []
    fake = FakeNvd([page(3, ["CVE-1"]), page(3, ["CVE-2"]), page(3, ["CVE-3"])])
    download_cves("openbsd", "openssh", fake, sleeps.append)
    assert sleeps == [PAUSE_SECONDS, PAUSE_SECONDS]


@pytest.mark.parametrize(
    "vendor, product",
    [
        ("../etc", "openssh"),
        ("openbsd", "open ssh"),
        ("", "openssh"),
        ("openbsd", "a/b"),
    ],
)
def test_unsafe_names_send_nothing(vendor: str, product: str) -> None:
    fake = FakeNvd([page(1, ["CVE-1"])])
    with pytest.raises(UnsafeNameError):
        run(fake, vendor, product)
    assert fake.urls == []


def test_empty_page_before_the_total_is_reached_fails() -> None:
    fake = FakeNvd([page(5, ["CVE-1", "CVE-2"]), page(5, [])])
    with pytest.raises(DownloadError):
        run(fake)


def test_overlapping_pages_fail_because_distinct_ids_fall_short() -> None:
    fake = FakeNvd([page(3, ["CVE-1", "CVE-2"]), page(3, ["CVE-2"])])
    with pytest.raises(DownloadError):
        run(fake)


def test_total_changing_between_pages_fails() -> None:
    fake = FakeNvd([page(4, ["CVE-1", "CVE-2"]), page(5, ["CVE-3", "CVE-4", "CVE-5"])])
    with pytest.raises(DownloadError):
        run(fake)


def test_total_of_zero_fails_instead_of_meaning_no_cves() -> None:
    with pytest.raises(DownloadError):
        run(FakeNvd([page(0, [])]))


def test_more_distinct_cves_than_the_total_fails() -> None:
    with pytest.raises(DownloadError):
        run(FakeNvd([page(2, ["CVE-1", "CVE-2", "CVE-3"])]))


@pytest.mark.parametrize("bad_total", ["3", -1, None, True, 2.0])
def test_a_total_that_is_not_a_plain_count_fails(bad_total: object) -> None:
    with pytest.raises(DownloadError):
        run(FakeNvd([page(bad_total, ["CVE-1"])]))


BAD_BODIES = [
    b"not json",
    b"\xff\xfe\x00",
    b"[]",
    b"[" * 100_000 + b"]" * 100_000,
    json.dumps({"totalResults": 1}).encode(),
    json.dumps({"totalResults": 1, "vulnerabilities": "x"}).encode(),
    json.dumps({"totalResults": 1, "vulnerabilities": [{"nocve": {}}]}).encode(),
    json.dumps({"totalResults": 1, "vulnerabilities": [{"cve": {"id": 5}}]}).encode(),
    json.dumps({"totalResults": 1, "vulnerabilities": [{"cve": {}}]}).encode(),
]


@pytest.mark.parametrize(
    "body",
    BAD_BODIES,
    ids=[f"bad-body-{number}" for number in range(len(BAD_BODIES))],
)
def test_an_unreadable_reply_fails(body: bytes) -> None:
    with pytest.raises(DownloadError):
        run(FakeNvd([body]))


def test_a_network_error_on_the_first_page_becomes_download_error() -> None:
    with pytest.raises(DownloadError):
        run(FakeNvd([OSError("network down")]))


def test_a_network_error_on_a_later_page_returns_nothing() -> None:
    fake = FakeNvd([page(3, ["CVE-1", "CVE-2"]), TimeoutError("too slow")])
    with pytest.raises(DownloadError):
        run(fake)


def test_page_cap_stops_a_server_that_never_finishes() -> None:
    fetch = EndlessNvd()
    with pytest.raises(DownloadError):
        download_cves("openbsd", "openssh", fetch, lambda seconds: None, max_pages=3)
    assert fetch.calls == 3


def test_download_itself_never_writes_to_the_cache() -> None:
    with pytest.raises(DownloadError):
        run(FakeNvd([page(5, ["CVE-1"]), page(5, [])]))
    run(FakeNvd([page(1, ["CVE-1"])]))
    assert not (get_home_dir() / "cache").exists()
