"""Tests for the on-disk NVD cache.

The cache is keyed by (vendor, product). Names come from a scanned
host's CPE, which is untrusted, so they must never reach a path unless
they match a strict pattern. A missing or damaged file reads as "no
data", never as "no CVEs".
"""

from pathlib import Path

import pytest

from ghostsight.intelligence import nvd_cache
from ghostsight.intelligence.nvd_cache import (
    UnsafeNameError,
    read_cache,
    write_cache,
)

CVES = [{"id": "CVE-2024-0001"}, {"id": "CVE-2024-0002"}]
STAMP = "2026-11-25T22:00:00Z"

BAD_NAMES = [
    "../x",
    "a/b",
    "",
    ".hidden",
    "..",
    "a b",
    "a\x00b",
    "a\nb",
    "x" * 65,
    "\u00e9",
    "\u212a",  # Kelvin sign: lowercases to a plain "k", so it must be refused
]


@pytest.fixture
def home(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setenv("GHOSTSIGHT_HOME", str(tmp_path))
    return tmp_path


def _folder(home: Path) -> Path:
    return home.resolve() / "cache" / "nvd" / "openbsd"


def test_what_was_written_is_read_back(home):
    write_cache("openbsd", "openssh", CVES, STAMP)
    entry = read_cache("openbsd", "openssh")
    assert entry is not None
    assert entry.fetched_at == STAMP
    assert entry.cves == tuple(CVES)


def test_the_file_lives_under_the_home_cache_folder(home):
    write_cache("openbsd", "openssh", CVES, STAMP)
    assert (_folder(home) / "openssh.json").is_file()


def test_a_missing_file_reads_as_no_data(home):
    assert read_cache("openbsd", "openssh") is None


def test_names_that_differ_only_in_case_share_one_file(home):
    write_cache("OpenBSD", "OpenSSH", CVES, STAMP)
    assert (_folder(home) / "openssh.json").is_file()
    assert read_cache("openbsd", "openssh") is not None


@pytest.mark.parametrize("name", BAD_NAMES)
def test_an_unsafe_product_name_is_refused(home, name):
    with pytest.raises(UnsafeNameError):
        write_cache("openbsd", name, CVES, STAMP)


def test_an_unsafe_vendor_name_is_refused(home):
    with pytest.raises(UnsafeNameError):
        write_cache("../x", "openssh", CVES, STAMP)


def test_a_refused_name_writes_nothing(home):
    with pytest.raises(UnsafeNameError):
        write_cache("openbsd", "../../evil", CVES, STAMP)
    assert list(home.rglob("*")) == []


def test_reading_an_unsafe_name_gives_no_data(home):
    assert read_cache("../etc", "passwd") is None


@pytest.mark.parametrize(
    "content",
    [
        "",
        "not json",
        "[]",
        '{"fetched_at": 1, "cves": []}',
        '{"fetched_at": "x", "cves": "no"}',
        '{"fetched_at": "x"}',
        '{"fetched_at": "x", "cves": [1]}',
    ],
)
def test_a_damaged_file_reads_as_no_data(home, content):
    folder = _folder(home)
    folder.mkdir(parents=True)
    (folder / "openssh.json").write_text(content, encoding="utf-8")
    assert read_cache("openbsd", "openssh") is None


def test_a_file_over_the_size_cap_reads_as_no_data(home, monkeypatch):
    write_cache("openbsd", "openssh", CVES, STAMP)
    monkeypatch.setattr(nvd_cache, "MAX_CACHE_BYTES", 10)
    assert read_cache("openbsd", "openssh") is None


def test_writing_again_replaces_the_old_content(home):
    write_cache("openbsd", "openssh", CVES, STAMP)
    write_cache("openbsd", "openssh", [], "later")
    entry = read_cache("openbsd", "openssh")
    assert entry is not None
    assert entry.cves == ()
    assert entry.fetched_at == "later"


def test_a_successful_write_leaves_no_temporary_file(home):
    write_cache("openbsd", "openssh", CVES, STAMP)
    names = sorted(p.name for p in _folder(home).iterdir())
    assert names == ["openssh.json"]


def test_a_failed_write_keeps_the_old_file_and_leaves_no_temp_file(home, monkeypatch):
    write_cache("openbsd", "openssh", CVES, STAMP)

    def broken_replace(source, target):
        raise OSError("disk problem")

    monkeypatch.setattr(nvd_cache.os, "replace", broken_replace)
    with pytest.raises(OSError):
        write_cache("openbsd", "openssh", [], "new stamp")
    names = sorted(p.name for p in _folder(home).iterdir())
    assert read_cache("openbsd", "openssh").fetched_at == STAMP
    assert names == ["openssh.json"]
