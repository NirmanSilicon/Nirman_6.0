# TRD.md — Technical Requirements Document (`algoryxz` — DocuReady for NIRMAN 6.0)

**Status:** `PROPOSED` (Aligned with ADR-001; `algoryxz` currently contains `.gitignore` & `algoryxz.txt` only)

---

## 1. Existing vs. Proposed Implementation (`VERIFIED` vs. `PROPOSED`)
- **`VERIFIED` on `algoryxz` (`06c65b4`):** `.gitignore`, `algoryxz.txt`.
- **`PROPOSED` for NIRMAN 6.0 implementation branches (`feature/<member>-<topic>`):**
  - **Desktop Shell:** Electron + TypeScript (`contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `validateIpcSender`).
  - **Renderer UI:** React + TypeScript + Vite + PDF.js (`DocumentNav`, `EvidenceViewer` with bbox overlay, `FindingPanel`, replacement flow).
  - **Backend Sidecar:** Python stdio NDJSON protocol (`health`, `audit_packet`, `replace_document`, `shutdown`) packaged via PyInstaller (`docuready_sidecar.exe`) + bundled Tesseract OCR (`eng`, `hin`, `ori`).
  - **Windows Packaging:** Electron Forge (`MakerSquirrel` `.exe` installer + `MakerZIP` portable `.zip`).

## 2. Reusable Concepts vs. Independent NIRMAN Deliverables (`PROPOSED`)
- **Reusable Concepts (from validated DocuReady architecture):**
  - Context-isolated Electron preload bridge + ephemeral `os.tmpdir()` packet staging.
  - Versioned NDJSON stdio sidecar protocol with sanitized error payloads.
  - 9-feature confidence calibration (`VERIFIED` / `PROVISIONAL` / `UNCERTAIN`) and conservative abstention (`DecisionSafetyLayer`).
  - PII redaction on exported reports and logs.
- **Independent NIRMAN Deliverables (must be built & verified in `Nirman_6.0`):**
  - Independent `src/` + `apps/desktop/` + `sidecar/` + `tests/` suites and acceptance evidence.
  - Repeatable synthetic demonstration dataset (`demo_packet/`) and step-by-step judge demonstration script.
  - Clean-machine Windows validation report and dependency/licensing disclosures (including PyMuPDF AGPLv3 disclosure if bundled).