# DocuReady 2.0 — Lane B: Phase 9 Indic Name Normalization Investigation

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Evidence:** [`evidence/comprehensive/phase9/phase9_results.json`](../../../evidence/comprehensive/phase9/phase9_results.json) (`phase9_indic_name_traces`, `phase9_cross_script_compare`)

---

## 1. Exact Codepoint-Level Root Cause (`normalizer.py` lines 66–83)

`normalize_name(s)` executes two distinct character-filtering stages:
1. **Stage 1 & 2 (`unicodedata.normalize("NFKD", s)` + `not unicodedata.combining(c)`):**
   - Only strips Unicode codepoints with `combining != 0` (such as `Mn` Virama/Halant `U+0B4D` / `U+094D`, combining class `9`).
   - **Preserves** all `Lo` Indic letters and `Mc` spacing vowel signs (`combining == 0`, e.g., `U+0B3E` `ା`, `U+093E` `ा`).
2. **Stage 5 (`re.sub(r'[^A-Z\s]', ' ', cleaned)` at `normalizer.py:74`):**
   - **This ASCII-only regex is the stage that wipes out all remaining Indic characters**, replacing every non-ASCII codepoint with a space (`" "` $\to$ `""`).

### Exact Codepoint Traces
- **Odia `"ଅନନ୍ୟା ଦାସ"`:**
  - Stage 1 (`NFKD`): `[('ଅ', U+0B05, Lo, 0), ('ନ', U+0B28, Lo, 0), ('ନ', U+0B28, Lo, 0), ('୍', U+0B4D, Mn, 9), ('ୟ', U+0B5F, Lo, 0), ('ା', U+0B3E, Mc, 0), (' ', U+0020, Zs, 0), ('ଦ', U+0B26, Lo, 0), ('ା', U+0B3E, Mc, 0), ('ସ', U+0B38, Lo, 0)]`
  - Stage 2 (`combining == 0` kept): `'ଅନନୟା ଦାସ'` (`[U+0B05, U+0B28, U+0B28, U+0B5F, U+0B3E, U+0020, U+0B26, U+0B3E, U+0B38]`) — only `U+0B4D` (Virama, `combining=9`) is stripped.
  - Stage 5 (`[^A-Z\s]`): `'         '` $\to$ final `""`.
- **Hindi `"अनन्या दास"`:**
  - Stage 1 (`NFKD`): `[('अ', U+0905, Lo, 0), ('न', U+0928, Lo, 0), ('न', U+0928, Lo, 0), ('्', U+094D, Mn, 9), ('य', U+092F, Lo, 0), ('ा', U+093E, Mc, 0), (' ', U+0020, Zs, 0), ('द', U+0926, Lo, 0), ('ा', U+093E, Mc, 0), ('स', U+0938, Lo, 0)]`
  - Stage 2 (`combining == 0` kept): `'अननया दास'` (`[U+0905, U+0928, U+0928, U+092F, U+093E, U+0020, U+0926, U+093E, U+0938]`) — only `U+094D` (Virama, `combining=9`) is stripped.
  - Stage 5 (`[^A-Z\s]`): `'         '` $\to$ final `""`.

| Input Case | Stage 2 (`combining==0`) | Stage 5 (`[^A-Z\s]`) | Final Output |
|---|---|---|---|
| Odia-only NFC/NFD (`"ଅନନ୍ୟା ଦାସ"`) | `"ଅନନୟା ଦାସ"` | `"         "` | `""` |
| Hindi-only NFC/NFD (`"अनन्या दास"`) | `"अननया दास"` | `"         "` | `""` |
| Mixed Eng + Odia (`"Ananya ଦାସ"`) | `"Ananya ଦାସ"` | `"ANANYA    "` | `"ANANYA"` |
| Mixed Eng + Hindi (`"Ananya दास"`) | `"Ananya दास"` | `"ANANYA    "` | `"ANANYA"` |
| English + Honorific/Diacritic (`"Smt. Ananyá   Das"`) | `"Smt. Ananya   Das"` | `"     ANANYA   DAS"` | `"ANANYA DAS"` |

---

## 2. Cross-Script `compare_names()` Impact
- `"Ananya Das"` vs `"ଅନନ୍ୟା ଦାସ"` (Odia) $\to$ `grade=AMBIGUOUS, status=FAIL, type=EMPTY_FIELD`.
- `"Ananya Das"` vs `"अनन्या दास"` (Hindi) $\to$ `grade=AMBIGUOUS, status=FAIL, type=EMPTY_FIELD`.
- `"Ananya Das"` vs `"Ananya ଦାସ"` (Mixed) $\to$ `grade=AMBIGUOUS, status=REVIEW, type=SINGLE_TOKEN_NAME` (`"ANANYA DAS"` vs `"ANANYA"`).
- **Recommended Proposal (Not Implemented in Lane B):** Preserve Indic Unicode ranges (`\u0900-\u097F`, `\u0B00-\u0B7F`) in a separate normalized/raw field rather than stripping via `[^A-Z\s]`, and add transliteration for cross-script matching.
