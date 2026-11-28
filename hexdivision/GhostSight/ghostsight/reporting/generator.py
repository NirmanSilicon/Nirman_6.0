"""Creates GhostSight report directories and writes report files."""

import json
import logging
import os
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path

from ghostsight.paths import get_home_dir
from ghostsight.reporting.formatters import (
    format_ai_analysis,
    format_final_report,
    format_scan_results,
    format_services,
    format_validation,
    format_vulnerabilities,
)
from ghostsight.reporting.models import ScanResult

logger = logging.getLogger(__name__)

SCAN_DIR_PATTERN = re.compile(r"^scan_(\d+)$")


@dataclass
class ReportPaths:
    """The files produced for one scan."""

    directory: Path
    scan_data: Path
    scan_results: Path
    services: Path
    vulnerabilities: Path
    ai_analysis: Path
    validation: Path
    final_report: Path

    def all_files(self) -> list[Path]:
        """Return every generated file path."""
        return [
            self.scan_data,
            self.scan_results,
            self.services,
            self.vulnerabilities,
            self.ai_analysis,
            self.validation,
            self.final_report,
        ]


def get_scans_root() -> Path:
    """Return the folder that holds all scan directories."""
    return get_home_dir() / "output" / "scans"


def next_scan_number(scans_root: Path | None = None) -> int:
    """Return the next available scan number.

    Scan folders are never reused, so previous results are never
    overwritten.
    """
    root = scans_root if scans_root is not None else get_scans_root()
    if not root.exists():
        return 1
    numbers = []
    for child in root.iterdir():
        if not child.is_dir():
            continue
        match = SCAN_DIR_PATTERN.match(child.name)
        if match:
            numbers.append(int(match.group(1)))
    return max(numbers, default=0) + 1


def create_scan_directory(
    scans_root: Path | None = None, scan_number: int | None = None
) -> Path:
    """Create and return a new unique scan directory."""
    root = scans_root if scans_root is not None else get_scans_root()
    root.mkdir(parents=True, exist_ok=True)
    number = scan_number if scan_number is not None else next_scan_number(root)
    directory = root / f"scan_{number:03d}"
    directory.mkdir(parents=True, exist_ok=False)
    logger.info("Created scan directory %s", directory)
    return directory


def build_report_paths(directory: Path) -> ReportPaths:
    """Return the full set of file paths for a scan directory."""
    return ReportPaths(
        directory=directory,
        scan_data=directory / "scan_data.json",
        scan_results=directory / "scan_results.txt",
        services=directory / "services.txt",
        vulnerabilities=directory / "vulnerabilities.txt",
        ai_analysis=directory / "ai_analysis.txt",
        validation=directory / "validation.txt",
        final_report=directory / "final_report.txt",
    )


def write_scan_data(scan: ScanResult, paths: ReportPaths) -> Path:
    """Write the structured JSON data for a scan.

    The data is written to a temporary file in the same folder, then
    moved into place. An interrupted write never leaves a half-written
    scan_data.json behind.
    """
    payload = json.dumps(scan.to_dict(), indent=2, ensure_ascii=False) + "\n"
    handle, temp_name = tempfile.mkstemp(
        dir=paths.scan_data.parent, prefix=".tmp-", suffix=".json"
    )
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as temp_file:
            temp_file.write(payload)
        os.replace(temp_name, paths.scan_data)
    finally:
        Path(temp_name).unlink(missing_ok=True)
    logger.info("Wrote structured scan data to %s", paths.scan_data)
    return paths.scan_data


def generate_scan_reports(
    scan: ScanResult, directory: Path | None = None
) -> ReportPaths:
    """Write every report file for a scan and return their paths.

    If directory is None a new numbered scan directory is created.
    """
    if directory is None:
        directory = create_scan_directory()
    paths = build_report_paths(directory)
    directory.mkdir(parents=True, exist_ok=True)

    write_scan_data(scan, paths)
    paths.scan_results.write_text(
        format_scan_results(scan), encoding="utf-8"
    )
    paths.services.write_text(format_services(scan), encoding="utf-8")
    paths.vulnerabilities.write_text(
        format_vulnerabilities(scan), encoding="utf-8"
    )
    paths.ai_analysis.write_text(format_ai_analysis(scan), encoding="utf-8")
    paths.validation.write_text(format_validation(scan), encoding="utf-8")
    paths.final_report.write_text(
        format_final_report(scan), encoding="utf-8"
    )
    logger.info("Generated %d report files in %s", len(paths.all_files()), directory)
    return paths
