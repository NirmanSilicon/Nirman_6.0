# DocuReady 2.0 — Lane B: Track C Indic OCR Evaluation Report (`Tesseract 5.5.5`)

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 29 November 2026
**Container Image:** `docuready-lane-b-ocr:5.5.5` (`sha256:775712a9a78110bc55439b3c7b874a2b0fd30e92f6f21f0f41152608df978f33`)
**Source Snapshot:** `DocuReady` `main` @ `0e14a6ed4452c1e562da2df11df7e4f528045074` (**candidate snapshot only**)
**Corpus:** `research/loop11_benchmark/` (`40` PNGs: `20` `hin`, `20` `ori`; `DEV=15`, `VAL=15`, `CHALLENGE=10`; `indic_ground_truth.json` SHA-256 `95d8d22a86bff8a86ea7f2d97f1746e31e79f0ce0e3e6bedef3d84c4098d3ce1`)
**Evidence:** [`evidence/ocr/track-c/track_c_indic_results.json`](../../../evidence/ocr/track-c/track_c_indic_results.json), [`evidence/ocr/track-c/track_c.log`](../../../evidence/ocr/track-c/track_c.log), [`evidence/ocr/track-c/run_track_c_indic.py`](../../../evidence/ocr/track-c/run_track_c_indic.py)

---

## 1. Per-Language Results (`eng+hin` & `eng+ori`, `--oem 1`)

| Language | `n` | Mean Raw CER | Mean Raw WER | Mean Norm CER | Mean Norm WER | `annual_income` Exact Match (`k/n`, Rate, 95% Wilson CI) | `applicant_name` Exact Match (`k/n`, Rate, 95% Wilson CI) |
|---|---:|---:|---:|---:|---:|---|---|
| **Hindi (`hin`)** | `20` | `2.5275` | `2.0456` | `2.5275` | `2.0456` | `12 / 20` (`0.6000`, `[0.3866, 0.7812]`) | `0 / 20` (`0.0000`, `[0.0000, 0.1611]`) |
| **Odia (`ori`)** | `20` | `2.8823` | `2.9286` | `2.8823` | `2.9286` | `8 / 20` (`0.4000`, `[0.2188, 0.6134]`) | `0 / 20` (`0.0000`, `[0.0000, 0.1611]`) |

---

## 2. Per-Language & Per-Split Breakdown

| Language & Split | `n` | Mean Raw CER | Mean Raw WER | `annual_income` Exact Match | `applicant_name` Exact Match |
|---|---:|---:|---:|---|---|
| `hin` / `DEV` | `8` | `2.5322` | `2.0497` | `5 / 8` (`0.6250`, `[0.3057, 0.8632]`) | `0 / 8` (`0.0000`, `[0.0000, 0.3244]`) |
| `hin` / `VAL` | `7` | `2.4956` | `2.0176` | `3 / 7` (`0.4286`, `[0.1582, 0.7495]`) | `0 / 7` (`0.0000`, `[0.0000, 0.3543]`) |
| `hin` / `CHALLENGE` | `5` | `2.5647` | `2.0784` | `4 / 5` (`0.8000`, `[0.3755, 0.9638]`) | `0 / 5` (`0.0000`, `[0.0000, 0.4345]`) |
| `ori` / `DEV` | `7` | `2.7054` | `2.7415` | `5 / 7` (`0.7143`, `[0.3589, 0.9178]`) | `0 / 7` (`0.0000`, `[0.0000, 0.3543]`) |
| `ori` / `VAL` | `8` | `2.9668` | `3.0179` | `2 / 8` (`0.2500`, `[0.0715, 0.5907]`) | `0 / 8` (`0.0000`, `[0.0000, 0.3244]`) |
| `ori` / `CHALLENGE` | `5` | `2.9949` | `3.0476` | `1 / 5` (`0.2000`, `[0.0362, 0.6245]`) | `0 / 5` (`0.0000`, `[0.0000, 0.4345]`) |

---

## 3. Root-Cause Findings & Limitations
1. **`applicant_name` `0 / 40` Extraction:** `loop11_benchmark` PNGs label the field `"APPLICANT: <name>"`, whereas `extractor.py:944` (`INCOME_CERT`) only matches `Applicant Name:`, `Name:`, or `certify that ...`.
2. **High CER (`2.53` `hin`, `2.88` `ori`):** Each PNG contains ~`290–325` characters (including an English header `"INCOME_CERT - GOVERNMENT NOTIFICATION..."` not included in `indic_title + indic_clause` ~`101–108` chars), and the Indic-script lines (`Script Transliteration Notice: ...`) show severe OCR glyph garbling (`Si S808 ...`) under `eng+hin` / `eng+ori` on these synthetic PNGs.
3. **Raw vs. Normalized:** Raw OCR and normalized (`normalize_indic_digits`) CER/WER are identical (`2.5275` / `2.8823`) because digits in the OCR output were ASCII or garbled rather than clean Indic numerals.

---

## 4. Post-Execution Independent Audit: OCR Recognition vs. Downstream Extraction (Append-Only)

Independent recomputation from immutable `raw_ocr_text` and `gt_unicode_text` across all `40` samples (`DEV=15`, `VAL=15`, `CHALLENGE=10`, zero tuning, zero exclusions):

### A. OCR Recognition vs. `DocumentExtractor` Separation
Track C spans `3` document types (`INCOME_CERT`, `CASTE_CERT`, `RESIDENCE_CERT`): `12` `INCOME_CERT` in `hin` and `8` `INCOME_CERT` in `ori`.

| Language | `applicant_name` in Raw OCR (`k/n`, Rate, Wilson CI) | `applicant_name` Extracted by DocuReady | `annual_income` in Raw OCR (`INCOME_CERT` only) | `annual_income` Extracted by DocuReady (`INCOME_CERT` only) |
|---|---|---|---|---|
| **Hindi (`hin`)** | **`20 / 20`** (`1.0000`, `[0.8389, 1.0000]`) | `0 / 20` (`0.0000`, `[0.0000, 0.1611]`) | **`12 / 12`** (`1.0000`, `[0.7575, 1.0000]`) | **`12 / 12`** (`1.0000`, `[0.7575, 1.0000]`) |
| **Odia (`ori`)** | **`20 / 20`** (`1.0000`, `[0.8389, 1.0000]`) | `0 / 20` (`0.0000`, `[0.0000, 0.1611]`) | **`8 / 8`** (`1.0000`, `[0.6756, 1.0000]`) | **`8 / 8`** (`1.0000`, `[0.6756, 1.0000]`) |

- **Root-Cause Classification:**
  1. **`applicant_name` `0/40` is a downstream parser limitation, NOT an OCR failure:** Tesseract `5.5.5` recognized `applicant_name` in `40/40` (`100%`) raw outputs, but `extractor.py:944` does not match `"APPLICANT: <name>"`.
  2. **`annual_income` extraction is `20/20` (`100%`) on `INCOME_CERT` samples:** The earlier `12/20` (`hin`) and `8/20` (`ori`) denominators included `CASTE_CERT` (`8` `hin`, `12` `ori` combined with `RESIDENCE_CERT`) that have no `annual_income` field.

### B. CER / WER Scope & Distributions (`CER = edit_distance / len(ref)`)
- **Why `CER > 1.0`:** `gt_unicode_text` (`indic_title + indic_clause`: `108`–`113` chars `hin`, `93`–`101` chars `ori`) is a **partial-page Indic subset**, whereas `raw_ocr_text` (`307`–`319` chars `hin`, `285`–`320` chars `ori`) is a **full-page bilingual OCR output** (`edits`: `273`–`281` `hin`, `257`–`289` `ori`).
- **Per-Document Distributions:**
  - `hin` (`n=20`): CER `mean=2.5275`, `min=2.4159`, `median=2.6019`, `max=2.6019`; WER `mean=2.0456`, `min=1.9474`, `median=2.1111`, `max=2.1111`.
  - `ori` (`n=20`): CER `mean=2.8823`, `min=2.5446`, `median=3.1075`, `max=3.1075`; WER `mean=2.9286`, `min=2.5714`, `median=3.1667`, `max=3.1667`.
- **Raw vs. Normalized:** Identical because `normalize_indic_digits` maps `०-९`/`୦-୯` to `0-9`, and raw OCR outputs contained ASCII numerals / garbled Indic glyphs rather than clean Unicode Indic digits.

---

## 5. Final Consistency & Metric Validity Notice (Append-Only)

- **CER / WER Non-Comparability:** The CER (`2.5275` `hin`, `2.8823` `ori`) and WER (`2.0456` `hin`, `2.9286` `ori`) values above compare **full-page bilingual OCR output** (`~285–320` chars) against **partial-page Indic-only ground truth** (`indic_title + indic_clause`, `~93–113` chars). They are **non-comparable** and must **not** be interpreted as valid OCR accuracy measurements; valid full-page CER/WER requires complete page-level transcription ground truth.
- **Strict 40-Document Applicant-Name Audit:** Saved in [`evidence/ocr/track-c/applicant_name_audit_40.csv`](../../../evidence/ocr/track-c/applicant_name_audit_40.csv) via [`evidence/ocr/track-c/audit_track_c_40_names.py`](../../../evidence/ocr/track-c/audit_track_c_40_names.py) using strict `^APPLICANT:\s*(.+)$` exact equality: **`20/20` (`hin`)** and **`20/20` (`ori`)** raw OCR lines match ground truth exactly (`1.0000`, Wilson `[0.8389, 1.0000]`), while `DocumentExtractor` returned **`0/40` (`0.0000`)**.
- **Eligible `annual_income` Denominators:** `12/12` (`1.0000`, `[0.7575, 1.0000]`) for `hin` `INCOME_CERT` and `8/8` (`1.0000`, `[0.6756, 1.0000]`) for `ori` `INCOME_CERT` (`CASTE_CERT` and `RESIDENCE_CERT` excluded from `annual_income` denominators).
