# DocuReady 2.0 — Lane B: Track B `DocumentExtractor` + Tesseract 5.5.5 Smoke Test Report

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 29 November 2026
**Container Image:** `docuready-lane-b-ocr:5.5.5` (`sha256:775712a9a78110bc55439b3c7b874a2b0fd30e92f6f21f0f41152608df978f33`)
**Source Snapshot:** `DocuReady` `main` @ `0e14a6ed4452c1e562da2df11df7e4f528045074` (**candidate snapshot only**)
**Evidence:** [`evidence/ocr/track-b/track_b_results.json`](../../../evidence/ocr/track-b/track_b_results.json), [`evidence/ocr/track-b/track_b.log`](../../../evidence/ocr/track-b/track_b.log), [`evidence/ocr/track-b/run_track_b_ocr.py`](../../../evidence/ocr/track-b/run_track_b_ocr.py)

---

## 1. Execution Scope & Hardening
- **Hardened Command:** `docker run --rm --network=none --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m --cap-drop=ALL --security-opt=no-new-privileges:true --cpus=2 --memory=2g --pids-limit=128 ...` (`uid=10001(evaluator)`, `:ro` source/inputs, `:rw` `/output`).
- **Inventory Breakdown (`35` PDFs):**
  - **Genuine OCR-Path Samples Evaluated:** `2` (`ADV_SCANNED_NO_TESSERACT.pdf` classified as ordinary `INCOME_CERT` rasterized sample; `ID_AADHAAR_DEGRADED_IMG.pdf` JPEG `q=30` `AADHAAR` image).
  - **Native-Text OCR-Bypass Controls (Reported Separately):** `32` (did not invoke Tesseract).
  - **Excluded Malformed PDF:** `1` (`corpus/adversarial/ADV_MALFORMED.pdf`).

---

## 2. Genuine OCR-Path Results (`n = 2` — Smoke Test Only, Not a Representative Benchmark)

| Sample | Expected Type | `DocumentExtractor` Result | Extracted Fields (`LOCAL_OCR`) | Outcome & Failure Analysis |
|---|---|---|---|---|
| `ADV_SCANNED_NO_TESSERACT.pdf` (`sha256: 3da84587...`) | `INCOME_CERT` | `INCOME_CERT`, `VALID` | `applicant_name`: `"Ananya Das"` $\to$ `"ANANYA DAS"` (`conf=0.865`); `annual_income`: `"120000"` $\to$ `"120000.0"` (`conf=0.900`) | **PASS (`2/2` fields)** via live Tesseract `5.5.5` |
| `ID_AADHAAR_DEGRADED_IMG.pdf` (`sha256: cfd8aab0...`) | `AADHAAR` | `AADHAAR`, `VALID` | `dob`: `"22/08/1992"` $\to$ `"1992-08-22"` (`conf=0.800`); `applicant_name`: `"SYNTHETIC DEGRADED IMAGE TEST"` (`AMBIGUOUS`, `conf=0.912`); `aadhaar_no`: **missing** | **PARTIAL / FAILURE**: `dob` extracted; watermark line captured as `applicant_name`, and masked `aadhaar_no` missed |

- **Disclosure:** `2` synthetic samples confirm end-to-end `DocumentExtractor` $\to$ Tesseract `5.5.5` execution (`LOCAL_OCR`) and expose a real watermark/regex failure on `ID_AADHAAR_DEGRADED_IMG.pdf`; they do **not** constitute a statistically representative OCR accuracy benchmark.

---

## 3. Post-Execution Independent Audit (Append-Only)

- **Ground-Truth Verification (`ADV_SCANNED_NO_TESSERACT.pdf`):** Confirmed ordinary OCR-path `INCOME_CERT` sample (not a negative control). Extracted `applicant_name` (`"Ananya Das"` $\to$ `"ANANYA DAS"`) and `annual_income` (`"120000"` $\to$ `120000.0`) match ground truth `2/2` (`100%`).
- **Ground-Truth Verification (`ID_AADHAAR_DEGRADED_IMG.pdf`):** Ground truth is `Kavita Swain` / `22/08/1992` / `XXXX XXXX 4321`. Document-level classification succeeded (`AADHAAR`, `VALID`), while field-level extraction was `1/3` (`dob` matched `1992-08-22`, `aadhaar_no` missed, `applicant_name` failed).
- **Watermark Root Cause & Confidence Meaning:** `extractor.py:64` runs regex patterns with `re.IGNORECASE`; on `ID_AADHAAR_DEGRADED_IMG.pdf`, the fallback `AADHAAR` name pattern (`extractor.py:993`) matched the top watermark `"SYNTHETIC DEGRADED IMAGE TEST"` before `"Kavita Swain"`. The reported `confidence: 0.912` reflects **Tesseract's OCR token confidence** on that line, **not** semantic field correctness.
- **Malformed PDF Separation:** `ADV_MALFORMED.pdf` (`FileDataError`) remains a separate parser negative control and was excluded from OCR execution.

---

## 4. Final Consistency Notice (Append-Only)

- **Two-Document Smoke Test Only:** Track B evaluated `2` genuine OCR-path PDFs (`32` native-text bypass controls kept separate; `ADV_MALFORMED.pdf` excluded as a parser negative control).
- **Classification vs. Field Correctness:** On `ID_AADHAAR_DEGRADED_IMG.pdf`, document classification (`AADHAAR`) is separate from field-level extraction correctness (`1/3`: `dob` `1992-08-22` matched; `applicant_name` failed by selecting watermark `"SYNTHETIC DEGRADED IMAGE TEST"` at OCR token confidence `0.912`; `aadhaar_no` `XXXX XXXX 4321` omitted).
- **Baseline & Code Caveat:** `0e14a6ed4452c1e562da2df11df7e4f528045074` is a candidate source snapshot only; no production-code fixes are implied or applied.
