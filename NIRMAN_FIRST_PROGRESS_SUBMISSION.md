# NIRMAN 6.0 — First Progress Submission Report (9:00 PM IST, 28 Nov 2026)

**Hackathon:** NIRMAN 6.0 — HACKNATION 2026
**Project:** DocuReady
**Team:** `algoryxz` | **Team Leader:** Smarak Padhi
**Organizer Target Branch:** `NirmanSilicon/Nirman_6.0:algoryxz` (never `main`)

---

## 1. Problem & Solution Summary
- **Problem:** Scholarship and public-benefit applicants face avoidable rejections due to missing documents, unreadable scans, expired certificates, and cross-document clerical mismatches (names, dates, IDs, income/bank details) discovered only after portal submission.
- **Solution:** **DocuReady** — a local-first, deterministic Windows desktop pre-flight readiness assistant (Electron 45 + React 19 + PDF.js + PyInstaller Python Sidecar + bundled Tesseract 5.4.0 OCR) that validates multi-document packets locally, anchors every finding to source-page bounding boxes, conservatively abstains (`REVIEW`) when confidence is low, and exports PII-redacted reports.

## 2. Verified Architecture
- **Electron Main & Security (`apps/desktop/src/main.ts`, `preload.ts`, `main/security.ts`, `main/workspace.ts`, `main/ipc.ts`):** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, strict production CSP (`script-src 'self'`), `validateIpcSender` on 10 IPC channels, ephemeral temp workspaces (`50MB/file`, `200MB/packet`).
- **React + PDF.js Renderer (`apps/desktop/src/renderer/`):** 3-panel Evidence Workspace (`DocumentNav`, `EvidenceViewer` with `0°/90°/180°/270°` bbox transforms, `FindingPanel`, `DiagnosticsModal`).
- **Python Sidecar (`sidecar/docuready_sidecar.py`, `src/docuready/`):** NDJSON stdio protocol v1 (`health`, `audit_packet`, `shutdown`), PyMuPDF vector + bundled Tesseract 5.4.0 (`eng`, `hin`, `ori`) OCR, 9-feature `ConfidenceCalibrator`, deterministic normalizers, `DocuReadyValidator` + `DecisionSafetyLayer`, and PII redaction (`redact.py`, `exporter.py`).

## 3. Implemented & Verified Features (`VERIFIED`)
- Packaged Windows executable (`apps/desktop/out/DocuReady-win32-x64/DocuReady.exe`) launches, renders full 3-panel UI (`ROOT_HTML_LEN=4647`, `0` console errors), connects to bundled `docuready_sidecar.exe`, and passes `System & Runtime Diagnostics` (`eng, hin, ori`).
- Synthetic packet audits (`pkt_01_clean` -> `NO_ISSUES_FOUND` `100/100`; `pkt_02_name_conflict` -> `NOT_READY` `75/100`), golden baseline + Packet 07 OCR, and PII-redacted JSON/Markdown exports (including `f.remediation` redaction fix).

## 4. Genuine Test Results (`VERIFIED`)
- **TypeScript (`npm run lint:types`):** `0` errors.
- **Desktop Suite (`npm test`):** `25 / 25` passed (`15.45s`), including `packaged_sidecar.test.ts` and `parity.test.ts`.
- **Python Suite (`pytest tests/test_redaction_safe_logging.py tests/contract/test_claims.py tests/contract/test_no_network.py tests/test_golden_baseline.py tests/test_replacement_rerun.py`):** `53 / 53` passed (`10.60s`).

## 5. Known Limitations (Disclosed Honestly)
- `scheme-select` does not yet forward `schemeId` to `PackExecutionEngine` in `AuditPipeline`.
- Per-slot document replacement (`AuditPipeline.replace_document_and_reaudit`) passes in Python tests (`1/1`) but is not yet wired into the Electron UI.
- `pymupdf==2.1` (`AGPLv3`) distribution clearance remains `OPEN` (`LICENSING_DECISION.md`).

## 6. Team Contributions & Next Milestones
- **Smarak Padhi (Project Lead):** Security/privacy audit, Electron blank-renderer CSP fix, Markdown `f.remediation` redaction fix, packaging verification, and NIRMAN governance/submission coordination.
- **Deeptiman (Lane A):** Engineering integration, Loop 03/04 memory stability, `PackExecutionEngine` & slot/replacement wiring.
- **Akriti (Lane B):** Independent evaluation, 48-packet baseline reproduction, abstention/coverage analysis, multilingual & real-world protocols.
- **Next Milestones (IST):** **3:00 AM (29 Nov)** Second Progress Submission (scheme pack wiring + replacement UI + evaluation metrics); **6:00 AM (29 Nov)** Final Submission (installer + clean-machine validation + judge demo).

---

## 7. Ready-to-Use First Progress PR Description (Target: `NirmanSilicon/Nirman_6.0:algoryxz`)

```markdown
## Title
algoryxz — First Progress Submission (28 Nov 2026, 9:00 PM IST)

## Summary
Establishes the NIRMAN 6.0 Team `algoryxz` governance baseline (ADR-001 selecting DocuReady) and delivers a verified, locally executable DocuReady Electron + Python Sidecar desktop application with bundled Tesseract OCR (`eng`, `hin`, `ori`) and PII-redacted reporting.

## Testing
- `npm run lint:types` (`tsc --noEmit`): 0 errors
- `npm test` (`apps/desktop`): 25/25 passed
- `pytest tests/test_redaction_safe_logging.py tests/contract/test_claims.py tests/contract/test_no_network.py tests/test_golden_baseline.py tests/test_replacement_rerun.py`: 53/53 passed
- Live packaged `DocuReady.exe` verified via CDP (`ROOT_HTML_LEN=4647`, 0 console errors, bundled sidecar & Tesseract `5.4.0` healthy).

## Notes for reviewers
- `schemeId` forwarding to `PackExecutionEngine` and per-slot replacement UI are tracked for the 3:00 AM IST milestone.
- `pymupdf==2.1` (`AGPLv3`) licensing clearance remains `OPEN` pending formal review prior to public binary distribution.
```
