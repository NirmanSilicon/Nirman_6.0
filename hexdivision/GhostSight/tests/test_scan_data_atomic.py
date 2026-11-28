"""Tests for the atomic write of scan_data.json."""

import json
import os
from pathlib import Path

import pytest

from ghostsight.reporting import generator
from ghostsight.reporting.generator import build_report_paths, write_scan_data
from ghostsight.reporting.models import ScanResult


def make_scan(**fields) -> ScanResult:
    values = {"target": "127.0.0.1", "scan_id": "atomic-001"}
    values.update(fields)
    return ScanResult(**values)


def folder_listing(directory: Path) -> list[str]:
    return sorted(item.name for item in directory.iterdir())


def test_written_file_holds_the_scan_as_json(tmp_path):
    scan = make_scan()
    paths = build_report_paths(tmp_path)

    write_scan_data(scan, paths)

    data = json.loads(paths.scan_data.read_text(encoding="utf-8"))
    assert data == json.loads(json.dumps(scan.to_dict()))


def test_non_ascii_text_is_kept_and_file_ends_with_newline(tmp_path):
    paths = build_report_paths(tmp_path)

    write_scan_data(make_scan(notes=["caf\u00e9"]), paths)

    text = paths.scan_data.read_text(encoding="utf-8")
    assert "caf\u00e9" in text
    assert text.endswith("\n")


def test_overwrites_an_existing_file(tmp_path):
    paths = build_report_paths(tmp_path)
    paths.scan_data.write_text("old\n", encoding="utf-8")

    write_scan_data(make_scan(), paths)

    data = json.loads(paths.scan_data.read_text(encoding="utf-8"))
    assert data["scan_id"] == "atomic-001"


def test_no_temp_file_is_left_after_success(tmp_path):
    paths = build_report_paths(tmp_path)

    write_scan_data(make_scan(), paths)

    assert folder_listing(tmp_path) == ["scan_data.json"]


def test_returns_the_scan_data_path(tmp_path):
    paths = build_report_paths(tmp_path)

    assert write_scan_data(make_scan(), paths) == paths.scan_data


def test_temp_file_is_made_in_the_same_folder(tmp_path, monkeypatch):
    seen = []
    real_replace = os.replace

    def spy(source, target):
        seen.append((Path(source), Path(target)))
        real_replace(source, target)

    monkeypatch.setattr(generator.os, "replace", spy)
    paths = build_report_paths(tmp_path)

    write_scan_data(make_scan(), paths)

    assert len(seen) == 1
    source, target = seen[0]
    assert source.parent == tmp_path
    assert source != target
    assert target == paths.scan_data


def test_failed_replace_keeps_old_file_and_removes_temp_file(
    tmp_path, monkeypatch
):
    paths = build_report_paths(tmp_path)
    paths.scan_data.write_text("old\n", encoding="utf-8")

    def broken(source, target):
        raise OSError("disk trouble")

    monkeypatch.setattr(generator.os, "replace", broken)

    with pytest.raises(OSError):
        write_scan_data(make_scan(), paths)

    assert paths.scan_data.read_text(encoding="utf-8") == "old\n"
    assert folder_listing(tmp_path) == ["scan_data.json"]


def test_unserialisable_data_leaves_the_old_file(tmp_path):
    paths = build_report_paths(tmp_path)
    paths.scan_data.write_text("old\n", encoding="utf-8")
    scan = make_scan()
    scan.to_dict = lambda: {"bad": object()}

    with pytest.raises(TypeError):
        write_scan_data(scan, paths)

    assert paths.scan_data.read_text(encoding="utf-8") == "old\n"
    assert folder_listing(tmp_path) == ["scan_data.json"]
