# DocuReady 2.0 — Lane B: B1 Independent Historical 48-Packet Benchmark Reproduction & Final Verification Report (Track A)

**Owner:** Akriti — Platform, Pipeline & Deterministic Execution
**Date:** 28 November 2026
**Authorization:** Team Lead written approval received 28 November 2026 (Track A only)
**Overall B1 Status:** **VERIFIED — TRACK A HISTORICAL SIMULATED BENCHMARK REPRODUCTION** (independent stdlib-only verification, discrepancy closure, and dual-run reproducibility completed; `0e14a6ed4452c1e562da2df11df7e4f528045074` remains a **candidate snapshot**, not an officially confirmed Phase 3 baseline; governance blockers remain **BLOCKED**)

---

## 1. Provenance & Scope Statement

- **Candidate Source Snapshot:** `$env:DOCUREADY_SOURCE` (`main` at `0e14a6ed4452c1e562da2df11df7e4f528045074`, read-only, unmodified).
- **Provenance Caveat:** Team Lead authorization for Track A does **not** establish `0e14a6ed4452c1e562da2df11df7e4f528045074` as the authoritative frozen Phase 3 baseline. The historical T4.1 artifacts (`eval/EVAL_CARD.md`, `eval/baseline.json`, `eval/harness.py`, `eval/generators/generator_v2.py`, `eval/reports/t4_1_packet_audit.json`) were introduced in commit `d6ff7170b3423e69f693c3481f30380af51d6fb9` (`feat(domain): restore Subhadra and T4.1 evaluation work`, Susmita Rana, 27 Nov 2026) and remain present unchanged at `0e14a6ed4452c1e562da2df11df7e4f528045074`.
- **Track Separation:** **Track A only** (simulated OCR evaluation). No Track B (`DocumentExtractor`/Tesseract) or Track C (multilingual/Indic-script) experiments or metrics are included.
- **Evidence Directory:** `evidence/b1/track-a/` in `<repo-root>` (`akriti` branch, uncommitted/unpushed pending Akriti's review).

---

## 2. Frozen Inputs, Environment & Artifact Hash Inventory

### Environment
- **Python:** `3.12.10` (`C:\Users\akrit\AppData\Local\Programs\Python\Python312\python.exe`)
- **OS / Architecture:** `Windows-11-10.0.26300-SP0` (`AMD64`, `Intel64 Family 6 Model 186 Stepping 2, GenuineIntel`)
- **Key Installed Packages:** `docuready==0.1.0`, `numpy==2.5.4`, `pillow==13.0.0`, `pydantic==2.14.3`, `pydantic_core==2.50.4`, `pytest==9.2.0`, `reportlab==5.1.0`
- **Environment Isolation Note:** Default Python environment had `docuready` editable-installed from `C:\Users\akrit\DocuReady\src\docuready\__init__.py`. Execution explicitly set `PYTHONPATH="$env:DOCUREADY_SOURCE\src;$env:DOCUREADY_SOURCE"` and asserted `docuready.__file__` and `eval.harness.__file__` resolved inside `$env:DOCUREADY_SOURCE`.
- **Execution Configuration:** `n_dev=24` (`seed=101`), `n_calib=32` (`seed=202`), `n_test=48` (`seed=303`), `render_pdfs=True`, `as_of=date(2024, 7, 1)`, `bootstrap_seed=99`, `pack_dir=packs/odisha.subhadra`, `baseline_path=eval/baseline.json`.

### Source Input File SHA-256 Inventory (`DocuReady-live` @ `0e14a6ed4452c1e562da2df11df7e4f528045074`)
| Artifact | Size (bytes) | SHA-256 |
|---|---:|---|
| `eval/EVAL_CARD.md` | 10,001 | `09123b49e783fbd91c4d39f79fa269802b917d8ace17bd8682ac34ff62f27195` |
| `eval/baseline.json` | 243 | `0ad283641bccc04c83c6c6b23223b7e58046931f66d72318efd9e350e617d9ad` |
| `eval/harness.py` | 19,242 | `239144d25728413d529bd890e4149c049288c255b19dacf82dc2de3e51fd381d` |
| `eval/generators/generator_v2.py` | 20,864 | `75f6ef421c9af62fc02ead1a90d9f6dc8098d77b4fe00058d7e67d5119fcd8e0` |
| `eval/reports/t4_1_packet_audit.json` | 40,447 | `ecf3d53abcd23844212cc7c1af15cdeb42f70a82f78bb9baf8f6efba12aa1741` |
| `packs/odisha.subhadra/pack.yaml` | 3,800 | `f26461cc916231467afc802f32b0ab1d131ef10ddd5d3edbda5a03fc1153a13f` |
| `packs/odisha.subhadra/sources.yaml` | 7,699 | `15ab413f4a4c4a626b122091cb80489d12fb23b8386a19b55204648dad476e49` |
| `packs/odisha.subhadra/CHANGELOG.md` | 3,834 | `e5e5cf7d371c2e925f5ec0579463993e78f99099464b3ad69badba0c0a52df10` |

### Separate Supplementary Content-Based SHA-256 Inventory (Stable Relative Paths + PDF Bytes)
- **Inventory File:** [`evidence/b1/track-a/content_based_sha256_inventory.json`](../../../evidence/b1/track-a/content_based_sha256_inventory.json) (supplementary only; **not** a replacement for the historical `dataset_sha256` hash)
- **Algorithm:** `SHA-256` over sorted `test/<filename>.pdf:<file_sha256>\n` across all `96` rendered `test` PDFs (`48` Aadhaar + `48` Bank Passbook).
- **Content Bundle SHA-256:** `7881ea3e7614cf8fc87978020718648a431cea19e4c3658afa9129896e0fb674` (identical across Run 1 and Run 2).

---

## 3. Exact Execution Commands & Logs

1. **Dual-Run Harness Reproduction (`reproduce_b1_track_a.py`):**
   ```powershell
   $env:DOCUREADY_SOURCE = "<path-to-DocuReady-checkout>"  # Must be at candidate SHA 0e14a6ed4452c1e562da2df11df7e4f528045074
$env:PYTHONPATH = "$env:DOCUREADY_SOURCE\src;$env:DOCUREADY_SOURCE"
   $logFile = "evidence\b1\track-a\execution.log"
   python "evidence\b1\track-a\reproduce_b1_track_a.py" 2>&1 | Tee-Object -FilePath $logFile
   ```
   - Exit Status: `0` | Run 1: `9.0006` s | Run 2: `9.0031` s | Report SHA-256 (both): `f0b9ae521760013acf69bb6362609bec1fe6cd76348b3d02008d595c2b5f29d2`.
2. **Standalone Stdlib-Only Independent Verification (`independent_verify_b1.py`, zero `docuready`/`eval` imports):**
   ```powershell
   $logFile = "evidence\b1\track-a\independent_verify.log"
   python "evidence\b1\track-a\independent_verify_b1.py" 2>&1 | Tee-Object -FilePath $logFile
   ```
   - Exit Status: `0` | Outputs: [`evidence/b1/track-a/independent_metrics_audit.json`](../../../evidence/b1/track-a/independent_metrics_audit.json), [`evidence/b1/track-a/expected_readiness_discrepancy_48.csv`](../../../evidence/b1/track-a/expected_readiness_discrepancy_48.csv), [`evidence/b1/track-a/content_based_sha256_inventory.json`](../../../evidence/b1/track-a/content_based_sha256_inventory.json).

---

## 4. Dataset & Ground-Truth Integrity Audit

Full per-packet table saved at [`evidence/b1/track-a/packet_audit_48.csv`](../../../evidence/b1/track-a/packet_audit_48.csv).

- **Packet Identities & Balance:** `48` unique IDs (`SYN_TEST_000`–`SYN_TEST_047`), `24` clean (`is_defective=False`), `24` defective (`is_defective=True`), zero duplicates.
- **Defect Rule Traceability:**
  - `idx % 3 == 1`: DOB set to `"10/08/2006"` (underage `< 21` on `as_of=2024-07-01`).
  - `idx % 6 == 5`: Negative controls (`same_name_different_person` -> DOB `"10/10/2010"`; `near_identical_numbers` -> DOB `"01/07/2004"`; `common_name_collision` -> `"Sita Devi"` + DOB `"01/07/1960"` age $\ge 60$; `wrong_doc_in_slot` -> `aadhaar_doc.status = "UNREADABLE"`).
- **Synthetic PDF Integrity:** All `96` PDFs exist, are non-empty, and match manifest & historical `t4_1_packet_audit.json` `document_sha256s` 100%. Zero `dev`/`calib`/`test` layout, ID, or SHA-256 leakage.
- **Ground-Truth Classification Distinction:**
  - **Generator-rule/label consistency:** **VERIFIED** (every `is_defective` label and negative-control flag matches `generator_v2.py`'s deterministic rules).
  - **Semantic ground-truth validity:** **NOT ESTABLISHED** (`build_extracted_packet()` supplies simulated `ExtractedDocument` fields directly rather than parsing rendered PDFs via OCR, and synthetic labels do not undergo independent human/domain semantic verification).
  - **Real-world label validity:** **NOT EVALUATED** (no real-world citizen documents or production OCR outputs are included in Track A).

---

## 5. Independent Confusion Matrix, Metric Definitions & Wilson CIs — **VERIFIED**

Classification convention: **Positive = defective**, **Predicted Positive = `FAIL` (`NOT_READY`)**, **Predicted Negative = `PASS` (`NO_ISSUES_FOUND`)**, **Abstention = `REVIEW` (`NEEDS_CHECKS`)**.

### Three-Way Confusion Matrix (`n = 48`)
| Ground Truth \ Predicted | `PASS` (`NO_ISSUES_FOUND`) | `FAIL` (`NOT_READY`) | `REVIEW` (`NEEDS_CHECKS`) | Total |
|---|---:|---:|---:|---:|
| **Clean** (`is_defective=False`) | **4** (`TN`) | **0** (`FP` / False Fail) | **20** (Abstained) | **24** |
| **Defective** (`is_defective=True`) | **0** (`FN` / False Pass) | **2** (`TP`) | **22** (Abstained) | **24** |
| **Total** | **4** | **2** | **42** | **48** |

### Metric Definitions, Values & 95% Wilson Confidence Intervals (`z = 1.959963984540054`)
| Metric | Level | `REVIEW` Included in Denom? | Numerator (`k`) | Denominator (`n`) | Value | 95% Wilson CI |
|---|---|---|---|---|---:|---|
| **False-Pass Rate (All Defective)** | Packet | Yes (`22` `REVIEW` in `24`) | `0` (`FN`) | `24` (all defective) | `0.0000` | `[0.0000, 0.1380]` |
| **False-Pass Rate (Decided Defective)** | Packet | No | `0` (`FN`) | `2` (decided defective) | `0.0000` | `[0.0000, 0.6576]` |
| **False-Fail Rate (All Clean)** | Packet | Yes (`20` `REVIEW` in `24`) | `0` (`FP`) | `24` (all clean) | `0.0000` | `[0.0000, 0.1380]` |
| **False-Fail Rate (Decided Clean)** | Packet | No | `0` (`FP`) | `4` (decided clean) | `0.0000` | `[0.0000, 0.4899]` |
| **Decision Coverage** | Packet | Yes | `6` (`4` PASS + `2` FAIL) | `48` (all packets) | `0.1250` | — |
| **Abstention Rate** | Packet | Yes | `42` (`REVIEW`) | `48` (all packets) | `0.8750` | — |
| **Precision (Decided Positive)** | Packet | No | `2` (`TP`) | `2` (`TP + FP`) | `1.0000` | `[0.3424, 1.0000]` |
| **Recall (All Defective)** | Packet | Yes (`22` `REVIEW` in `24`) | `2` (`TP`) | `24` (all defective) | `0.0833` | `[0.0232, 0.2585]` |
| **Recall (Decided Defective)** | Packet | No (conditioned on decided) | `2` (`TP`) | `2` (decided defective) | `1.0000` | `[0.3424, 1.0000]` |
| **F1 (All Defective)** | Packet | Yes (uses overall recall) | `2 * 1.0 * (2/24)` | `1.0 + 2/24` | `0.1538` | — |
| **F1 (Decided Only)** | Packet | No | `2 * 1.0 * 1.0` | `1.0 + 1.0` | `1.0000` | — |
| **Simulated token-confidence proxy pass rate: 24/48 (50%)** (historical key: `per_field_extraction_accuracy`) | Packet-proxy* | Yes | `24` (`tok_conf >= 0.60`) | `48` (all packets) | `0.5000` | — |
| **10-Bin ECE** | Packet-level | Yes | `sum((cnt/48)*\|acc-conf\|)` | `48` (all packets) | `0.2177` | — |

*\*Proxy Pass Rate Note:* In `eval/harness.py` (`_sample_to_feature_vector`), `y_field = 1 if tok_conf >= 0.60 else 0` is a **packet-level simulated token-confidence threshold** (`24/48 = 0.5000`), applied identically to `overall`, `applicant_name`, `dob`, and `passbook_name`. This measurement is **not** actual extraction accuracy or field correctness.

---

## 6. Independent 10-Bin ECE Reconstruction — **VERIFIED (`0.2177`)**

- **Confidence Values:** `calibrated_prob` from `ConfidenceCalibrator` (fitted on `calib`), matching `t4_1_packet_audit.json` across all 48 packets.
- **Bin Boundaries:** 10 equal-width bins `[0.0, 0.1), [0.1, 0.2), ..., [0.8, 0.9), [0.9, 1.0]` (`1.0` included in bin 9).
- **Empty-Bin Treatment:** Bins `0, 3, 4, 6, 8` have `count = 0`, `avg_confidence = 0.0`, `empirical_accuracy = 0.0`, `contribution = 0.0`.
- **Non-Empty Bins (`n = 48`):**
  - Bin 1 `[0.1, 0.2)`: `cnt=6`, `avg_conf=0.1420`, `emp_acc=0.0000`, `weighted_abs_error=0.01775`
  - Bin 2 `[0.2, 0.3)`: `cnt=18`, `avg_conf=0.2427`, `emp_acc=0.0000`, `weighted_abs_error=0.09100`
  - Bin 5 `[0.5, 0.6)`: `cnt=6`, `avg_conf=0.5640`, `emp_acc=1.0000`, `weighted_abs_error=0.05450`
  - Bin 7 `[0.7, 0.8)`: `cnt=12`, `avg_conf=0.7950`, `emp_acc=1.0000`, `weighted_abs_error=0.05125`
  - Bin 9 `[0.9, 1.0]`: `cnt=6`, `avg_conf=0.9740`, `emp_acc=1.0000`, `weighted_abs_error=0.00325`
- **Sum:** `0.21775` $\to$ `round(0.21775, 4) = 0.2177` (exact match to historical `0.2177`).

---

## 7. Discrepancy Closure: `expected_readiness` (30/48) & Dataset Hashing

### A. 30/48 `expected_readiness` vs. `predicted_readiness` Discrepancy — **CLOSED (Generator Heuristic Gap)**
Full 48-row table saved at [`evidence/b1/track-a/expected_readiness_discrepancy_48.csv`](../../../evidence/b1/track-a/expected_readiness_discrepancy_48.csv).
- **`MATCH`: `18 / 48`** (`4` clean unperturbed `PASS`, `2` defective unperturbed `FAIL`, `12` clean packets under `blur`/`jpeg_low_quality`/`low_dpi`/`low_contrast` where `generator_v2.py` set `expected_readiness = NEEDS_CHECKS`).
- **`GENERATOR_OMITTED_ABSTENTION_DEFECTIVE_PERTURBED`: `22 / 48`** — `generator_v2.py` set `expected_readiness = NOT_READY` for all defective packets regardless of perturbation, whereas `discretize_probability()` (`< 0.85`) + `resolve_outcome()` fail closed to `NEEDS_CHECKS` (`REVIEW`) on all `22` perturbed defective packets.
- **`GENERATOR_OMITTED_ABSTENTION_CLEAN_PERTURBED`: `8 / 48`** — `generator_v2.py` only listed `("blur", "jpeg_low_quality", "low_dpi", "low_contrast")` in its `NEEDS_CHECKS` heuristic, omitting `bilingual_indic`, `rotation`, and `overlapping_stamp` on clean packets (`calibrated_prob` `0.5640`–`0.7950 < 0.85`), which also fail closed to `NEEDS_CHECKS` (`REVIEW`).
- **Conclusion:** `REVIEW` (`NEEDS_CHECKS`) on these 30 packets is the **intended fail-closed behavior** of Architecture V2 §6 (`resolve_outcome()`) when `calibrated_prob < 0.85`; `generator_v2.py`'s `expected_readiness` string is an incomplete heuristic and is not used by `harness.py`. These 30 mismatches are **explained by generator logic and not corrected** in the source files.

### B. Dataset Hashing (`dataset_sha256`) Investigation — **CLOSED (Path-Dependent Manifest Hash)**
- **Algorithm (`generator_v2.py` lines 503–525):** Hashes `json.dumps(manifest_payload, indent=2, sort_keys=True)`. `manifest_payload` includes `document_paths` (`str(aadhaar_pdf)`, `str(passbook_pdf)` derived from `output_dir`) and `document_sha256s` (SHA-256 of PDF bytes), **not** raw PDF bytes or relative paths.
- **Why Historical Hash Differs:** Run 1 (`dc9d59ad...`), Run 2 (`90308941...`), and historical `t4_1_packet_audit.json` (`cd29f350...`) used different `output_dir` paths, making the historical `dataset_sha256` output-path-dependent. The historical hash `cd29f350...` cannot be reproduced without knowing the exact historical `output_dir` string (not stored in `t4_1_packet_audit.json`), **even though all 96 PDFs and packet `document_sha256s` are 100% byte-identical**.
- **Supplementary Inventory:** Separate content-based inventory (`content_based_sha256_inventory.json`) yields `7881ea3e7614cf8fc87978020718648a431cea19e4c3658afa9129896e0fb674` identically across runs; it is **supplementary only and does not replace the historical hash**.

---

## 8. Final Component Classification, Limitations & Blockers

| # | Audit Component | Status | Evidence Basis |
|---|---|---|---|
| 1 | **Reproduction execution** | **VERIFIED** | Dual runs exited `0` (`9.0006` s, `9.0031` s) with `PYTHONPATH` isolated to `DocuReady-live` (`0e14a6ed`). |
| 2 | **Dataset integrity** | **VERIFIED** | `48` unique IDs, `96` valid PDFs, zero split leakage, supplementary content bundle SHA-256 `7881ea3e...` identical. |
| 3 | **Generator-rule/label consistency** | **VERIFIED** | `24` clean / `24` defective traced to `idx % 3 == 1` & `idx % 6 == 5`. |
| 3a | **Semantic ground-truth validity** | **NOT ESTABLISHED** | Simulated `ExtractedDocument` fields bypass OCR PDF parsing; no independent semantic label verification. |
| 3b | **Real-world label validity** | **NOT EVALUATED** | No real-world documents evaluated in Track A. |
| 4 | **Confusion matrix** | **VERIFIED** | Independently reconstructed (`TP=2, TN=4, FP=0, FN=0, REVIEW=42`), 100% match to historical. |
| 5 | **Metric calculations** | **VERIFIED** | Stdlib-only script matched all historical & reproduced rates; `24/48 (50%)` renamed to **Simulated token-confidence proxy pass rate: 24/48 (50%)**. |
| 6 | **Wilson intervals** | **VERIFIED** | Exact match (`[0.0000, 0.1380]`, `[0.0000, 0.6576]`, `[0.0000, 0.4899]`) plus Precision/Recall CIs added. |
| 7 | **ECE** | **VERIFIED** | Independently reconstructed `0.21775 -> 0.2177` across all 10 bins (`n=48`). |
| 8 | **Reproducibility** | **VERIFIED** | Run 1 & Run 2 report JSONs (`f0b9ae52...`) and all `96` PDFs are byte-identical (`dataset_sha256` output-path-dependence explained). |
| 9 | **Outstanding discrepancies** | **VERIFIED (Closed for Track A)** | `30/48` `expected_readiness` diffs & `dataset_sha256` output-path-dependence explained without altering code/labels. |

### Explicit Limitations & Outstanding Governance Blockers
- **Production OCR Not Evaluated:** `eval/harness.py` injects synthetic `ocr_sim_params` via `build_extracted_packet()`; production `DocumentExtractor`/Tesseract (Track B) and multilingual/Indic-script evaluation (Track C) have **not** been evaluated and remain **DEFERRED**.
- **Candidate Baseline Unconfirmed (`BLOCKED`):** `0e14a6ed4452c1e562da2df11df7e4f528045074` is **not** confirmed as the authoritative Phase 3 baseline; the Phase 3 provisioning report and 7 repository governance documents (`PHASE_3_EXECUTION_PLAN.md`, `LANE_B_AKRITI_EXECUTION.md`, `CROSS_LANE_INTERFACE_CONTRACTS.md`, `PHASE_3_ACCEPTANCE_MATRIX.md`, `INTEGRATION_TRACKER.md`, `PHASE_3_RISK_REGISTER.md`, `PHASE_3_EVIDENCE_INDEX.md`) remain missing.

**Final Work Package Status:** **`VERIFIED — TRACK A HISTORICAL SIMULATED BENCHMARK REPRODUCTION`** (ready for Akriti's review prior to commit/push to `Nirman_6.0:akriti`).
