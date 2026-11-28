# DocuReady 2.0 — Lane B: Adversarial & Quality Evaluation Report

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Evidence:** [`evidence/comprehensive/comprehensive_eval_results.json`](../../../evidence/comprehensive/comprehensive_eval_results.json) (`adversarial_and_failure_tests`) & [`evidence/comprehensive/comprehensive_eval.log`](../../../evidence/comprehensive/comprehensive_eval.log)

---

## 1. Executed Adversarial & Failure Scenarios (Track B Native / Non-Tesseract)

| Scenario | Test Input / Artifact | Actual System Outcome | Status | Findings |
|---|---|---|---|---|
| **1. Scanned Image PDF (No Tesseract)** | `ADV_SCANNED_NO_TESSERACT.pdf` (`sha256: 3da84587...`) | `status = "UNREADABLE"`, `0` fields extracted | **VERIFIED (Fail-Closed)** | Without local Tesseract, `DocumentExtractor` fails closed to `UNREADABLE` instead of guessing or crashing. |
| **2. Malformed / Corrupted PDF** | `ADV_MALFORMED.pdf` (`sha256: f98f8288...`) | `status = "CORRUPTED"`, `0` fields extracted | **VERIFIED (Fail-Closed)** | Truncated `%PDF-1.4` stream is caught cleanly and marked `CORRUPTED`. |
| **3. Conflicting Primary Anchors** | `"INCOME CERTIFICATE\nCASTE CERTIFICATE\n..."` | `candidate_type = None`, `is_uncertain = True` | **VERIFIED (Fail-Closed)** | Rejects multi-type header collision (`Conflicting primary anchors detected from multiple types: INCOME_CERT, CASTE_CERT`). |
| **4. Bank Statement Masquerading as Passbook** | `UNSUP_BANK_STATEMENT.pdf` (`sha256: ae9445a0...`) | `candidate_type = None`, `is_uncertain = True` | **VERIFIED (Fail-Closed)** | `BANK_STATEMENT_INDICATORS` blocks Bank Statement from matching `BANK_PASSBOOK`. |
| **5. Clean `odisha.subhadra` Packet** | `SUP_AADHAAR_MASKED` + `SUP_BANK_PASSBOOK` | `readiness = "NO_ISSUES_FOUND"` (`PASS`) | **VERIFIED** | Masked Aadhaar (`XXXX XXXX 9012`) + matching passbook passes cleanly (`as_of=2024-07-01`). |
| **6. Underage `odisha.subhadra` Packet (`10/08/2006`)** | `ADV_SUB_UNDERAGE_AADHAAR.pdf` + `SUP_BANK_PASSBOOK` | `readiness = "NEEDS_CHECKS"` (`REVIEW`), **not** `NOT_READY` | **VERIFIED (Finding / Limitation)** | `parse_and_normalize_date("10/08/2006")` marks `dob` as `EvidenceState.AMBIGUOUS` (`10 <= 12` and `08 <= 12`), causing `resolve_outcome()` to downgrade `RULE-SUB-AGE-01` from `FAIL` to `REVIEW`. |
| **7. Clean `generic.demo` (`draft`) 6-Doc Packet** | All 6 `generic.demo` supported docs (`SUP_INCOME_CERT` has `10/02/2024`) | `readiness = "NEEDS_CHECKS"` (`RULE-EXP-01: REVIEW / CANNOT_CONFIRM`) | **VERIFIED (Finding / Limitation)** | Same `DD <= 12` ambiguity in `Issue Date: 10/02/2024` causes `RULE-EXP-01` to abstain (`REVIEW`) instead of `PASS`. |
| **8. Contradictory Applicant Name (`generic.demo`)** | `ADV_MISMATCH_PASSBOOK.pdf` (`"Priyadarshini Mohanty"` vs `"Ananya Das"`) | `readiness = "NOT_READY"` (`FAIL`) | **VERIFIED** | `RULE-NAME-01` (`match_across`) detects cross-document name conflict and emits `NOT_READY`. |

---

## 2. Blocked Quality & OCR-Dependent Adversarial Tests

Because Tesseract OCR is not installed on this Windows host (`find_tesseract_binary_with_source()` $\to$ `(None, 'none')`), the following scanned-image quality perturbations could **not** be executed via `DocumentExtractor` (Track B) and remain **BLOCKED**:
- Low-resolution scan, Gaussian blur, rotation, skew, cropping, low contrast, JPEG compression, glare/shadows, camera photograph, partial occlusion, and illegible scanned fields.
- Track A simulated results for `blur`, `rotation`, `low_dpi`, `low_contrast`, `jpeg_low_quality`, and `overlapping_stamp` are **not** substituted as Track B production OCR evidence.
