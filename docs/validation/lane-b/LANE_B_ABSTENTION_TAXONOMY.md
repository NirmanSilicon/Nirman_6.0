# DocuReady 2.0 — Lane B: Abstention Taxonomy

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Evidence:** [`evidence/comprehensive/comprehensive_eval_results.json`](../../../evidence/comprehensive/comprehensive_eval_results.json) (`phase_d_abstention_taxonomy`) & [`evidence/b1/track-a/packet_audit_48.csv`](../../../evidence/b1/track-a/packet_audit_48.csv)

---

## 1. Historical 48-Packet Benchmark: Analysis of the 42 `REVIEW` Cases

Out of `48` synthetic `test` packets (`SYN_TEST_000`–`SYN_TEST_047`), **`42` (`87.50%`)** resolved to `NEEDS_CHECKS` (`REVIEW`): `20` ground-truth clean packets and `22` ground-truth defective packets. Only the `6` `unperturbed` (`NATIVE_VECTOR`) packets resolved decisively (`4` `PASS`, `2` `FAIL`).

| Abstention Category | Packet Count | % of 42 `REVIEW` | % of 48 `test` | Evidence & Root Cause | `REVIEW` Justified? | Safe Resolution Exists? |
|---|---:|---:|---:|---|---|---|
| **OCR Uncertainty — `PROVISIONAL` Confidence (`0.60 <= p < 0.85`)** | **10** | `23.81%` | `20.83%` | `SYN_TEST_001, 007, 009, 015, 017, 025, 031, 033, 039, 041` (`bilingual_indic` & `rotation` non-unreadable). `calibrated_prob = 0.7950 < 0.85`, so `discretize_probability()` emits `PROVISIONAL` and `resolve_outcome()` downgrades to `NEEDS_CHECKS`. | **Yes** (under Architecture V2 §6 `< 0.85` safety rule) | Human review or higher-confidence re-scan (`>= 0.85`) |
| **OCR Uncertainty — `UNCERTAIN` Low Confidence (`p < 0.60`)** | **24** | `57.14%` | `50.00%` | `overlapping_stamp` (`0.5640`), `jpeg_low_quality` (`0.2528`), `low_dpi` (`0.2225`), and clean `blur`/`low_contrast` (`0.1420`–`0.2528`). `calibrated_prob < 0.60` $\to$ `UNCERTAIN` $\to$ fail-closed `NEEDS_CHECKS`. | **Yes** | Re-upload clean/higher-DPI scan |
| **Unreadable Document / Negative Control (`UNREADABLE` + OCR Uncertainty)** | **8** | `19.05%` | `16.67%` | `SYN_TEST_005, 010, 013, 023, 029, 034, 037, 047`: `aadhaar_doc.status = "UNREADABLE"` (defective `blur`/`low_contrast` or `wrong_doc_in_slot` negative control) combined with `< 0.85` calibrated confidence. | **Yes** (and `wrong_doc_in_slot` could also fail-fast if slot-verified) | Document replacement (`replace_document_and_reaudit`) |
| **Total** | **42** | **100.00%** | **87.50%** | `12` `PROVISIONAL` (`bilingual_indic` 6 + `rotation` 6) + `30` `UNCERTAIN` (`blur` 6, `jpeg_low_quality` 6, `low_contrast` 6, `low_dpi` 6, `overlapping_stamp` 6) | — | — |

---

## 2. Extended Abstention Taxonomy (Newly Evaluated Document Types — Track B Native)

Live execution of `DocumentExtractor` + `classify_document_content()` + `PackExecutionEngine` on synthetic documents identified **four additional abstention causes**:

1. **Unsupported / Unrecognized Document (`UNSUP_*`, `9/9`):** `classify_document_content()` returns `candidate_type=None, is_uncertain=True` (e.g., Passport, PAN, Voter ID, Driving Licence, Ration Card, Birth Cert, School Leaving Cert, Bank Statement, Utility Bill).
2. **Document Ambiguity — Conflicting Primary Anchors:** Text containing both `INCOME CERTIFICATE` and `CASTE CERTIFICATE` returns `candidate_type=None, is_uncertain=True` (`Conflicting primary anchors detected from multiple types: INCOME_CERT, CASTE_CERT`).
3. **Missing OCR Engine (`ADV_SCANNED_NO_TESSERACT.pdf`):** Image-only PDF with zero native text fails closed to `status="UNREADABLE"`, `0` fields extracted when Tesseract is absent.
4. **Ambiguous Date Format (`DD <= 12` in `DD/MM/YYYY`) — Critical Live Finding:** `parse_and_normalize_date()` marks any date where both day and month are `<= 12` (e.g., `10/08/2006` in `ADV_SUB_UNDERAGE_AADHAAR` and `10/02/2024` in `SUP_INCOME_CERT`) as `EvidenceState.AMBIGUOUS`, causing `resolve_outcome()` to downgrade both `RULE-SUB-AGE-01` (underage defect) and `RULE-EXP-01` (income cert validity) to `REVIEW` (`NEEDS_CHECKS`).
