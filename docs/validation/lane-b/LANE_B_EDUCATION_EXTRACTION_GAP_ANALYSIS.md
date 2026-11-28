# DocuReady 2.0 — Lane B: Phase 9 Education Extraction Gap Analysis

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Evidence:** [`evidence/comprehensive/comprehensive_eval_results.json`](../../../evidence/comprehensive/comprehensive_eval_results.json), [`evidence/comprehensive/phase4_7/phase4_7_results.json`](../../../evidence/comprehensive/phase4_7/phase4_7_results.json), [`evidence/comprehensive/phase9/phase9_results.json`](../../../evidence/comprehensive/phase9/phase9_results.json)

---

## 1. Specimen Counts & Outcome Distinction (`MARKSHEET` + `SLC`, `n = 11` total across Phases 4/5/9)

| Education Family | Total Specimens | Correct Classification | Extraction Successes | Field-Level Exact Match | Safe Rejection (`is_uncertain=True`) | Authenticity Verification |
|---|---:|---:|---:|---:|---:|---|
| **Class 10 Marksheet (`%`)** | **3** (`SUP_MARKSHEET`, `EDU_CLASS10`, `EDU_10_PCT`) | `3 / 3` (`1.0000`, Wilson `[0.4385, 1.0000]`) | `3 / 3` | `14 / 14` (`5+5+4` fields: name, father_name, dob, roll_no, `%`) | `0` | **NOT ESTABLISHED** |
| **Class 12 Marksheet (`%`)** | **2** (`EDU_CLASS12`, `EDU_12_PCT`) | `2 / 2` (`1.0000`, Wilson `[0.3424, 1.0000]`) | `2 / 2` | `9 / 9` (`5+4` fields; no Class 10 vs 12 type split) | `0` | **NOT ESTABLISHED** |
| **University Marksheet (`SGPA`/`CGPA`)** | **3** (`EDU_UNIV_SGPA` x2, `EDU_UNIV_CGPA`) | `3 / 3` (`1.0000`, Wilson `[0.4385, 1.0000]`) | Partial (`name`, `roll_no` only) | `0 / 3` SGPA/CGPA extracted | `0` | **NOT ESTABLISHED** |
| **Grade-Only / Total-Marks Marksheet** | **1** (`EDU_GRADE_ONLY`) | `1 / 1` (`1.0000`, Wilson `[0.2065, 1.0000]`) | Partial (`name`, `roll_no` only) | `0 / 1` letter grade / total marks extracted | `0` | **NOT ESTABLISHED** |
| **University Semester Grade Card** | **1** (`EDU_SEMESTER_GRADE_CARD`) | `0 / 1` (lacks `MARKSHEET` anchor) | `0` (rejected by classifier) | `0` | **`1 / 1`** (`1.0000`, Wilson `[0.2065, 1.0000]`) | **NOT ESTABLISHED** |
| **School Leaving Certificate** | **1** (`UNSUP_SLC`) | N/A (unsupported) | `0` | `0` | **`1 / 1`** (`1.0000`, Wilson `[0.2065, 1.0000]`) | **NOT ESTABLISHED** |

- **Combined `MARKSHEET` Classification (`n = 10`):** `9 / 10` (`0.9000`, 95% Wilson CI `[0.5958, 0.9821]`).
- **Combined Academic Score Extraction (`%` vs `SGPA`/`CGPA`/Grade):** `5 / 5` when `%` is present (`1.0000`, Wilson `[0.5655, 1.0000]`); **`0 / 4`** when expressed as `SGPA`, `CGPA`, or letter grade (`0.0000`, Wilson `[0.0000, 0.4899]`).
