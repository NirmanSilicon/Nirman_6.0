# DocuReady 2.0 — Lane B: Indic-Script Failure Analysis (Phase 6)

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Evidence:** [`evidence/comprehensive/phase4_7/phase4_7_results.json`](../../../evidence/comprehensive/phase4_7/phase4_7_results.json) (`phase6_indic_script`)
**Track C Live OCR Status:** **BLOCKED** (no Tesseract / `hin` / `ori` `tessdata`)

---

## 1. Observed Behavior & Failures (Deterministic Normalization Layer)

| Test Case | Input | Observed Output | Classification |
|---|---|---|---|
| **Odia Name Normalization** | `"ଅନନ୍ୟା ଦାସ"` | `""` (empty string) | **FAILURE / LIMITATION** (`re.sub(r'[^A-Z\s]', ' ', cleaned)` strips all Odia Unicode) |
| **Hindi Name Normalization** | `"अनन्या दास"` | `""` (empty string) | **FAILURE / LIMITATION** (`re.sub(r'[^A-Z\s]', ' ', cleaned)` strips all Devanagari Unicode) |
| **Mixed English/Odia Name** | `"Ananya ଦାସ"` | `"ANANYA"` (Indic surname dropped) | **PARTIAL / DATA LOSS** |
| **Mixed English/Hindi Name** | `"Ananya दास"` | `"ANANYA"` (Indic surname dropped) | **PARTIAL / DATA LOSS** |
| **Cross-Script Name Match (`Eng` vs `Odia`/`Hindi`)** | `"Ananya Das"` vs `"ଅନନ୍ୟା ଦାସ"` / `"अनन्या दास"` | `grade=AMBIGUOUS, status=FAIL, type=EMPTY_FIELD` | **FAILURE / NO TRANSLITERATION** |
| **Odia Numerals (`normalize_indic_digits`)** | `"୨୦୨୪-୦୭-୦୧"` | `"2024-07-01"` | **PASS** |
| **Devanagari Numerals (`normalize_indic_digits`)** | `"२०२४-०७-०१"` | `"2024-07-01"` | **PASS** |
| **Odia / Devanagari Cert Numbers** | `"OD/INC/୨୦୨୪/୦୦୯୯"`, `"HI/INC/२०२४/००९९"` | `"OD/INC/2024/0099"`, `"HI/INC/2024/0099"` | **PASS** |
| **Confusable Characters (IFSC `O` vs `0`)** | `"SBINO000123"` | `(False, "SBINO000123", "ABSTAIN", ...)` | **PASS (Fail-Closed)** |
| **Confusable Characters (PAN digit in prefix)** | `"AB0DE1234F"` | `(False, "AB0DE1234F", "ABSTAIN", ...)` | **PASS (Fail-Closed)** |
