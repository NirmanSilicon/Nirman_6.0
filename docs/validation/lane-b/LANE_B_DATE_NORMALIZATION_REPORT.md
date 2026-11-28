# DocuReady 2.0 — Lane B: Date Normalization & Ambiguity Report (Phase 7)

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Evidence:** [`evidence/comprehensive/phase4_7/phase4_7_results.json`](../../../evidence/comprehensive/phase4_7/phase4_7_results.json) (`phase7_date_normalization`)
**Reference Date:** `as_of = 2024-07-01` (`odisha.subhadra`: age `21..59`)

---

## 1. Date Format Test Matrix (`parse_and_normalize_date` & `get_date_ambiguity_candidates`)

| Test Case | Raw Input | Parsed ISO | Status | `is_ambiguous` | Ambiguity Candidates |
|---|---|---|---|---|---|
| `DD/MM/YYYY` unambiguous | `"15/05/1990"` | `1990-05-15` | `VALID` | `False` | `["1990-05-15"]` |
| `DD/MM/YYYY` ambiguous (`DD<=12`) | `"10/08/2006"` | `2006-08-10` | `VALID` | `True` | `["2006-08-10", "2006-10-08"]` |
| `MM/DD/YYYY` unambiguous | `"05/15/1990"` | `None` | **`INVALID_FORMAT`** | `False` | `[]` |
| `MM/DD/YYYY` ambiguous (`MM<=12`) | `"08/10/2006"` | `2006-10-08` | `VALID` | `True` | `["2006-10-08", "2006-08-10"]` |
| `YYYY-MM-DD` | `"1990-05-15"` | `1990-05-15` | `VALID` | `False` | `["1990-05-15"]` |
| `YYYY-MM-DD` underage | `"2006-08-10"` | `2006-08-10` | `VALID` | `False` | `["2006-08-10", "2006-10-08"]` *(divergence)* |
| Odia numerals unambiguous | `"୧୫/୦୫/୧୯୯୦"` | `1990-05-15` | `VALID` | `False` | `["1990-05-15"]` |
| Devanagari numerals ambiguous | `"१०/०८/२००६"` | `2006-08-10` | `VALID` | `True` | `["2006-08-10", "2006-10-08"]` |
| Boundary eligibility (`01/07/2003`) | `"01/07/2003"` | `2003-07-01` | `VALID` | `True` | `["2003-07-01", "2003-01-07"]` |
| Missing (empty / `None`) | `""` / `None` | `None` | `EMPTY` | `False` | `[]` |
| Invalid (`32/13/2024` / `"not-a-date"`) | `"32/13/2024"` / `"not-a-date"` | `None` | `INVALID_FORMAT` | `False` | `[]` |
| Unreadable (`XX/XX/2006`) | `"XX/XX/2006"` | `None` | `UNREADABLE` | `False` | `[]` |

---

## 2. Is `REVIEW` Justified for Ambiguous Dates?

1. **Boundary-Sensitive Dates (`"01/07/2003"` near `2024-07-01`):** **YES**, `REVIEW` is justified when `DD/MM` vs `MM/DD` could legitimately flip eligibility (e.g., on `as_of=2024-06-30`, `2003-01-07` is age 21 while `2003-07-01` is age 20).
2. **Invariant-Outcome Dates (`"10/08/2006"` on `as_of=2024-07-01`):** **NO** (safety over-conservatism). Both `2006-08-10` and `2006-10-08` are age `17 < 21`, yet `EvidenceState.AMBIGUOUS` downgrades `RULE-SUB-AGE-01` from `FAIL` (`NOT_READY`) to `REVIEW` (`NEEDS_CHECKS`), whereas `"2006-08-10"` (`YYYY-MM-DD`, `is_ambiguous=False`) emits **`NOT_READY`**.
3. **Observed Code Divergences:**
   - `MM/DD/YYYY` with `DD > 12` (`"05/15/1990"`) is rejected as `INVALID_FORMAT`.
   - For `"2006-08-10"`, `parse_and_normalize_date()` returns `is_ambiguous=False`, while `get_date_ambiguity_candidates()` returns two candidates (`["2006-08-10", "2006-10-08"]`).
