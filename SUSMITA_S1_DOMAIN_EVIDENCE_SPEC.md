# SUSMITA S1.0 — Domain Rules and Evidence Integrity Technical Specification

- **Author:** Susmita (Domain Rules, Evidence and Evaluation Lead)
- **Repository:** `https://github.com/Smarak-padhi/Nirman_6.0`
- **Working Branch:** `Susmita` (branched from `algoryxz` at `06c65b4ad83a4aa250711d3e85d842264c29bb1e`)
- **Reference Shared Branch (`origin/algoryxz`):** `715314c30c24b07a501c221f3a8b10ec32a19754`
- **Date:** 2026-11-28 (IST)
- **Status:** Draft Technical Specification — **Awaiting Team Review (No Application Implementation Authorized)**

---

## 1. Executive Summary

This specification defines the domain-rule and evidence-integrity contracts for **Work Package S1** on the `Susmita` branch, building on `SUSMITA_OWNERSHIP_RECONCILIATION.md` and reconciling against the latest `origin/algoryxz` governance state (`715314c30c24b07a501c221f3a8b10ec32a19754`) and the read-only `Deeptiman` branch (`7b230d9de01bf019c7c5bc0aab7c43ddc5354770`).

1. **Shared Branch State (`origin/algoryxz`):** Three new commits (`a7bb715`, `201d98c`, `715314c`) added NIRMAN 6.0 governance, DocuReady project specifications (`PRD.md`, `TRD.md`, `ARCHITECTURE.md`, `DECISIONS.md`), and `NIRMAN_FIRST_PROGRESS_SUBMISSION.md`. **Application source code remains absent from `algoryxz`** (`0` implementation files).
2. **Evidence Provenance Integrity (`EvidenceProvenance.page_number`):** `EvidenceProvenance.page_number` currently defaults to `1` (`src/docuready/domain/models.py:65`), which can fabricate a source-page citation when no page number is known. This spec defines an optional `Optional[int] = None` proposal, pending contract and consumer review.
3. **Subhadra Document Slot Semantics (`ration_card`):** `packs/odisha.subhadra/pack.yaml` declares `doc_slots.ration_card`, which has no corresponding member in `DocumentType` (`src/docuready/domain/models.py:20-27`) or `resolve_doc_type()` (`src/docuready/rules/primitives.py:77-109`). `RATION_CARD` remains a joint decision for Susmita, Akriti, and Deeptiman.
4. **Negative-Control Expected-Outcome Matrix:** In `eval/EVAL_CARD.md`, all `8/8` existing synthetic negative-control packets abstained (`REVIEW`), which does **not** prove that each underlying defect was decisively detected. This spec defines **proposed rule-level expectations** distinguishing verified conflicts (`FAIL` only where an applicable rule explicitly supports it), name/digit ambiguity (`REVIEW`), and `wrong_doc_in_slot` (`REVIEW` under `slot_validator.py`).

**Important Status & Claim Boundaries:**
- `T3.3` (`odisha.subhadra`) formal Product Owner acceptance remains **pending** per `docs/STATUS.md`.
- The `T4.2` Indic OCR evaluation corpus (`eval/t4_2_indic_ocr/`) is **synthetic-only** and does **not** constitute real-world OCR accuracy validation (`docs/07-DOCUREADY-2.0/STATUS.md`, `eval/EVAL_CARD.md`).
- No statutory requirements are invented or newly claimed in this document.
- No application implementation is authorized by this documentation task.

---

## 2. Current-State Evidence and Exact Repository References

### 2.1 Shared `algoryxz` Branch State (`715314c30c24b07a501c221f3a8b10ec32a19754`)
- `origin/algoryxz` is 3 commits ahead of `06c65b4`:
  - `a7bb715c2c9da03d8e4903f4944b8ba233ebd729`: `docs: establish NIRMAN 6.0 governance, baseline specs, and agent prompts`
  - `201d98cfd78fdd6a00e72682e6a2ecd9929962a6`: `docs: select DocuReady in ADR-001 and align NIRMAN specs`
  - `715314c30c24b07a501c221f3a8b10ec32a19754`: `docs: add NIRMAN 6.0 first progress submission report`
- Files on `origin/algoryxz`: `.gitignore`, `algoryxz.txt`, `AGENT_INSTRUCTIONS.md`, `PROJECT_RULES.md`, `PROJECT_STATUS.md`, `PRD.md`, `TRD.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `DEVELOPMENT_WORKFLOW.md`, `TESTING_STRATEGY.md`, `NIRMAN_FIRST_PROGRESS_SUBMISSION.md`, and `docs/`.
- **Application source code (`src/`, `apps/`, `sidecar/`, `packs/`, `tests/`, `eval/`) remains absent from `algoryxz`.**

### 2.2 DocuReady Source References (Inspected Read-Only on `Deeptiman` at `7b230d9`)

| Area | Exact File & Symbol Reference | Verified Current Behavior |
|---|---|---|
| **Evidence Provenance Model** | `src/docuready/domain/models.py:62-75` (`EvidenceProvenance`), line `65` | `page_number: Optional[int] = 1` (line `65`). When a caller omits `page_number`, Pydantic silently populates `1`. |
| **Slot Validation Workaround** | `src/docuready/rules/slot_validator.py:66, 108, 151, 187, 232, 260` | Explicitly passes `page_number=None` to `EvidenceProvenance(...)` to avoid fabricating page `1`. |
| **2.0 API & Data Contract** | `docs/07-DOCUREADY-2.0/API_AND_DATA_CONTRACTS.md` §3 (`EvidenceProvenanceDTO`) | Specifies `page_number: number \| null` ("1-indexed; `null` when document/page is missing or unlocated — never fabricate page `1`"). |
| **Historical Gate G2 Note** | `docs/STATUS.md` (§1, Gate G2) | Explicitly flags `EvidenceProvenance.page_number = 1` default in domain models as a non-blocking follow-up item that can fabricate page numbers when unspecified. |
| **Subhadra Pack Manifest** | `packs/odisha.subhadra/pack.yaml:36-49` (`doc_slots`) | Declares `aadhaar_card`, `bank_passbook`, `income_certificate`, `application_form`, and `ration_card` (all `required: false`). |
| **DocumentType Enum** | `src/docuready/domain/models.py:20-27` (`DocumentType`) | Defines `INCOME_CERT`, `CASTE_CERT`, `RESIDENCE_CERT`, `MARKSHEET`, `BANK_PASSBOOK`, `APPLICATION_FORM`, `AADHAAR`. **Lacks `RATION_CARD`.** |
| **Slot Name Resolver** | `src/docuready/rules/primitives.py:77-109` (`resolve_doc_type`) | Maps string aliases to `DocumentType` and falls back to `DocumentType(normalized)` (returning `None` on `ValueError`). `"ration_card"` / `"RATION_CARD"` resolves to `None`. |
| **Pack Slot Schema** | `src/docuready/rules/schema.py:47-53, 305` (`DocSlotDefinition`) | Defines `ocr_langs: List[str]` and `required: bool = True`. Has no explicit `unmapped` or `supported` flag. |
| **Slot Mismatch Contract** | `src/docuready/rules/slot_validator.py` & `tests/test_slot_validation.py` (`test_scenario_21_wrong_slot_never_becomes_automatic_fail`) | `slot_validator.py` explicitly specifies `Status.REVIEW` for confident document-slot mismatches and never automatic `FAIL`; `tests/test_slot_validation.py` enforces this. |
| **Negative Controls** | `eval/generators/generator_v2.py:56-62, 241-293` & `eval/EVAL_CARD.md` §5 | Defines `same_name_different_person`, `near_identical_numbers`, `common_name_collision`, `wrong_doc_in_slot`. `eval/EVAL_CARD.md` explicitly states all `8/8` test-split negative-control packets abstained (`0/8` decisive coverage). |
| **Provenance Tests** | `tests/test_evidence_provenance_contract.py:37-48, 69-88` | Asserts `ev.page_number >= 1` on clean `pkt_01_clean` findings and `len(finding.evidence) == 0` on missing-document `RULE-DOC-01` findings. |

---

## 3. Proposed Contracts — Evidence Provenance Integrity

*(Pending contract and consumer review; no code changes are authorized by this specification.)*

### 3.1 Current Contract vs. Intended Semantics
- **Current Contract (`src/docuready/domain/models.py:65`):** `page_number: Optional[int] = 1`.
- **Intended Semantics (`API_AND_DATA_CONTRACTS.md` §3):** `page_number` is a **1-indexed** PDF/document page number when a source location is known, and **`None` (`null` in JSON)** when the page is unknown, unlocated, or not applicable.

### 3.2 Why an Unknown Page Must Not Be Represented as Page `1`
1. **False Evidence Attribution:** Reporting `page_number = 1` on a multi-page PDF when extraction failed to locate a page misleads applicants and assisted-service operators into inspecting page 1 for a field or defect that may not exist there.
2. **Contract Violation:** `API_AND_DATA_CONTRACTS.md` §3 explicitly forbids fabricating page `1`.
3. **Renderer Highlighting Risk:** `EvidenceViewer.tsx` uses `page_number` to navigate and render bounding-box overlays; a fabricated `page_number = 1` with `bounding_box = None` creates inconsistent UI state.

### 3.3 Proposed Optional Page-Number Contract
```python
class EvidenceProvenance(BaseModel):
    document_type: str
    file_name: str
    page_number: Optional[int] = None  # 1-indexed when known; None when unknown/unlocated
    bounding_box: Optional[List[float]] = None  # [x0, y0, x1, y1]
    ...
```
- **Invariant 1:** When `page_number` is provided, it MUST be `>= 1` (1-indexed).
- **Invariant 2:** When `page_number` is omitted or unknown, it MUST remain `None`.
- **Invariant 3:** If `bounding_box is not None` on a located field extraction, `page_number` SHOULD be `>= 1`.

### 3.4 Serialization and Downstream Compatibility Implications
- **JSON / `to_public_dict()` / Sidecar:** `model_dump(mode="json")` emits `"page_number": null` when `None`. `API_AND_DATA_CONTRACTS.md` §3 already types `EvidenceProvenanceDTO.page_number` as `number | null`.
- **Golden Baseline (`tests/golden/legacy_v0/GOLDEN_BASELINE.json`):** Must be verified to ensure no legacy extractor/validator path relies on the default `1` for located fields.
- **UI / Redaction (`report/redact.py`, `EvidenceViewer.tsx`):** Must handle `page_number === null` gracefully without jumping to page 1.

### 3.5 Locations to Inspect Before Implementation
1. **Constructors:** All `EvidenceProvenance(` call sites in `src/docuready/ingest/`, `src/docuready/rules/` (`validator.py`, `primitives.py`, `slot_validator.py`), `src/docuready/evidence/`, `eval/generators/generator_v2.py`, and `tests/`.
2. **Consumers:** `src/docuready/report/redact.py`, `src/docuready/report/exporter.py`, `sidecar/docuready_sidecar.py`, `apps/desktop/src/shared/evidence.ts`, and `apps/desktop/src/renderer/components/EvidenceViewer.tsx`.
3. **Tests:** `tests/test_evidence_provenance_contract.py`, `tests/integration/test_validator_rule_matrix.py`, `tests/test_slot_validation.py`, `tests/test_golden_baseline.py`, and `tests/test_desktop_sidecar_protocol.py`.

### 3.6 Required Regression Tests
1. Default construction `EvidenceProvenance(document_type="AADHAAR", file_name="a.pdf").page_number is None`.
2. Serialization via `model_dump(mode="json")` and `AuditResult.to_public_dict()` preserves `"page_number": None` (`null`).
3. Extracted fields with located bounding boxes on clean PDFs emit `page_number >= 1`.
4. Unlocated/unreadable/slot-mismatch findings emit `page_number is None` and never `1`.
5. `tests/test_golden_baseline.py` passes with unchanged golden SHA-256 (`E8FB1A6B842A47089937777133DE79E1E7F704BEE591D5B4471A1A90BC8C5FA9`).

---

## 4. Subhadra Document Slot Semantics (`ration_card` Alternatives)

`packs/odisha.subhadra/pack.yaml:36-49` declares `doc_slots.ration_card` (`ocr_langs: [eng, ori]`, `required: false`), while `DocumentType` (`src/docuready/domain/models.py:20-27`) and `resolve_doc_type()` (`src/docuready/rules/primitives.py:77-109`) do not include `RATION_CARD`. **This remains a joint decision involving Susmita, Akriti, and Deeptiman; no option is selected unilaterally here.**

| Option | Description | Implications & Trade-Offs |
|---|---|---|
| **Option A: Add `DocumentType.RATION_CARD` + `resolve_doc_type()` alias** | Add `RATION_CARD = "RATION_CARD"` to `DocumentType`, `DOC_TYPE_LABELS`, and `resolve_doc_type()`. | **Pros:** Clean 1:1 mapping between `pack.yaml` `doc_slots` and `DocumentType`; enables `get_slot_ocr_langs()` and A5 UI slot checklist to recognize `ration_card` as a typed slot.<br>**Cons:** `slot_classifier.py` has no `RATION_CARD` anchors yet, so uploads to `ration_card` would classify as uncertain (`REVIEW`) unless anchors or passthrough handling are added. Requires checking `DocumentType` consumers across `src/` and `apps/desktop/`. |
| **Option B: Keep `ration_card` optional and explicitly unmapped in 2.0** | Leave `DocumentType` unchanged; document `ration_card` in `odisha.subhadra/pack.yaml` as an informational/unmapped optional slot. | **Pros:** Zero risk to `DocumentType` enum stability, `slot_classifier.py`, or golden baseline; aligns with `odisha.subhadra/CHANGELOG.md` (NFSA/SFSS household coverage cannot be verified without a trusted government database).<br>**Cons:** `resolve_doc_type("ration_card")` continues returning `None`; A5 UI slot checklist must explicitly handle `resolve_doc_type(slot_id) is None`. |
| **Option C: Schema-level `slot_mode: mapped \| informational` in `DocSlotDefinition`** | Extend `DocSlotDefinition` (`src/docuready/rules/schema.py:47`) with an explicit flag so `packs/lint.py` validates `mapped=True` slots while permitting `mapped=False` informational slots. | **Pros:** Makes unmapped slots self-documenting and lint-enforced rather than silent `None` returns.<br>**Cons:** Modifies `schema.py` and `lint.py` (requires coordination with Deeptiman's A5 work and pack lint tests). |

---

## 5. Negative-Control Expected-Outcome Matrix (Existing Generator vs. Proposed Domain Tests)

### 5.1 Existing Synthetic Generator Behavior (`eval/generators/generator_v2.py:289-415` & `eval/EVAL_CARD.md`)

In `eval/EVAL_CARD.md` §5, all `8/8` existing synthetic negative-control packets abstained (`REVIEW`, `0/8` decisive coverage) because `generator_v2.py` paired them with scan perturbations. **This does not prove that each underlying defect was decisively detected, nor does the existing corpus verify identity collision detection, cross-document numeric mismatch detection, or actual wrong-document classification.**

Inspection of `SyntheticGeneratorV2.build_extracted_packet()` (`eval/generators/generator_v2.py:289-415`) shows what each existing generator label currently exercises:

| Existing Generator Label | Actual Behavior in `build_extracted_packet()` | What It Currently Exercises (and Does Not Exercise) |
|---|---|---|
| **`same_name_different_person`** (`lines 338-340`) | Changes only `dob_val = "10/10/2010"`. Both `aadhaar_name` and `passbook_name` remain unchanged from `gt`. | Exercises **only** the Subhadra age rule (`RULE-SUB-AGE-01`), **not** independent identity verification. |
| **`near_identical_numbers`** (`lines 341-343`) | Changes only Aadhaar `dob_val = "01/07/2004"`. | Contains a single DOB field for `RULE-SUB-AGE-01`; does **not** establish a cross-document numeric mismatch. |
| **`common_name_collision`** (`lines 344-347`) | Sets both `aadhaar_name` and `passbook_name` to `"Sita Devi"` and sets `dob_val = "01/07/1960"`. | The names match; `RULE-SUB-AGE-01` is what can detect the over-age condition (`>= 60`), **not** identity collision detection. |
| **`wrong_doc_in_slot`** (`build_extracted_packet()`) | Sets `aadhaar_doc.status = "UNREADABLE"`. | Exercises unreadable-document handling; does **not** change `doc_type` or create an independently verified `detected_type != slot` mismatch. |

### 5.2 Proposed Future Domain-Rule Test Fixtures & Expected Outcomes

Independent of the existing `eval/EVAL_CARD.md` corpus, future rule-level tests (`tests/integration/test_domain_negative_controls.py`) must use dedicated fixtures and **must distinguish currently implemented rules (`RULE-SUB-AGE-01`, `RULE-SUB-NAME-01`, `RULE-SLOT-01`) from unapproved/unimplemented future rules**:
- **Ambiguous identity (name-only ambiguity) and visually ambiguous digits** must result in **`REVIEW`**.
- **Unreadable documents and `wrong_doc_in_slot` (`detected_type != slot`)** must remain **`REVIEW`** under the existing `slot_validator.py` contract (enforced by `tests/test_slot_validation.py::test_scenario_21_wrong_slot_never_becomes_automatic_fail()`).
- **`FAIL`** is permitted **only** where `VERIFIED` evidence violates a currently implemented rule explicitly supporting `FAIL` (in `packs/odisha.subhadra/pack.yaml`, only `RULE-SUB-AGE-01` supports `FAIL`; `RULE-SUB-NAME-01` is capped at `max_severity: REVIEW`, and there is **no** cross-document DOB, numeric-consistency, or identity-uniqueness rule in the current Subhadra pack).

| Negative Control | Independent Future Fixture Conditions | Evidence Quality & Verification State | Governing Rule (`odisha.subhadra` / Slot) | Proposed Expected Outcome (Current vs. Unapproved Future Rules) | Reason for Outcome | Conditions Requiring Abstention (`REVIEW`) | Conditions Constituting Unsafe False `PASS` |
|---|---|---|---|---|---|---|---|
| **`common_name_collision`** | Two documents share an exact common name (`"Sita Devi"`) with either (a) no independent person-level disambiguating evidence, or (b) a verified over-age Aadhaar `dob` (`"01/07/1960"` on `as_of=2024-07-01`). | (a) Exact name match only, or `PROVISIONAL`/`UNCERTAIN` `dob`; OR (b) `VERIFIED` ($P \ge 0.85$) `dob` violating `RULE-SUB-AGE-01`. | **Current:** `RULE-SUB-NAME-01` (`max_severity: REVIEW`) + `RULE-SUB-AGE-01` (`max_severity: FAIL`).<br>**Future (unapproved):** Independent identity-collision rule. | **Current:** Exact matching names may satisfy `RULE-SUB-NAME-01`, which does not establish identity uniqueness and is capped at `REVIEW`; verified over-age `dob` triggers `RULE-SUB-AGE-01` **`FAIL`** *(age-eligibility result, not collision detection)*.<br>**Future:** Genuine collision detection requires independent person-level evidence and an approved rule. | `RULE-SUB-NAME-01` only checks name consistency (capped at `REVIEW`) and cannot prove identity uniqueness; `RULE-SUB-AGE-01` evaluates statutory age only. | Name-only ambiguity, missing independent person-level evidence, or `PROVISIONAL`/`UNCERTAIN` `dob`. | Emitting `PASS` / `NO_ISSUES_FOUND` when a verified `RULE-SUB-AGE-01` violation exists, or treating `RULE-SUB-NAME-01` `PASS` as proof of unique identity. |
| **`near_identical_numbers`** | Two distinct test cases: (a) visually ambiguous OCR digits near a boundary (`"01/07/2004"` vs. `"01/07/2003"`), vs. (b) genuine cross-document numeric disagreement or verified under-age Aadhaar `dob` (`"01/07/2004"` on `as_of=2024-07-01`). | (a) Visually ambiguous digits (`PROVISIONAL`/`UNCERTAIN`); OR (b) `VERIFIED` ($P \ge 0.85$, `format_valid=True`, unambiguous date parse). | **Current:** `RULE-SUB-AGE-01` (`age_on`, `min_age: 21`, `max_severity: FAIL`).<br>**Future (unapproved):** Cross-document numeric-consistency rule. | **Current:** Digit ambiguity requires **`REVIEW`**; verified `dob < 21` triggers `RULE-SUB-AGE-01` **`FAIL`** *(age-eligibility result)*. The current Subhadra pack has **no** dedicated cross-document numeric-consistency rule, so cross-document numeric mismatch cannot currently produce `FAIL`.<br>**Future:** Cross-document numeric mismatch `FAIL` requires an approved rule. | Separates OCR digit ambiguity (`REVIEW`) from verified age-threshold failure (`RULE-SUB-AGE-01`); avoids claiming `FAIL` for an unimplemented cross-document numeric rule. | Visually ambiguous digits, `PROVISIONAL`/`UNCERTAIN` OCR confidence, or ambiguous two-candidate date parsing. | Rounding age, fuzzy-matching digits, or emitting `PASS` when `dob` is verified `< 21` or visually ambiguous. |
| **`same_name_different_person`** | Two documents share identical `applicant_name` **with** either (a) conflicting `dob` across documents / no independent identity proof, or (b) verified under-age Aadhaar `dob` (`"10/10/2010"`). | (a) Name-only match or `PROVISIONAL`/`UNCERTAIN` secondary identifier; OR (b) `VERIFIED` ($P \ge 0.85$) under-age Aadhaar `dob`. | **Current:** `RULE-SUB-NAME-01` (`max_severity: REVIEW`) + `RULE-SUB-AGE-01` (`max_severity: FAIL`).<br>**Future (unapproved):** Cross-document DOB / identity-conflict rule. | **Current:** Identical names alone do not establish identity; a conflicting DOB across documents is **not** currently checked by a dedicated cross-document DOB rule in Subhadra. Verified under-age Aadhaar `dob` triggers `RULE-SUB-AGE-01` **`FAIL`** *(classified as age-eligibility, not identity-collision detection)*.<br>**Future:** Actual identity-conflict detection requires an approved rule and independent identity evidence. | Prevents conflating `RULE-SUB-AGE-01` age-eligibility `FAIL` with identity-conflict detection, which is not yet implemented in `odisha.subhadra`. | Missing, unreadable, or `PROVISIONAL`/`UNCERTAIN` `dob` / identifier, or absent optional `aadhaar_card`. | Emitting `PASS` / `NO_ISSUES_FOUND` solely because `applicant_name` matches across documents, or when `RULE-SUB-AGE-01` is violated. |
| **`wrong_doc_in_slot`** | Independent fixture with a genuine `VALID` wrong document (`detected_type != slot`, e.g., `INCOME_CERT` uploaded in `aadhaar_card` slot) **plus** separate `UNREADABLE` / `CORRUPTED` fixture. | `VALID` with `detected_type != slot`, or `UNREADABLE` / `CORRUPTED` / blank. | `RULE-SLOT-01` (`slot_validator.py`) + `mismatched_slots` guard (`test_scenario_21_wrong_slot_never_becomes_automatic_fail`) | **`REVIEW`** (overall `NEEDS_CHECKS`, `ReasonCode.WRONG_DOCUMENT_TYPE` or `EVIDENCE_UNCERTAIN`) | Existing `slot_validator.py` contract explicitly specifies `REVIEW` for confident slot mismatches and **never** automatic `FAIL`. | Always abstains to `REVIEW` under the existing contract. | Emitting `PASS` / `NO_ISSUES_FOUND` on a mismatched/unreadable slot, or using wrong-slot fields to pass `RULE-SUB-FLD-01` / `RULE-SUB-AGE-01`. |

---

## 6. Acceptance Criteria (for Future S1 Implementation)

1. **No Unsupported `PASS`:** No rule, pipeline path, or test fixture may emit `PASS` / `NO_ISSUES_FOUND` without `VERIFIED` supporting evidence for the currently implemented rules; negative-control fixtures must produce `0` unsafe false `PASS` outcomes.
2. **Ambiguity Leads to `REVIEW`:** Name-only ambiguity, visually ambiguous digits, `PROVISIONAL`/`UNCERTAIN` evidence, unreadable documents, and `wrong_doc_in_slot` (`slot_validator.py` / `test_scenario_21_wrong_slot_never_becomes_automatic_fail`) must resolve to `REVIEW` (`NEEDS_CHECKS`).
3. **`FAIL` Reserved for Verified Violations of Implemented Rules:** `FAIL` (`NOT_READY`) is emitted only when `VERIFIED` evidence violates a currently implemented rule whose contract explicitly supports `FAIL` (e.g., `RULE-SUB-AGE-01` for statutory age eligibility). No future test may claim to verify an unapproved or unimplemented domain rule (such as cross-document identity-collision or numeric-consistency rules).
4. **Provenance Integrity:** `EvidenceProvenance.page_number` defaults to `None` (pending contract/consumer review); no constructor or pipeline path fabricates `page_number = 1` when page location is unknown.
5. **Slot Decision Alignment:** `odisha.subhadra` `ration_card` slot semantics match the joint decision (Option A, B, or C) with zero unhandled `None` crashes.
6. **Golden Baseline Intact:** `tests/golden/legacy_v0/GOLDEN_BASELINE.json` SHA-256 (`E8FB1A6B842A47089937777133DE79E1E7F704BEE591D5B4471A1A90BC8C5FA9`) remains unchanged.

---

## 7. Regression-Test Plan

Once `algoryxz` receives the DocuReady application codebase and S1 implementation is authorized:
- **New Test Suite:** `tests/integration/test_domain_negative_controls.py` — parameterized across the 4 negative controls under `VERIFIED` conflict, name/digit ambiguity (`REVIEW`), and `wrong_doc_in_slot` (`REVIEW`).
- **Provenance Contract Updates:** `tests/test_evidence_provenance_contract.py` — verify `page_number is None` default and JSON `null` serialization.
- **Slot & Pack Verification:** `tests/test_slot_validation.py` (preserving `test_scenario_21_wrong_slot_never_becomes_automatic_fail`), `tests/test_subhadra_pack.py`, `tests/test_pack_engine.py`, `tests/test_citation_sources.py`.
- **Baseline & Safety Invariants:** `tests/test_golden_baseline.py`, `tests/test_date_invariance_safety.py`, `tests/test_outcome_v2_integration.py`.

---

## 8. Ownership and Dependency Matrix

| Contributor | Confirmed / Documented Responsibilities | Dependencies & Boundaries |
|---|---|---|
| **Susmita** | Domain rules, scheme-specific rule packs (`packs/**` domain rules & `sources.yaml`), official source verification & traceability, matching semantics & resolution, evidence provenance & confidence semantics, rule-level negative-control & regression matrices. | Depends on **Smarak** integrating application code into `algoryxz`; coordinates `RATION_CARD` with **Akriti** and **Deeptiman**; coordinates benchmark scoring with **Akriti**. |
| **Deeptiman** | Lane A Engineering (`DEEPTIMAN_PROJECT_SCOPE.md`): **A4** `PackExecutionEngine` default pipeline, **A1–A3** memory/CI, **A5** slot-validator/engine unification & UI slot checklist, **A6** `ApplicantSession`, **A7** replacement & `exporter.py` redaction fix, **A8** `INTERFACE_CONTRACTS.md`, `apps/desktop/**`, `sidecar/`. | Susmita must **not** modify `apps/desktop/**`, `sidecar/`, `pipeline.py`, or `exporter.py`. |
| **Akriti** | OCR/infrastructure (`src/docuready/ingest/`), evaluation datasets (`eval/`, `synthetic_data/`), and independent OCR accuracy scoring (including pending 24-document paired OCR accuracy benchmark). | Susmita owns domain expected-outcome specs; **Akriti** owns dataset generation/scoring and independent benchmark decisions. |
| **Smarak** | Team-level integration into `algoryxz`, database/AI ownership, security acceptance (`SECURITY.md`), and licensing acceptance (`LICENSING_DECISION.md` AGPLv3/PyMuPDF gate). | Susmita must **not** merge into `algoryxz`, open PRs, or declare security/licensing acceptance. |

### Unresolved Documentation & Governance Conflicts (Recorded Without Resolving)
1. **Workstream Ownership Conflict (`TEAM_WORKSTREAMS.md` vs. `DEEPTIMAN_PROJECT_SCOPE.md`):** `docs/07-DOCUREADY-2.0/TEAM_WORKSTREAMS.md` and `docs/07-DOCUREADY-2.0/STATUS.md` assign **Susmita** as owner of **Backend & Doc Intelligence** (`src/docuready/**`, `sidecar/docuready_sidecar.py`, `packs/**`) and list an unnamed `"Project frontend owner"` and `"Deepti"`, whereas `DEEPTIMAN_PROJECT_SCOPE.md` assigns `src/docuready/**`, `sidecar/`, `packs/**`, and `apps/desktop/**` (A1–A8) to **Deeptiman** and omits Susmita.
2. **Branch Naming Conflict (`Susmita` vs. `feature/<member>-<topic>`):** `PROJECT_RULES.md` (§2.3, §4) and `AGENT_INSTRUCTIONS.md` (§4) on `origin/algoryxz` prescribe `feature/<member>-<short-topic>` / `docs/<short-topic>` (and `PROJECT_RULES.md` §12 prohibits renaming branches without team-leader approval), whereas `Susmita`, `Deeptiman`, and `akriti` use contributor-named branches.
3. **PR Process Conflict (No-PR Rule vs. `PROJECT_RULES.md`):** Susmita's governing instructions prohibit creating, reviewing, or merging PRs, whereas `PROJECT_RULES.md` (§2.4, §3) requires member PRs targeting `Smarak-padhi/Nirman_6.0:algoryxz` for Smarak's review and merge.
4. **`PROPOSED` Status & Outdated SHA on `origin/algoryxz`:** `PROJECT_RULES.md`, `PRD.md`, `TRD.md`, and `ARCHITECTURE.md` on `origin/algoryxz` (`715314c`) are all marked `Status: PROPOSED`, and `PROJECT_STATUS.md` still records an outdated shared-branch SHA (`06c65b4`).
5. **Independent NIRMAN Implementation vs. Imported Snapshot (`TRD.md` vs. `Deeptiman`):** `TRD.md` (§2) requires independent `src/`, `apps/desktop/`, `sidecar/`, and `tests/` suites in `Nirman_6.0`, which conflicts with the full `Algoryxz/DocuReady` (`9f57bb8`) snapshot imported on `Deeptiman` (`7b230d9`).

---

## 9. Open Decisions Requiring Team Approval

1. **Governance & Process Reconciliation (`Smarak`):** Resolve the conflicts in §8 (branch naming `Susmita` vs. `feature/<member>-<topic>`, no-PR rule vs. `PROJECT_RULES.md` PR-to-`algoryxz`, and `TRD.md` §2 independent deliverables vs. `Deeptiman`'s imported snapshot).
2. **Base Codebase Integration (`Smarak`):** Confirm when/how application source code will be integrated into `algoryxz` (`715314c` currently has `0` implementation files).
3. **Workstream Ownership (`Smarak` + `Deeptiman`):** Confirm the boundary between `TEAM_WORKSTREAMS.md` and `DEEPTIMAN_PROJECT_SCOPE.md`.
4. **`ration_card` Slot Decision (`Susmita` + `Akriti` + `Deeptiman`):** Jointly select **Option A**, **Option B**, or **Option C**.
5. **`EvidenceProvenance.page_number` Proposal (`Susmita` + `Deeptiman`):** Approve `Optional[int] = None` after constructor/consumer audit.
6. **Negative-Control Proposed Expectations (`Susmita` + `Akriti`):** Approve §5's proposed expectations for rule-level test implementation.
