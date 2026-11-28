# DOCUREADY 2.0 — Website Readiness, Evidence UX Handoff & Submission Package

- **Author:** Susmita Rana (Domain Rules, Evidence & Evaluation Lead)
- **Repository:** `Smarak-padhi/Nirman_6.0`
- **Working Branch:** `Susmita` (HEAD: `cf7e6eb8a7d2d588a4b267c2fbe141e59b851c5c`)
- **Reference Shared Branch (`origin/algoryxz`):** `715314c30c24b07a501c221f3a8b10ec32a19754`
- **Date:** 2026-11-28 (IST)
- **S1.0 Specification Status:** `Submitted — Awaiting Review` (`SUSMITA_S1_DOMAIN_EVIDENCE_SPEC.md`, `cf7e6eb`) — **Implementation Freeze Active for Unapproved S1.0 Decisions**

---

## 1. Reconstructed Website & Frontend State

Inspected read-only from `origin/algoryxz` (`715314c`) and `Deeptiman` (`7b230d9`):

| Area | Current state | Completed work | Missing work | Owner | Submission priority |
|---|---|---|---|---|---|
| **Shared `algoryxz` code integration** | Governance/specs only (`715314c`); `0` app files | `PRD.md`, `TRD.md`, `ARCHITECTURE.md`, `DECISIONS.md` (ADR-001), `NIRMAN_FIRST_PROGRESS_SUBMISSION.md` | Merging DocuReady application code into `algoryxz` | Smarak (Lead) | **Critical (03:00 AM)** |
| **Public Website (`site/index.html`)** | Static Vercel showcase (`261` lines, `script-src 'none'`) | Hero, 4-step workflow overview, privacy section, Vercel security headers (`site/vercel.json`) | Replace stale `"Python/Streamlit application"` copy (lines 227, 244); add Windows installer download section | Deeptiman / Frontend Owner | **High (06:00 AM)** |
| **Desktop 3-Panel Evidence Workspace (`apps/desktop/`)** | Implemented on `Deeptiman` (`DocuReady.exe` verified) | `DocumentNav.tsx`, `EvidenceViewer.tsx` (`0°/90°/180°/270°` bbox), `FindingPanel.tsx`, `DiagnosticsModal`, `25/25` desktop tests | Render `ExtractedDocumentSummary` raw-vs-normalized view; fix `"100% Offline"` copy (`main.tsx:486`) | Deeptiman / Frontend Owner | **High (03:00 AM)** |
| **Scheme Pack & Slot Checklist Wiring** | Partial (backend A4 done on `Deeptiman`; UI stubbed) | `PackExecutionEngine` default in `AuditPipeline`/CLI/sidecar; `SlotStatusSummary` DTO in `types.ts` | Forward `schemeId` from `scheme-select` through IPC; render guided slot checklist; resolve `RATION_CARD` (S1.0 pending) | Deeptiman (UI/IPC) + Susmita/Akriti (`RATION_CARD`) | **High (03:00 AM)** |
| **Single-Doc Replacement & Re-Audit UI** | Backend `1/1` test passing; missing in UI | `AuditPipeline.replace_document_and_reaudit()` in Python | Wire `packet:replace-document` IPC and per-slot Replace button in Electron UI | Deeptiman (A7) | **High (03:00 AM)** |
| **Domain Evidence & UX Handoff (This Doc)** | **Completed by Susmita** | 8-stage layman journey, evidence-card model, plain-English outcome copy, API field map, submission summary | Frontend integration by Deeptiman / Frontend Owner | **Susmita** | **Ready Now (03:00 AM)** |
| **S1.0 Domain & Provenance Changes** | `Submitted — Awaiting Review` (`cf7e6eb`) | `SUSMITA_S1_DOMAIN_EVIDENCE_SPEC.md` committed & pushed | Team review/approval of `page_number=None`, `RATION_CARD`, and negative-control matrix | Susmita + Akriti + Deeptiman + Smarak | **Pending Review** |

---

## 2. Layman-Friendly User Journey (8 Stages)

Designed for an ordinary applicant or CSC operator with zero knowledge of OCR, JSON, or validation rules.

| Stage | What the User Sees | Information Displayed | What System Actually Supports | Missing / Uncertain Behavior | Simple-English Copy | Next Action |
|---|---|---|---|---|---|---|
| **1. Open DocuReady** | Clean welcome workspace + local readiness status | App title, selected scheme (`generic.demo` or `odisha.subhadra` `DEMO SNAPSHOT` badge), engine health (`eng`, `hin`, `ori` OCR ready) | `getEngineHealth()` (`EngineHealth` in `types.ts:5-20`) | If sidecar/OCR is unhealthy, show plain warning without host paths | *"DocuReady checks your documents on this computer before you submit them."* | Select a scheme or add documents |
| **2. Understand Platform** | Clear boundary banner + 4-step overview | Pre-flight check scope & non-authority notice (`CLAIMS_REGISTER.md`) | Static UI + `demo_snapshot_disclaimer` (`models.py:164-169`) | Clarify `DEMO SNAPSHOT` when `odisha.subhadra` is selected | *"This tool helps you spot missing pages, unclear scans, and mismatches early. It is not a government portal and cannot guarantee approval."* | Click **Add Documents** |
| **3. Select / Upload Documents** | Document list (`DocumentNav`) or slot list | File name, size, type (`PDF`, `PNG`, `JPEG`), and slot status if `slot_statuses` is present | `selectDocuments()`, `createPacket()` (`types.ts:62-75`); `50MB/file`, `200MB/packet` | If `schemeId` forwarding is not yet wired, show *"General Check"* rather than claiming scheme-specific intake | *"Add your PDF or photo files. Your files stay in a temporary folder on this computer."* | Click **Run Check** |
| **4. Documents Processed** | Progress bar + current step label | `stage`, `percent`, `completed / total` | `onAuditProgress()` (`AuditProgress` in `types.ts:86-92`) | If cancelled (`cancelAudit()`), return to staged packet cleanly | *"Reading your documents and checking key details…"* | Wait or **Cancel** |
| **5. Extracted Info Presented** | Document preview (`EvidenceViewer`) + extracted fields | `document_type`, `extraction_method`, `page_count`, and (when wired) `ExtractedDocumentSummary.fields` | `EvidenceViewer` + `ExtractedDocumentSummary` (`types.ts:148-161`) | If a field is unextracted or `UNCERTAIN`, show *"Could not read clearly"* — never guess | *"Here is what we could read from your document."* | Inspect highlighted page or findings |
| **6. Validation Results Explained** | Readiness banner + grouped findings (`FindingPanel`) | `overall_status` (`NO_ISSUES_FOUND` / `NEEDS_CHECKS` / `NOT_READY`), `readiness_score`, and plain-English finding cards | `RedactedAuditResult` + `RedactedFinding` (`types.ts:119-189`) | Never present `REVIEW` as a rejection; never claim unimplemented identity/numeric checks | *"Some items need your attention before you submit."* | Click any finding to jump to evidence |
| **7. Understand What Needs Attention** | Highlighted source box + plain remediation | `raw_snippet` (redacted), `page_number` (only if known), `bounding_box` (only if present), `remediation` | `EvidenceProvenanceDTO` + `NormalizedEvidenceItem` (`types.ts:93-117`) | If `page_number` is unknown or `bounding_box` is `null`, omit page jump and show *"Page location unavailable"* | *"Check this detail on your document, or upload a clearer copy."* | Review or prepare replacement |
| **8. Next Appropriate Action** | Clear next-step buttons | Replace guidance, **Export Redacted Summary** (`JSON` / `Markdown`), **Clear Session** | `exportReport()`, `clearSession()` (`types.ts:199-211`); `replace_document_and_reaudit` in Python | Until replacement UI is wired, instruct user to re-run packet with updated file | *"Fix or replace any unclear document, then save your summary report."* | Replace file / Export / Clear |

---

## 3. Evidence Presentation Model & Simple-English Validation Copy

### 3.1 Evidence-Card Content Structure (Strict Non-Fabrication Rules)
Every finding card in `FindingPanel.tsx` must render **only** fields genuinely present in `NormalizedEvidenceItem` / `RedactedFinding`:
1. **Document & Field Checked:** `documentType` + `fileName` + `field` (or `extractedField`).
2. **Extracted Value (when available):** `rawSnippet` (redacted by default; never display unredacted Aadhaar/bank/phone). If empty, display *"No readable text captured"*.
3. **Page Number (only when genuinely known):** Display `Page {pageNumber}` **only** when `pageNumber != null && pageNumber >= 1` and `hasProvenance === true`. If `null` or missing, display *"Page location not available"* — **never fabricate `Page 1`**.
4. **Evidence Location (only when available):** Render bounding-box highlight in `EvidenceViewer.tsx` **only** when `boundingBox !== null` (4-element `[x0, y0, x1, y1]`).
5. **Verification & Outcome Badge:** Map directly from supported status semantics:
   - `PASS` -> **Checked — Looks consistent** (*"The readable details on this document match this check."*)
   - `FAIL` -> **Issue Found — Fix before submitting** (*"A required check did not pass based on clearly read information (for example, an age rule)."*)
   - `REVIEW` / `MANUAL_REVIEW` -> **Needs Your Review** (*"We could not confirm this automatically. Please check the document yourself — this is not an automatic rejection."*)
   - `MISSING` -> **Document Missing** (*"This document was not found in your packet."*)
   - `WARN` -> **Advisory Note** (*"Worth double-checking, even though it may not block submission."*)

### 3.2 Distinguishing Validation Outcomes (Accurate Scope Boundaries)
- **Confirmed Rule Violations (`FAIL`):** Reserved strictly for `VERIFIED` evidence violating an implemented `FAIL`-capable rule (e.g., `RULE-SUB-AGE-01` statutory age check in `odisha.subhadra`).
- **Information Requiring Review (`REVIEW`):** Used for low-confidence/uncertain OCR, name-only ambiguity, visually ambiguous digits, and `RULE-SUB-NAME-01` (which is capped at `max_severity: REVIEW`). **Never label `REVIEW` as a rejection.**
- **Missing or Unreadable Information (`MISSING` / `REVIEW`):** Missing mandatory documents emit `MISSING`; unreadable/corrupted uploads emit `REVIEW` with `INSUFFICIENT_DATA` / `EVIDENCE_UNCERTAIN`.
- **Document-Slot Mismatches (`REVIEW`):** Under `slot_validator.py`, confident wrong-document-in-slot mismatches emit `REVIEW` (`WRONG_DOCUMENT_TYPE`), never automatic `FAIL`.
- **What the System Cannot Verify:** Do **not** claim the UI detects cross-document identity collisions, cross-document numeric inconsistencies, NFSA/SFSS household coverage, Aadhaar DBT seeding, or official portal eligibility.

### 3.3 Pending S1.0 Decisions (Interim Safe Website Behavior)
Until S1.0 (`cf7e6eb`) is explicitly approved:
1. **Evidence model & provenance invariants:** *Pending.* UI must still guard against `pageNumber == null` and `boundingBox == null` without crashing.
2. **`EvidenceProvenance.page_number` default:** *Pending.* Until `models.py:65` is updated, UI must not assume `page_number === 1` with `bounding_box === null` is a verified page-1 citation; show *"Page not pinpointed"* when `boundingBox === null`.
3. **`RATION_CARD` slot handling:** *Pending joint decision (Susmita, Akriti, Deeptiman).* Show `ration_card` (if displayed) as **Optional / Informational** and never mark a packet `NOT_READY` for omitting it.
4. **Future negative-control expectations:** *Pending.* Do not advertise identity-collision or cross-document numeric-mismatch detection in UI copy.

---

## 4. Developer-Ready Frontend Handoff (For Deeptiman / Frontend Owner)

### 4.1 Screen-by-Screen & Component Mapping (`apps/desktop/src/renderer/`)
- **Top Bar & Scheme Banner (`main.tsx`):**
  - Replace `"100% Offline · Local Workspace"` (`main.tsx:486`) with `"Local Processing · Ephemeral Workspace"` (per `DECISIONS.md` D-004).
  - When `scheme_name` / `odisha.subhadra` is active, display `DEMO SNAPSHOT — FY 2024–25 REFERENCE MATERIALS` banner.
- **Left Panel (`DocumentNav.tsx`):**
  - Render `documents` list; when `slot_statuses` (`SlotStatusSummary[]` in `types.ts:164-176`) is populated, show `display_name`, `required` vs `Optional`, and `state` badge (`VALID`, `MISSING`, `OPTIONAL_ABSENT`, `MISMATCHED`, `UNCERTAIN`).
- **Center Panel (`EvidenceViewer.tsx`):**
  - Render PDF/image; highlight `boundingBox` only when non-null; show empty/fallback banner when document is `UNREADABLE` or has no bbox.
- **Right Panel (`FindingPanel.tsx`):**
  - Render `RedactedAuditResult.overall_status` using plain-English labels (`NO_ISSUES_FOUND` -> *"No Issues Found in Checked Items"*, `NEEDS_CHECKS` -> *"Needs Your Review"*, `NOT_READY` -> *"Action Needed Before Submitting"*).
  - Group/filter findings by status (`FAIL`, `REVIEW`/`MANUAL_REVIEW`, `MISSING`, `WARN`, `PASS`) and render the Evidence-Card structure (§3.1).

### 4.2 Empty, Loading, Success, Warning, and Error States
- **Empty:** *"No documents added yet. Select PDF, PNG, or JPEG files to begin."*
- **Loading:** Show `AuditProgress.stage` and `percent` (`0–100%`) with a working **Cancel** button.
- **Success (`NO_ISSUES_FOUND`):** *"Checked items passed on the supplied documents. Please still review your details before official portal submission."*
- **Warning / Review (`NEEDS_CHECKS`):** *"Some details could not be confirmed automatically or need your review."*
- **Error / Action Needed (`NOT_READY`):** *"One or more required checks did not pass. Review the highlighted items below."* (Never expose raw host paths or stack traces in sidecar errors.)

### 4.3 Accessibility & Responsive Notes
- Ensure all filter tabs, document rows, and finding cards have keyboard focus, `aria-label`s, and `>= 44px` touch targets (consistent with `test_mobile_ui.py` / `site/index.html` responsive breakpoints).
- Do not rely on color alone for `PASS` / `REVIEW` / `FAIL` badges — always pair with text labels.

### 4.4 Supported API Fields (`apps/desktop/src/shared/types.ts`) vs. Unresolved Dependencies
- **Actually Supported Today:** `EngineHealth`, `DocumentDescriptor`, `PacketDescriptor`, `AuditProgress`, `RedactedAuditResult` (`packet_id`, `scheme_name`, `readiness_score`, `overall_status`, `findings`, `summary_counts`, `as_of`, `documents`, `slot_statuses`), `RedactedFinding`, `EvidenceProvenanceDTO`, `ExportReportResult`.
- **Unresolved Dependencies:**
  1. `schemeId` forwarding from `main.tsx` -> `ipc.ts` -> `docuready_sidecar.py` (Deeptiman A5).
  2. `packet:replace-document` IPC + UI action (Deeptiman A7).
  3. `EvidenceProvenanceDTO.page_number: number | null` alignment (S1.0 pending).
  4. `site/index.html` stale Streamlit copy update + download link (Deeptiman / Frontend Owner).

### 4.5 Screen Acceptance Criteria
1. **Welcome / Intake:** User understands local-only pre-flight scope; no `"100% Offline"` or `"government approval"` claims.
2. **Evidence Viewer:** Clicking a finding with `boundingBox !== null` and `pageNumber >= 1` jumps to the exact page/box; `boundingBox === null` never fabricates a highlight.
3. **Findings Panel:** `REVIEW` is never labeled as `FAIL`/rejection; `FAIL` is shown only for verified violations; all PII in snippets/remediation remains redacted.
4. **Export:** JSON/Markdown export includes `as_of` and `DEMO SNAPSHOT` disclaimer when applicable, with zero unredacted PII.

---

## 5. Submission Preparation (03:00 AM & 06:00 AM IST)

### 5.1 For 03:00 AM IST — Second Progress Submission
- **Susmita's Verified Contributions on `Susmita`:**
  1. `SUSMITA_S1_DOMAIN_EVIDENCE_SPEC.md` (`cf7e6eb`): Complete S1.0 domain-rules, `EvidenceProvenance.page_number`, `RATION_CARD`, and negative-control expected-outcome specification (`Submitted — Awaiting Review`).
  2. `SUSMITA_WEBSITE_EVIDENCE_UX_HANDOFF.md` (this deliverable): Reconstructed website/UI state, 8-stage layman user journey, non-fabricated evidence-card model, plain-English validation copy, and developer-ready frontend handoff.
- **Completed / Pending / Blocked Summary:**
  - *Completed (on `Deeptiman` / `algoryxz` baselines):* Electron + PyInstaller sidecar desktop app (`25/25` desktop tests), `PackExecutionEngine` default pipeline (A4, `10/10` A4 tests), `53/53` core Python safety/redaction/golden tests, `SUSMITA_S1_DOMAIN_EVIDENCE_SPEC.md` (`cf7e6eb`), and this UX handoff.
  - *Pending:* Forwarding `schemeId` in Electron IPC, wiring per-slot replacement UI, updating `site/index.html` Streamlit copy, and S1.0 team review/decisions (`S1-D1`..`S1-D4` remain `Pending`).
  - *Blocked:* `algoryxz` still has `0` application source files awaiting Smarak's integration of `Deeptiman`; `pymupdf==2.1` (`AGPLv3`) licensing clearance remains `OPEN`.

### 5.2 For 06:00 AM IST — Final Submission Package Checklist (Susmita Scope)
- Finalize any S1.0 review decisions (`S1-D1`..`S1-D4`) if feedback arrives in writing; otherwise preserve `Pending` status honestly.
- Once `algoryxz` receives the base codebase and S1.0 decisions are approved, execute S1 regression tests (`test_evidence_provenance_contract.py`, `test_domain_negative_controls.py`, `test_slot_validation.py`, `test_golden_baseline.py`).
- Support final judge demo with accurate domain/evidence explanations (no overstated offline/accuracy/identity-collision claims).
