"""Extract only N-CMAPSS_DS05.h5 from the downloaded NASA archive(s).

Supports both layouts:
  data/raw/ncmapss_full.zip -> nested data_set.zip -> data_set/N-CMAPSS_DS05.h5
  data/raw/data_set.zip -> data_set/N-CMAPSS_DS05.h5

Extraction is streamed to temporary files and atomically renamed when complete.
The original ZIP archives are kept intact.
"""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path
from zipfile import BadZipFile, ZipFile


def extract_nested_archive(outer: Path, inner: Path) -> None:
    if not outer.is_file():
        raise FileNotFoundError(
            f"Neither inner data_set.zip nor outer ncmapss_full.zip was found. "
            f"Expected inner: {inner}; outer: {outer}"
        )
    inner.parent.mkdir(parents=True, exist_ok=True)
    partial = inner.with_suffix(inner.suffix + ".partial")
    if partial.exists():
        partial.unlink()
    with ZipFile(outer, "r") as archive:
        candidates = [
            item for item in archive.infolist()
            if not item.is_dir() and Path(item.filename).name.lower() == "data_set.zip"
        ]
        if len(candidates) != 1:
            raise RuntimeError(
                f"Expected one nested data_set.zip in {outer}; "
                f"found {[item.filename for item in candidates]}"
            )
        item = candidates[0]
        print(f"Extracting nested archive member: {item.filename}")
        print(f"Nested archive size: {item.file_size / (1024**3):.2f} GiB")
        with archive.open(item, "r") as source, partial.open("wb") as target:
            shutil.copyfileobj(source, target, length=8 * 1024 * 1024)
        if partial.stat().st_size != item.file_size:
            raise IOError(
                f"Nested ZIP size mismatch: got {partial.stat().st_size}, expected {item.file_size}"
            )
    partial.replace(inner)
    print(f"Nested ZIP saved: {inner}")


def extract_ds05(inner: Path, output: Path, overwrite: bool = False) -> None:
    if not inner.is_file():
        raise FileNotFoundError(f"Nested data_set.zip not found: {inner}")
    if output.exists() and not overwrite:
        print(f"DS05 already exists; leaving it unchanged: {output}")
        print(f"Size: {output.stat().st_size / (1024**3):.2f} GiB")
        return

    with ZipFile(inner, "r") as archive:
        candidates = [
            item for item in archive.infolist()
            if not item.is_dir() and Path(item.filename).name.lower() == "n-cmapss_ds05.h5"
        ]
        if len(candidates) != 1:
            raise RuntimeError(
                f"Expected exactly one N-CMAPSS_DS05.h5 in {inner}; "
                f"found {[item.filename for item in candidates]}"
            )
        item = candidates[0]
        output.parent.mkdir(parents=True, exist_ok=True)
        partial = output.with_suffix(output.suffix + ".partial")
        if partial.exists():
            partial.unlink()
        print(f"Extracting {item.filename}")
        print(f"Uncompressed size: {item.file_size / (1024**3):.2f} GiB")
        with archive.open(item, "r") as source, partial.open("wb") as target:
            shutil.copyfileobj(source, target, length=8 * 1024 * 1024)
        if partial.stat().st_size != item.file_size:
            raise IOError(
                f"Extracted size mismatch: {partial.stat().st_size} bytes; expected {item.file_size}"
            )
        partial.replace(output)


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    raw = root / "data" / "raw"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, default=raw / "data_set.zip", help="Inner NASA data_set.zip")
    parser.add_argument("--outer-archive", type=Path, default=raw / "ncmapss_full.zip", help="Full downloaded wrapper ZIP")
    parser.add_argument("--output", type=Path, default=raw / "N-CMAPSS_DS05.h5")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    try:
        if not args.archive.is_file():
            extract_nested_archive(args.outer_archive, args.archive)
        extract_ds05(args.archive, args.output, args.overwrite)
    except (BadZipFile, OSError, RuntimeError) as exc:
        raise SystemExit(f"DS05 extraction failed: {exc}") from exc

    print("DS05 extraction complete")
    print(f"Output: {args.output.resolve()}")
    print(f"Size: {args.output.stat().st_size / (1024**3):.2f} GiB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
