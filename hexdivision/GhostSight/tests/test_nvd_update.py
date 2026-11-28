"""Tests for the cache update step. No network: a fake fetcher is passed in.

The rule under test: the cache changes only after a complete download.
A failed or partial download must leave the old cache exactly as it was,
and must not create one if there was none.
"""

import json

import pytest

from ghostsight.intelligence.nvd_cache import UnsafeNameError, read_cache, write_cache
from ghostsight.intelligence.nvd_download import DownloadError
from ghostsight.intelligence.nvd_update import update_cache
from ghostsight.paths import get_home_dir

NOW = "2026-01-01T00:00:00Z"
OLD_TIME = "2025-01-01T00:00:00Z"
OLD = ({"id": "CVE-OLD"},)


def cve(cve_id: str) -> dict:
    return {"id": cve_id, "descriptions": []}


def page(total: int, ids: list[str]) -> bytes:
    body = {
        "resultsPerPage": len(ids),
        "startIndex": 0,
        "totalResults": total,
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
            raise AssertionError("asked for more pages than expected")
        reply = self.replies[len(self.urls) - 1]
        if isinstance(reply, Exception):
            raise reply
        return reply


class Clock:
    """Returns a fixed time and counts how often it was read."""

    def __init__(self) -> None:
        self.calls = 0

    def __call__(self) -> str:
        self.calls += 1
        return NOW


# Each of these must fail, and each must leave the cache alone.
FAILING = {
    "partial": [page(5, ["CVE-9"]), page(5, [])],
    "network": [OSError("down")],
    "zero": [page(0, [])],
    "garbage": [b"not json"],
}


def run(
    replies: list,
    clock: Clock | None = None,
    vendor: str = "openbsd",
    product: str = "openssh",
) -> int:
    fetch = FakeNvd(replies)
    return update_cache(
        vendor, product, fetch, lambda seconds: None, clock or Clock()
    )


def test_success_writes_the_cache_and_returns_the_count() -> None:
    count = run([page(2, ["CVE-1", "CVE-2"])])
    entry = read_cache("openbsd", "openssh")
    assert count == 2
    assert entry is not None
    assert entry.fetched_at == NOW
    assert entry.cves == (cve("CVE-1"), cve("CVE-2"))


def test_a_second_success_replaces_the_first() -> None:
    write_cache("openbsd", "openssh", OLD, OLD_TIME)
    run([page(1, ["CVE-1"])])
    entry = read_cache("openbsd", "openssh")
    assert entry is not None
    assert entry.cves == (cve("CVE-1"),)
    assert entry.fetched_at == NOW


def test_names_are_stored_in_lowercase() -> None:
    run([page(1, ["CVE-1"])], vendor="OpenBSD", product="OpenSSH")
    assert read_cache("openbsd", "openssh") is not None


@pytest.mark.parametrize("name", list(FAILING))
def test_failure_creates_nothing_when_there_was_no_cache(name: str) -> None:
    with pytest.raises(DownloadError):
        run(FAILING[name])
    assert not (get_home_dir() / "cache").exists()


@pytest.mark.parametrize("name", list(FAILING))
def test_failure_keeps_the_old_cache_unchanged(name: str) -> None:
    write_cache("openbsd", "openssh", OLD, OLD_TIME)
    with pytest.raises(DownloadError):
        run(FAILING[name])
    entry = read_cache("openbsd", "openssh")
    assert entry is not None
    assert entry.cves == OLD
    assert entry.fetched_at == OLD_TIME


def test_the_clock_is_not_read_when_the_download_fails() -> None:
    clock = Clock()
    with pytest.raises(DownloadError):
        run(FAILING["partial"], clock)
    assert clock.calls == 0


@pytest.mark.parametrize(
    "vendor, product",
    [("../etc", "openssh"), ("openbsd", "a/b")],
)
def test_unsafe_names_fetch_nothing_and_write_nothing(
    vendor: str, product: str
) -> None:
    fetch = FakeNvd([page(1, ["CVE-1"])])
    with pytest.raises(UnsafeNameError):
        update_cache(vendor, product, fetch, lambda seconds: None, Clock())
    assert fetch.urls == []
    assert not (get_home_dir() / "cache").exists()
