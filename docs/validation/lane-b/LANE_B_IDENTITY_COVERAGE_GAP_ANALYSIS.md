# DocuReady 2.0 — Lane B: Phase 9 Identity Coverage Gap Analysis

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Evidence:** [`evidence/comprehensive/comprehensive_eval_results.json`](../../../evidence/comprehensive/comprehensive_eval_results.json) & [`evidence/comprehensive/phase4_7/phase4_7_results.json`](../../../evidence/comprehensive/phase4_7/phase4_7_results.json)

---

## 1. Exact Specimen Counts & Outcome Distinction (Identity Families)

| Identity Family | Total Specimens | Variations Tested | Correct Classification | Extraction Successes | Field-Level Exact Match | Safe Rejection (`is_uncertain=True`) | Abstention (`UNREADABLE`) | Authenticity Verification |
|---|---:|---|---:|---:|---:|---:|---:|---|
| **Aadhaar** | **4** (`3` native + `1` degraded JPEG) | Masked, front+back w/ address, missing DOB, JPEG q=30 image | `3 / 3` native (`1.0000`, Wilson `[0.4385, 1.0000]`) | `3 / 3` native | `11 / 11` extracted fields (`4+4+3`); **`0 / 2` address** (`address` unsupported) | `0` | `1 / 1` degraded image (`UNREADABLE`, no Tesseract) | **NOT ESTABLISHED** (no QR, no UIDAI) |
| **Passport** | **2** (`UNSUP_PASSPORT`, `ID_PASSPORT_SYN`) | Clean native w/ synthetic MRZ `Z0000000` | N/A (unsupported) | `0` (not supported) | `0` | **`2 / 2`** (`1.0000`, Wilson `[0.3424, 1.0000]`) | `0` | **NOT ESTABLISHED** |
| **PAN Card** | **2** (`UNSUP_PAN`, `ID_PAN_SYN`) | Clean native `ABCDE0000F` | N/A (unsupported) | `0` (not wired to `extractor.py`) | `0` | **`2 / 2`** (`1.0000`, Wilson `[0.3424, 1.0000]`) | `0` | **NOT ESTABLISHED** |
| **Voter ID** | **2** (`UNSUP_VOTER_ID`, `ID_VOTER_SYN`) | Clean native EPIC | N/A (unsupported) | `0` | `0` | **`2 / 2`** (`1.0000`, Wilson `[0.3424, 1.0000]`) | `0` | **NOT ESTABLISHED** |
| **Driving Licence** | **2** (`UNSUP_DRIVING_LICENCE`, `ID_DL_SYN`) | Clean native DL | N/A (unsupported) | `0` | `0` | **`2 / 2`** (`1.0000`, Wilson `[0.3424, 1.0000]`) | `0` | **NOT ESTABLISHED** |
| **Ration Card** | **2** (`UNSUP_RATION_CARD`, `ID_RATION_SYN`) | Clean native RC | N/A (unsupported) | `0` | `0` | **`2 / 2`** (`1.0000`, Wilson `[0.3424, 1.0000]`) | `0` | **NOT ESTABLISHED** |

- **Combined Unsupported Identity Safe Rejection:** `10 / 10` (`1.0000`, 95% Wilson CI `[0.7225, 1.0000]`).
- **Architectural Gap:** `packs/odisha.subhadra/pack.yaml` declares a `ration_card` slot, but `DocumentType`, `slot_classifier.py`, and `extractor.py` have no Ration Card support.
- **Authenticity Disclaimer:** OCR/native text extraction does **not** establish document authenticity for any identity family.
