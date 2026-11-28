# PRD.md — Product Requirements Document (`algoryxz` — DocuReady for NIRMAN 6.0)

**Status:** `PROPOSED` (Updated per ADR-001 selecting DocuReady; pending PR merge into `algoryxz`)
**Repository Baseline (`VERIFIED`):** `algoryxz` (`06c65b4`) currently has `.gitignore` and `algoryxz.txt` only; application modules below are `PROPOSED` for incremental PRs into `algoryxz`.

---

## 1. Competition Schedule (`VERIFIED` from `upstream/main:docs/submission-timeline.md`)
- **First Progress Submission:** 28 November 2026, **9:00 PM IST**
- **Second Progress Submission:** 29 November 2026, **3:00 AM IST**
- **Final Submission:** 29 November 2026, **6:00 AM IST**
- **Target PR:** `Smarak-padhi/Nirman_6.0:algoryxz` → `NirmanSilicon/Nirman_6.0:algoryxz` (never `main`).

## 2. Problem Statement & Target Users (`PROPOSED`)
- **Problem:** Scholarship and welfare applicants frequently face application rejection or delays due to missing documents, unreadable scans, expired certificates, and cross-document clerical mismatches (names, dates, IDs, income/bank details) discovered only *after* portal submission.
- **Target Users:**
  1. **Primary:** Scholarship/public-benefit applicants preparing multi-document PDF/image packets on a Windows desktop.
  2. **Secondary:** Assisted-service / CSC operators pre-checking applicant packets locally without uploading sensitive PII to cloud services.
- **Product Boundary:** DocuReady is an **applicant-side pre-flight readiness assistant**, not a government portal, fraud/authenticity detector, or eligibility predictor.

## 3. Minimum Complete, Demonstrable Scope (`PROPOSED`)
Core vertical slice for judge demonstration:
> **Guided Packet Intake (Scheme Slots) → Local Document Extraction (Vector + OCR) → Evidence Review (Source Page + BBox) → Discrepancy / Uncertainty Findings → Single-Document Replacement & Re-Audit → Redacted Report Export**

### Out-of-Scope
- Cloud OCR or cloud document storage
- DigiLocker, WhatsApp, or live government portal APIs
- Automatic fraud/authenticity verdicts or AI eligibility predictions
- Mobile/Flutter apps

## 4. Functional & Non-Functional Requirements (`PROPOSED`)
- **FR-01:** Select a scheme/pack (e.g., scholarship/welfare slot checklist) and stage PDF/PNG/JPEG documents in an isolated ephemeral workspace.
- **FR-02:** Extract key fields locally (vector text + Tesseract OCR for English/Indic scripts) with source page & bounding-box provenance.
- **FR-03:** Normalize values (dates, Indic digits, amounts, IDs) and run deterministic completeness, freshness, and cross-document consistency checks.
- **FR-04:** Display explainable findings (`PASS`, `WARN`, `REVIEW`, `FAIL`, `MISSING`) with conservative abstention (`REVIEW`) on low confidence.
- **FR-05:** Replace a defective document in-place and re-audit without re-uploading the full packet.
- **FR-06:** Export a PII-redacted Markdown/JSON summary report.
- **NFR-01 (Privacy/Security):** Local-only processing, ephemeral temp workspace cleanup, zero committed secrets.
- **NFR-02 (Windows Deliverable):** Packaged Windows executable (`DocuReady-Setup.exe` / portable `.zip`) verified on a clean Windows machine with a repeatable demo dataset and judge demo script.