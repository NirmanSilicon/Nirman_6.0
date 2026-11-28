"""Tests for the NVD fetcher. No network: a fake opener is passed in.

The fetcher may talk to one host over HTTPS only, must not follow
redirects, must stop reading at a size limit, and must turn every
failure into FetchError so the downloader can refuse a partial set.
"""

import http.client
import json
import urllib.error
import urllib.request

import pytest

from ghostsight.intelligence.nvd_download import NVD_URL, DownloadError, download_cves
from ghostsight.intelligence.nvd_http import (
    FETCH_TIMEOUT_SECONDS,
    FetchError,
    NoRedirect,
    fetch_nvd,
)

GOOD_URL = NVD_URL + "?virtualMatchString=cpe:2.3:a:openbsd:openssh"


class FakeResponse:
    """Stands in for the reply object that urllib hands back."""

    def __init__(
        self,
        data: bytes = b"{}",
        status: int = 200,
        read_error: Exception | None = None,
    ) -> None:
        self.data = data
        self.status = status
        self.read_error = read_error

    def read(self, amount: int = -1) -> bytes:
        if self.read_error is not None:
            raise self.read_error
        if amount < 0:
            return self.data
        return self.data[:amount]

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *exc_info: object) -> bool:
        return False


class FakeOpen:
    """Records every request and either answers or raises."""

    def __init__(
        self,
        response: FakeResponse | None = None,
        error: Exception | None = None,
    ) -> None:
        self.response = response
        self.error = error
        self.calls: list[tuple[urllib.request.Request, float]] = []

    def __call__(self, request: urllib.request.Request, timeout: float):
        self.calls.append((request, timeout))
        if self.error is not None:
            raise self.error
        return self.response


def fetcher(open_url: FakeOpen):
    def fetch(url: str) -> bytes:
        return fetch_nvd(url, open_url=open_url)

    return fetch


def test_returns_the_reply_body() -> None:
    fake = FakeOpen(FakeResponse(b'{"a": 1}'))
    assert fetch_nvd(GOOD_URL, open_url=fake) == b'{"a": 1}'


def test_asks_with_get_the_given_url_and_a_timeout() -> None:
    fake = FakeOpen(FakeResponse())
    fetch_nvd(GOOD_URL, open_url=fake)
    request, timeout = fake.calls[0]
    assert request.full_url == GOOD_URL
    assert request.get_method() == "GET"
    assert request.data is None
    assert timeout == FETCH_TIMEOUT_SECONDS


@pytest.mark.parametrize(
    "url",
    [
        "http://services.nvd.nist.gov/rest/json/cves/2.0",
        "https://example.com/x",
        "https://services.nvd.nist.gov.evil.example/x",
        "https://user@services.nvd.nist.gov/x",
        "https://services.nvd.nist.gov:8443/x",
        "file:///etc/passwd",
        "ftp://services.nvd.nist.gov/x",
        "",
        "https://[bad",
    ],
)
def test_unsafe_urls_are_refused_before_any_request(url: str) -> None:
    fake = FakeOpen(FakeResponse())
    with pytest.raises(FetchError):
        fetch_nvd(url, open_url=fake)
    assert fake.calls == []


@pytest.mark.parametrize("status", [204, 301, 500])
def test_a_status_other_than_200_fails(status: int) -> None:
    fake = FakeOpen(FakeResponse(b"{}", status=status))
    with pytest.raises(FetchError):
        fetch_nvd(GOOD_URL, open_url=fake)


def test_a_reply_over_the_limit_fails() -> None:
    fake = FakeOpen(FakeResponse(b"x" * 11))
    with pytest.raises(FetchError):
        fetch_nvd(GOOD_URL, open_url=fake, max_bytes=10)


def test_a_reply_exactly_at_the_limit_is_accepted() -> None:
    fake = FakeOpen(FakeResponse(b"x" * 10))
    assert fetch_nvd(GOOD_URL, open_url=fake, max_bytes=10) == b"x" * 10


@pytest.mark.parametrize(
    "error",
    [
        urllib.error.URLError("down"),
        TimeoutError("slow"),
        http.client.BadStatusLine("junk"),
        ValueError("bad url"),
        ConnectionResetError("reset"),
    ],
)
def test_network_problems_become_fetch_error(error: Exception) -> None:
    with pytest.raises(FetchError):
        fetch_nvd(GOOD_URL, open_url=FakeOpen(error=error))


def test_a_read_that_breaks_becomes_fetch_error() -> None:
    broken = FakeResponse(read_error=http.client.IncompleteRead(b"ab"))
    with pytest.raises(FetchError):
        fetch_nvd(GOOD_URL, open_url=FakeOpen(broken))


def test_fetch_error_is_an_os_error() -> None:
    # The downloader catches OSError, so this link must hold.
    assert issubclass(FetchError, OSError)


def test_a_redirect_is_refused() -> None:
    request = urllib.request.Request(GOOD_URL)
    with pytest.raises(urllib.error.HTTPError):
        NoRedirect().redirect_request(
            request, None, 301, "Moved", {}, "http://evil.example/"
        )


def test_urls_built_by_the_downloader_pass_the_host_check() -> None:
    body = json.dumps(
        {"totalResults": 1, "vulnerabilities": [{"cve": {"id": "CVE-1"}}]}
    ).encode()
    fake = FakeOpen(FakeResponse(body))
    result = download_cves("openbsd", "openssh", fetcher(fake), lambda seconds: None)
    assert result == ({"id": "CVE-1"},)
    assert len(fake.calls) == 1


def test_a_fetch_error_reaches_the_caller_as_download_error() -> None:
    fake = FakeOpen(error=urllib.error.URLError("down"))
    with pytest.raises(DownloadError):
        download_cves("openbsd", "openssh", fetcher(fake), lambda seconds: None)
