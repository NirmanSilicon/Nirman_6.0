#!/usr/bin/env python3
"""Fetch and verify pinned tessdata_fast models for Lane B OCR container builds."""

from __future__ import annotations

import argparse
import hashlib
import os
import sys
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping

TESSDATA_FAST_COMMIT = "87416418657359cb625c412a48b6e1d6d41c29bd"
RAW_BASE_URL = (
    f"https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/{TESSDATA_FAST_COMMIT}"
)


@dataclass(frozen=True)
class ModelSpec:
    """Pinned verification metadata for a single traineddata model."""

    filename: str
    size_bytes: int
    git_blob_sha1: str
    sha256: str


EXPECTED_MODELS: dict[str, ModelSpec] = {
    "eng": ModelSpec(
        filename="eng.traineddata",
        size_bytes=4113088,
        git_blob_sha1="bbef4675053b5b468cdb477053e28b1c698ba08e",
        sha256="7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2",
    ),
    "hin": ModelSpec(
        filename="hin.traineddata",
        size_bytes=1122751,
        git_blob_sha1="a8f0aaec09378115b12a2c6287c57695d082aea2",
        sha256="4c73ffc59d497c186b19d1e90f5d721d678ea6b2e277b719bee4e2af12271825",
    ),
    "ori": ModelSpec(
        filename="ori.traineddata",
        size_bytes=1480066,
        git_blob_sha1="ae0f9ed13d5c9ad4a4de57c7266c434b83a9f583",
        sha256="36f3135e61d501a3acfad41f5fe60b8e791274fff4c5375c969fdcca980cdbac",
    ),
}


def compute_hashes(data: bytes) -> tuple[int, str, str]:
    """Return (size_bytes, git_blob_sha1, sha256) for the given bytes."""
    size_bytes = len(data)
    git_header = f"blob {size_bytes}\0".encode("ascii")
    git_blob_sha1 = hashlib.sha1(git_header + data).hexdigest()
    sha256 = hashlib.sha256(data).hexdigest()
    return size_bytes, git_blob_sha1, sha256


def verify_bytes(data: bytes, spec: ModelSpec, source_label: str) -> tuple[int, str, str]:
    """Verify exact size, Git blob SHA-1, and SHA-256; raise ValueError on mismatch."""
    actual_size, actual_blob, actual_sha256 = compute_hashes(data)
    errors: list[str] = []
    if actual_size != spec.size_bytes:
        errors.append(f"size {actual_size} != expected {spec.size_bytes}")
    if actual_blob != spec.git_blob_sha1:
        errors.append(f"git_blob_sha1 {actual_blob} != expected {spec.git_blob_sha1}")
    if actual_sha256 != spec.sha256:
        errors.append(f"sha256 {actual_sha256} != expected {spec.sha256}")
    if errors:
        raise ValueError(f"{spec.filename} ({source_label}) verification failed: {'; '.join(errors)}")
    return actual_size, actual_blob, actual_sha256


def download_model(url: str, timeout: int = 60) -> bytes:
    """Download model bytes from an immutable raw GitHub URL, failing closed on HTTP errors."""
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "docuready-lane-b-fetch-tessdata/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            status = getattr(response, "status", 200)
            if status != 200:
                raise RuntimeError(f"Unexpected HTTP status {status} for {url}")
            return response.read()
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"HTTP error {exc.code} fetching {url}: {exc.reason}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error fetching {url}: {exc.reason}") from exc


def acquire_and_verify(
    dest_dir: Path,
    models: Mapping[str, ModelSpec] = EXPECTED_MODELS,
    base_url: str = RAW_BASE_URL,
    verify_only: bool = False,
) -> list[str]:
    """Verify existing models or download into temp files, verify, and atomically move into dest_dir."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    summary_lines: list[str] = []

    for lang, spec in models.items():
        target_path = dest_dir / spec.filename
        if target_path.exists():
            data = target_path.read_bytes()
            actual_size, actual_blob, actual_sha256 = verify_bytes(
                data, spec, f"existing {target_path}"
            )
            summary_lines.append(
                f"[PASS] {lang} ({spec.filename}): existing verified | "
                f"size={actual_size} | blob={actual_blob} | sha256={actual_sha256}"
            )
            continue

        if verify_only:
            raise FileNotFoundError(f"Missing model file in verify-only mode: {target_path}")

        url = f"{base_url}/{spec.filename}"
        data = download_model(url)
        actual_size, actual_blob, actual_sha256 = verify_bytes(data, spec, url)

        tmp_path: Path | None = None
        try:
            fd, tmp_name = tempfile.mkstemp(
                prefix=f".{spec.filename}.",
                suffix=".tmp",
                dir=str(dest_dir),
            )
            tmp_path = Path(tmp_name)
            with os.fdopen(fd, "wb") as handle:
                handle.write(data)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(tmp_path, target_path)
            tmp_path = None
        finally:
            if tmp_path is not None and tmp_path.exists():
                tmp_path.unlink(missing_ok=True)

        summary_lines.append(
            f"[PASS] {lang} ({spec.filename}): downloaded & verified | "
            f"size={actual_size} | blob={actual_blob} | sha256={actual_sha256}"
        )

    return summary_lines


def main(argv: list[str] | None = None) -> int:
    default_dest = Path(__file__).resolve().parent / "tessdata"
    parser = argparse.ArgumentParser(
        description="Fetch and verify pinned tessdata_fast models for Lane B OCR."
    )
    parser.add_argument(
        "--dest",
        type=Path,
        default=default_dest,
        help=f"Target tessdata directory (default: {default_dest})",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Verify existing files without downloading missing ones.",
    )
    args = parser.parse_args(argv)

    print(f"tessdata_fast pinned commit: {TESSDATA_FAST_COMMIT}")
    print(f"Destination directory:       {args.dest}")
    try:
        summary = acquire_and_verify(args.dest, verify_only=args.verify_only)
    except Exception as exc:
        print(f"[FAIL] {exc}", file=sys.stderr)
        return 1

    for line in summary:
        print(line)
    print(f"Verified {len(summary)}/{len(EXPECTED_MODELS)} models successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
