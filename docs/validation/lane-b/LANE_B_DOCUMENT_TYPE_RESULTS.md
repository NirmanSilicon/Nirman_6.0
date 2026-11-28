# DocuReady 2.0 — Lane B: Document-Type Results (Track B Native-Vector)

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Evidence:** [`evidence/comprehensive/comprehensive_eval_results.json`](../../../evidence/comprehensive/comprehensive_eval_results.json) & [`evidence/comprehensive/comprehensive_eval.log`](../../../evidence/comprehensive/comprehensive_eval.log)

---

## 1. Aggregate Native-Vector Metrics (Clean Synthetic Corpus)

*Note: Metrics below reflect **native-vector (`NATIVE_VECTOR`) PyMuPDF extraction** and `classify_document_content()` on clean synthetic PDFs. Small sample denominators are stated explicitly with 95% Wilson CIs.*

| Metric | Level | Numerator (`k`) | Denominator (`n`) | Rate | 95% Wilson CI | Status |
|---|---|---:|---:|---:|---|---|
| **Supported-Type Classification Accuracy** | Document | `7` | `7` | `1.0000` | `[0.6457, 1.0000]` | **VERIFIED (Native)** |
| **Unsupported-Type Safe Rejection Rate** | Document | `9` | `9` | `1.0000` | `[0.7009, 1.0000]` | **VERIFIED (Native)** |
| **Native-Vector Field Exact-Match Accuracy** | Field | `34` | `34` | `1.0000` | `[0.8985, 1.0000]` | **VERIFIED (Native)** |
| **Production Scanned OCR Accuracy / CER / WER** | Document / Char | — | — | — | — | **BLOCKED** (No Tesseract) |

---

## 2. Per-Document-Type Native-Vector Results (`7 / 7` Supported Types)

| Document ID | `DocumentType` | Classified Correctly? | Extraction Method | Fields Tested (`k / n` Exact Match) | PDF SHA-256 |
|---|---|---|---|---:|---|
| `SUP_AADHAAR_MASKED` | `AADHAAR` | Yes (`AADHAAR`) | `NATIVE_VECTOR` | `4 / 4` (`applicant_name`, `dob`, `gender`, `aadhaar_no`) | `805f547b...` |
| `SUP_INCOME_CERT` | `INCOME_CERT` | Yes (`INCOME_CERT`) | `NATIVE_VECTOR` | `6 / 6` (`applicant_name`, `father_name`, `annual_income`, `issue_date`, `certificate_no`, `state`) | `b4cefa55...` |
| `SUP_CASTE_CERT` | `CASTE_CERT` | Yes (`CASTE_CERT`) | `NATIVE_VECTOR` | `6 / 6` (`applicant_name`, `father_name`, `caste_category`, `certificate_no`, `issue_date`, `state`) | `6c758e52...` |
| `SUP_RESIDENCE_CERT` | `RESIDENCE_CERT` | Yes (`RESIDENCE_CERT`) | `NATIVE_VECTOR` | `5 / 5` (`applicant_name`, `father_name`, `state`, `certificate_no`, `issue_date`) | `9a8c3c2f...` |
| `SUP_MARKSHEET` | `MARKSHEET` | Yes (`MARKSHEET`) | `NATIVE_VECTOR` | `5 / 5` (`applicant_name`, `father_name`, `dob`, `roll_no`, `percentage`) | `b1df94d0...` |
| `SUP_BANK_PASSBOOK` | `BANK_PASSBOOK` | Yes (`BANK_PASSBOOK`) | `NATIVE_VECTOR` | `4 / 4` (`applicant_name`, `account_no`, `ifsc`, `dbt_seeded`) | `7a3f0392...` |
| `SUP_APPLICATION_FORM` | `APPLICATION_FORM` | Yes (`APPLICATION_FORM`) | `NATIVE_VECTOR` | `4 / 4` (`applicant_name`, `dob`, `annual_income`, `ifsc`) | `b177f621...` |

---

## 3. Unsupported Document Rejection Results (`9 / 9` Rejected Safely)

All `9` synthetic unsupported documents (`UNSUP_PASSPORT`, `UNSUP_PAN`, `UNSUP_VOTER_ID`, `UNSUP_DRIVING_LICENCE`, `UNSUP_RATION_CARD`, `UNSUP_BIRTH_CERT`, `UNSUP_SLC`, `UNSUP_BANK_STATEMENT`, `UNSUP_UTILITY_BILL`) returned `classified_type = None` and `is_uncertain = True` (`100%` safe rejection, `0` false positives).
