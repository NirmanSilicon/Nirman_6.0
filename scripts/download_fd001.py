"""Download and safely extract the NASA PCoE C-MAPSS FD001 files.

Run from the project root:
    python scripts/download_fd001.py
"""
from __future__ import annotations

import hashlib
import io
import json
import shutil
import sys
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "data" / "raw" / "FD001"
PROCESSED_DIR = ROOT / "data" / "processed" / "FD001"
DOWNLOAD_DIR = ROOT / "data" / "downloads"
TARGETS = {"train_FD001.txt", "test_FD001.txt", "RUL_FD001.txt"}
MAX_ARCHIVE_BYTES = 50 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 250 * 1024 * 1024
MAX_ARCHIVE_MEMBERS = 100

# The Zenodo record is the current version of the NASA PCoE dataset deposit.
# The NASA PCoE-linked S3 download is retained as a fallback source.
SOURCES = [
    {
        "name": "NASA PCoE dataset on Zenodo",
        "url": "https://zenodo.org/records/15346912/files/CMAPSSData.zip?download=1",
        "md5": "79a22f36e80606c69d0e9e4da5bb2b7a",
        "source_url": "https://zenodo.org/records/15346912",
    },
    {
        "name": "NASA PCoE repository download",
        "url": "https://phm-datasets.s3.amazonaws.com/NASA/6.+Turbofan+Engine+Degradation+Simulation+Data+Set.zip",
        "md5": None,
        "source_url": "https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/",
    },
]


def sha256_bytes(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()


def _inspect_zip(blob: bytes) -> zipfile.ZipFile:
    archive = zipfile.ZipFile(io.BytesIO(blob))
    infos = archive.infolist()
    if len(infos) > MAX_ARCHIVE_MEMBERS:
        archive.close()
        raise RuntimeError(f"Archive contains too many members ({len(infos)}).")
    total_uncompressed = sum(info.file_size for info in infos)
    if total_uncompressed > MAX_UNCOMPRESSED_BYTES:
        archive.close()
        raise RuntimeError("Archive exceeds the configured uncompressed-size limit.")
    bad_member = archive.testzip()
    if bad_member:
        archive.close()
        raise RuntimeError(f"ZIP integrity check failed at {bad_member}.")
    return archive


def extract_targets(blob: bytes, depth: int = 0) -> dict[str, bytes]:
    """Find only the three known data files in nested ZIPs; never extract paths."""
    if depth > 4:
        raise RuntimeError("Archive nesting is deeper than expected; inspect the ZIP manually.")
    found: dict[str, bytes] = {}
    with _inspect_zip(blob) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            basename = info.filename.replace("\\", "/").rsplit("/", 1)[-1]
            if basename in TARGETS:
                found[basename] = archive.read(info)
            elif basename.lower().endswith(".zip"):
                nested = archive.read(info)
                if len(nested) > MAX_ARCHIVE_BYTES:
                    raise RuntimeError(f"Nested archive {basename} exceeds the size limit.")
                found.update(extract_targets(nested, depth + 1))
    return found


def download_source(source: dict) -> tuple[bytes, str, str]:
    request = urllib.request.Request(
        source["url"],
        headers={"User-Agent": "AEROSENTRY-Research-Prototype/1.0 (NASA C-MAPSS FD001)"},
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        blob = response.read(MAX_ARCHIVE_BYTES + 1)
    if not blob:
        raise RuntimeError("The downloaded archive is empty.")
    if len(blob) > MAX_ARCHIVE_BYTES:
        raise RuntimeError("Downloaded archive exceeds the configured 50 MB limit.")

    expected_md5 = source.get("md5")
    actual_md5 = hashlib.md5(blob).hexdigest()
    if expected_md5 and actual_md5.lower() != expected_md5.lower():
        raise RuntimeError(f"MD5 mismatch: expected {expected_md5}, received {actual_md5}.")

    with _inspect_zip(blob):
        pass
    return blob, sha256_bytes(blob), actual_md5


def install_dataset(extracted: dict[str, bytes], source: dict, archive_hash: str, archive_md5: str) -> None:
    missing = sorted(TARGETS - set(extracted))
    if missing:
        raise RuntimeError(f"Archive did not contain all required FD001 files: {missing}")
    if set(extracted) - TARGETS:
        # Extra recursively-found data files are not copied into the FD001 folder.
        pass

    stage = OUTPUT_DIR.with_name(OUTPUT_DIR.name + ".download-staging")
    backup = OUTPUT_DIR.with_name(OUTPUT_DIR.name + ".download-previous")
    if stage.exists():
        shutil.rmtree(stage)
    stage.mkdir(parents=True)

    file_manifest = {}
    for name in sorted(TARGETS):
        payload = extracted[name]
        if not payload:
            raise RuntimeError(f"Extracted file {name} is empty.")
        (stage / name).write_bytes(payload)
        file_manifest[name] = {
            "size_bytes": len(payload),
            "sha256": sha256_bytes(payload),
        }

    manifest = {
        "dataset": "NASA C-MAPSS FD001",
        "source_name": source["name"],
        "source_url": source["source_url"],
        "download_url": source["url"],
        "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
        "archive_sha256": archive_hash,
        "archive_md5": archive_md5,
        "published_md5_verified": bool(source.get("md5")),
        "files": file_manifest,
        "note": "FD001 is simulated turbofan degradation data, not live aircraft telemetry.",
    }
    (stage / "download_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    if backup.exists():
        shutil.rmtree(backup)
    if OUTPUT_DIR.exists():
        OUTPUT_DIR.rename(backup)
    try:
        stage.rename(OUTPUT_DIR)
    except Exception:
        if backup.exists() and not OUTPUT_DIR.exists():
            backup.rename(OUTPUT_DIR)
        raise
    if backup.exists():
        shutil.rmtree(backup)

    # Invalidate any outputs that were made from an older input dataset.
    if PROCESSED_DIR.exists():
        shutil.rmtree(PROCESSED_DIR)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    archive_path = DOWNLOAD_DIR / "CMAPSSData.zip"
    # Archive bytes are intentionally not re-saved here; the manifest preserves hashes.
    print(f"Installed original files in: {OUTPUT_DIR}")
    for filename, details in file_manifest.items():
        print(f"  {filename}: {details['size_bytes']:,} bytes | SHA-256 {details['sha256']}")
    print(f"Archive SHA-256: {archive_hash}")
    print(f"Archive MD5: {archive_md5}")


def main() -> int:
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    for index, source in enumerate(SOURCES, start=1):
        print(f"[{index}/{len(SOURCES)}] Downloading from {source['name']}...")
        try:
            blob, archive_hash, archive_md5 = download_source(source)
            extracted = extract_targets(blob)
            install_dataset(extracted, source, archive_hash, archive_md5)
            print("\nFD001 download and extraction completed.")
            print("Next: python scripts/prepare_fd001.py --validate-only")
            return 0
        except Exception as exc:
            errors.append(f"{source['name']}: {exc}")
            print(f"Source failed: {exc}", file=sys.stderr)

    print("All automated download sources failed:", file=sys.stderr)
    for error in errors:
        print(f" - {error}", file=sys.stderr)
    print("Manual source: https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/", file=sys.stderr)
    print("Zenodo record: https://zenodo.org/records/15346912", file=sys.stderr)
    print("Place train_FD001.txt, test_FD001.txt and RUL_FD001.txt in data/raw/FD001/.", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
