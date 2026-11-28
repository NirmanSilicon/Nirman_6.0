"""Track C: Indic OCR Evaluation on 40 Synthetic Bilingual Samples (Containerized).

Mounts expected inside container:
  /src/docuready-live :ro
  /input/ocr :ro
  /output :rw (evidence/ocr/track-c)
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Sequence

import PIL.Image
import pytesseract

from docuready.domain.models import DocumentType
from docuready.ingest.extractor import DocumentExtractor
from docuready.ingest.tesseract_discovery import find_tesseract_binary_with_source
from docuready.normalize.normalizer import normalize_indic_digits, normalize_name


def sha256_file(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def levenshtein(a: Sequence[Any], b: Sequence[Any]) -> int:
    if len(a) < len(b):
        return levenshtein(b, a)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a):
        curr = [i + 1]
        for j, y in enumerate(b):
            curr.append(min(prev[j + 1] + 1, curr[j] + 1, prev[j] + (0 if x == y else 1)))
        prev = curr
    return prev[-1]


def wilson_95(k: int, n: int, z: float = 1.959963984540054) -> List[float]:
    if n <= 0:
        return [0.0, 1.0]
    p = k / n
    z2 = z * z
    d = 1.0 + z2 / n
    c = (p + z2 / (2.0 * n)) / d
    h = (z * math.sqrt(p * (1.0 - p) / n + z2 / (4.0 * n * n))) / d
    return [round(max(0.0, c - h), 4), round(min(1.0, c + h), 4)]


def norm_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def main() -> None:
    t_bin, t_src = find_tesseract_binary_with_source()
    assert str(t_bin) == "/usr/local/bin/tesseract" and t_src in ("env_override", "bundled_resource"), (t_bin, t_src)

    loop11 = Path("/src/docuready-live/research/loop11_benchmark")
    ocr_dir = Path("/input/ocr")
    out_dir = Path("/output")

    tc_manifest = json.loads((ocr_dir / "track_c_input_manifest.json").read_text(encoding="utf-8"))
    gt_path = loop11 / "ground_truth" / "indic_ground_truth.json"
    if sha256_file(gt_path) != tc_manifest["gt_sha256"]:
        raise RuntimeError("indic_ground_truth.json SHA-256 mismatch")

    gt_items = json.loads(gt_path.read_text(encoding="utf-8"))
    manifest_by_id = {s["sample_id"]: s for s in tc_manifest["samples"]}
    assert len(gt_items) == 40 and len(manifest_by_id) == 40

    extractor = DocumentExtractor()
    sample_results: List[Dict[str, Any]] = []

    for item in gt_items:
        sid = item["sample_id"]
        lang = item["lang"]
        split = item["split"]
        m_rec = manifest_by_id[sid]
        png_p = loop11 / m_rec["png_rel"]
        if not png_p.exists() or sha256_file(png_p) != m_rec["png_sha256"]:
            raise RuntimeError(f"Missing or hash-mismatched PNG for {sid}")

        lang_pack = f"eng+{lang}"
        img = PIL.Image.open(png_p)
        raw_ocr_text = pytesseract.image_to_string(img, lang=lang_pack, config="--oem 1")

        # Also run DocumentExtractor on the PNG with explicit bilingual langs
        ext_doc = extractor.extract_document(str(png_p), expected_type=DocumentType.INCOME_CERT, ocr_langs=["eng", lang])

        gt_obj = item["ground_truth"]
        gt_unicode_text = f"{gt_obj.get('indic_title', '')}\n{gt_obj.get('indic_clause', '')}".strip()

        raw_ref = norm_ws(gt_unicode_text)
        raw_hyp = norm_ws(raw_ocr_text)
        raw_cer = round(levenshtein(raw_ref, raw_hyp) / max(1, len(raw_ref)), 4)
        raw_wer = round(levenshtein(raw_ref.split(), raw_hyp.split()) / max(1, len(raw_ref.split())), 4)

        norm_ref = normalize_indic_digits(raw_ref)
        norm_hyp = normalize_indic_digits(raw_hyp)
        norm_cer = round(levenshtein(norm_ref, norm_hyp) / max(1, len(norm_ref)), 4)
        norm_wer = round(levenshtein(norm_ref.split(), norm_hyp.split()) / max(1, len(norm_ref.split())), 4)

        gt_fields = gt_obj["fields"]
        ext_income = ext_doc.fields.get("annual_income")
        ext_name = ext_doc.fields.get("applicant_name")

        income_match = (
            ext_income is not None
            and ext_income.normalized_value is not None
            and float(ext_income.normalized_value) == float(gt_fields["annual_income"])
        )
        name_match = (
            ext_name is not None
            and normalize_name(str(ext_name.normalized_value or "")) == normalize_name(gt_fields["applicant_name"])
        )

        sample_results.append({
            "sample_id": sid,
            "split": split,
            "lang": lang,
            "lang_pack": lang_pack,
            "png_sha256": m_rec["png_sha256"],
            "gt_unicode_text": gt_unicode_text,
            "raw_ocr_text": raw_ocr_text,
            "raw_cer": raw_cer,
            "raw_wer": raw_wer,
            "norm_cer": norm_cer,
            "norm_wer": norm_wer,
            "gt_fields": gt_fields,
            "extracted_fields": {
                k: {"raw": v.raw_value, "norm": str(v.normalized_value), "state": v.evidence_state.value}
                for k, v in ext_doc.fields.items()
            },
            "income_exact_match": income_match,
            "name_exact_match": name_match,
        })

    def _agg(subset: List[Dict[str, Any]]) -> Dict[str, Any]:
        n = len(subset)
        k_inc = sum(1 for r in subset if r["income_exact_match"])
        k_nam = sum(1 for r in subset if r["name_exact_match"])
        return {
            "n": n,
            "mean_raw_cer": round(sum(r["raw_cer"] for r in subset) / max(1, n), 4),
            "mean_raw_wer": round(sum(r["raw_wer"] for r in subset) / max(1, n), 4),
            "mean_norm_cer": round(sum(r["norm_cer"] for r in subset) / max(1, n), 4),
            "mean_norm_wer": round(sum(r["norm_wer"] for r in subset) / max(1, n), 4),
            "income_exact_match": {"k": k_inc, "n": n, "rate": round(k_inc / max(1, n), 4), "wilson_95": wilson_95(k_inc, n)},
            "name_exact_match": {"k": k_nam, "n": n, "rate": round(k_nam / max(1, n), 4), "wilson_95": wilson_95(k_nam, n)},
        }

    summary = {
        "source_commit": "0e14a6ed4452c1e562da2df11df7e4f528045074",
        "source_status": "candidate_snapshot_only",
        "gt_sha256": tc_manifest["gt_sha256"],
        "by_language": {
            "hin": _agg([r for r in sample_results if r["lang"] == "hin"]),
            "ori": _agg([r for r in sample_results if r["lang"] == "ori"]),
        },
        "by_language_and_split": {
            f"{lg}_{sp}": _agg([r for r in sample_results if r["lang"] == lg and r["split"] == sp])
            for lg in ("hin", "ori")
            for sp in ("DEV", "VAL", "CHALLENGE")
        },
        "samples": sample_results,
    }
    (out_dir / "track_c_indic_results.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"by_language": summary["by_language"], "by_language_and_split": summary["by_language_and_split"]}, indent=2))


if __name__ == "__main__":
    main()
