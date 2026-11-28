"""Find a scan folder safely.

A scan name typed by a user is never joined to a path until it has been
checked against a strict pattern, so "../etc" cannot reach outside the
scans folder.
"""

import re
from pathlib import Path

from ghostsight.reporting.generator import get_scans_root

SCAN_DATA_FILE = "scan_data.json"

# [0-9] and fullmatch, not \d and match: \d accepts non-ASCII digits and
# "$" accepts a trailing newline. At most 9 digits keeps the number small.
_SCAN_NAME = re.compile(r"scan_([0-9]{1,9})")


class ScanNotFoundError(Exception):
    """No usable scan folder. The message never echoes the name given."""


def _scan_number(name: str) -> int | None:
    match = _SCAN_NAME.fullmatch(name)
    return int(match.group(1)) if match else None


def _has_scan_data(directory: Path) -> bool:
    return directory.is_dir() and (directory / SCAN_DATA_FILE).is_file()


def _newest(root: Path) -> Path:
    if not root.is_dir():
        raise ScanNotFoundError("No scans have been run yet.")
    candidates: list[tuple[int, str]] = []
    for child in root.iterdir():
        number = _scan_number(child.name)
        if number is not None and _has_scan_data(child):
            candidates.append((number, child.name))
    if not candidates:
        raise ScanNotFoundError("No scans have been run yet.")
    return root / max(candidates)[1]


def find_scan_dir(name: str | None, scans_root: Path | None = None) -> Path:
    """Return the folder of the named scan, or of the newest one if None."""
    root = scans_root if scans_root is not None else get_scans_root()
    if name is None:
        return _newest(root)
    if _scan_number(name) is None:
        raise ScanNotFoundError("Not a valid scan name. Use a name like scan_001.")
    directory = root / name
    if not _has_scan_data(directory):
        raise ScanNotFoundError("No scan with that name was found.")
    return directory
