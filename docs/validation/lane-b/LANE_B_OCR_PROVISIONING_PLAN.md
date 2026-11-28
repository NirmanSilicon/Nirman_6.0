# DocuReady 2.0 — Lane B: Isolated Local OCR Provisioning Plan (Phase 9)

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Current OCR Status:** **BLOCKED** (awaiting approval and isolated binary/traineddata provisioning; no downloads or global PATH changes performed)

---

## 1. Current Host State
- `find_tesseract_binary_with_source()` $\to$ `(None, 'none')`
- `pytesseract 0.3.13`, `pymupdf 2.1`, `pillow 13.0.0` are installed in Python `3.12.10`, but no `tesseract.exe` binary or `tessdata` files exist on disk, and no `winget`/`choco`/`scoop` package manager is installed.

## 2. Proposed Isolated Provisioning Plan (No Admin Rights, No Global `PATH` Changes)
`src/docuready/ingest/tesseract_discovery.py` natively supports explicit environment overrides:
- `DOCUREADY_TESSERACT_PATH` $\to$ points directly to an isolated `tesseract.exe`
- `TESSDATA_PREFIX` $\to$ points directly to an isolated `tessdata` directory

### Steps Upon Approval
1. **Trusted Official Sources:**
   - Windows Tesseract binary from the official UB-Mannheim / Tesseract-OCR distribution (extracted/installed into an isolated non-system folder, e.g. `C:\Users\akrit\tools\tesseract-isolated\`).
   - Official traineddata from `tesseract-ocr/tessdata_fast` (or `tessdata_best`): `eng.traineddata`, `hin.traineddata`, `ori.traineddata`.
2. **Integrity & Version Verification:**
   - Record SHA-256 hashes of the installer/archive, `tesseract.exe`, and all three `.traineddata` files.
   - Run `tesseract --version` and `tesseract --list-langs` with `DOCUREADY_TESSERACT_PATH` and `TESSDATA_PREFIX` scoped to the evaluation shell only.
3. **DocumentExtractor Wiring Verification:**
   - Verify `find_tesseract_binary_with_source()` returns `(Path(...), 'env_override')` and `check_ocr_language_availability(['eng', 'hin', 'ori'])` returns `available: True`.
   - Execute `DocumentExtractor.extract_document()` on synthetic scanned English, Hindi, and Odia test PDFs and preserve full logs.
