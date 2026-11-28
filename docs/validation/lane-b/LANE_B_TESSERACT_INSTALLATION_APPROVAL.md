# DocuReady 2.0 — Lane B: Final Tesseract 5.5.3 Installation Gate (READ-ONLY)

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Repository:** `Smarak-padhi/Nirman_6.0` (`akriti` @ `7c97da6af6b9d6de384ed4629e4a573d6e60cfc6`)
**Gate Recommendation:** **NO-GO** (per-user non-admin isolation without elevation or machine-wide registry writes cannot be demonstrated from read-only metadata)

---

## 1. Verified Facts

- **Upstream Release Asset (`5.5.3`):** `https://github.com/tesseract-ocr/tesseract/releases/download/5.5.3/tesseract-ocr-w64-setup-5.5.3.20260724.exe` (`26,573,224` bytes, published `2026-07-24T18:33:22Z`).
- **GitHub API SHA-256 Digest (`5.5.3`):** `sha256:bee9e3434bd94fd65387d9be28cd467a41f61b1275383b55b0f59a1331270ae4` (from `gh api repos/tesseract-ocr/tesseract/releases/tags/5.5.3`).
- **Third-Party Windows Packaging:** Per `tesseract-ocr/tessdoc/Installation.md`, Windows installers (`Tesseract at UB Mannheim`) are third-party Windows packaging, not an official upstream source build.
- **Source Tag Distinction:** The PGP-signed upstream tag `5.5.5` (commit `4292f6890aa86ef64eba32090358f40f69dd6d28`, Stefan Weil) authenticates the `5.5.5` Git source tree only; it does **not** authenticate the `5.5.3` Windows installer binary.
- **WinGet Manifest (`microsoft/winget-pkgs`):** `UB-Mannheim.TesseractOCR` manifests stop at `5.4.0.20240606` (`InstallerType: nullsoft`, `ProductCode: Tesseract-OCR`, **no `Scope: user` declared** — machine-scoped by default). No `5.5.3.20260724` WinGet manifest exists.
- **Pinned `tessdata_fast` (`87416418657359cb625c412a48b6e1d6d41c29bd`):**
  - `eng.traineddata`: `4,113,088` B | Git blob SHA-1 `bbef4675053b5b468cdb477053e28b1c698ba08e`
  - `hin.traineddata`: `1,122,751` B | Git blob SHA-1 `a8f0aaec09378115b12a2c6287c57695d082aea2`
  - `ori.traineddata`: `1,480,066` B | Git blob SHA-1 `ae0f9ed13d5c9ad4a4de57c7266c434b83a9f583`

---

## 2. Unverified Facts (Cannot Be Established Read-Only Without Downloading)

- **Authenticode Signature & Publisher:** **PENDING / UNVERIFIED** — whether `tesseract-ocr-w64-setup-5.5.3.20260724.exe` carries a valid Authenticode signature and who its certificate publisher is cannot be verified without downloading the binary.
- **Independent Non-GitHub Checksum Corroboration:** No `5.5.3.20260724` WinGet manifest exists in `microsoft/winget-pkgs` to independently corroborate the GitHub release asset SHA-256.
- **NSIS `RequestExecutionLevel` & Registry Behavior:** The `.nsi` script for `5.5.3.20260724` is not exposed in `tesseract-ocr/tesseract` or `UB-Mannheim/tesseract` via GitHub API, so `RequestExecutionLevel user` and absence of `HKLM` / machine-wide registry writes are **unverified**.

---

## 3. Installation-Scope Findings

- Standard UB-Mannheim NSIS installers in `microsoft/winget-pkgs` (`5.4.0.20240606`) are `InstallerType: nullsoft` with `ProductCode: Tesseract-OCR` and **no `Scope: user`**.
- Passing `/D=%LOCALAPPDATA%\DocuReady-LaneB-OCR\tesseract` to a machine-scoped NSIS installer does **not** guarantee per-user-only installation, absence of UAC elevation, or absence of `HKLM` / machine-wide uninstall registry entries.
- Per gate policy, UAC will not be bypassed and system-wide changes will not be silently accepted.

---

## 4. Security Limitations & Evaluation Boundary (If Ever Authorized)

- **Security Delta:** Tesseract `5.5.3` lacks the **9 security advisory fixes** and crafted-image/model crash fixes in `5.5.5`.
- **Required Track B Boundary (if a safe per-user route is later approved):**
  - **Track B only:** Controlled, benign, synthetic rasterized documents.
  - **Prohibited inputs:** No user documents, real personal documents, untrusted inputs, deliberately malformed PDFs, crafted images, or adversarial model/image files (malformed-PDF parser tests remain separate from Tesseract OCR; adversarial OCR testing is deferred until `5.5.5` or newer).
  - **Track Separation:** Track A (historical simulated OCR) and Track C (Indic OCR) remain strictly separate.
- **Model Verification:** Any future authorized acquisition of `tessdata_fast` (`87416418657359cb625c412a48b6e1d6d41c29bd`) must verify Git blob SHA-1s (`git hash-object`), record local SHA-256s before use, and run with `--oem 1`.

---

## 5. Explicit Go / No-Go Decision

**DECISION: NO-GO**

- **Reason:** Per-user isolation under `%LOCALAPPDATA%\DocuReady-LaneB-OCR\` without UAC elevation or machine-wide registry/system changes **cannot be demonstrated** for `tesseract-ocr-w64-setup-5.5.3.20260724.exe` from read-only metadata, and Authenticode signature status remains unverified.
- **Status:** Track B Scanned OCR and Track C Live Indic OCR remain **BLOCKED**. Awaiting Akriti's explicit direction before any acquisition, extraction, or system modification.
