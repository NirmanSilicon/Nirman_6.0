"""Tests for finding a scan folder safely."""

from pathlib import Path

import pytest

from ghostsight.reporting.generator import get_scans_root
from ghostsight.reporting.scan_finder import ScanNotFoundError, find_scan_dir


def make_scan(root: Path, name: str, with_data: bool = True) -> Path:
    directory = root / name
    directory.mkdir(parents=True)
    if with_data:
        (directory / "scan_data.json").write_text("{}", encoding="utf-8")
    return directory


def test_newest_scan_is_chosen_by_number_not_by_text(tmp_path: Path) -> None:
    make_scan(tmp_path, "scan_9")
    make_scan(tmp_path, "scan_10")
    assert find_scan_dir(None, tmp_path) == tmp_path / "scan_10"


def test_newest_scan_skips_folders_without_scan_data(tmp_path: Path) -> None:
    make_scan(tmp_path, "scan_001")
    make_scan(tmp_path, "scan_002", with_data=False)
    assert find_scan_dir(None, tmp_path) == tmp_path / "scan_001"


def test_newest_scan_ignores_folders_with_other_names(tmp_path: Path) -> None:
    make_scan(tmp_path, "scan_001")
    for other in ("scan_abc", "scan_001_old", "notes", "SCAN_009"):
        make_scan(tmp_path, other)
    assert find_scan_dir(None, tmp_path) == tmp_path / "scan_001"


def test_newest_scan_ignores_a_file_named_like_a_scan(tmp_path: Path) -> None:
    make_scan(tmp_path, "scan_001")
    (tmp_path / "scan_005").write_text("x", encoding="utf-8")
    assert find_scan_dir(None, tmp_path) == tmp_path / "scan_001"


def test_no_scans_raises(tmp_path: Path) -> None:
    with pytest.raises(ScanNotFoundError):
        find_scan_dir(None, tmp_path)


def test_missing_scans_folder_raises(tmp_path: Path) -> None:
    with pytest.raises(ScanNotFoundError):
        find_scan_dir(None, tmp_path / "does-not-exist")


def test_named_scan_is_found(tmp_path: Path) -> None:
    make_scan(tmp_path, "scan_001")
    make_scan(tmp_path, "scan_002")
    assert find_scan_dir("scan_001", tmp_path) == tmp_path / "scan_001"


def test_named_scan_that_does_not_exist_raises(tmp_path: Path) -> None:
    make_scan(tmp_path, "scan_001")
    with pytest.raises(ScanNotFoundError):
        find_scan_dir("scan_002", tmp_path)


def test_named_scan_without_scan_data_raises(tmp_path: Path) -> None:
    make_scan(tmp_path, "scan_001", with_data=False)
    with pytest.raises(ScanNotFoundError):
        find_scan_dir("scan_001", tmp_path)


@pytest.mark.parametrize(
    "name",
    [
        "../etc",
        "scan_001/..",
        "scan_",
        "SCAN_001",
        "scan_001\n",
        "scan_\u0661\u0662",
        "",
        " scan_001",
        "/etc",
        "scan_1234567890",
    ],
)
def test_bad_names_are_refused(tmp_path: Path, name: str) -> None:
    make_scan(tmp_path, "scan_001")
    with pytest.raises(ScanNotFoundError):
        find_scan_dir(name, tmp_path)


def test_bad_name_is_not_echoed_in_the_error(tmp_path: Path) -> None:
    with pytest.raises(ScanNotFoundError) as info:
        find_scan_dir("../etc/passwd", tmp_path)
    assert "passwd" not in str(info.value)


def test_default_folder_is_the_scans_folder_of_the_home() -> None:
    root = get_scans_root()
    make_scan(root, "scan_003")
    assert find_scan_dir(None) == root / "scan_003"


def test_a_tie_is_broken_by_name(tmp_path: Path) -> None:
    make_scan(tmp_path, "scan_001")
    make_scan(tmp_path, "scan_1")
    assert find_scan_dir(None, tmp_path) == tmp_path / "scan_1"
