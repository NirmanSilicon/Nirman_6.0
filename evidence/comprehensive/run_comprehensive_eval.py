"""Comprehensive Document Evaluation Program Runner (Phases C, D, E, F, G, H).

Strictly read-only against $DOCUREADY_SOURCE.
Writes all datasets, manifests, hashes, and raw outputs under:
  <repo-root>/evidence/comprehensive/
"""

from __future__ import annotations

import hashlib
import io
import json
import math
from datetime import date
from pathlib import Path
from typing import Any, Dict, List

import pymupdf as fitz
from PIL import Image, ImageDraw
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from docuready.domain.enums import ExtractionMethod, Readiness
from docuready.domain.models import DocumentType
from docuready.ingest.extractor import DocumentExtractor
from docuready.ingest.slot_classifier import classify_document_content
from docuready.ingest.tesseract_discovery import (
    check_ocr_language_availability,
    find_tesseract_binary_with_source,
)
from docuready.normalize.normalizer import (
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
OUT_ROOT = Path(__file__).resolve().parent
B1_TRACK_A = Path(__file__).resolve().parent.parent / "b1" / "track-a"


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


def make_scanned_image_pdf(path: Path, lines: List[str]) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (1200, 1600), "white")
    draw = ImageDraw.Draw(img)
    y = 60
    draw.text((40, 20), "SYNTHETIC SCANNED TEST DOCUMENT - NOT VALID FOR OFFICIAL USE", fill="black")
    for ln in lines:
        draw.text((40, y), ln, fill="black")
        y += 36
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    page.insert_image(fitz.Rect(0, 0, 595, 842), stream=buf.getvalue())
    doc.save(str(path))
    doc.close()
    return sha256_bytes(path.read_bytes())


def make_malformed_pdf(path: Path) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"%PDF-1.4\n%%CORRUPTED_TRUNCATED_STREAM_FOR_TESTING\n")
    return sha256_bytes(path.read_bytes())


def phase_d_abstention_taxonomy() -> Dict[str, Any]:
    manifest = json.loads((B1_TRACK_A / "run1_data" / "test" / "manifest.json").read_text(encoding="utf-8"))
    hist = json.loads((SOURCE_ROOT / "eval" / "reports" / "t4_1_packet_audit.json").read_text(encoding="utf-8"))
    m_by_id = {s["packet_id"]: s for s in manifest["samples"]}
    reviews = [p for p in hist["packets"] if p["outcome"] == "REVIEW"]

    by_pert: Dict[str, int] = {}
    by_state: Dict[str, int] = {}
    by_cat: Dict[str, Dict[str, Any]] = {
        "OCR_UNCERTAINTY_PROVISIONAL": {"count": 0, "packets": [], "evidence": "calibrated_prob in [0.60, 0.85) -> PROVISIONAL -> resolve_outcome() downgrades to NEEDS_CHECKS"},
        "OCR_UNCERTAINTY_LOW_CONFIDENCE": {"count": 0, "packets": [], "evidence": "calibrated_prob < 0.60 -> UNCERTAIN -> fail-closed to NEEDS_CHECKS"},
        "UNREADABLE_OR_NEGATIVE_CONTROL": {"count": 0, "packets": [], "evidence": "aadhaar_doc.status == UNREADABLE (blur/low_contrast defective or wrong_doc_in_slot) + OCR uncertainty"},
    }
    for p in reviews:
        pid = p["packet_id"]
        pert = p["perturbation"]
        st = p["evidence_state"]
        by_pert[pert] = by_pert.get(pert, 0) + 1
        by_state[st] = by_state.get(st, 0) + 1
        m_rec = m_by_id[pid]
        if (pert in ("blur", "low_contrast") and m_rec["is_defective"]) or p["negative_control"] == "wrong_doc_in_slot":
            cat = "UNREADABLE_OR_NEGATIVE_CONTROL"
        elif st == "PROVISIONAL":
            cat = "OCR_UNCERTAINTY_PROVISIONAL"
        else:
            cat = "OCR_UNCERTAINTY_LOW_CONFIDENCE"
        by_cat[cat]["count"] += 1
        by_cat[cat]["packets"].append(pid)

    for cat, info in by_cat.items():
        info["pct_of_42_reviews"] = round(100.0 * info["count"] / len(reviews), 2)
        info["pct_of_48_test"] = round(100.0 * info["count"] / 48.0, 2)

    return {
        "total_reviews": len(reviews),
        "total_test": 48,
        "by_evidence_state": by_state,
        "by_perturbation": by_pert,
        "taxonomy": by_cat,
    }


def main() -> None:
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    corpus_dir = OUT_ROOT / "corpus"
    extractor = DocumentExtractor()

    tess_bin, tess_src = find_tesseract_binary_with_source()
    lang_checks = {lang: check_ocr_language_availability([lang]) for lang in ("eng", "hin", "ori")}

    # --- Supported Document Types (7 types, clean native-vector PDFs) ---
    supported_specs = [
        {
            "id": "SUP_AADHAAR_MASKED",
            "category": "Identity",
            "doc_type_label": "Aadhaar (Masked)",
            "expected_type": DocumentType.AADHAAR,
            "lines": [
                "UNIQUE IDENTIFICATION AUTHORITY OF INDIA",
                "Government of India",
                "Name: Ananya Das",
                "DOB: 15/05/1990",
                "Gender: FEMALE",
                "Aadhaar Number: XXXX XXXX 9012",
                "Address: Plot 14, Saheed Nagar, Bhubaneswar, Odisha 751007",
            ],
            "gt": {"applicant_name": "Ananya Das", "dob": "1990-05-15", "gender": "FEMALE", "aadhaar_no": "XXXXXXXX9012"},
        },
        {
            "id": "SUP_INCOME_CERT",
            "category": "Government Certificate",
            "doc_type_label": "Income Certificate",
            "expected_type": DocumentType.INCOME_CERT,
            "lines": [
                "GOVERNMENT OF ODISHA",
                "INCOME CERTIFICATE",
                "Certificate No: SYN/INC/2024/0001",
                "Issue Date: 10/02/2024",
                "This is to certify that Ananya Das, Son/Daughter of Ramesh Das, resident of Khordha.",
                "Annual Family Income (in figures): Rs. 1,20,000",
            ],
            "gt": {"applicant_name": "Ananya Das", "father_name": "Ramesh Das", "annual_income": 120000.0, "issue_date": "2024-02-10", "certificate_no": "SYN/INC/2024/0001", "state": "ODISHA"},
        },
        {
            "id": "SUP_CASTE_CERT",
            "category": "Government Certificate",
            "doc_type_label": "Caste Certificate",
            "expected_type": DocumentType.CASTE_CERT,
            "lines": [
                "GOVERNMENT OF ODISHA",
                "CASTE CERTIFICATE",
                "Certificate No: SYN/CST/2024/0002",
                "Issue Date: 12/02/2024",
                "Applicant Name: Ananya Das",
                "Father Name: Ramesh Das",
                "Recognized Category: OBC",
                "Sub-Caste: Teli",
            ],
            "gt": {"applicant_name": "Ananya Das", "father_name": "Ramesh Das", "caste_category": "OBC", "certificate_no": "SYN/CST/2024/0002", "issue_date": "2024-02-12", "state": "ODISHA"},
        },
        {
            "id": "SUP_RESIDENCE_CERT",
            "category": "Government Certificate",
            "doc_type_label": "Residence / Domicile Certificate",
            "expected_type": DocumentType.RESIDENCE_CERT,
            "lines": [
                "GOVERNMENT OF ODISHA",
                "RESIDENCE CERTIFICATE",
                "Certificate No: SYN/RES/2024/0003",
                "Issue Date: 15/02/2024",
                "Applicant Full Name: Ananya Das",
                "Father Name: Ramesh Das",
                "Domicile State: Odisha",
            ],
            "gt": {"applicant_name": "Ananya Das", "father_name": "Ramesh Das", "state": "ODISHA", "certificate_no": "SYN/RES/2024/0003", "issue_date": "2024-02-15"},
        },
        {
            "id": "SUP_MARKSHEET",
            "category": "Education",
            "doc_type_label": "Academic Marksheet (Class 10)",
            "expected_type": DocumentType.MARKSHEET,
            "lines": [
                "BOARD OF SECONDARY EDUCATION ODISHA",
                "HIGH SCHOOL CERTIFICATE EXAMINATION",
                "Candidate Name: Ananya Das",
                "Father Name: Ramesh Das",
                "Date of Birth: 15/05/1990",
                "Roll No: SYN2024001",
                "AGGREGATE RESULT: PASS (78.5%)",
            ],
            "gt": {"applicant_name": "Ananya Das", "father_name": "Ramesh Das", "dob": "1990-05-15", "roll_no": "SYN2024001", "percentage": 78.5},
        },
        {
            "id": "SUP_BANK_PASSBOOK",
            "category": "Financial",
            "doc_type_label": "Bank Passbook",
            "expected_type": DocumentType.BANK_PASSBOOK,
            "lines": [
                "STATE BANK OF INDIA",
                "SAVINGS BANK PASSBOOK",
                "Account Holder Name: Ananya Das",
                "Account Number: 00001234567890",
                "Bank IFSC Code: SBIN0000123",
                "DBT / Aadhaar Seeding: ACTIVE",
            ],
            "gt": {"applicant_name": "Ananya Das", "account_no": "00001234567890", "ifsc": "SBIN0000123", "dbt_seeded": True},
        },
        {
            "id": "SUP_APPLICATION_FORM",
            "category": "Application",
            "doc_type_label": "Scheme Application Form",
            "expected_type": DocumentType.APPLICATION_FORM,
            "lines": [
                "COMMON SCHOLARSHIP PORTAL",
                "APPLICATION ACKNOWLEDGEMENT",
                "Application ID: SYN-APP-2024-01",
                "Applicant Full Name: Ananya Das",
                "Father Name: Ramesh Das",
                "Date of Birth (DOB): 15/05/1990",
                "Social Category: OBC",
                "Declared Annual Family Income: 120000",
                "Income Certificate Reference No: SYN/INC/2024/0001",
                "Caste Certificate Reference No: SYN/CST/2024/0002",
                "Residence Certificate Reference No: SYN/RES/2024/0003",
                "Bank Account Number: 00001234567890",
                "Bank IFSC Code: SBIN0000123",
            ],
            "gt": {"applicant_name": "Ananya Das", "dob": "1990-05-15", "annual_income": 120000.0, "ifsc": "SBIN0000123"},
        },
    ]

    supported_results = []
    manifest_entries = []
    extracted_by_type: Dict[DocumentType, Any] = {}

    for spec in supported_specs:
        pdf_path = corpus_dir / "supported" / f"{spec['id']}.pdf"
        fhash = make_text_pdf(pdf_path, spec["lines"])
        # Classify without expected_type hint to test true recognition
        cls_res = classify_document_content("\n".join(spec["lines"]))
        ext_doc = extractor.extract_document(str(pdf_path), expected_type=spec["expected_type"])
        extracted_by_type[spec["expected_type"]] = ext_doc

        field_checks = {}
        for k, exp_v in spec["gt"].items():
            fld = ext_doc.fields.get(k)
            actual_v = fld.normalized_value if fld else None
            if hasattr(actual_v, "isoformat"):
                actual_v = actual_v.isoformat()
            field_checks[k] = {
                "expected": exp_v,
                "actual": actual_v,
                "exact_match": str(actual_v).upper() == str(exp_v).upper() if actual_v is not None else False,
            }

        supported_results.append({
            "id": spec["id"],
            "category": spec["category"],
            "doc_type_label": spec["doc_type_label"],
            "expected_type": spec["expected_type"].value,
            "classified_type": cls_res.candidate_type.value if cls_res.candidate_type else None,
            "classification_confident": cls_res.is_confident,
            "classification_correct": cls_res.candidate_type == spec["expected_type"],
            "extraction_method": ext_doc.fields[next(iter(ext_doc.fields))].extraction_method if ext_doc.fields else "NONE",
            "doc_status": ext_doc.status,
            "field_checks": field_checks,
            "pdf_sha256": fhash,
        })
        manifest_entries.append({"id": spec["id"], "type": spec["doc_type_label"], "language": "eng", "condition": "clean_native_vector", "sha256": fhash})

    # --- Unsupported Document Types (9 types, synthetic negative controls) ---
    unsupported_specs = [
        ("UNSUP_PASSPORT", "Passport", ["REPUBLIC OF INDIA", "PASSPORT", "Passport No: Z0000000", "Name: Ananya Das", "Nationality: INDIAN", "Date of Birth: 15/05/1990", "Date of Issue: 01/01/2020", "Date of Expiry: 31/12/2030", "P<INDDAS<<ANANYA<<<<<<<<<<<<<<<<<<<<<<<<<<<<", "Z0000000<0IND9005151F3012319<<<<<<<<<<<<<<00"]),
        ("UNSUP_PAN", "PAN Card", ["INCOME TAX DEPARTMENT", "GOVT. OF INDIA", "Permanent Account Number Card", "ABCDE0000F", "Name: Ananya Das", "Date of Birth: 15/05/1990"]),
        ("UNSUP_VOTER_ID", "Voter ID", ["ELECTION COMMISSION OF INDIA", "ELECTORS PHOTO IDENTITY CARD", "EPIC No: SYN0000001", "Name: Ananya Das", "Age: 34"]),
        ("UNSUP_DRIVING_LICENCE", "Driving Licence", ["INDIAN UNION DRIVING LICENCE", "OD02 20200000001", "Name: Ananya Das", "DOB: 15/05/1990", "Valid Till: 31/12/2040"]),
        ("UNSUP_RATION_CARD", "Ration Card", ["FOOD SUPPLIES & CONSUMER WELFARE DEPARTMENT", "RATION CARD", "Card No: SYN-RC-0001", "Head of Family: Ananya Das"]),
        ("UNSUP_BIRTH_CERT", "Birth Certificate", ["GOVERNMENT OF ODISHA", "BIRTH CERTIFICATE", "Registration No: SYN-BC-1990", "Name: Ananya Das", "Date of Birth: 15/05/1990"]),
        ("UNSUP_SLC", "School Leaving Certificate", ["SCHOOL LEAVING CERTIFICATE", "Transfer Certificate No: SYN-SLC-01", "Student Name: Ananya Das", "Date of Birth: 15/05/1990"]),
        ("UNSUP_BANK_STATEMENT", "Bank Statement", ["STATE BANK OF INDIA", "BANK STATEMENT", "STATEMENT OF ACCOUNT", "Statement Period: 01/01/2024 to 31/03/2024", "Closing Balance: 45000.00"]),
        ("UNSUP_UTILITY_BILL", "Utility Bill", ["TP CENTRAL ODISHA DISTRIBUTION LTD", "ELECTRICITY BILL", "Consumer No: SYN-EL-0001", "Name: Ananya Das", "Amount Due: Rs. 850"]),
    ]

    unsupported_results = []
    for uid, label, lines in unsupported_specs:
        pdf_path = corpus_dir / "unsupported" / f"{uid}.pdf"
        fhash = make_text_pdf(pdf_path, lines)
        cls_res = classify_document_content("\n".join(lines))
        unsupported_results.append({
            "id": uid,
            "doc_type_label": label,
            "classified_type": cls_res.candidate_type.value if cls_res.candidate_type else None,
            "is_uncertain": cls_res.is_uncertain,
            "uncertainty_reason": cls_res.uncertainty_reason,
            "safely_rejected_as_unsupported": cls_res.candidate_type is None and cls_res.is_uncertain,
            "pdf_sha256": fhash,
        })
        manifest_entries.append({"id": uid, "type": label, "language": "eng", "condition": "clean_native_vector_unsupported", "sha256": fhash})

    # --- Phase E/F/G: Scanned PDF (no Tesseract), Multilingual Normalization, Adversarial Tests ---
    scanned_pdf = corpus_dir / "adversarial" / "ADV_SCANNED_NO_TESSERACT.pdf"
    scan_hash = make_scanned_image_pdf(scanned_pdf, ["INCOME CERTIFICATE", "Applicant Name: Ananya Das", "Annual Income: 120000"])
    scan_ext = extractor.extract_document(str(scanned_pdf), expected_type=DocumentType.INCOME_CERT, ocr_langs=["eng", "ori"])

    malformed_pdf = corpus_dir / "adversarial" / "ADV_MALFORMED.pdf"
    mal_hash = make_malformed_pdf(malformed_pdf)
    mal_ext = extractor.extract_document(str(malformed_pdf), expected_type=DocumentType.AADHAAR)

    conflicting_anchor_cls = classify_document_content(
        "INCOME CERTIFICATE\nCASTE CERTIFICATE\nApplicant Name: Ananya Das"
    )

    # Pack validation scenarios (generic.demo [draft] & odisha.subhadra [demo_snapshot])
    subhadra_engine = PackExecutionEngine(SOURCE_ROOT / "packs" / "odisha.subhadra")
    generic_engine = PackExecutionEngine(SOURCE_ROOT / "packs" / "generic.demo", allow_draft=True)

    # 1. Clean Subhadra packet (Aadhaar + Passbook) -> expected NO_ISSUES_FOUND
    sub_clean_res = subhadra_engine.validate_packet(
        "ADV_SUB_CLEAN",
        {DocumentType.AADHAAR: extracted_by_type[DocumentType.AADHAAR], DocumentType.BANK_PASSBOOK: extracted_by_type[DocumentType.BANK_PASSBOOK]},
        as_of=date(2024, 7, 1),
    )

    # 2. Underage Subhadra packet (DOB 2006) -> expected NOT_READY
    underage_aadhaar_pdf = corpus_dir / "adversarial" / "ADV_SUB_UNDERAGE_AADHAAR.pdf"
    make_text_pdf(underage_aadhaar_pdf, [
        "UNIQUE IDENTIFICATION AUTHORITY OF INDIA",
        "Name: Ananya Das",
        "DOB: 10/08/2006",
        "Gender: FEMALE",
        "Aadhaar Number: XXXX XXXX 9012",
    ])
    underage_doc = extractor.extract_document(str(underage_aadhaar_pdf), expected_type=DocumentType.AADHAAR)
    sub_underage_res = subhadra_engine.validate_packet(
        "ADV_SUB_UNDERAGE",
        {DocumentType.AADHAAR: underage_doc, DocumentType.BANK_PASSBOOK: extracted_by_type[DocumentType.BANK_PASSBOOK]},
        as_of=date(2024, 7, 1),
    )

    # 3. Clean generic.demo 6-doc packet
    gen_clean_docs = {
        dt: extracted_by_type[dt]
        for dt in (
            DocumentType.APPLICATION_FORM,
            DocumentType.INCOME_CERT,
            DocumentType.CASTE_CERT,
            DocumentType.RESIDENCE_CERT,
            DocumentType.MARKSHEET,
            DocumentType.BANK_PASSBOOK,
        )
    }
    gen_clean_res = generic_engine.validate_packet("ADV_GEN_CLEAN", gen_clean_docs, as_of=date(2024, 7, 1))

    # 4. Contradictory name on Bank Passbook in generic.demo
    mismatch_pb_pdf = corpus_dir / "adversarial" / "ADV_MISMATCH_PASSBOOK.pdf"
    make_text_pdf(mismatch_pb_pdf, [
        "STATE BANK OF INDIA",
        "SAVINGS BANK PASSBOOK",
        "Account Holder Name: Priyadarshini Mohanty",
        "Account Number: 00001234567890",
        "Bank IFSC Code: SBIN0000123",
    ])
    mismatch_pb_doc = extractor.extract_document(str(mismatch_pb_pdf), expected_type=DocumentType.BANK_PASSBOOK)
    gen_mismatch_docs = dict(gen_clean_docs)
    gen_mismatch_docs[DocumentType.BANK_PASSBOOK] = mismatch_pb_doc
    gen_mismatch_res = generic_engine.validate_packet("ADV_GEN_NAME_MISMATCH", gen_mismatch_docs, as_of=date(2024, 7, 1))

    # 5. Deterministic Indic normalizer checks (non-Tesseract layer)
    indic_norm_checks = {
        "odia_digits_to_ascii": normalize_indic_digits("୨୦୨୪-୦୧-୧୫"),
        "devanagari_digits_to_ascii": normalize_indic_digits("२०२४-०१-१५"),
        "odia_cert_no": normalize_cert_number("SYN/INC/୨୦୨୪/୦୦୦୧"),
        "devanagari_cert_no": normalize_cert_number("SYN/INC/२०२४/०००१"),
        "odia_date_parse": str(parse_and_normalize_date("୧୫/୦୫/୧୯୯୦")),
        "indic_only_name": normalize_name("ଅନନ୍ୟା ଦାସ"),
    }

    # Aggregate metrics for Native-Vector Supported & Unsupported Classification
    n_sup = len(supported_results)
    sup_cls_ok = sum(1 for r in supported_results if r["classification_correct"])
    n_unsup = len(unsupported_results)
    unsup_rej_ok = sum(1 for r in unsupported_results if r["safely_rejected_as_unsupported"])

    total_fields = sum(len(r["field_checks"]) for r in supported_results)
    matched_fields = sum(1 for r in supported_results for fc in r["field_checks"].values() if fc["exact_match"])

    output = {
        "environment": {
            "tesseract_binary": str(tess_bin) if tess_bin else None,
            "tesseract_source": tess_src,
            "language_availability": lang_checks,
            "track_b_ocr_status": "BLOCKED" if tess_bin is None else "AVAILABLE",
            "track_c_indic_ocr_status": "BLOCKED" if tess_bin is None else "AVAILABLE",
        },
        "supported_native_vector_results": supported_results,
        "unsupported_negative_results": unsupported_results,
        "summary_metrics": {
            "supported_classification_accuracy": {"k": sup_cls_ok, "n": n_sup, "rate": round(sup_cls_ok / n_sup, 4), "wilson_95": wilson_95(sup_cls_ok, n_sup)},
            "unsupported_rejection_rate": {"k": unsup_rej_ok, "n": n_unsup, "rate": round(unsup_rej_ok / n_unsup, 4), "wilson_95": wilson_95(unsup_rej_ok, n_unsup)},
            "native_vector_field_exact_match": {"k": matched_fields, "n": total_fields, "rate": round(matched_fields / total_fields, 4), "wilson_95": wilson_95(matched_fields, total_fields)},
        },
        "adversarial_and_failure_tests": {
            "scanned_pdf_without_tesseract": {"status": scan_ext.status, "fields_extracted": len(scan_ext.fields), "sha256": scan_hash},
            "malformed_pdf": {"status": mal_ext.status, "fields_extracted": len(mal_ext.fields), "sha256": mal_hash},
            "conflicting_anchors": {"candidate_type": conflicting_anchor_cls.candidate_type, "is_uncertain": conflicting_anchor_cls.is_uncertain, "reason": conflicting_anchor_cls.uncertainty_reason},
            "subhadra_clean": {"readiness": sub_clean_res.readiness.value},
            "subhadra_underage": {"readiness": sub_underage_res.readiness.value},
            "generic_clean": {"readiness": gen_clean_res.readiness.value},
            "generic_name_mismatch": {"readiness": gen_mismatch_res.readiness.value},
        },
        "indic_normalizer_checks": indic_norm_checks,
        "phase_d_abstention_taxonomy": phase_d_abstention_taxonomy(),
        "corpus_manifest": manifest_entries,
    }

    (OUT_ROOT / "comprehensive_eval_results.json").write_text(
        json.dumps(output, indent=2, default=str), encoding="utf-8"
    )
    print(json.dumps({k: v for k, v in output.items() if k != "corpus_manifest"}, indent=2, default=str))


if __name__ == "__main__":
    main()
