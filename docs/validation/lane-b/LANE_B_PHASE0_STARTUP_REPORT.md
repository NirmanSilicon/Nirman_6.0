# DocuReady 2.0 — Lane B Phase 0 Independent Evaluation Startup & Reconciliation Report

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Overall Phase 0 / B1 Status:** **BLOCKED** (authoritative Phase 3 baseline SHA/provisioning report missing; 7 of 8 repository governance artifacts missing; B1 independent verification not started)

---

## 1. Source Environment Verification

- **Status:** **VERIFIED**
- **Repository Root:** `$env:DOCUREADY_SOURCE`
- **Remote (`origin`):** `https://github.com/Algoryxz/DocuReady.git` (fetch & push)
- **Current Branch:** `main` (`## main...origin/main`)
- **Current HEAD:** `0e14a6ed4452c1e562da2df11df7e4f528045074` (`Merge pull request #96 from Algoryxz/fix/ocr-tessdata-and-benchmark-integrity`)
- **Working Tree:** Clean (read-only; unmodified)
- **Post-Merge `main` CI Evidence:**
  - `CI Tests` run `46143209998` (`0e14a6ed4452c1e562da2df11df7e4f528045074`): `completed` / `success`
  - `Windows desktop release qualification` run `46143209901` (`0e14a6ed4452c1e562da2df11df7e4f528045074`): `completed` / `success`

---

## 2. Source Restoration Audit (`DocuReady-live`)

- **Status:** **VERIFIED (No modifications, discards, or HEAD changes occurred)**
- **Logged Event:** `toolSummary: "Restore DocuReady-live to clean main"` at `2026-11-28T15:02:39Z` (`20:32:39+05:30` IST), recorded in `transcript_full.jsonl` (`step=569`, line `570`).
- **Exact Command Executed:**
  ```powershell
  git -C "$env:DOCUREADY_SOURCE" switch main
  git -C "$env:DOCUREADY_SOURCE" branch -D eval/T4.2-indic-ocr-comparison
  git -C "$env:DOCUREADY_SOURCE" status --short --branch
  ```
  Note: Despite the `toolSummary` label `"Restore DocuReady-live to clean main"`, **no** `git restore`, `git reset`, `git checkout --`, or `git clean` command was executed.
- **Why It Was Executed:** An earlier T4.2 evaluation branch (`eval/T4.2-indic-ocr-comparison`) had been checked out at `0e14a6e` (`git reflog` `HEAD@{2}` / `HEAD@{1}`); `step=569` ran `switch main` and `branch -D` to ensure `DocuReady-live` was cleanly on `main` without that branch.
- **Working-Tree State Immediately Before Execution:** Established directly from `transcript_full.jsonl` line `566` (`step=565`, `2026-11-28T15:02:35Z`, 4 seconds prior): `git status --short --branch` returned `## main...origin/main` with **zero** modified, staged, or untracked files, and `git rev-parse HEAD` returned `0e14a6ed4452c1e562da2df11df7e4f528045074`.
- **Tracked or Staged Modifications Before Execution:** None.
- **Changes Discarded:** None.
- **HEAD Changed:** No (`0e14a6ed4452c1e562da2df11df7e4f528045074` before and after; `git reflog` shows `0e14a6e HEAD@{0}: checkout: moving from main to main`).
- **Files Modified or Deleted:** None. Command output (`step=571`, line `572`) recorded `Already on 'main'`, `Your branch is up to date with 'origin/main'.`, `error: branch 'eval/T4.2-indic-ocr-comparison' not found`, `## main...origin/main`.
- **Pre-Restoration Uncertainty:** None — exact pre- and post-execution states are established by `transcript_full.jsonl` (`L566`, `L570`–`L572`) and `git reflog`.

---

## 3. Publishing Environment Verification

- **Status:** **VERIFIED**
- **Repository Root:** `<repo-root>`
- **Remote (`origin`):** `https://github.com/Smarak-padhi/Nirman_6.0.git` (fetch & push)
- **Current Branch:** `akriti` (`## akriti...origin/akriti`, `git config push.default simple`)
- **Current HEAD:** `06c65b4ad83a4aa250711d3e85d842264c29bb1e` (matches `algoryxz`)
- **Working Tree:** Clean prior to creating/updating this unpushed report; confirmed separate repository from `DocuReady-live`.

---

## 4. Exact Phase 3 Baseline Identification

- **Status:** **BLOCKED**
- **Authoritative Phase 3 Baseline SHA:** `UNVERIFIED / MISSING`
- **Git Tags in `DocuReady-live`:** None (`git tag -l` returned empty).
- **Provisioning Report Search:** Expanded recursive search across `C:\Users\akrit\Downloads` (including `DocuReady`, `DocuReady-live`, `DocuReady-main`, `Nirman_6.0-wt-akriti`), `C:\Users\akrit\Documents`, `C:\Users\akrit\Desktop`, and all git branches/tags/logs found **no** `*PROVISION*` file or Phase 3 provisioning record.
- **Conclusion:** `DocuReady-live` `main` HEAD (`0e14a6ed4452c1e562da2df11df7e4f528045074`) is **not** assumed to be the Phase 3 baseline.

---

## 5. Expanded Governance Document Audit

Expanded search covered `C:\Users\akrit\Downloads` (`DocuReady`, `DocuReady-live`, `DocuReady-main`, `Nirman_6.0-wt-akriti`), `C:\Users\akrit\Documents`, `C:\Users\akrit\Desktop`, and all local/remote branches and tags in `DocuReady-live` and `Nirman_6.0-wt-akriti`.

| # | Document | Exists in Repo/Disk | Status | Findings / Distinction |
|---|---|---|---|---|
| 1 | `PHASE_3_EXECUTION_PLAN.md` | No | **BLOCKED** | Not found in any searched directory, branch, or tag. |
| 2 | `LANE_B_AKRITI_EXECUTION.md` | No (repo file missing) | **BLOCKED** (artifact) | Repository artifact `LANE_B_AKRITI_EXECUTION.md` is missing. **User-Provided Governing Instructions:** Akriti supplied the Lane B execution charter directly in this conversation (Phase 0 startup & reconciliation constraints, `Nirman_6.0:akriti` publishing policy, read-only `DocuReady-live`, no B1 execution until unblocked); recorded as user-provided instructions, distinct from the missing repository file. |
| 3 | `CROSS_LANE_INTERFACE_CONTRACTS.md` | No | **BLOCKED** | Not found in any searched directory, branch, or tag. |
| 4 | `PHASE_3_ACCEPTANCE_MATRIX.md` | No | **BLOCKED** | Not found in any searched directory, branch, or tag. |
| 5 | `INTEGRATION_TRACKER.md` | No | **BLOCKED** | Not found in any searched directory, branch, or tag. |
| 6 | `PHASE_3_RISK_REGISTER.md` | No | **BLOCKED** | Not found in any searched directory, branch, or tag. (Only `research/loop36/LOOP_36_RISK_REGISTER.md` exists, which is not `PHASE_3_RISK_REGISTER.md`.) |
| 7 | `PHASE_3_EVIDENCE_INDEX.md` | No | **BLOCKED** | Not found in any searched directory, branch, or tag. |
| 8 | `eval/EVAL_CARD.md` | Yes | **VERIFIED** | Exists at `$env:DOCUREADY_SOURCE\eval\EVAL_CARD.md` (133 lines). Documents T4.1/T4.3 synthetic `dev` (n=24), `calib` (n=32), and `test` (n=48) splits, `87.5%` abstention (`42/48`), `12.5%` coverage (`6/48`), `0.0000` false-pass rate (`0/24`), Wilson 95% CIs, 10-bin ECE (`0.2177`), and notes `harness.py` uses simulated OCR features. |

---

## 6. 48-Packet Inventory: Artifact Availability vs. Independent Verification

Artifact presence does **not** constitute independently verified benchmark accuracy.

### A. Artifact Availability (`VERIFIED` as present on disk)
| Artifact / Component | Exact Path / Evidence in `DocuReady-live` | Availability Status |
|---|---|---|
| **48 packet identities** | `eval/reports/t4_1_packet_audit.json` (`SYN_TEST_000`–`SYN_TEST_047`) | **Available** |
| **24 clean / 24 defective split** | `eval/reports/t4_1_packet_audit.json` & `eval/EVAL_CARD.md` (`n_clean=24`, `n_defective=24`) | **Available** |
| **Dataset manifest / generator** | `eval/generators/generator_v2.py` (`generate_split_dataset()`, `test` seed `303`, `n=48`); `test_dataset_sha256: cd29f3507d26c56249491bfc7c9eaee8e5c91c04608a9632983b9312bd51ccfd` recorded in `t4_1_packet_audit.json` & `EVAL_CARD.md` | **Available** (generated manifest not stored as a static file in `eval/`; reproduced by `generator_v2.py`) |
| **Historical baseline JSON** | `eval/baseline.json` (`max_false_pass_rate: 0.0`, `false_pass_tolerance: 0.02`, `max_false_fail_rate: 0.05`, `min_coverage: 0.10`, `max_ece_10bin: 0.35`) | **Available** |
| **Packet audit JSON** | `eval/reports/t4_1_packet_audit.json` (1282 lines: cross-tabulation, leakage check, regression gate, 48 packet records) | **Available** |
| **Evaluation harness** | `eval/harness.py` (455 lines) | **Available** |

### B. Independent Verification Still Required (All `OPEN / NOT YET VERIFIED` — B1 Scope)
The following items have **not** been independently re-executed or verified in Phase 0:
1. **Every ground-truth label:** Independently verify `is_defective` and `expected_readiness` across all 48 `SYN_TEST_000`–`SYN_TEST_047` packets.
2. **Defect definitions:** Independently verify `idx % 3 == 1` underage DOB (`10/08/2006` vs `as_of=2024-07-01`) and all 4 negative controls (`common_name_collision`, `near_identical_numbers`, `same_name_different_person`, `wrong_doc_in_slot`).
3. **Packet integrity:** Independently regenerate/inspect all 96 `test` PDFs and verify `test_dataset_sha256` (`cd29f3507d26c56249491bfc7c9eaee8e5c91c04608a9632983b9312bd51ccfd`) and zero `dev`/`calib`/`test` leakage.
4. **Scoring correctness:** Independently verify `PackExecutionEngine.validate_packet()` behavior on `odisha.subhadra` for all 48 packets.
5. **Confusion matrix correctness:** Independently verify `PASS` (`4`), `FAIL` (`2`), `REVIEW` (`42`) counts across clean/defective and all 8 perturbations.
6. **Historical false-pass and false-fail calculations:** Independently verify `k_fp = 0 / 24`, `k_ff = 0 / 24`, conditional rates (`0/2`, `0/4`), and `per_field_extraction_accuracy` (`0.5000`).
7. **Abstention classification:** Independently verify `87.5%` abstention (`42/48`, `12` `PROVISIONAL` + `30` `UNCERTAIN`) and `12.5%` coverage (`6/48`).
8. **Wilson interval implementation:** Independently verify `wilson_ci(k, n)` math against `[0.0000, 0.1380]`, `[0.0000, 0.6576]`, and `[0.0000, 0.4899]`, plus 10-bin ECE (`0.2177`) and bootstrap CI.

---

## 7. Simulated vs. Production Evaluation Execution Path

| Execution Mode | Actual Code Path | What It Does | Current Limitations / Status |
|---|---|---|---|
| **1. Simulated OCR Evaluation (`eval/harness.py`)** | `generate_split_dataset()` $\to$ `SyntheticGeneratorV2.build_extracted_packet(rec)` & `_sample_to_feature_vector(s)` $\to$ `ConfidenceCalibrator` (fitted on `calib`) $\to$ `discretize_probability()` $\to$ `PackExecutionEngine.validate_packet()` | Injects synthetic `ocr_sim_params` (`token_confidence`, `label_distance_pt`, `label_match_confidence`, `layout_consistency`, `rotation_deg`) per perturbation and overrides OCR field confidence/state before rule validation. | **Does not execute OCR or PDF parsing.** Live OCR accuracy cannot be claimed from simulated results. |
| **2. Production `DocumentExtractor` / Tesseract** | `src/docuready/ingest/extractor.py` $\to$ Tesseract OCR + regex/label extraction + `PackExecutionEngine` | Performs real PDF text/image extraction and OCR recognition. | **Not invoked by `eval/harness.py`.** Additionally, `eval/EVAL_CARD.md` §6 notes 3 of 9 calibration features (`label_match_confidence`, `layout_consistency`, `rotation_skew`) are defaulted in `extractor.py`, and this Windows host lacks a local Tesseract binary. |
| **3. Generator-Produced Synthetic Documents** | `SyntheticGeneratorV2.render_pdf_with_layout()` in `eval/generators/generator_v2.py` | Renders deterministic seeded PDFs across 5 layouts (`L1`–`L2` dev/calib, `L3`–`L5` test-only) and 8 perturbations. | Uses Type1 fonts lacking Odia glyphs; generates **0** Devanagari/Hindi samples. |
| **4. Rasterized Indic Evaluation Documents** | `generator_v2.py` `_apply_scan_degradation()` | Rasterizes/degrades PDFs for scan perturbations (`blur`, `jpeg_low_quality`, `low_contrast`, `low_dpi`, `rotation`, `overlapping_stamp`). | `bilingual_indic` is **not** passed to `_apply_scan_degradation()`, leaving `bilingual_indic` PDFs as unrasterized native vector. No true rasterized Indic evaluation corpus exists yet. |

---

## 8. Data Readiness vs. Actual Evaluation Readiness

- **Data Readiness (Simulated 48-Packet Baseline):** **Available / Ready for B1 Re-execution (Pending Governance Unblock)** — All 48 packet definitions, perturbation/negative-control rules, `baseline.json`, `harness.py`, and `t4_1_packet_audit.json` are present.
- **Actual Evaluation Readiness (Governance & Live OCR):** **BLOCKED**
  1. **BLOCKER-1 (Baseline Governance):** Authoritative Phase 3 baseline SHA / provisioning report and 7 repository governance documents are missing.
  2. **BLOCKER-2 (Production OCR Evaluation):** `eval/harness.py` tests simulated OCR features only; real `DocumentExtractor` + Tesseract Indic evaluation lacks a rasterized Indic corpus (0 Devanagari samples, unrasterized `bilingual_indic`, Type1 fonts) and local Tesseract installation.

---

## 9. Outstanding Evidence Required from Project Owner / Product Owner

Before B1 or live Indic evaluation can be authorized:
1. **Authoritative Phase 3 Baseline SHA & Provisioning Report** (or written confirmation designating `0e14a6ed4452c1e562da2df11df7e4f528045074` as the frozen Phase 3 baseline).
2. **Missing Repository Governance Artifacts** (or written confirmation of their replacement/waiver):
   - `PHASE_3_EXECUTION_PLAN.md`
   - `LANE_B_AKRITI_EXECUTION.md` (to pair with Akriti's user-provided instructions)
   - `CROSS_LANE_INTERFACE_CONTRACTS.md`
   - `PHASE_3_ACCEPTANCE_MATRIX.md`
   - `INTEGRATION_TRACKER.md`
   - `PHASE_3_RISK_REGISTER.md`
   - `PHASE_3_EVIDENCE_INDEX.md`
3. **Scope Confirmation for B1:** Confirm whether B1 should first independently verify the 48-packet simulated baseline (`eval/harness.py` + `eval/reports/t4_1_packet_audit.json`), and whether production `DocumentExtractor`/Tesseract evaluation requires a separate rasterized Indic corpus and Tesseract environment.
