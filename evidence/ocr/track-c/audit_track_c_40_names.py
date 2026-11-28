"""Read-only strict 40-document applicant-name recognition vs extraction audit."""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path


def main() -> None:
    tc_path = Path(__file__).resolve().parent / "track_c_indic_results.json"
    tc = json.loads(tc_path.read_text(encoding="utf-8"))
    rows = []
    for s in tc["samples"]:
        gt_name = s["gt_fields"]["applicant_name"].strip()
        lines = [ln.strip() for ln in s["raw_ocr_text"].splitlines() if ln.strip()]
        # Strict exact-label match: line starting with "APPLICANT:"
        matched_line = next((ln for ln in lines if re.match(r"^APPLICANT:\s*", ln, re.IGNORECASE)), None)
        extracted_from_line = re.sub(r"^APPLICANT:\s*", "", matched_line, flags=re.IGNORECASE).strip() if matched_line else None
        raw_exact = extracted_from_line == gt_name
        doc_ext_val = s["extracted_fields"].get("applicant_name")
        rows.append({
            "sample_id": s["sample_id"],
            "split": s["split"],
            "lang": s["lang"],
            "gt_applicant_name": gt_name,
            "matching_raw_ocr_line": matched_line or "",
            "raw_ocr_name_exact_match": raw_exact,
            "docuready_extracted_applicant_name": doc_ext_val["norm"] if doc_ext_val else "NONE",
            "paired_gap": "OCR_RECOGNIZED_EXTRACTOR_MISSED" if (raw_exact and doc_ext_val is None) else "OTHER",
        })

    out_csv = Path(__file__).resolve().parent / "applicant_name_audit_40.csv"
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    for lg in ("hin", "ori"):
        sub = [r for r in rows if r["lang"] == lg]
        n_raw = sum(1 for r in sub if r["raw_ocr_name_exact_match"])
        n_ext = sum(1 for r in sub if r["docuready_extracted_applicant_name"] != "NONE")
        print(f"{lg}: raw_exact={n_raw}/{len(sub)}, docuready_extracted={n_ext}/{len(sub)}")


if __name__ == "__main__":
    main()
