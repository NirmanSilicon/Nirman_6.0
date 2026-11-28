# AEROSENTRY — Phase 3 and Phase 4 Completion Roadmap

This is the retained roadmap from the previous AEROSENTRY project. The newer Fleet Operations / TELESENTRY ZIP contributes UI, telemetry replay and modular frontend components; it does not replace the Phase 3/4 definitions used in this project.

## Phase 3 — FD001 anomaly detection and model-backed diagnostic replay

**Status: IMPLEMENTATION COMPLETE; synthetic benchmark and integration verification PASS.**

### Implemented
- FD001 raw data validation and engine-separated preprocessing.
- 17 non-constant candidate input features for the anomaly baseline.
- Isolation Forest and Local Outlier Factor baselines.
- Combined detector with local outlier, sensor deviation and flatline checks.
- Controlled spike, drift and stuck-at fault injection.
- Engine-grouped train/calibration/final-test separation (70/15/15 engines).
- Saved model, anomaly score outputs, comparison metrics and benchmark report.
- FastAPI routes for model status, available engines, historical replay and direct feature scoring.
- Fleet Operations Diagnostic Insights panel connected to the FD001 anomaly API.
- UI engine identity is read from the actual analysis response.

### Current benchmark (synthetic test only)
- Sample-level: precision 88.6%, recall 38.9%, F1 54.1%, FPR 4.5%.
- Event-level: 45/45 injected events had at least one flagged observation.
- 110/180 individual injected faulty observations were missed.

### Phase 3 exit criteria
- [x] FD001 raw input is validated and preprocessing is reproducible.
- [x] Engine IDs are separated between model fitting, threshold calibration and final evaluation.
- [x] At least two anomaly baselines and a combined detector are evaluated.
- [x] Spike, drift and stuck-at synthetic fault scenarios are evaluated.
- [x] Precision, recall, F1, false-positive rate and event-level recall are reported.
- [x] Model artifact and evaluation outputs are saved.
- [x] Phase 3 FastAPI routes return model-backed assessments.
- [x] Dashboard provides model-backed engine-cycle replay and affected-sensor details.
- [x] Automated verification passes.
- [ ] Natural sensor-fault validation on real labelled aircraft telemetry (not available in FD001 and outside this research-prototype scope).

**Phase 3 conclusion:** complete as a reproducible research/hackathon prototype. Do not claim that it detects all faulty samples or is validated for actual aircraft use. The synthetic event recall does not cancel out the lower sample-level recall.

## Phase 4 — N-CMAPSS DS05 integration

**Status: DS05-specific software implementation and synthetic fixture tests are ready; user's actual HDF5 schema has been inspected, while strict full-file validation/preprocessing remain to be run locally.**

### User-reported real HDF5 profile
- HDF5 filename: `N-CMAPSS_DS05.h5` (reported extracted size ~2.42 GiB).
- Development samples: 4,350,606; test samples: 2,562,046.
- Arrays per split: W (4 columns), X_s (14), X_v (14), T (10), Y (1), A (4).
- W names: `alt`, `Mach`, `TRA`, `T2`.
- X_s names: `T24`, `T30`, `T48`, `T50`, `P15`, `P2`, `P21`, `P24`, `Ps30`, `P40`, `P50`, `Nf`, `Nc`, `Wf`.
- X_v names: `T40`, `P30`, `P45`, `W21`, `W22`, `W25`, `W31`, `W32`, `W48`, `W50`, `SmFan`, `SmLPC`, `SmHPC`, `phi`.
- T contains ten internal fan/LPC/HPC/HPT/LPT efficiency and flow health parameters.
- A names: `unit`, `cycle`, `Fc`, `hs`.
- Published DS05 split: development units 1–6; held-out test units 7–10.

### Implemented in this DS05 update
- Extract only `N-CMAPSS_DS05.h5` from the nested `data_set.zip`; the extractor also handles the outer ZIP if the inner ZIP has not yet been written to disk.
- HDF5 inspection for all six array families, dimensions, row alignment, metadata labels, finite values, actual row counts and disjoint engine IDs; reports rather than hard-codes unit identities.
- Chunked flight-level preprocessing for 18 observable candidate inputs (four W conditions + fourteen X_s physical sensor measurements).
- Strict separation of development and held-out test engine units.
- RUL/health metadata retained separately from predictors; X_v/T/A/Y do not become ordinary model inputs.
- Atomic CSV outputs and preprocessing summary.
- Synthetic fixture tests cover the full DS05 schema, flight aggregation across chunk boundaries and nested-archive extraction.
- FastAPI `/ds05` status, inspection, report and preprocessing routes.
- Settings page and TELESENTRY data source are configured for DS05.

### Phase 4 exit criteria
- [x] User has extracted the real DS05 HDF5 file.
- [x] User's HDF5 metadata inspection reports the expected arrays, dimensions and variable labels.
- [x] DS05-specific extraction, strict inspection and chunked preprocessing code is included.
- [x] API and frontend references are configured for DS05.
- [ ] Run the packaged strict inspector on the actual HDF5 file and obtain `validation_status: passed` with no warnings.
- [ ] Run full chunked preprocessing on the actual HDF5 file and review both output tables and the preprocessing summary.
- [ ] Confirm API/Settings/TELESENTRY recognize the DS05 development engine IDs and do not stream RUL/health labels as sensor features.

**Phase 4 conclusion:** the user's initial HDF5 metadata inspection confirms that the DS05 file opens and exposes the expected array structure. That output alone does not confirm that every numeric value is finite, that engine IDs match the split, or that the flight aggregator completes. Strict Phase 4 sign-off remains pending those local commands.

## Integrated feature additions from the newer ZIP

- Fleet Operations multi-page responsive dashboard.
- Engine assets and sensor analytics pages.
- Alert Centre and RUL Predictions presentation pages.
- TELESENTRY historical CSV replay, with sample and processed N-CMAPSS source options.
- Settings panel for FD001 and N-CMAPSS dataset status/processing.
- Diagnostic Insights page with actual FD001 anomaly scoring beside clearly labelled illustrative/demo UI values.

The newer ZIP's own roadmap uses different phase labels. Those labels are not adopted here; the feature additions above are integrated into the previous AEROSENTRY Phase 3/4 roadmap.

## Non-goals / explicit limitations
- No certified aircraft maintenance or airworthiness decision.
- No claim of live aircraft sensor acquisition.
- No claim of SHAP diagnostic root cause or calibrated uncertainty intervals.
- No RUL predictor trained on N-CMAPSS DS05 in this package. Dashboard RUL views remain illustrative until such a model is trained and evaluated separately.
- No natural labelled sensor failure dataset is supplied for Phase 3 fault recall evaluation.
