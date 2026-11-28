# Lane B — Engineering Handoff: Deeptiman (Indic Normalization & Applicant-Name Extraction)

**From:** Akriti — Independent Evaluation Owner  
**To:** Deeptiman — Engineering Reviewer  
**Date:** 29 November 2026  
**Repository / Branch / HEAD:** `Smarak-padhi/Nirman_6.0` | `akriti` @ `2abd3088cff851ddfa51959a1b591cb42b24e279`  
**Canonical Source (Read-Only):** `DocuReady-live` `main` @ `0e14a6ed4452c1e562da2df11df7e4f528045074`  
**Scope:** Indic name normalization (`normalizer.py`) and `APPLICANT:` label extraction (`extractor.py`) only. *(Aadhaar watermark filtering is handled separately under Security/Privacy Review.)*

---

## A. Canonical Normalizer Failures (`DocuReady-live/src/docuready/normalize/normalizer.py:66-83`)

Canonical `normalize_name()` executes `unicodedata.normalize("NFKD", s)`, strips all `unicodedata.combining(c)` (destroying Devanagari Virama `U+094D`, Odia Virama `U+0B4D`, and dependent vowel marks), and then executes `re.sub(r'[^A-Z\s]', ' ', cleaned)` (destroying all non-ASCII Unicode letters).

| Case ID | Input | Expected Meaning-Preserving Output | Actual Canonical Output | Unicode Behavior Causing Loss | Canonical Test |
|---|---|---|---|---|---|
| `hi_nfc` | `अनन्या दास` (NFC) | `अनन्या दास` | `""` | `U+094D` (`Mn`, `ccc=9`) stripped; `Lo`/`Mc` stripped by `[^A-Z\s]` | **FAIL** |
| `hi_nfd` | `अनन्या दास` (NFD) | `अनन्या दास` | `""` | Same as `hi_nfc` | **FAIL** |
| `or_nfc` | `ଅନନ୍ୟା ଦାସ` (NFC) | `ଅନନ୍ୟା ଦାସ` | `""` | `U+0B4D` (`Mn`, `ccc=9`) stripped; `Lo`/`Mc` stripped by `[^A-Z\s]` | **FAIL** |
| `or_nfd` | `ଅନନ୍ୟା ଦାସ` (NFD) | `ଅନନ୍ୟା ଦାସ` | `""` | Same as `or_nfc` | **FAIL** |
| `mixed_script` | `ANANYA DAS / ଅନନ୍ୟା ଦାସ` | `ANANYA DAS ଅନନ୍ୟା ଦାସ` | `"ANANYA DAS"` | Odia `U+0B4D` + base/vowel letters stripped; Latin retained | **FAIL** |
| `hi_vowel_marks` | `श्रीमती रीता देवी` | `श्रीमती रीता देवी` | `""` | `U+094D`, `U+0940`, `U+0947` (`Mn`), `U+093E` (`Mc`) + base letters stripped | **FAIL** |
| `or_vowel_marks` | `ଶ୍ରୀମତୀ ସୀତା ଦେବୀ` | `ଶ୍ରୀମତୀ ସୀତା ଦେବୀ` | `""` | `U+0B4D`, `U+0B40`, `U+0B47`, `U+0B3E` + base letters stripped | **FAIL** |
| `mixed_honorific_ws` | `  Smt.   अनन्या   दास  ` | `अनन्या दास` | `""` | Honorific `SMT` removed; Devanagari stripped by `[^A-Z\s]` | **FAIL** |

---

## B. Proposed Regression Tests (**PROPOSED — NOT APPLIED TO DOCUREADY**)

Standalone test suite: `evidence/normalization/test_indic_normalization.py`  
Isolated prototype: `evidence/normalization/proposed_normalizer.py` & `proposed_normalizer.patch`

| Implementation | Result |
|---|---|
| Canonical DocuReady normalizer (`DocuReady-live/src/docuready/normalize/normalizer.py`) | **0/8 passing** |
| Isolated proposed normalizer (**PROPOSED — NOT APPLIED TO DOCUREADY**) | **8/8 passing** |

**Caveat:** The `8/8` prototype pass does **not** establish production readiness. Engineering must review the algorithm, `compare_names()` / Levenshtein / token-Jaccard compatibility, and broader canonical regression implications before any source change.

---

## C. Applicant-Name Extraction Failure (`Track C`, `n = 40`)

Published Track C evidence (`evidence/ocr/track-c/applicant_name_audit_40.csv` and `track_c_indic_results.json`):
- **Raw Tesseract 5.5.5 OCR:** **`20/20`** Hindi (`hin`) and **`20/20`** Odia (`ori`) applicant names recognized (`40/40 = 100%`, Wilson 95% CI `[0.8389, 1.0000]` per language).
- **`DocumentExtractor` (`extractor.py:944`):** **`0/40`** extracted (`0.0000`, `[0.0000, 0.1611]` per language) because `INCOME_CERT` patterns match `Applicant Name:`, `Name:`, or `certify that ...`, not `APPLICANT: <name>`.

| Sample ID | Language | Ground-Truth Name | Exact Matching Raw OCR Line | `DocumentExtractor` Output | Expected Extraction | Actual Extraction |
|---|---|---|---|---|---|---|
| `indic_001` (`DEV`) | `hin` | `Aarav Sharma` | `APPLICANT: Aarav Sharma` | `NONE` | `Aarav Sharma` | **Missed (`NONE`)** |
| `indic_003` (`DEV`) | `hin` | `Aarav Sharma` | `APPLICANT: Aarav Sharma` | `NONE` | `Aarav Sharma` | **Missed (`NONE`)** |
| `indic_002` (`DEV`) | `ori` | `Subrat Nayak` | `APPLICANT: Subrat Nayak` | `NONE` | `Subrat Nayak` | **Missed (`NONE`)** |
| `indic_004` (`DEV`) | `ori` | `Subrat Nayak` | `APPLICANT: Subrat Nayak` | `NONE` | `Subrat Nayak` | **Missed (`NONE`)** |

---

## D. Engineering Decision Sheet for Deeptiman

Please record your written engineering assessment on each question:

1. Should Unicode normalization preserve all Indic letters (`L*`) and combining marks (`M*`, including `U+094D`/`U+0B4D`)?
2. Is `NFC` the correct canonical output representation?
3. Is the proposed normalizer compatible with existing name comparisons (`compare_names()`, Levenshtein distance, `KUMAR`/`KUMARI` rules, honorifics)?
4. How should `APPLICANT:` be handled in the canonical extraction pipeline (`extractor.py`)?
5. Should new parser rules have document-type (`INCOME_CERT`, `CASTE_CERT`, `RESIDENCE_CERT`) or language-specific constraints?
6. How will ambiguity and uncertain extraction continue to route to human review (`REVIEW` / `NEEDS_CHECKS`)?
7. Which canonical tests and regression suites must pass before implementation?

**Status:** **PENDING — AWAITING DEEPTIMAN'S WRITTEN ENGINEERING ASSESSMENT.**
