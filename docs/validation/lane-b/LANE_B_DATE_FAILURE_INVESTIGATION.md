# DocuReady 2.0 — Lane B: Phase 9 Date Normalization & Failure Investigation

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Reproduction Command:**
```powershell
$env:DOCUREADY_SOURCE = "<path-to-DocuReady-checkout>"  # Must be at candidate SHA 0e14a6ed4452c1e562da2df11df7e4f528045074
$env:PYTHONPATH = "$env:DOCUREADY_SOURCE\src;$env:DOCUREADY_SOURCE"
python "evidence\comprehensive\phase9\run_phase9_verification.py"
```
**Evidence:** [`evidence/comprehensive/phase9/phase9_results.json`](../../../evidence/comprehensive/phase9/phase9_results.json) (`phase9_date_traces`) & [`evidence/comprehensive/phase9/phase9.log`](../../../evidence/comprehensive/phase9/phase9.log)

---

## 1. Supported Formats & Locale Assumptions (`normalizer.py` lines 251–297)
- **`DATE_FORMATS`:** `%d/%m/%Y`, `%Y-%m-%d`, `%d-%m-%Y`, `%d.%m.%Y`, `%Y.%m.%d`, `%d.%m.%y`, `%d/%m/%y`, `%d-%m-%y`, `%d-%b-%Y`, `%d %b %Y`, `%d %B %Y`, `%d.%b.%Y`, `%d-%B-%Y`, `%Y/%m/%d`.
- **Locale Assumption:** Strictly Indian/ISO day-first (`DD/MM/YYYY`) or year-first (`YYYY-MM-DD`). **`MM/DD/YYYY` (`%m/%d/%Y`) is NOT in `DATE_FORMATS`.**
- **Ambiguity Rule:** After `strptime` succeeds, `parse_and_normalize_date()` splits on `[/.\-\s]+` and sets `ambiguous = True` iff `1 <= p1 <= 12 and 1 <= p2 <= 12 and p1 != p2`.
- **Parser vs. Ambiguity-Helper Divergence on ISO Dates:**
  - `parse_and_normalize_date("2006-08-10")` has `p1 = 2006`, so `1 <= p1 <= 12` is `False` and the **actual parser returns `is_ambiguous = False`**, producing `EvidenceState.VERIFIED_TEXT` and allowing `PackExecutionEngine` (`RULE-SUB-AGE-01`) to emit **`NOT_READY` (`FAIL`)**.
  - Separately, the helper `get_date_ambiguity_candidates("2006-08-10")` (`normalizer.py` Case B, lines 349–370) returns **two** candidates `["2006-08-10", "2006-10-08"]`; however, `PackExecutionEngine` does **not** call `get_date_ambiguity_candidates()`, so this helper bug does not affect `odisha.subhadra`'s `NOT_READY` decision on `"2006-08-10"`.

---

## 2. End-to-End Execution Trace (`as_of = 2024-07-01`, `odisha.subhadra` age `21..59`)

| Raw DOB | `parse_and_normalize_date` | `get_date_ambiguity_candidates` | `extracted_dob_state` | `RULE-SUB-AGE-01` | Final Readiness | Correct Under Scheme? |
|---|---|---|---|---|---|---|
| `"10/08/2006"` | `2006-08-10`, `VALID`, `amb=True` | `["2006-08-10", "2006-10-08"]` | `AMBIGUOUS` | `REVIEW` (`EVIDENCE_UNCERTAIN`) | `NEEDS_CHECKS` | Over-conservative: both candidates are age `17 < 21` |
| `"05/15/1990"` | `None`, `INVALID_FORMAT`, `amb=False` | `[]` | `LOW_CONFIDENCE` | `REVIEW` (`INSUFFICIENT_DATA`) | `NEEDS_CHECKS` | Expected (`MM/DD/YYYY` unsupported) |
| `"2006-08-10"` | `2006-08-10`, `VALID`, `amb=False` | `["2006-08-10", "2006-10-08"]` | `VERIFIED_TEXT` | `FAIL` (`DEFECT_CONFIRMED`) | **`NOT_READY`** | **Yes**: age `17 < 21` violates Gazette §3.1(c)–(e) |
| `"01/07/2003"` | `2003-07-01`, `VALID`, `amb=True` | `["2003-07-01", "2003-01-07"]` | `AMBIGUOUS` | `REVIEW` (`CANNOT_CONFIRM`) | `NEEDS_CHECKS` | **Justified `REVIEW`** for boundary `DD/MM` vs `MM/DD` ambiguity |
| `"02/07/2003"` | `2003-07-02`, `VALID`, `amb=True` | `["2003-07-02", "2003-02-07"]` | `AMBIGUOUS` | `REVIEW` (`EVIDENCE_UNCERTAIN`) | `NEEDS_CHECKS` | **Justified `REVIEW`**: `2003-07-02` is age 20, `2003-02-07` is age 21 |
| `"15/05/1990"` | `1990-05-15`, `VALID`, `amb=False` | `["1990-05-15"]` | `VERIFIED_TEXT` | `PASS` (`CONFIRMED_OK`) | `NO_ISSUES_FOUND` | **Yes** |
| `"01/07/1964"` | `1964-07-01`, `VALID`, `amb=True` | `["1964-07-01", "1964-01-07"]` | `AMBIGUOUS` | `REVIEW` (`EVIDENCE_UNCERTAIN`) | `NEEDS_CHECKS` | Over-conservative: both candidates are age `60 > 59` |
| `"1964-07-01"` | `1964-07-01`, `VALID`, `amb=False` | `["1964-07-01", "1964-01-07"]` | `VERIFIED_TEXT` | `FAIL` (`DEFECT_CONFIRMED`) | **`NOT_READY`** | **Yes**: age `60 > 59` |
| `"31/02/1995"` | `None`, `INVALID_FORMAT`, `amb=False` | `[]` | `LOW_CONFIDENCE` | `REVIEW` (`INSUFFICIENT_DATA`) | `NEEDS_CHECKS` | **Yes** (invalid calendar date) |
| `""` (empty) | `None`, `EMPTY`, `amb=False` | `[]` | `ABSENT` | `REVIEW` (`INSUFFICIENT_DATA`) | `NEEDS_CHECKS` | **Yes** (missing DOB) |

---

## 3. Root Cause & Recommended Engineering Proposal (Separate from Evaluation)
- **Root Cause:** `safety_layer.py` implements `is_expiration_date_invariant_pass/fail` only for `issue_date` in legacy validation, not for `age_on` / `dob` in `PackExecutionEngine`; and `get_date_ambiguity_candidates()` Case B treats ISO `YYYY-MM-DD` as day/month-ambiguous even though ISO 8601 is unambiguous `YYYY-MM-DD`.
- **Proposal (Not Implemented in Lane B):** Skip Case B ambiguity on strict `YYYY-MM-DD` dates, and optionally evaluate all `get_date_ambiguity_candidates()` in `age_on` so invariant underage/overage dates (`10/08/2006`, `01/07/1964`) resolve to `FAIL` while true boundary flips (`02/07/2003`) stay `REVIEW`.
