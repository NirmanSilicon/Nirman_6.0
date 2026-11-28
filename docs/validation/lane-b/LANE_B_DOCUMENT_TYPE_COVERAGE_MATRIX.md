# DocuReady 2.0 — Lane B: Document Type Coverage Matrix

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Candidate Source Snapshot:** `$env:DOCUREADY_SOURCE` (`main` @ `0e14a6ed4452c1e562da2df11df7e4f528045074`)
**Evidence:** [`evidence/comprehensive/comprehensive_eval_results.json`](../../../evidence/comprehensive/comprehensive_eval_results.json)

---

## Support Classification Legend
- **SUPPORTED:** In `DocumentType` enum (`src/docuready/domain/models.py`), `slot_classifier.py` (`PRIMARY_ANCHOR_PATTERNS`), `extractor.py`, and at least one scheme pack (`odisha.subhadra` or `generic.demo`), and verified on native-vector PDFs.
- **PARTIALLY SUPPORTED:** Present in `DocumentType`/`slot_classifier.py`/`extractor.py`, but lacks key document fields, sub-type granularity, or live OCR verification.
- **UNSUPPORTED:** Absent from `DocumentType`, `slot_classifier.py`, and `extractor.py` (or explicitly rejected).

---

## Complete Document Type Inventory

| Category | Document Type | Status | Code & Pack Grounding | Native-Vector Live Test (`0e14a6ed`) |
|---|---|---|---|---|
| **Identity** | **Aadhaar Card** | **PARTIALLY SUPPORTED** | `DocumentType.AADHAAR`; `odisha.subhadra` slot (`[eng, ori]`); extracts `applicant_name`, `dob`, `gender`, `aadhaar_no` (masked `X` supported). **No `address` extraction, no QR parsing, no UIDAI verification.** | **VERIFIED** (`SUP_AADHAAR_MASKED`: classified `AADHAAR`, `4/4` fields matched) |
| **Identity** | **Passport** | **UNSUPPORTED** | Not in `DocumentType`, `slot_classifier.py`, `extractor.py`, or any pack. No MRZ/nationality/expiry extraction. | **VERIFIED REJECTED** (`UNSUP_PASSPORT`: `classified=None`, `is_uncertain=True`) |
| **Identity** | **PAN Card** | **UNSUPPORTED** | Not in `DocumentType`, `slot_classifier.py`, or `extractor.py`. Only regex helper `PAN_CARD` exists in `identifier_validation.py` (not wired to extractor). | **VERIFIED REJECTED** (`UNSUP_PAN`: `classified=None`, `is_uncertain=True`) |
| **Identity** | **Voter ID** | **UNSUPPORTED** | Not in `DocumentType`, `slot_classifier.py`, `extractor.py`, or any pack. | **VERIFIED REJECTED** (`UNSUP_VOTER_ID`: `classified=None`, `is_uncertain=True`) |
| **Identity** | **Driving Licence** | **UNSUPPORTED** | Not in `DocumentType`, `slot_classifier.py`, `extractor.py`, or any pack. | **VERIFIED REJECTED** (`UNSUP_DRIVING_LICENCE`: `classified=None`, `is_uncertain=True`) |
| **Identity** | **Ration Card** | **UNSUPPORTED** | Declarative `ration_card` slot listed in `packs/odisha.subhadra/pack.yaml`, but **no** `DocumentType.RATION_CARD`, **no** classifier anchor, **no** extractor branch, and **no** rules. | **VERIFIED REJECTED** (`UNSUP_RATION_CARD`: `classified=None`, `is_uncertain=True`) |
| **Identity** | **Birth Certificate** | **UNSUPPORTED** | Not in `DocumentType`, `slot_classifier.py`, `extractor.py`, or any pack. | **VERIFIED REJECTED** (`UNSUP_BIRTH_CERT`: `classified=None`, `is_uncertain=True`) |
| **Govt Cert** | **Income Certificate** | **SUPPORTED** | `DocumentType.INCOME_CERT`; `generic.demo` (`[eng, ori]`) & `odisha.subhadra` slot; extracts `applicant_name`, `father_name`, `annual_income`, `issue_date`, `certificate_no`, `state`. | **VERIFIED** (`SUP_INCOME_CERT`: classified `INCOME_CERT`, `6/6` fields matched) |
| **Govt Cert** | **Caste Certificate** | **SUPPORTED** | `DocumentType.CASTE_CERT`; `generic.demo` (`[eng, ori]`); extracts `applicant_name`, `father_name`, `caste_category`, `sub_caste`, `certificate_no`, `issue_date`, `state`. | **VERIFIED** (`SUP_CASTE_CERT`: classified `CASTE_CERT`, `5/5` tested fields matched) |
| **Govt Cert** | **Residence / Domicile Certificate** | **SUPPORTED** | `DocumentType.RESIDENCE_CERT`; `generic.demo` (`[eng, ori]`); extracts `applicant_name`, `father_name`, `state`, `certificate_no`, `issue_date`. | **VERIFIED** (`SUP_RESIDENCE_CERT`: classified `RESIDENCE_CERT`, `5/5` fields matched) |
| **Govt Cert** | **Other Eligibility Certificates** | **UNSUPPORTED** | No generic or other certificate types in `DocumentType`. | — |
| **Education** | **Class 10 Marksheet** | **PARTIALLY SUPPORTED** | Mapped to generic `DocumentType.MARKSHEET` (`HIGH SCHOOL CERTIFICATE\|BOARD OF SECONDARY` anchor); extracts `applicant_name`, `father_name`, `dob`, `roll_no`, `percentage`. | **VERIFIED** (`SUP_MARKSHEET`: classified `MARKSHEET`, `5/5` fields matched) |
| **Education** | **Class 12 Marksheet** | **PARTIALLY SUPPORTED** | No separate type; only matched if text contains generic `MARKSHEET` / `MARKS STATEMENT` anchor. | **NOT SEPARATELY EVALUATED** |
| **Education** | **University Marksheet** | **PARTIALLY SUPPORTED** | No separate type; no CGPA/SGPA/semester/degree extraction. | **NOT SEPARATELY EVALUATED** |
| **Education** | **School Leaving Certificate** | **UNSUPPORTED** | Not in `DocumentType`, `slot_classifier.py`, `extractor.py`, or any pack. | **VERIFIED REJECTED** (`UNSUP_SLC`: `classified=None`, `is_uncertain=True`) |
| **Financial** | **Bank Passbook** | **SUPPORTED** | `DocumentType.BANK_PASSBOOK`; `generic.demo` & `odisha.subhadra` (`[eng]`); extracts `applicant_name`, `account_no`, `ifsc`, `dbt_seeded`. | **VERIFIED** (`SUP_BANK_PASSBOOK`: classified `BANK_PASSBOOK`, `4/4` fields matched) |
| **Financial** | **Bank Statement** | **UNSUPPORTED** | Explicitly rejected from `BANK_PASSBOOK` by `BANK_STATEMENT_INDICATORS` in `slot_classifier.py`. | **VERIFIED REJECTED** (`UNSUP_BANK_STATEMENT`: `classified=None`, `is_uncertain=True`) |
| **Financial** | **Other Financial Proof** | **UNSUPPORTED** | No other financial `DocumentType` exists. | — |
| **Application / Supporting** | **Application Forms** | **SUPPORTED** | `DocumentType.APPLICATION_FORM`; `generic.demo` & `odisha.subhadra` slot; extracts `applicant_name`, `father_name`, `dob`, `caste_category`, `annual_income`, cert refs, `account_no`, `ifsc`. | **VERIFIED** (`SUP_APPLICATION_FORM`: classified `APPLICATION_FORM`, `4/4` tested fields matched) |
| **Application / Supporting** | **Utility Bills** | **UNSUPPORTED** | Not in `DocumentType`, `slot_classifier.py`, `extractor.py`, or any pack. | **VERIFIED REJECTED** (`UNSUP_UTILITY_BILL`: `classified=None`, `is_uncertain=True`) |
| **Application / Supporting** | **Other Evidence Documents** | **UNSUPPORTED** | No other supporting `DocumentType` exists. | — |
