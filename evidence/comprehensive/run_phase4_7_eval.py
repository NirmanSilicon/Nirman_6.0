"""Phases 4-7 Comprehensive Evaluation Script (Track B Native & Deterministic Layers).

Read-only against $DOCUREADY_SOURCE.
Writes all datasets, manifests, hashes, and raw outputs under:
  <repo-root>/evidence/comprehensive/phase4_7/
"""

from __future__ import annotations

import hashlib
import io
import json
from datetime import date
from pathlib import Path
from typing import Any, Dict, List

import pymupdf as fitz
from PIL import Image, ImageDraw
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from docuready.domain.models import DocumentType
from docuready.ingest.extractor import DocumentExtractor
from docuready.ingest.identifier_validation import validate_identifier_syntax_and_ambiguity
from docuready.ingest.slot_classifier import classify_document_content
from docuready.normalize.normalizer import (
    compare_names,
    get_date_ambiguity_candidates,
    normalize_cert_number,
    normalize_indic_digits,
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
OUT_ROOT = Path(__file__).resolve().parent / "phase4_7"


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


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


def make_image_pdf(path: Path, lines: List[str]) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (1000, 1400), "white")
    draw = ImageDraw.Draw(img)
    y = 50
    draw.text((40, 20), "SYNTHETIC DEGRADED IMAGE TEST - NOT VALID FOR OFFICIAL USE", fill="black")
    for ln in lines:
        draw.text((40, y), ln, fill="black")
        y += 32
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=30)
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    page.insert_image(fitz.Rect(0, 0, 595, 842), stream=buf.getvalue())
    doc.save(str(path))
    doc.close()
    return sha256_bytes(path.read_bytes())


def main() -> None:
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    extractor = DocumentExtractor()
    subhadra_engine = PackExecutionEngine(SOURCE_ROOT / "packs" / "odisha.subhadra")
    generic_engine = PackExecutionEngine(SOURCE_ROOT / "packs" / "generic.demo", allow_draft=True)

    manifest: List[Dict[str, Any]] = []

    # ---------------- PHASE 4: EXPANDED IDENTITY CORPUS ----------------
    id_specs = [
        ("ID_AADHAAR_FRONT_BACK", "Aadhaar Front+Back", DocumentType.AADHAAR, [
            "UNIQUE IDENTIFICATION AUTHORITY OF INDIA",
            "Government of India",
            "Name: Kavita Swain",
            "DOB: 22/08/1992",
            "Gender: FEMALE",
            "Aadhaar Number: XXXX XXXX 4321",
            "Address: At/Po Rasulgarh, Bhubaneswar, Khordha, Odisha 751010",
        ]),
        ("ID_AADHAAR_MISSING_DOB", "Aadhaar Missing DOB", DocumentType.AADHAAR, [
            "UNIQUE IDENTIFICATION AUTHORITY OF INDIA",
            "Name: Kavita Swain",
            "Gender: FEMALE",
            "Aadhaar Number: XXXX XXXX 4321",
        ]),
        ("ID_PASSPORT_SYN", "Passport (Synthetic)", None, [
            "REPUBLIC OF INDIA",
            "PASSPORT",
            "Passport No: Z0000000",
            "Name: Kavita Swain",
            "Nationality: INDIAN",
            "Date of Birth: 22/08/1992",
            "Date of Issue: 01/01/2015",
            "Date of Expiry: 01/01/2025",
            "P<INDSWAIN<<KAVITA<<<<<<<<<<<<<<<<<<<<<<<<<<",
            "Z0000000<0IND9208221F2501019<<<<<<<<<<<<<<00",
        ]),
        ("ID_PAN_SYN", "PAN Card (Synthetic)", None, [
            "INCOME TAX DEPARTMENT",
            "GOVT. OF INDIA",
            "Permanent Account Number Card",
            "ABCDE0000F",
            "Name: Kavita Swain",
            "Date of Birth: 22/08/1992",
        ]),
        ("ID_VOTER_SYN", "Voter ID (Synthetic)", None, [
            "ELECTION COMMISSION OF INDIA",
            "ELECTORS PHOTO IDENTITY CARD",
            "EPIC No: SYN0000002",
            "Name: Kavita Swain",
            "Age: 32",
            "Address: Bhubaneswar, Odisha",
        ]),
        ("ID_DL_SYN", "Driving Licence (Synthetic)", None, [
            "INDIAN UNION DRIVING LICENCE",
            "OD02 20190000002",
            "Name: Kavita Swain",
            "DOB: 22/08/1992",
            "Valid Till: 21/08/2039",
        ]),
        ("ID_RATION_SYN", "Ration Card (Synthetic)", None, [
            "FOOD SUPPLIES & CONSUMER WELFARE DEPARTMENT",
            "RATION CARD",
            "Card No: SYN-RC-0002",
            "Head of Family: Kavita Swain",
            "Address: Bhubaneswar, Odisha",
        ]),
    ]

    phase4_results = []
    for sid, label, exp_dt, lines in id_specs:
        pdf_p = OUT_ROOT / "identity" / f"{sid}.pdf"
        h = make_text_pdf(pdf_p, lines)
        cls = classify_document_content("\n".join(lines))
        ext = extractor.extract_document(str(pdf_p), expected_type=exp_dt) if exp_dt else None
        phase4_results.append({
            "id": sid,
            "label": label,
            "expected_doc_type": exp_dt.value if exp_dt else None,
            "classified_type": cls.candidate_type.value if cls.candidate_type else None,
            "is_uncertain": cls.is_uncertain,
            "extracted_fields": {k: {"norm": str(v.normalized_value), "state": v.evidence_state.value} for k, v in ext.fields.items()} if ext else {},
            "address_extracted": ("address" in ext.fields) if ext else False,
            "sha256": h,
        })
        manifest.append({"id": sid, "phase": "phase4_identity", "label": label, "condition": "clean_native_vector", "sha256": h})

    # Degraded image Aadhaar (no Tesseract -> UNREADABLE)
    deg_img_pdf = OUT_ROOT / "identity" / "ID_AADHAAR_DEGRADED_IMG.pdf"
    h_deg = make_image_pdf(deg_img_pdf, ["AADHAAR CARD", "Kavita Swain", "DOB: 22/08/1992", "XXXX XXXX 4321"])
    deg_ext = extractor.extract_document(str(deg_img_pdf), expected_type=DocumentType.AADHAAR)
    phase4_results.append({
        "id": "ID_AADHAAR_DEGRADED_IMG",
        "label": "Aadhaar Degraded JPEG Image (No Tesseract)",
        "expected_doc_type": "AADHAAR",
        "doc_status": deg_ext.status,
        "extracted_fields_count": len(deg_ext.fields),
        "sha256": h_deg,
    })
    manifest.append({"id": "ID_AADHAAR_DEGRADED_IMG", "phase": "phase4_identity", "label": "Aadhaar Degraded Image", "condition": "jpeg_q30_image_only", "sha256": h_deg})

    # Contradictory applicant details on Aadhaar vs Passbook
    contra_pb = OUT_ROOT / "identity" / "ID_CONTRA_PASSBOOK.pdf"
    h_cpb = make_text_pdf(contra_pb, [
        "STATE BANK OF INDIA",
        "SAVINGS BANK PASSBOOK",
        "Account Holder Name: Sunita Rout",
        "Account Number: 00009876543210",
        "Bank IFSC Code: SBIN0000456",
    ])
    aadhaar_ok = extractor.extract_document(str(OUT_ROOT / "identity" / "ID_AADHAAR_FRONT_BACK.pdf"), expected_type=DocumentType.AADHAAR)
    pb_contra = extractor.extract_document(str(contra_pb), expected_type=DocumentType.BANK_PASSBOOK)
    sub_contra = subhadra_engine.validate_packet("PH4_CONTRA", {DocumentType.AADHAAR: aadhaar_ok, DocumentType.BANK_PASSBOOK: pb_contra}, as_of=date(2024, 7, 1))
    manifest.append({"id": "ID_CONTRA_PASSBOOK", "phase": "phase4_identity", "label": "Contradictory Passbook", "condition": "name_mismatch", "sha256": h_cpb})

    # ---------------- PHASE 5: EDUCATION & FINANCIAL ----------------
    edu_fin_specs = [
        ("EDU_CLASS10", "Class 10 Marksheet", DocumentType.MARKSHEET, [
            "BOARD OF SECONDARY EDUCATION ODISHA",
            "HIGH SCHOOL CERTIFICATE EXAMINATION",
            "Candidate Name: Kavita Swain",
            "Father Name: Harihar Swain",
            "Date of Birth: 22/08/1992",
            "Roll No: SYN10-2008-01",
            "AGGREGATE RESULT: PASS (82.4%)",
        ]),
        ("EDU_CLASS12", "Class 12 Marksheet", DocumentType.MARKSHEET, [
            "COUNCIL OF HIGHER SECONDARY EDUCATION ODISHA",
            "MARKS STATEMENT",
            "Candidate Name: Kavita Swain",
            "Father Name: Harihar Swain",
            "Date of Birth: 22/08/1992",
            "Roll No: SYN12-2010-01",
            "AGGREGATE RESULT: PASS (79.0%)",
        ]),
        ("EDU_UNIV_SGPA", "University Marksheet (SGPA, no %)", DocumentType.MARKSHEET, [
            "UTKAL UNIVERSITY",
            "MARKSHEET",
            "Candidate Name: Kavita Swain",
            "Roll No: SYNUNI-2013-01",
            "SGPA: 8.45",
        ]),
        ("FIN_BANK_STATEMENT", "Bank Statement (Unsupported)", None, [
            "STATE BANK OF INDIA",
            "STATEMENT OF ACCOUNT",
            "Statement Period: 01/04/2024 to 30/06/2024",
            "Account Holder Name: Kavita Swain",
            "Closing Balance: 35000.00",
        ]),
    ]
    phase5_results = []
    for eid, label, exp_dt, lines in edu_fin_specs:
        pdf_p = OUT_ROOT / "edu_fin" / f"{eid}.pdf"
        h = make_text_pdf(pdf_p, lines)
        cls = classify_document_content("\n".join(lines))
        ext = extractor.extract_document(str(pdf_p), expected_type=exp_dt) if exp_dt else None
        phase5_results.append({
            "id": eid,
            "label": label,
            "classified_type": cls.candidate_type.value if cls.candidate_type else None,
            "is_uncertain": cls.is_uncertain,
            "uncertainty_reason": cls.uncertainty_reason,
            "extracted_fields": {k: str(v.normalized_value) for k, v in ext.fields.items()} if ext else {},
            "sha256": h,
        })
        manifest.append({"id": eid, "phase": "phase5_edu_fin", "label": label, "condition": "clean_native_vector", "sha256": h})

    # ---------------- PHASE 6: INDIC-SCRIPT INVESTIGATION ----------------
    phase6_results = {
        "odia_name_norm": normalize_name("ଅନନ୍ୟା ଦାସ"),
        "hindi_name_norm": normalize_name("अनन्या दास"),
        "mixed_eng_odia_name_norm": normalize_name("Ananya ଦାସ"),
        "mixed_eng_hindi_name_norm": normalize_name("Ananya दास"),
        "cross_script_compare_eng_vs_odia": {k: str(v) for k, v in compare_names("Ananya Das", "ଅନନ୍ୟା ଦାସ").items()},
        "cross_script_compare_eng_vs_hindi": {k: str(v) for k, v in compare_names("Ananya Das", "अनन्या दास").items()},
        "odia_numerals": normalize_indic_digits("୨୦୨୪-୦୭-୦୧"),
        "devanagari_numerals": normalize_indic_digits("२०२४-०७-०१"),
        "odia_cert_no": normalize_cert_number("OD/INC/୨୦୨୪/୦୦୯୯"),
        "devanagari_cert_no": normalize_cert_number("HI/INC/२०२४/००९९"),
        "confusable_ifsc_O_vs_0": validate_identifier_syntax_and_ambiguity("SBINO000123", "ifsc", "code"),
        "confusable_pan_digit_in_prefix": validate_identifier_syntax_and_ambiguity("AB0DE1234F", "pan", "id"),
    }

    # ---------------- PHASE 7: DATE NORMALIZATION INVESTIGATION ----------------
    date_cases = [
        ("DD/MM/YYYY unambiguous", "15/05/1990"),
        ("DD/MM/YYYY ambiguous (DD<=12)", "10/08/2006"),
        ("MM/DD/YYYY unambiguous", "05/15/1990"),
        ("MM/DD/YYYY ambiguous (MM<=12)", "08/10/2006"),
        ("YYYY-MM-DD", "1990-05-15"),
        ("YYYY-MM-DD underage", "2006-08-10"),
        ("Odia numerals unambiguous", "୧୫/୦୫/୧୯୯୦"),
        ("Devanagari numerals ambiguous", "१०/०८/२००६"),
        ("Boundary eligibility (01/07/2003)", "01/07/2003"),
        ("Missing (empty)", ""),
        ("Missing (None)", None),
        ("Invalid (32/13/2024)", "32/13/2024"),
        ("Invalid (text)", "not-a-date"),
        ("Unreadable (XX/XX/2006)", "XX/XX/2006"),
    ]
    phase7_results = []
    for label, raw in date_cases:
        dt, st, amb = parse_and_normalize_date(raw)
        cands = [c.isoformat() for c in get_date_ambiguity_candidates(raw)]
        phase7_results.append({
            "case": label,
            "raw": raw,
            "parsed_iso": dt.isoformat() if dt else None,
            "status": st,
            "is_ambiguous": amb,
            "ambiguity_candidates": cands,
        })

    # Fixed reference date age check: 2006-08-10 (unambiguous YYYY-MM-DD) vs 10/08/2006 (ambiguous)
    aadhaar_iso_underage = OUT_ROOT / "identity" / "ID_AADHAAR_ISO_UNDERAGE.pdf"
    make_text_pdf(aadhaar_iso_underage, [
        "UNIQUE IDENTIFICATION AUTHORITY OF INDIA",
        "Name: Kavita Swain",
        "DOB: 2006-08-10",
        "Gender: FEMALE",
        "Aadhaar Number: XXXX XXXX 4321",
    ])
    iso_ext = extractor.extract_document(str(aadhaar_iso_underage), expected_type=DocumentType.AADHAAR)
    pb_match = OUT_ROOT / "identity" / "ID_MATCH_PASSBOOK.pdf"
    make_text_pdf(pb_match, [
        "STATE BANK OF INDIA",
        "SAVINGS BANK PASSBOOK",
        "Account Holder Name: Kavita Swain",
        "Account Number: 00009876543210",
        "Bank IFSC Code: SBIN0000456",
    ])
    pb_ok = extractor.extract_document(str(pb_match), expected_type=DocumentType.BANK_PASSBOOK)
    sub_iso_underage = subhadra_engine.validate_packet("PH7_ISO_UNDERAGE", {DocumentType.AADHAAR: iso_ext, DocumentType.BANK_PASSBOOK: pb_ok}, as_of=date(2024, 7, 1))

    out = {
        "phase4_identity": phase4_results,
        "phase4_contradictory_subhadra_readiness": sub_contra.readiness.value,
        "phase5_edu_fin": phase5_results,
        "phase6_indic_script": phase6_results,
        "phase7_date_normalization": phase7_results,
        "phase7_iso_underage_subhadra_readiness": sub_iso_underage.readiness.value,
        "manifest": manifest,
    }
    (OUT_ROOT / "phase4_7_results.json").write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
    print(json.dumps({k: v for k, v in out.items() if k != "manifest"}, indent=2, default=str))


if __name__ == "__main__":
    main()
