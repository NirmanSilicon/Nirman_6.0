"""On-disk cache of NVD records, one JSON file per vendor and product.

The cache never reads the clock and never touches the network. The caller
passes in `fetched_at`. A missing or damaged cache reads as None, and the
caller must treat None as "cannot tell", never as "no CVEs".
"""

import json
import os
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path

from ghostsight.paths import get_home_dir

# Refuse to read a cache file larger than this. A guess, not a measured value.
MAX_CACHE_BYTES = 256 * 1024 * 1024

# Accept only a known-good shape. Nothing is stripped or "cleaned".
_NAME_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}")


class UnsafeNameError(ValueError):
    """A vendor or product name is not safe to use as a file name."""


@dataclass(frozen=True)
class CacheEntry:
    """What was stored: the raw NVD `cve` objects and when they were fetched."""

    fetched_at: str
    cves: tuple[dict, ...]


def safe_name(name: str) -> str:
    # Check the original text first. str.lower() can turn some non-ASCII
    # characters (such as the Kelvin sign) into plain ASCII ones.
    if not isinstance(name, str) or not _NAME_PATTERN.fullmatch(name):
        raise UnsafeNameError(f"Unsafe name for the cache: {name!r}")
    return name.lower()


def _cache_file(vendor: str, product: str) -> Path:
    vendor_name = safe_name(vendor)
    product_name = safe_name(product)
    return get_home_dir() / "cache" / "nvd" / vendor_name / f"{product_name}.json"


def write_cache(
    vendor: str,
    product: str,
    cves: list[dict] | tuple[dict, ...],
    fetched_at: str,
) -> None:
    """Replace the cache for one product. Raises UnsafeNameError for bad names."""
    # Validate and serialise first, so a failure creates nothing on disk.
    path = _cache_file(vendor, product)
    text = json.dumps({"fetched_at": fetched_at, "cves": list(cves)})

    path.parent.mkdir(parents=True, exist_ok=True)
    # Write a temp file in the same folder, then swap it in. On one
    # filesystem os.replace is atomic, so a reader sees the old file or the
    # new one, never half of a file.
    fd, temp_name = tempfile.mkstemp(dir=path.parent, prefix=".tmp-", suffix=".json")
    temp_path = Path(temp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
        os.replace(temp_path, path)
    finally:
        # After a successful replace the temp file is gone, so this does nothing.
        temp_path.unlink(missing_ok=True)


def read_cache(vendor: str, product: str) -> CacheEntry | None:
    """Return the stored entry, or None if it is missing, too big or damaged."""
    try:
        path = _cache_file(vendor, product)
    except UnsafeNameError:
        return None

    try:
        if path.stat().st_size > MAX_CACHE_BYTES:
            return None
        raw_text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None

    try:
        data = json.loads(raw_text)
    except (ValueError, RecursionError):
        return None

    if not isinstance(data, dict):
        return None
    fetched_at = data.get("fetched_at")
    cves = data.get("cves")
    if not isinstance(fetched_at, str) or not isinstance(cves, list):
        return None
    if not all(isinstance(cve, dict) for cve in cves):
        return None

    return CacheEntry(fetched_at=fetched_at, cves=tuple(cves))
