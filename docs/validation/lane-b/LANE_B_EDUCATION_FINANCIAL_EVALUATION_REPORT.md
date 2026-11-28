# DocuReady 2.0 — Lane B: Education & Financial Document Evaluation Report (Phase 5)

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Evidence:** [`evidence/comprehensive/phase4_7/phase4_7_results.json`](../../../evidence/comprehensive/phase4_7/phase4_7_results.json) (`phase5_edu_fin`) & [`evidence/comprehensive/comprehensive_eval_results.json`](../../../evidence/comprehensive/comprehensive_eval_results.json)

---

## 1. Education Documents (`DocumentType.MARKSHEET`)

| ID | Specimen | Classified Type | Extracted Fields | Findings / Gaps |
|---|---|---|---|---|
| `EDU_CLASS10` | Class 10 (`HIGH SCHOOL CERTIFICATE EXAMINATION`) | `MARKSHEET` | `applicant_name`, `father_name`, `dob`, `roll_no`, `percentage` (`82.4`) | All 5 fields extracted accurately (native-vector). |
| `EDU_CLASS12` | Class 12 (`MARKS STATEMENT`) | `MARKSHEET` | `applicant_name`, `father_name`, `dob`, `roll_no`, `percentage` (`79.0`) | Matches only via generic `MARKSHEET`/`MARKS STATEMENT` anchor; no Class 10 vs. Class 12 distinction. |
| `EDU_UNIV_SGPA` | University Marksheet (`SGPA: 8.45`, no `%`) | `MARKSHEET` | `applicant_name`, `roll_no` | **`percentage`/SGPA/CGPA NOT extracted** when expressed as SGPA instead of `%`. |

## 2. Financial & Revenue Certificates (Native-Vector)
- **Income, Caste, Residence Certificates & Application Form:** Classified (`3/3` + `1/1`) and extracted cleanly in `comprehensive_eval_results.json` (`SUP_INCOME_CERT`, `SUP_CASTE_CERT`, `SUP_RESIDENCE_CERT`, `SUP_APPLICATION_FORM`).
- **Bank Passbook (`SUP_BANK_PASSBOOK`):** Classified `BANK_PASSBOOK`; extracted `applicant_name`, `account_no`, `ifsc`, `dbt_seeded`.
- **Bank Statement (`FIN_BANK_STATEMENT`):** Safely rejected (`classified_type=None`, `is_uncertain=True`: `"Document identifies as a bank statement, which cannot be accepted as a bank passbook"`).
