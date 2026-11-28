# DocuReady 2.0 — Lane B: OCR Environment Verification Report (Phase 3)

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Overall OCR Environment Status:** **BLOCKED** (no Tesseract binary, `tessdata`, or Windows package manager available for isolated provisioning)

---

## 1. Track Separation
- **Track A (Historical Simulated OCR):** `eval/harness.py` simulated features (`SYN_TEST_000`–`SYN_TEST_047`) — **VERIFIED** separately; **not** production OCR evidence.
- **Track B Native-Vector (`PyMuPDF`):** `DocumentExtractor` native-vector PDF text path — **VERIFIED** on synthetic native-vector PDFs (`pymupdf 2.1`, `reportlab 5.1.0`, `pillow 13.0.0`).
- **Track B Scanned OCR (`Tesseract`) & Track C Live Indic OCR (`eng`, `hin`, `ori`):** **BLOCKED**.

## 2. Isolated Discovery Audit (`tesseract_discovery.py`)
Without modifying global `PATH` or production code:
- `Get-Command tesseract`: Not found.
- `C:\Program Files\Tesseract-OCR\tesseract.exe`: `False` (also absent across `C:\Users\akrit`, `C:\Program Files`, `C:\Program Files (x86)`).
- Package managers (`winget`, `choco`, `scoop`): None installed.
- `find_tesseract_binary_with_source()`: `(None, 'none')`.
- `check_ocr_language_availability(['eng'])`: `available=False, binary_available=False, installed_langs=[], missing_langs=['eng']`.
- `check_ocr_language_availability(['hin'])`: `available=False, binary_available=False, installed_langs=[], missing_langs=['hin']`.
- `check_ocr_language_availability(['ori'])`: `available=False, binary_available=False, installed_langs=[], missing_langs=['ori']`.

## 3. Unblock Requirements
To unblock Track B/C live OCR without modifying global `PATH`:
1. Provision an isolated portable Tesseract binary + `tessdata` (`eng.traineddata`, `hin.traineddata`, `ori.traineddata`) and record SHA-256 hashes + `tesseract --version` + `tesseract --list-langs`.
2. Point `DOCUREADY_TESSERACT_PATH` and `TESSDATA_PREFIX` to the isolated directory and verify `DocumentExtractor` invokes the intended binary on synthetic scanned PDFs.
