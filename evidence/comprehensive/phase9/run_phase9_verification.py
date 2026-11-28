"""Phase 9: Critical Findings Verification Script.

Read-only against $DOCUREADY_SOURCE.
Writes all inputs, hashes, and raw outputs under:
  <repo-root>/evidence/comprehensive/phase9/
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import unicodedata
from datetime import date
from pathlib import Path
from typing import Any, Dict, List

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from docuready.domain.models import DocumentType
from docuready.ingest.extractor import DocumentExtractor
from docuready.ingest.slot_classifier import classify_document_content
from docuready.normalize.normalizer import (
    HONORIFICS_PATTERN,
    compare_names,
    get_date_ambiguity_candidates,
    normalize_name,
    parse_and_normalize_date,
)
from docuready.rules.engine import PackExecutionEngine


import os
import subprocess

EXPECTED_CANDIDATE_SHA = "0e14a6ed4452c1e562da2df11df7e4f528045074"


def resolve_docuready_source() -> Path:
    src_env = os.environ.get("DOCUREADY_SOURCE")
    if not src_env:
        raise RuntimeError(
            "DOCUREADY_SOURCE environment variable must point to a read-only DocuReady checkout at "
            f"{EXPECTED_CANDIDATE_SHA}."
        )
    src = Path(src_env).resolve()
    if not src.exists():
        raise RuntimeError(f"DOCUREADY_SOURCE path does not exist: {src}")
    head = subprocess.check_output(["git", "-C", str(src), "rev-parse", "HEAD"], text=True).strip()
    if head != EXPECTED_CANDIDATE_SHA:
        raise RuntimeError(
            f"DOCUREADY_SOURCE HEAD {head} does not match expected candidate SHA {EXPECTED_CANDIDATE_SHA}."
        )
    return src

SOURCE_ROOT = resolve_docuready_source()
OUT_ROOT = Path(__file__).resolve().parent


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def wilson_95(k: int, n: int, z: float = 1.959963984540054) -> List[float]:
    if n <= 0:
        return [0.0, 1.0]
    p = k / n
    z2 = z * z
    denom = 1.0 + z2 / n
    center = (p + z2 / (2.0 * n)) / denom
    half = (z * math.sqrt((p * (1.0 - p) / n) + (z2 / (4.0 * n * n)))) / denom
    return [round(max(0.0, center - half), 4), round(min(1.0, center + half), 4)]


def make_text_pdf(path: Path, lines: List[str]) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setFont("Helvetica", 8)
    c.drawString(40, 815, "SYNTHETIC TEST DOCUMENT - NOT VALID FOR OFFICIAL USE")
    c.setFont("Helvetica", 11)
    y = 780
    for ln in lines:
        c.drawString(40, y, ln)
        y -= 18
    c.save()
    return sha256_bytes(path.read_bytes())


def trace_normalize_name_stages(raw: str) -> Dict[str, Any]:
    decomposed = unicodedata.normalize("NFKD", raw)
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    upper = stripped.upper()
    no_hon = re.sub(HONORIFICS_PATTERN, " ", upper)
    ascii_only = re.sub(r"[^A-Z\s]", " ", no_hon)
    tokens = ascii_only.split()
    final = normalize_name(raw)
    return {
        "input": raw,
        "stage1_nfkd_len": len(decomposed),
        "stage2_combining_stripped": stripped,
        "stage3_upper": upper,
        "stage4_honorifics_removed": no_hon,
        "stage5_ascii_regex_sub": ascii_only,
        "stage6_tokens": tokens,
        "final_normalize_name": final,
    }


def main() -> None:
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    extractor = DocumentExtractor()
    subhadra = PackExecutionEngine(SOURCE_ROOT / "packs" / "odisha.subhadra")

    pb_pdf = OUT_ROOT / "pdfs" / "PASSBOOK_REF.pdf"
    make_text_pdf(pb_pdf, [
        "STATE BANK OF INDIA",
        "SAVINGS BANK PASSBOOK",
        "Account Holder Name: Kavita Swain",
        "Account Number: 00001234567890",
        "Bank IFSC Code: SBIN0000123",
    ])
    pb_doc = extractor.extract_document(str(pb_pdf), expected_type=DocumentType.BANK_PASSBOOK)

    # 1. Date Normalization End-to-End Trace (as_of = 2024-07-01, age 21..59)
    date_matrix_inputs = [
        ("10/08/2006", "Reported ambiguous underage DD/MM/YYYY"),
        ("05/15/1990", "Reported MM/DD/YYYY (DD>12)"),
        ("2006-08-10", "Reported ISO YYYY-MM-DD underage"),
        ("01/07/2003", "Reported boundary 21st birthday on 2024-07-01"),
        ("02/07/2003", "Boundary underage by 1 day (DD<=12)"),
        ("15/05/1990", "Unambiguous eligible DD/MM/YYYY"),
        ("01/07/1964", "Boundary age 60 (ineligible >=60, DD<=12)"),
        ("1964-07-01", "Boundary age 60 ISO (ineligible >=60)"),
        ("02/07/1964", "Boundary age 59 (eligible, DD<=12)"),
        ("31/02/1995", "Invalid calendar date"),
        ("", "Empty date"),
    ]
    date_traces = []
    for idx, (raw_dob, desc) in enumerate(date_matrix_inputs):
        parsed_dt, p_status, is_amb = parse_and_normalize_date(raw_dob)
        cands = [c.isoformat() for c in get_date_ambiguity_candidates(raw_dob)]
        pdf_p = OUT_ROOT / "pdfs" / f"DATE_{idx:02d}.pdf"
        h = make_text_pdf(pdf_p, [
            "UNIQUE IDENTIFICATION AUTHORITY OF INDIA",
            "Name: Kavita Swain",
            f"DOB: {raw_dob}",
            "Gender: FEMALE",
            "Aadhaar Number: XXXX XXXX 4321",
        ])
        ext_a = extractor.extract_document(str(pdf_p), expected_type=DocumentType.AADHAAR)
        dob_fld = ext_a.fields.get("dob")
        res = subhadra.validate_packet(
            f"PH9_DT_{idx:02d}",
            {DocumentType.AADHAAR: ext_a, DocumentType.BANK_PASSBOOK: pb_doc},
            as_of=date(2024, 7, 1),
        )
        age_finding = next((f for f in res.findings if f.rule_id == "RULE-SUB-AGE-01"), None)
        date_traces.append({
            "raw_dob": raw_dob,
            "description": desc,
            "parse_and_normalize_date": {"parsed": parsed_dt.isoformat() if parsed_dt else None, "status": p_status, "is_ambiguous": is_amb},
            "get_date_ambiguity_candidates": cands,
            "extracted_dob_state": dob_fld.evidence_state.value if dob_fld else "ABSENT",
            "rule_sub_age_01": {"status": str(age_finding.status), "reason_code": str(age_finding.reason_code)} if age_finding else None,
            "final_readiness": res.readiness.value,
            "pdf_sha256": h,
        })

    # 2. Indic Name Normalization Trace
    name_cases = [
        ("Odia-only NFC", "ଅନନ୍ୟା ଦାସ"),
        ("Odia-only NFD", unicodedata.normalize("NFD", "ଅନନ୍ୟା ଦାସ")),
        ("Hindi-only NFC", "अनन्या दास"),
        ("Hindi-only NFD", unicodedata.normalize("NFD", "अनन्या दास")),
        ("English-only with honorific & diacritic", "Smt. Ananyá   Das"),
        ("English-only middle Kumar", "Rajesh Kumar Patel"),
        ("Mixed English + Odia", "Ananya ଦାସ"),
        ("Mixed English + Hindi", "Ananya दास"),
    ]
    indic_traces = [{"label": lbl, **trace_normalize_name_stages(val)} for lbl, val in name_cases]
    cross_script_pairs = [
        ("Ananya Das", "ଅନନ୍ୟା ଦାସ"),
        ("Ananya Das", "अनन्या दास"),
        ("Ananya Das", "Ananya ଦାସ"),
        ("Ananya Das", "Smt. Ananyá Das"),
    ]
    cross_script_results = [
        {"n1": n1, "n2": n2, **{k: str(v) for k, v in compare_names(n1, n2).items()}}
        for n1, n2 in cross_script_pairs
    ]

    # 3. Expanded Education Marksheet Format Matrix
    edu_cases = [
        ("EDU_10_PCT", "Class 10 (%)", [
            "BOARD OF SECONDARY EDUCATION ODISHA", "HIGH SCHOOL CERTIFICATE EXAMINATION",
            "Candidate Name: Kavita Swain", "Date of Birth: 22/08/1992", "Roll No: 10A-001", "AGGREGATE RESULT: PASS (84.2%)",
        ]),
        ("EDU_12_PCT", "Class 12 (%)", [
            "COUNCIL OF HIGHER SECONDARY EDUCATION", "MARKS STATEMENT",
            "Candidate Name: Kavita Swain", "Date of Birth: 22/08/1992", "Roll No: 12A-002", "AGGREGATE RESULT: PASS (76.5%)",
        ]),
        ("EDU_UNIV_SGPA", "University (SGPA only)", [
            "UTKAL UNIVERSITY", "MARKSHEET", "Candidate Name: Kavita Swain", "Roll No: U-003", "SGPA: 8.45",
        ]),
        ("EDU_UNIV_CGPA", "University (CGPA only)", [
            "UTKAL UNIVERSITY", "MARKSHEET", "Candidate Name: Kavita Swain", "Roll No: U-004", "CGPA: 8.10",
        ]),
        ("EDU_GRADE_ONLY", "Grade-only Marksheet", [
            "CENTRAL BOARD OF SECONDARY EDUCATION", "MARKS STATEMENT",
            "Candidate Name: Kavita Swain", "Roll No: G-005", "Grade: A1", "Total Marks: 450 / 500",
        ]),
        ("EDU_SEMESTER_GRADE_CARD", "University Semester Grade Card (no MARKSHEET anchor)", [
            "BPUT ODISHA", "PROVISIONAL GRADE SHEET",
            "Candidate Name: Kavita Swain", "Reg No: 2001001", "SGPA: 7.90",
        ]),
    ]
    edu_results = []
    for eid, label, lines in edu_cases:
        p = OUT_ROOT / "pdfs" / f"{eid}.pdf"
        h = make_text_pdf(p, lines)
        cls = classify_document_content("\n".join(lines))
        ext = extractor.extract_document(str(p), expected_type=DocumentType.MARKSHEET)
        edu_results.append({
            "id": eid,
            "label": label,
            "classified_type": cls.candidate_type.value if cls.candidate_type else None,
            "is_uncertain": cls.is_uncertain,
            "extracted_fields": {k: str(v.normalized_value) for k, v in ext.fields.items()},
            "sha256": h,
        })

    out = {
        "phase9_date_traces": date_traces,
        "phase9_indic_name_traces": indic_traces,
        "phase9_cross_script_compare": cross_script_results,
        "phase9_education_formats": edu_results,
    }
    (OUT_ROOT / "phase9_results.json").write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
