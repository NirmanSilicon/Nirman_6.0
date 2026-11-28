# DocuReady 2.0 — Lane B: Multilingual Evaluation Report (Track C)

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Overall Track C Live OCR Status:** **BLOCKED** (Tesseract OCR binary and `eng`/`hin`/`ori` `tessdata` language packs are not installed on this host)
**Deterministic Indic Normalizer Layer Status:** **VERIFIED** (non-OCR text normalization executed live)

---

## 1. Live OCR Environment Audit (`tesseract_discovery.py`)

Executed `find_tesseract_binary_with_source()` and `check_ocr_language_availability()` from `DocuReady-live`:
- **Tesseract Binary:** `None` (`source: 'none'`)
- **`eng` Availability:** `available=False`, `binary_available=False`, `installed_langs=[]`, `missing_langs=['eng']`
- **`hin` Availability:** `available=False`, `binary_available=False`, `installed_langs=[]`, `missing_langs=['hin']`
- **`ori` Availability:** `available=False`, `binary_available=False`, `installed_langs=[]`, `missing_langs=['ori']`
- **Impact:** Live Tesseract OCR across English, Hindi, Odia, English/Hindi mixed, English/Odia mixed, and low-quality Indic scans **cannot be executed** on this host and is explicitly marked **BLOCKED**. Simulated OCR results from Track A are **not** used as Track C evidence.

---

## 2. Deterministic Indic Normalization Layer (Non-OCR) — **VERIFIED**

Executed `docuready.normalize.normalizer` directly on synthetic Indic strings ([`evidence/comprehensive/comprehensive_eval_results.json`](../../../evidence/comprehensive/comprehensive_eval_results.json) $\to$ `indic_normalizer_checks`):

| Check | Input | Output | Result |
|---|---|---|---|
| **Odia numerals (`normalize_indic_digits`)** | `"୨୦୨୪-୦୧-୧୫"` | `"2024-01-15"` | **PASS** |
| **Devanagari numerals (`normalize_indic_digits`)** | `"२०२४-०१-१५"` | `"2024-01-15"` | **PASS** |
| **Odia certificate number (`normalize_cert_number`)** | `"SYN/INC/୨୦୨୪/୦୦୦୧"` | `"SYN/INC/2024/0001"` | **PASS** |
| **Devanagari certificate number (`normalize_cert_number`)** | `"SYN/INC/२०२४/०००१"` | `"SYN/INC/2024/0001"` | **PASS** |
| **Odia date (`parse_and_normalize_date`)** | `"୧୫/୦୫/୧୯୯୦"` | `(date(1990, 5, 15), 'VALID', False)` | **PASS** |
| **Indic-only name (`normalize_name`)** | `"ଅନନ୍ୟା ଦାସ"` | `""` (empty string) | **LIMITATION CONFIRMED** (`normalize_name()` strips non-ASCII characters and returns `""` for Indic-only names) |

---

## 3. Known Multilingual Limitations
1. **No Live Indic OCR Evidence:** CER, WER, and mixed-script OCR accuracy on Hindi (`hin`) and Odia (`ori`) scans remain **BLOCKED / UNMEASURED** pending Tesseract + `tessdata` installation.
2. **Indic-Only Name Normalization:** `normalize_name()` returns `""` for pure Indic-script names (`"ଅନନ୍ୟା ଦାସ"`), so cross-document name matching requires Latin/transliterated names.
3. **Synthetic Generator Gap:** `eval/generators/generator_v2.py` uses Type1 Helvetica fonts lacking Odia glyphs, generates `0` Devanagari samples, and leaves `bilingual_indic` PDFs unrasterized.
