# DocuReady 2.0 — Lane B: Final Dependency Parity & OCR-Path Readiness Report

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 29 November 2026
**Repository:** `Smarak-padhi/Nirman_6.0` (`akriti` @ `7c97da6af6b9d6de384ed4629e4a573d6e60cfc6`)
**Source Snapshot:** `DocuReady` `main` @ `0e14a6ed4452c1e562da2df11df7e4f528045074` (**candidate snapshot only** — not an authoritative frozen Phase 3 baseline)
**Track B Status:** **EXECUTED (Smoke Test Complete — `2` OCR-path + `32` native controls)** — see [`LANE_B_TRACK_B_OCR_SMOKE_REPORT.md`](LANE_B_TRACK_B_OCR_SMOKE_REPORT.md)
**Track C Status:** **EXECUTED (`40/40` `loop11_benchmark` Indic PNGs)** — see [`LANE_B_TRACK_C_INDIC_OCR_REPORT.md`](LANE_B_TRACK_C_INDIC_OCR_REPORT.md)

---

## 1. Complete Python Dependency Parity (`docuready-lane-b-ocr:5.5.5`)

Verified directly inside `sha256:775712a9a78110bc55439b3c7b874a2b0fd30e92f6f21f0f41152608df978f33` via `importlib.metadata.version()`:

| Package | `DocuReady-live/pyproject.toml` | `Dockerfile` / `build_manifest.json` | Installed in Container | Parity Status |
|---|---|---|---|---|
| `pydantic` | `>=2.0.0` | `2.14.3` | `2.14.3` | **PASS** |
| `pymupdf` | `==2.1` | `2.1` | `2.1` | **PASS (Exact)** |
| `pillow` | `>=10.0.0` | `13.0.0` | `13.0.0` | **PASS** |
| `numpy` | `>=1.24.0` | `2.5.5` (transitive via `pymupdf`) | `2.5.5` | **PASS** |
| `pytesseract` | `>=0.3.10` | `0.3.13` | `0.3.13` | **PASS** |
| `PyYAML` | `>=6.0.0` | `6.0.4` | `6.0.4` | **PASS** |

---

## 2. Track B 35-PDF OCR-Path Audit (Without Invoking OCR)

In `DocuReady-live/src/docuready/ingest/extractor.py:641`, `has_native_text = len(native_text.strip()) >= 30 and "ILLEGIBLE" not in native_text.upper()`. Any PDF with `>= 30` native text characters bypasses Tesseract OCR.

Per-file audit saved at [`evidence/ocr/track_b_ocr_path_audit.json`](../../../evidence/ocr/track_b_ocr_path_audit.json):

| Category | Count (`n = 35`) | Invokes Tesseract OCR? | Files |
|---|---:|---|---|
| **Genuine OCR-Path Samples** (`text_chars = 0`, `images = 1`) | **2** | **Yes** | `corpus/adversarial/ADV_SCANNED_NO_TESSERACT.pdf` (`sha256: 3da84587...`), `phase4_7/identity/ID_AADHAAR_DEGRADED_IMG.pdf` (`sha256: cfd8aab0...`) |
| **Native-Text Controls** (`text_chars >= 30`, `images = 0`) | **32** | **No** (bypasses OCR) | `corpus/supported/*` (7), `corpus/unsupported/*` (9), `phase4_7/{identity,edu_fin,pdfs}/*` (16) |
| **Mixed-Content Samples** | **0** | — | None |
| **Malformed / Corrupt PDF** (`FileDataError`) | **1** | **No** (fails at `pymupdf.open`) | `corpus/adversarial/ADV_MALFORMED.pdf` (`sha256: f98f8288...`) |

**Gap Disclosure:** Native-text extractions (`32` PDFs) must **not** be counted as OCR successes. Only **`2`** PDFs in `comprehensive/` genuinely exercise Tesseract OCR; broader Track B scanned-OCR coverage would require a separate approved scanned corpus (not generated here).

---

## 3. Track C Input Verification (`loop11_benchmark`)

- **Manifest:** [`evidence/ocr/track_c_input_manifest.json`](../../../evidence/ocr/track_c_input_manifest.json)
- **Counts:** `40` rasterized PNG/PDF pairs (`20` `hin`, `20` `ori`; `DEV=15`, `VAL=15`, `CHALLENGE=10`), `0` missing, `0` duplicates, `0` out-of-tree paths; `indic_ground_truth.json` SHA-256 `95d8d22a86bff8a86ea7f2d97f1746e31e79f0ce0e3e6bedef3d84c4098d3ce1`.

---

## 4. Execution Readiness & Required Approvals

- **Track B:** **READY WITH LIMITATIONS** — ready to execute on the `2` genuine OCR PDFs (keeping `32` native controls and `1` malformed PDF separate) inside `docuready-lane-b-ocr:5.5.5` (`--network=none`, `--read-only`, `--cap-drop=ALL`, `--security-opt=no-new-privileges:true`, `--cpus=2 --memory=2g --pids-limit=128`, `--oem 1`).
- **Track C:** **READY** — ready to execute on all `40` `loop11_benchmark` Indic PNGs (`eng+hin` / `eng+ori`, `--oem 1`, raw OCR preserved separately from normalized output, `hin` and `ori` reported separately).

**Stopped — awaiting Akriti's explicit authorization before running Track B or Track C.**

---

## 4. Post-Execution Independent Audit Summary (Append-Only)

- **Track B Audit:** Confirmed `ADV_SCANNED_NO_TESSERACT.pdf` (`INCOME_CERT`: `2/2` fields) and `ID_AADHAAR_DEGRADED_IMG.pdf` (`AADHAAR`: `dob` matched, watermark matched `applicant_name` at token confidence `0.912`, `aadhaar_no` missed).
- **Track C Audit:** Separated Tesseract OCR recognition from downstream `DocumentExtractor` extraction: Tesseract recognized `applicant_name` in `20/20` `hin` and `20/20` `ori` (`100%`) raw outputs (`0/40` extracted by `extractor.py:944` due to `APPLICANT:` label mismatch), and `annual_income` achieved `12/12` (`hin`) and `8/8` (`ori`) (`100%`) on actual `INCOME_CERT` samples. Track C `CER > 1.0` (`2.5275` `hin`, `2.8823` `ori`) is explained by comparing full-page OCR (`~285–320` chars) against partial-page `indic_title + indic_clause` ground truth (`~93–113` chars).

---

## 5. Clean-Checkout Reproduction & Publication Inventory

To allow `evidence/ocr/build/tessdata/*.traineddata` (`6,715,905` bytes total) to remain excluded from Git via `.gitignore` without breaking clean-checkout container builds, [`evidence/ocr/build/fetch_tessdata.py`](../../../evidence/ocr/build/fetch_tessdata.py) (`6,586` bytes, SHA-256 `99a4580f5420c3c38393a4e9d50a51ed8409d2d6f0a5b6613906a6ae5e46b9db`) reconstructs and verifies the pinned models prior to `docker build`.

- **Required Python Version:** Python 3.10+ (standard library only; verified with `Python 3.12.10`).
- **Fetch & Verify Command:**
  ```powershell
  python evidence/ocr/build/fetch_tessdata.py
  ```
- **Docker Build Command:**
  ```powershell
  docker build --platform linux/amd64 -t docuready-lane-b-ocr:5.5.5 evidence/ocr/build
  ```
- **Expected Model Verification Values (`tessdata_fast` @ `87416418657359cb625c412a48b6e1d6d41c29bd`):**

  | Model | Size (bytes) | Git blob SHA-1 | SHA-256 |
  |---|---:|---|---|
  | `eng.traineddata` | `4,113,088` | `bbef4675053b5b468cdb477053e28b1c698ba08e` | `7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2` |
  | `hin.traineddata` | `1,122,751` | `a8f0aaec09378115b12a2c6287c57695d082aea2` | `4c73ffc59d497c186b19d1e90f5d721d678ea6b2e277b719bee4e2af12271825` |
  | `ori.traineddata` | `1,480,066` | `ae0f9ed13d5c9ad4a4de57c7266c434b83a9f583` | `36f3135e61d501a3acfad41f5fe60b8e791274fff4c5375c969fdcca980cdbac` |

- **Verification Behavior:** Verifies existing files rather than trusting them; downloads missing models from immutable raw GitHub URLs pinned to `87416418657359cb625c412a48b6e1d6d41c29bd` into temporary files in the target directory; checks exact byte size, Git blob SHA-1, and SHA-256; atomically moves verified files into `evidence/ocr/build/tessdata/`; and fails closed (nonzero exit) on HTTP errors, size mismatches, or hash mismatches.
- **Network Scope:** Network access is required **only** during model acquisition (`fetch_tessdata.py`) and container image build (`docker build`), never during OCR execution (`--network=none`).
- **Existing Verified Image Preserved:** `Dockerfile` (`72be737b5c9480b5ec0b0a3bf024f007bb6dd7f083e47be3b99999990f84dde0`) and all three `.traineddata` inputs are unchanged, retaining `docuready-lane-b-ocr:5.5.5` (`sha256:775712a9a78110bc55439b3c7b874a2b0fd30e92f6f21f0f41152608df978f33`).
- **Updated Proposed Publication Inventory:** `20` audited publication files (`16` under `evidence/ocr/` including `fetch_tessdata.py` + `4` Lane B OCR markdown reports under `docs/validation/lane-b/`) plus `.gitignore` (narrowly scoped `evidence/ocr/build/tessdata/*.traineddata` exclusion).
