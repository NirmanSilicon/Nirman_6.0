"""Track B: Production DocumentExtractor + Tesseract 5.5.5 Smoke Test (Containerized).

Mounts expected inside container:
  /src/docuready-live :ro
  /input/comprehensive :ro
  /input/ocr :ro
  /output :rw (evidence/ocr/track-b)
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict, List

import pymupdf

from docuready.domain.models import DocumentType
from docuready.ingest.extractor import DocumentExtractor
from docuready.ingest.tesseract_discovery import find_tesseract_binary_with_source


def sha256_file(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main() -> None:
    assert pymupdf.__version__ == "2.1", f"Unexpected pymupdf version: {pymupdf.__version__}"
    t_bin, t_src = find_tesseract_binary_with_source()
    assert str(t_bin) == "/usr/local/bin/tesseract" and t_src in ("env_override", "bundled_resource"), (t_bin, t_src)

    comp_dir = Path("/input/comprehensive")
    ocr_dir = Path("/input/ocr")
    out_dir = Path("/output")

    manifest = json.loads((ocr_dir / "track_b_input_manifest.json").read_text(encoding="utf-8"))
    audit = json.loads((ocr_dir / "track_b_ocr_path_audit.json").read_text(encoding="utf-8"))
    cat_by_rel = {f["rel_path"]: f["category"] for f in audit["files"]}

    extractor = DocumentExtractor()

    def _infer_expected_type(rel: str) -> DocumentType | None:
        name = Path(rel).name.upper()
        if "AADHAAR" in name or "DATE_" in name:
            return DocumentType.AADHAAR
        if "INCOME" in name or "SCANNED_NO_TESSERACT" in name:
            return DocumentType.INCOME_CERT
        if "CASTE" in name:
            return DocumentType.CASTE_CERT
        if "RESIDENCE" in name:
            return DocumentType.RESIDENCE_CERT
        if "MARKSHEET" in name or "EDU_" in name:
            return DocumentType.MARKSHEET
        if "PASSBOOK" in name:
            return DocumentType.BANK_PASSBOOK
        if "APPLICATION" in name:
            return DocumentType.APPLICATION_FORM
        return None

    ocr_results: List[Dict[str, Any]] = []
    native_bypass_controls: List[Dict[str, Any]] = []
    excluded_malformed: List[str] = []

    for item in manifest["files"]:
        rel = item["rel_path"]
        p = comp_dir / rel
        if not p.exists():
            raise FileNotFoundError(f"Missing Track B input: {p}")
        if sha256_file(p) != item["sha256"]:
            raise RuntimeError(f"SHA-256 mismatch for {rel}")

        cat = cat_by_rel[rel]
        if cat == "malformed_corrupt":
            excluded_malformed.append(rel)
            continue

        exp_dt = _infer_expected_type(rel)
        ext = extractor.extract_document(str(p), expected_type=exp_dt, ocr_langs=["eng"])
        rec = {
            "rel_path": rel,
            "sha256": item["sha256"],
            "category": cat,
            "expected_type": exp_dt.value if exp_dt else None,
            "detected_type": ext.doc_type.value if ext.doc_type else None,
            "doc_status": ext.status,
            "fields": {
                k: {
                    "raw_value": v.raw_value,
                    "normalized_value": str(v.normalized_value),
                    "extraction_method": v.extraction_method,
                    "evidence_state": v.evidence_state.value,
                    "confidence": v.confidence,
                }
                for k, v in ext.fields.items()
            },
        }
        if cat == "genuine_ocr":
            ocr_results.append(rec)
        else:
            native_bypass_controls.append(rec)

    summary = {
        "source_commit": "0e14a6ed4452c1e562da2df11df7e4f528045074",
        "source_status": "candidate_snapshot_only",
        "container_tesseract_bin": str(t_bin),
        "pymupdf_version": pymupdf.__version__,
        "adv_scanned_no_tesseract_classification": "ordinary_ocr_path_sample (INCOME_CERT rasterized PDF; not a negative control)",
        "counts": {
            "genuine_ocr_evaluated": len(ocr_results),
            "native_bypass_controls": len(native_bypass_controls),
            "excluded_malformed": len(excluded_malformed),
        },
        "genuine_ocr_results": ocr_results,
        "native_bypass_control_results": native_bypass_controls,
        "excluded_malformed_files": excluded_malformed,
    }
    (out_dir / "track_b_results.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps({"counts": summary["counts"], "genuine_ocr_results": ocr_results}, indent=2))


if __name__ == "__main__":
    main()
