# Lane B — Ready-to-Send Reviewer Handoff Messages

*(Prepared for manual review and sending. No messages have been sent automatically.)*

---

## 1. Message for Deeptiman (Engineering Review)

> **Subject:** Lane B Engineering Handoff — Indic Normalization & `APPLICANT:` Extraction (`2abd308`)
>
> Hi Deeptiman,
>
> Per the Team Lead's review assignment, please find the scoped engineering handoff at `01_DEEPTIMAN_INDIC_ENGINEERING_HANDOFF.md` (with supporting fixtures in `LaneB_TeamLead_Review_2abd308.zip`, SHA-256 `d1dcfc7a61ceaeb2a8e7b8557bf4cfe3d3cea3787c1d31345a9da3c5ba1132e9`).
>
> **Your Scope:**
> 1. **Indic Name Normalization (`normalizer.py:66-83`):** Canonical `normalize_name()` passes `0/8` on Hindi/Odia NFC/NFD, Virama (`U+094D`/`U+0B4D`), vowel marks, and mixed-script inputs. An isolated prototype (`PROPOSED — NOT APPLIED TO DOCUREADY`) passes `8/8` in standalone tests.
> 2. **`APPLICANT:` Extraction (`extractor.py:944`):** Track C raw Tesseract OCR recognizes `40/40` (`20/20` `hin`, `20/20` `ori`) `APPLICANT: <name>` lines, while `DocumentExtractor` extracts `0/40` (supporting CSV: `applicant_name_audit_40.csv`).
>
> Please review the 7 questions in the decision sheet and return your written engineering assessment before any canonical source changes are authorized. (Aadhaar watermark filtering is being handled separately under Security/Privacy review.)
>
> Thanks,  
> Akriti

---

## 2. Message for Susmita (Backend Contract Review)

> **Subject:** Lane B Backend Contract Review Request — Unicode Names & Extraction Contracts (`2abd308`)
>
> Hi Susmita,
>
> Please find the separate backend contract review request at `02_SUSMITA_BACKEND_CONTRACT_REVIEW_REQUEST.md` (referencing `LaneB_TeamLead_Review_2abd308.zip`, SHA-256 `d1dcfc7a61ceaeb2a8e7b8557bf4cfe3d3cea3787c1d31345a9da3c5ba1132e9`).
>
> **Your Scope:** Assess backend contract implications within your ownership for (1) `NFC` Unicode Indic name representations, (2) `APPLICANT:` label extraction output conformance, and (3) provenance vs. OCR token confidence and `AMBIGUOUS`/`NONE` serialization semantics. No canonical code has been modified.
>
> Please return one of: `ACCEPTABLE`, `ACCEPTABLE WITH CONDITIONS`, `CHANGES REQUIRED`, or `OUT OF OWNERSHIP`, with technical reasoning and affected contract references. Status remains **PENDING — WRITTEN BACKEND REVIEW NOT YET RECORDED**.
>
> Thanks,  
> Akriti

---

## 3. Message for Team Lead (Package, Governance & Decisions Handoff)

> **Subject:** Lane B Engineering & Governance Coordination Package (`akriti` @ `2abd308`)
>
> Hi Team Lead,
>
> The complete Lane B engineering and governance coordination package is ready for your review:
> - **Preserved Evidence Archive:** `LaneB_TeamLead_Review_2abd308.zip` (`26,238` B, SHA-256 `d1dcfc7a61ceaeb2a8e7b8557bf4cfe3d3cea3787c1d31345a9da3c5ba1132e9`) + `LaneB_TeamLead_Review_2abd308_INVENTORY.txt` (13 byte-preserved artifacts + `SHA256SUMS.txt`).
> - **Coordination Package (`LaneB_Engineering_Governance_Handoff/`):** Scoped handoffs for Deeptiman (`01`), Susmita (`02`), Security/Privacy (`03`, currently `UNASSIGNED`), Track A/B/C Impact Matrix (`04`), Seven-Document Governance Tracker (`05`), Outstanding Decisions Register (`06`), Attachment Manifest (`07`), and Reviewer Messages (`08`).
>
> **Open Team Lead Decisions Required (`06_OUTSTANDING_DECISIONS_REGISTER.md`):**
> 1. Final review of the 13-artifact evidence package.
> 2. Confirmation of the authoritative Phase 3 baseline reference (candidate `0e14a6ed4452c1e562da2df11df7e4f528045074` remains unapproved/unwaived).
> 3. Original owners/retrieval path or written disposition for the 7 missing governance documents and Phase 3 provisioning evidence.
> 4. Designation of an accountable Security/Privacy Reviewer for the Aadhaar watermark brief.
>
> S1.0 remains **Submitted — Awaiting Review**; all repository and `DocuReady-live` files remain untouched.
>
> Best regards,  
> Akriti

---

## 4. Message for Security / Privacy Reviewer *(Send Only After Team Lead Designates Reviewer)*

> **Subject:** Lane B Security & Privacy Review — Aadhaar Watermark Filtering Brief (`2abd308`)
>
> Hi `<Designated Reviewer>`,
>
> Following Team Lead designation, please review `03_AADHAAR_SECURITY_PRIVACY_REVIEW_BRIEF.md` (with Track B evidence in `LaneB_TeamLead_Review_2abd308.zip`, SHA-256 `d1dcfc7a61ceaeb2a8e7b8557bf4cfe3d3cea3787c1d31345a9da3c5ba1132e9`).
>
> **Scope:** Evidence-only assessment of the `ID_AADHAAR_DEGRADED_IMG.pdf` failure where fallback regex (`extractor.py:64,993`) selected `"SYNTHETIC DEGRADED IMAGE TEST"` (`conf=0.912`) as `applicant_name`, missing `"Kavita Swain"`. This review is strictly separate from Deeptiman's normalization/extraction work and must preserve all four safeguards (no silent deletion of OCR text, no automatic acceptance, raw OCR retained for audit, uncertain extractions continue routing to `REVIEW`).
>
> Please record your findings and explicit approval/rejection decision in the decision record before any filtering implementation is authorized.
>
> Thanks,  
> Akriti
