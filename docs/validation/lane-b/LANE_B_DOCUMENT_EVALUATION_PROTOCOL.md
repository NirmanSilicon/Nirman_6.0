# DocuReady 2.0 — Lane B: Comprehensive Document Evaluation Protocol

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Publishing Workspace:** `<repo-root>` (`akriti` branch)

---

## 1. Track Separation & Experimental Rules
- **Track A (Historical Simulated OCR):** 48-packet `eval/harness.py` benchmark (`SYN_TEST_000`–`SYN_TEST_047`); frozen and reported separately in `LANE_B_B1_BASELINE_REPRODUCTION_REPORT.md`.
- **Track B (Production `DocumentExtractor` + `PackExecutionEngine`):**
  - **Native-Vector Path (`PyMuPDF`):** Executed live on synthetic native-vector PDFs ([`evidence/comprehensive/run_comprehensive_eval.py`](../../../evidence/comprehensive/run_comprehensive_eval.py)).
  - **Scanned OCR Path (`Tesseract`):** **BLOCKED** on this Windows host (`find_tesseract_binary_with_source()` returned `(None, 'none')`; `eng` binary unavailable).
- **Track C (Multilingual & Indic-Script Evaluation):**
  - **Deterministic Normalizer Layer (`normalizer.py`):** Executed live (`normalize_indic_digits`, `normalize_cert_number`, `parse_and_normalize_date`, `normalize_name`).
  - **Live Indic OCR (`hin`, `ori`):** **BLOCKED** (`Tesseract OCR binary not found`, `hin` & `ori` `tessdata` unavailable).
- **Non-Negotiable Rules:** No production code, thresholds, or ground-truth labels were modified; no real Aadhaar/passport/financial records were used; all synthetic PDFs carry `"SYNTHETIC TEST DOCUMENT - NOT VALID FOR OFFICIAL USE"` and non-live/masked identifiers (`XXXX XXXX 9012`, `SYN/*`).

## 2. Outcome Vocabulary Mapping (`docuready/domain/enums.py`)
- **Packet Readiness (`Readiness`):** `NO_ISSUES_FOUND` (`PASS`), `NOT_READY` (`FAIL`), `NEEDS_CHECKS` (`REVIEW` / abstention).
- **Finding Status (`Status`):** `PASS`, `FAIL`, `WARN`, `REVIEW`, `MISSING`, `NOT_APPLICABLE`.
- **Reason Codes (`ReasonCode`):** `CONFIRMED_OK`, `DEFECT_CONFIRMED`, `DEFECT_PROBABLE`, `EVIDENCE_UNCERTAIN`, `CANNOT_CONFIRM`, `INSUFFICIENT_DATA`, `DOC_ABSENT`, `ADVISORY_RULE_CAP`, `WRONG_DOCUMENT_TYPE`.
- **Evidence States (`EvidenceState`):** Canonical `VERIFIED`, `PROVISIONAL`, `UNCERTAIN` (mapped from transitional `VERIFIED_TEXT`, `OCR_EXTRACTED`, `AMBIGUOUS`, `LOW_CONFIDENCE`, `NOT_FOUND`, `UNREADABLE`, `CONFLICTING`).

## 3. Reproducibility Instructions
```powershell
$env:DOCUREADY_SOURCE = "<path-to-DocuReady-checkout>"  # Must be at candidate SHA 0e14a6ed4452c1e562da2df11df7e4f528045074
$env:PYTHONPATH = "$env:DOCUREADY_SOURCE\src;$env:DOCUREADY_SOURCE"
$logFile = "evidence\comprehensive\comprehensive_eval.log"
python "evidence\comprehensive\run_comprehensive_eval.py" 2>&1 | Tee-Object -FilePath $logFile
```
- **Dataset & Results Artifacts:** [`evidence/comprehensive/comprehensive_eval_results.json`](../../../evidence/comprehensive/comprehensive_eval_results.json), [`evidence/comprehensive/comprehensive_eval.log`](../../../evidence/comprehensive/comprehensive_eval.log), and `evidence/comprehensive/corpus/` (`supported/`, `unsupported/`, `adversarial/`).
