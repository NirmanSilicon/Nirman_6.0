# Lane B — Aadhaar Watermark Filtering: Security & Privacy Review Brief (Evidence-Only)

**From:** Akriti — Independent Evaluation Owner  
**Assigned Reviewer:** **UNASSIGNED — AWAITING TEAM LEAD DESIGNATION**  
**Date:** 29 November 2026  
**Repository / Branch / HEAD:** `Smarak-padhi/Nirman_6.0` | `akriti` @ `2abd3088cff851ddfa51959a1b591cb42b24e279`  
**Scope:** Strictly separate from Deeptiman's Indic normalization and `APPLICANT:` extraction assessment.

---

## 1. Observed Failure Evidence (`ID_AADHAAR_DEGRADED_IMG.pdf`)

From published Track B evidence (`evidence/ocr/track-b/track_b_results.json`, `LANE_B_TRACK_B_OCR_SMOKE_REPORT.md`):
- **Ground Truth:** `Kavita Swain` / `22/08/1992` / `XXXX XXXX 4321` (`AADHAAR`).
- **Observed Extraction:**
  - `applicant_name`: selected `"SYNTHETIC DEGRADED IMAGE TEST"` (`AMBIGUOUS`, `conf=0.912`).
  - Actual applicant name `"Kavita Swain"` was missed; masked `aadhaar_no` (`XXXX XXXX 4321`) was missed; `dob` matched `1992-08-22`.
- **Code Mechanism:** `DocuReady-live/src/docuready/ingest/extractor.py:64` runs regex patterns with `re.IGNORECASE`; the fallback Aadhaar name regex (`extractor.py:993`) matched the uppercase watermark line `"SYNTHETIC DEGRADED IMAGE TEST"` before `"Kavita Swain"`.
- **Confidence Meaning:** `0.912` is Tesseract's OCR token confidence on that watermark line, not semantic identity correctness.

---

## 2. Security & Privacy Risk Assessment Areas

1. **Incorrect Applicant Identity:** Selecting non-identity banner/watermark text as `applicant_name` risks misidentifying citizens or corrupting identity records.
2. **Watermark & Adversarial Text:** Naïve blocklists could be bypassed by adversarial/crafted document text or over-broadly suppress legitimate names containing similar words.
3. **Evidence Suppression / Accidental Deletion:** Stripping or deleting OCR text prior to audit would destroy forensic traceability.
4. **Incorrect Confidence Interpretation:** High OCR token confidence (`0.912`) on a non-name string can mislead downstream consumers if treated as semantic field confidence.
5. **Human-Review Bypass:** Filtering a watermark must **not** auto-accept a document or bypass `REVIEW` / `NEEDS_CHECKS`.
6. **False Acceptance & False Rejection:** Over-filtering risks dropping valid names (false rejection); under-filtering risks accepting spoofed/banner strings (false acceptance).

---

## 3. Mandatory Safeguards to Preserve

Any future approved filtering proposal **must** preserve:
- **No silent deletion of OCR text.**
- **No automatic acceptance merely because a watermark is filtered.**
- **Raw OCR text remains available for audit.**
- **Uncertain name extraction continues to trigger the established review (`REVIEW` / `NEEDS_CHECKS`) behavior.**

---

## 4. Security / Privacy Decision Record

| Field | Value |
|---|---|
| **Reviewer** | **UNASSIGNED — AWAITING TEAM LEAD DESIGNATION** |
| **Review Status** | **PENDING — NOT STARTED** |
| **Findings** | *(To be recorded by designated reviewer)* |
| **Approval Decision** | **UNDECIDED** (requires explicit written approval before any Aadhaar-specific filtering implementation) |
| **Written Decision Reference** | *(None recorded)* |
