"""Tests for `ghostsight nvd-fetch`. No network: the fetcher is replaced.

The command must warn before anything is sent, ask first unless --yes is
given, refuse unsafe names before asking, and leave the cache exactly as
it was when the download fails.
"""

import json
import re

import pytest
from typer.testing import CliRunner

from ghostsight.intelligence.nvd_cache import read_cache, write_cache
from ghostsight.main import app
from ghostsight.paths import get_home_dir

runner = CliRunner()

TIME_FORMAT = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z")
OLD = ({"id": "CVE-OLD"},)
OLD_TIME = "2025-01-01T00:00:00Z"
BASE = ["nvd-fetch", "--vendor", "openbsd", "--product", "openssh"]


def page(total: int, ids: list[str]) -> bytes:
    body = {
        "resultsPerPage": len(ids),
        "startIndex": 0,
        "totalResults": total,
        "vulnerabilities": [{"cve": {"id": cve_id}} for cve_id in ids],
    }
    return json.dumps(body).encode("utf-8")


def partial_replies() -> list[bytes]:
    return [page(5, ["CVE-1"]), page(5, [])]


def install_fake_nvd(monkeypatch: pytest.MonkeyPatch, replies: list) -> list[str]:
    """Replace the real fetcher and the pause. Return the list of URLs asked for."""
    urls: list[str] = []

    def fake_fetch(url: str) -> bytes:
        urls.append(url)
        if len(urls) > len(replies):
            raise AssertionError("asked for more pages than expected")
        return replies[len(urls) - 1]

    monkeypatch.setattr("ghostsight.main.fetch_nvd", fake_fetch)
    monkeypatch.setattr("ghostsight.main.sleep", lambda seconds: None)
    return urls


def test_yes_flag_stores_the_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    urls = install_fake_nvd(monkeypatch, [page(2, ["CVE-1", "CVE-2"])])
    result = runner.invoke(app, BASE + ["--yes"])
    assert result.exit_code == 0
    assert len(urls) == 1
    entry = read_cache("openbsd", "openssh")
    assert entry is not None
    assert [cve["id"] for cve in entry.cves] == ["CVE-1", "CVE-2"]
    assert TIME_FORMAT.fullmatch(entry.fetched_at)
    assert "Stored 2" in result.output


def test_answering_y_stores_the_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    urls = install_fake_nvd(monkeypatch, [page(1, ["CVE-1"])])
    result = runner.invoke(app, BASE, input="y\n")
    assert result.exit_code == 0
    assert len(urls) == 1
    assert read_cache("openbsd", "openssh") is not None


def test_the_warning_names_what_nvd_will_see(monkeypatch: pytest.MonkeyPatch) -> None:
    urls = install_fake_nvd(monkeypatch, [page(1, ["CVE-1"])])
    result = runner.invoke(app, BASE, input="n\n")
    assert "your IP address" in result.output
    assert "product name" in result.output
    assert urls == []


def test_answering_n_sends_and_writes_nothing(monkeypatch: pytest.MonkeyPatch) -> None:
    urls = install_fake_nvd(monkeypatch, [page(1, ["CVE-1"])])
    result = runner.invoke(app, BASE, input="n\n")
    assert result.exit_code == 1
    assert urls == []
    assert not (get_home_dir() / "cache").exists()


def test_no_answer_counts_as_no(monkeypatch: pytest.MonkeyPatch) -> None:
    urls = install_fake_nvd(monkeypatch, [page(1, ["CVE-1"])])
    result = runner.invoke(app, BASE)
    assert result.exit_code == 1
    assert urls == []
    assert not (get_home_dir() / "cache").exists()


@pytest.mark.parametrize(
    "vendor, product",
    [("../etc", "openssh"), ("openbsd", "a/b")],
)
def test_unsafe_names_are_refused_before_asking(
    monkeypatch: pytest.MonkeyPatch, vendor: str, product: str
) -> None:
    urls = install_fake_nvd(monkeypatch, [page(1, ["CVE-1"])])
    result = runner.invoke(
        app, ["nvd-fetch", "--vendor", vendor, "--product", product]
    )
    # No --yes and no input: exit code 2 (not 1) shows no question was asked.
    assert result.exit_code == 2
    assert "Not a safe" in result.output
    assert urls == []
    assert not (get_home_dir() / "cache").exists()


def test_incomplete_download_exits_4_and_creates_no_cache(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    urls = install_fake_nvd(monkeypatch, partial_replies())
    result = runner.invoke(app, BASE + ["--yes"])
    assert result.exit_code == 4
    assert len(urls) == 2
    assert "Cache not updated" in result.output
    assert "The cache was not changed." in result.output
    assert not (get_home_dir() / "cache").exists()


def test_incomplete_download_keeps_the_old_cache(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    write_cache("openbsd", "openssh", OLD, OLD_TIME)
    install_fake_nvd(monkeypatch, partial_replies())
    result = runner.invoke(app, BASE + ["--yes"])
    assert result.exit_code == 4
    entry = read_cache("openbsd", "openssh")
    assert entry is not None
    assert entry.cves == OLD
    assert entry.fetched_at == OLD_TIME


def test_cache_write_error_exits_4(monkeypatch: pytest.MonkeyPatch) -> None:
    def broken(*args: object, **kwargs: object) -> int:
        raise OSError("disk full")

    monkeypatch.setattr("ghostsight.main.update_cache", broken)
    result = runner.invoke(app, BASE + ["--yes"])
    assert result.exit_code == 4
    assert "Cache not updated" in result.output


def test_names_are_lowercased(monkeypatch: pytest.MonkeyPatch) -> None:
    install_fake_nvd(monkeypatch, [page(1, ["CVE-1"])])
    result = runner.invoke(
        app, ["nvd-fetch", "--vendor", "OpenBSD", "--product", "OpenSSH", "--yes"]
    )
    assert result.exit_code == 0
    assert read_cache("openbsd", "openssh") is not None


def test_help_lists_the_command() -> None:
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "nvd-fetch" in result.output


def test_vendor_and_product_are_required(monkeypatch: pytest.MonkeyPatch) -> None:
    urls = install_fake_nvd(monkeypatch, [page(1, ["CVE-1"])])
    result = runner.invoke(app, ["nvd-fetch", "--vendor", "openbsd"])
    assert result.exit_code == 2
    assert "--product" in result.output
    assert urls == []
