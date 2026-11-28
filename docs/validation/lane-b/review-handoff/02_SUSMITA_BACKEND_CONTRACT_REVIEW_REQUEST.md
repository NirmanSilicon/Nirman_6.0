# Lane B — Backend Contract Review Request: Susmita

**From:** Akriti — Independent Evaluation Owner  
**To:** Susmita — Backend Contract Owner  
**Date:** 29 November 2026  
**Repository / Branch / HEAD:** `Smarak-padhi/Nirman_6.0` | `akriti` @ `2abd3088cff851ddfa51959a1b591cb42b24e279`  
**Canonical Source (Read-Only):** `DocuReady-live` `main` @ `0e14a6ed4452c1e562da2df11df7e4f528045074`  
**Review Status:** **PENDING — WRITTEN BACKEND REVIEW NOT YET RECORDED.**

---

## 1. Review Scope & Technical References

Please assess backend contract implications within your ownership for the following proposed Lane B remediations (none applied to `DocuReady-live`):

1. **Unicode Name Representation (`DocuReady-live/src/docuready/normalize/normalizer.py:66-83`):**
   - Current `normalize_name()` returns ASCII uppercase only (`""` for pure Hindi/Odia names).
   - Proposed change (`PROPOSED — NOT APPLIED TO DOCUREADY`) preserves `NFC` Unicode letters (`L*`) and combining marks (`M*`) alongside uppercase Latin tokens.
2. **Applicant-Name Extraction (`DocuReady-live/src/docuready/ingest/extractor.py:944`):**
   - Supporting `APPLICANT: <name>` labels in addition to `Applicant Name:` / `Name:` / `certify that ...`.
3. **Provenance, Confidence & Ambiguity Semantics (`extractor.py:64,993` & `evidence/states.py:8-24`):**
   - Track B (`ID_AADHAAR_DEGRADED_IMG.pdf`) showed `confidence: 0.912` on a watermark-matched string reflects Tesseract OCR token confidence, not semantic field correctness, while `discretize_probability()` routes `< 0.85` or `is_ambiguous=True` to `PROVISIONAL`/`UNCERTAIN` (`REVIEW`).

---

## 2. Specific Questions for Susmita

1. Do Unicode `NFC` Indic characters in normalized name fields affect backend name representations, storage, or downstream matching contracts?
2. Does extracting `APPLICANT:` labels conform to existing `ExtractedDocument` / field-level contracts?
3. Do source-text provenance (`raw_text`, `LOCAL_OCR` source) and extraction/token confidence remain clearly distinguishable?
4. Are ambiguous (`AMBIGUOUS` / `UNCERTAIN`) and missing (`NONE`) fields represented consistently across API/schema contracts?
5. Do any contract, JSON/UTF-8 serialization, or backward-compatibility issues arise?

---

## 3. Requested Decision Format

Please return one of the following determinations with technical reasoning and affected contract references:
- `ACCEPTABLE`
- `ACCEPTABLE WITH CONDITIONS`
- `CHANGES REQUIRED`
- `OUT OF OWNERSHIP`

**Current Status:** **PENDING — WRITTEN BACKEND REVIEW NOT YET RECORDED.**
