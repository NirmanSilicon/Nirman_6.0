from __future__ import annotations

import io
import sys
import zipfile
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"
sys.path.insert(0, str(SCRIPTS))

from download_fd001 import extract_targets, sha256_bytes  # noqa: E402


def test_extracts_only_required_files_from_nested_zip():
    inner_buffer = io.BytesIO()
    with zipfile.ZipFile(inner_buffer, "w", compression=zipfile.ZIP_DEFLATED) as inner:
        inner.writestr("CMAPSSData/train_FD001.txt", b"train-data")
        inner.writestr("CMAPSSData/test_FD001.txt", b"test-data")
        inner.writestr("CMAPSSData/RUL_FD001.txt", b"rul-data")
        inner.writestr("CMAPSSData/readme.txt", b"ignore-me")

    outer_buffer = io.BytesIO()
    with zipfile.ZipFile(outer_buffer, "w", compression=zipfile.ZIP_DEFLATED) as outer:
        outer.writestr("nested/CMAPSSData.zip", inner_buffer.getvalue())

    extracted = extract_targets(outer_buffer.getvalue())
    assert extracted == {
        "train_FD001.txt": b"train-data",
        "test_FD001.txt": b"test-data",
        "RUL_FD001.txt": b"rul-data",
    }
    assert sha256_bytes(b"abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
