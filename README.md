# AEROSENTRY — Integrated Phase 3 + Phase 4 Project

AEROSENTRY is a research prototype for turbofan engine health monitoring. This integrated package combines the Fleet Operations / TELESENTRY dashboard from the newer UI package with the FD001 anomaly-detection work and N-CMAPSS DS05 ingestion tools adapted to the actual HDF5 schema reported by the user.

## Project boundary

- **Phase 3:** FD001-based anomaly detection, synthetic fault evaluation, FastAPI scoring endpoints, historical engine replay and Diagnostic Insights UI.
- **Phase 4:** N-CMAPSS DS05 acquisition, HDF5 inspection, chunked flight-level preprocessing, API endpoints and Settings/TELESENTRY UI integration.
- **TELESENTRY:** historical CSV replay is a simulation feature. It does not connect to physical aircraft sensors.

> **Important:** NASA C-MAPSS and N-CMAPSS are simulated engine datasets. N-CMAPSS uses flight-condition profiles based on real commercial-flight data, but the engine measurements are still simulator-generated. This is not live aircraft telemetry, certified fault diagnosis, maintenance authorization or an airworthiness decision.

## Current completion state

| Deliverable | Status |
|---|---|
| Fleet Operations dashboard and TELESENTRY UI | Integrated |
| FD001 raw data validation and preprocessing | Executed successfully on bundled FD001 files |
| Phase 3 anomaly model and synthetic benchmark | Executed; verification passes |
| Phase 3 FastAPI endpoints and Diagnostic Insights replay | Integrated and tested |
| N-CMAPSS DS05 nested-archive extractor | Implemented; extracts only DS05 from the already downloaded nested archive |
| N-CMAPSS DS05 HDF5 inspection and flight-level preprocessing | Implemented against the user-reported DS05 schema (all six array families) and tested with synthetic HDF5 fixtures |
| N-CMAPSS run on the real DS05 HDF5 file | **User reports successful HDF5 extraction and metadata inspection; full inspector/preprocessing run remains to be executed locally** |
| N-CMAPSS dashboard/TELESENTRY data-source activation | Integrated; activates after real DS05 inspection and preprocessing succeeds |

The Phase 3 implementation and Phase 4 software integration are included. **Strict Phase 4 data sign-off still requires running the pipeline on the actual `N-CMAPSS_DS05.h5` file.** Fixture tests are not a substitute for real-data validation.

## Project structure

```text
AEROSENTRY_Phase3_Phase4/
├── index.html / style.css / app.js      # Fleet Operations frontend shell
├── components/                           # Overview, assets, analytics, alerts,
│   ├── diagnostic-insights/              # Phase 3 model-backed replay panel
│   ├── settings/                         # FD001 + N-CMAPSS dataset manager
│   └── telemetry/                        # TELESENTRY simulator and source picker
├── backend/
│   ├── app/main.py                       # FastAPI service and all API routes
│   ├── app/services/                     # FD001, Phase 3 anomaly and telemetry services
│   └── tests/                             # API and integration tests
├── data/
│   ├── raw/FD001/                         # Bundled original FD001 text files
│   ├── processed/FD001/                   # Reproducible processed windows and reports
│   └── telemetry/                         # Illustrative replay CSV
├── outputs/                               # Trained Phase 3 model + evaluation outputs
├── phase4_ncmapss/
│   ├── scripts/extract_ds05_from_nested_zip.py  # Extract DS05 from nested NASA ZIPs
│   ├── scripts/inspect_ncmapss.py         # HDF5 schema and integrity inspection
│   ├── scripts/preprocess_to_flights.py   # Chunked development/test flight aggregates
│   └── test_phase4_pipeline.py            # HDF5 fixture tests
├── scripts/prepare_fd001.py               # Validate and preprocess FD001
├── phase3_complete.py                     # Train/evaluate Phase 3 anomaly pipeline
├── verify_phase3.py                       # Phase 3 acceptance verification
└── PROJECT_ROADMAP.md                     # Phase 3/4 definition of done
```

## 1. Set up the environment (Windows / VS Code)

Open the project root in VS Code. Since the folder was moved between drives, create a fresh virtual environment in its new location rather than copying an old `.venv` folder.

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install -r phase4_ncmapss\requirements-phase4.txt
```

If PowerShell blocks activation, run commands with the environment's Python directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pip install -r phase4_ncmapss\requirements-phase4.txt
```

Python 3.11 or 3.12 is recommended for the scientific Python packages.

## 2. Phase 3 — FD001 anomaly detection

### Bundled dataset

The project contains the original FD001 text files in `data/raw/FD001/`:

- `train_FD001.txt`
- `test_FD001.txt`
- `RUL_FD001.txt`

Run a raw-data integrity check:

```powershell
.\.venv\Scripts\python.exe scripts\prepare_fd001.py --validate-only
```

Run preprocessing (creates engine-separated windows and scaler artifacts):

```powershell
.\.venv\Scripts\python.exe scripts\prepare_fd001.py
```

Train/evaluate the Phase 3 anomaly pipeline and write model/report outputs:

```powershell
.\.venv\Scripts\python.exe phase3_complete.py
```

Run the Phase 3 acceptance verification:

```powershell
.\.venv\Scripts\python.exe verify_phase3.py
```

The current reproducible synthetic benchmark report is `outputs/PHASE3_FINAL_REPORT.txt`. It reports:

- 17 non-constant candidate features.
- Engine separation: 70 training / 15 calibration / 15 final test engines.
- Combined detector sample-level precision 88.6%, recall 38.9%, F1 54.1%, false-positive rate 4.5%.
- 45/45 synthetic events had at least one flagged observation (100% event-level recall).

**Interpretation:** event-level recall means an alert occurred somewhere in each injected event; it does not mean every faulty row was detected. In the saved benchmark 110 of 180 injected faulty observations were missed. Synthetic faults are not naturally labelled NASA faults and do not establish real-engine diagnostic performance.

### Phase 3 API and UI

Start the backend from the project root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

Open the frontend using VS Code Live Server from `index.html` (do not use `file://`). The default backend base URL is `http://127.0.0.1:8000`.

Use **Diagnostic Insights → FD001 anomaly replay** to choose an engine, set an end cycle and run the model-backed assessment. The engine ID displayed in the assessment is taken from the same API response as the model scores, preventing a separate UI selection label from being mistaken for the engine actually assessed.

Phase 3 endpoints:

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/v1/anomaly/fd001/status` | Model and dataset readiness |
| GET | `/api/v1/anomaly/fd001/engines` | Available engine IDs and cycle bounds |
| GET | `/api/v1/anomaly/fd001/analyze?engine_id=1&end_cycle=60` | Historical engine-cycle replay |
| POST | `/api/v1/anomaly/fd001/score` | Score a supplied feature observation |

## 3. Phase 4 — N-CMAPSS DS05 integration

### Actual HDF5 structure reported from the user's DS05 file

The user's HDF5 inspection reports these actual array shapes:

| Array | Development shape | Test shape | Meaning |
|---|---:|---:|---|
| `W_*` | (4,350,606, 4) | (2,562,046, 4) | Flight-condition descriptors |
| `X_s_*` | (4,350,606, 14) | (2,562,046, 14) | Physical sensor measurements |
| `X_v_*` | (4,350,606, 14) | (2,562,046, 14) | Virtual sensor measurements |
| `T_*` | (4,350,606, 10) | (2,562,046, 10) | Internal health/degradation parameters |
| `Y_*` | (4,350,606, 1) | (2,562,046, 1) | RUL labels (cycles) |
| `A_*` | (4,350,606, 4) | (2,562,046, 4) | Unit, cycle, flight class and health-state metadata |

The reported metadata labels are:

- `W_var`: `alt`, `Mach`, `TRA`, `T2`.
- `X_s_var`: `T24`, `T30`, `T48`, `T50`, `P15`, `P2`, `P21`, `P24`, `Ps30`, `P40`, `P50`, `Nf`, `Nc`, `Wf`.
- `X_v_var`: `T40`, `P30`, `P45`, `W21`, `W22`, `W25`, `W31`, `W32`, `W48`, `W50`, `SmFan`, `SmLPC`, `SmHPC`, `phi`.
- `T_var`: ten fan/LPC/HPC/HPT/LPT efficiency and flow health parameters.
- `A_var`: `unit`, `cycle`, `Fc`, `hs`.

Default observable model inputs are **18 channels**: 4 `W` flight-condition descriptors + 14 `X_s` measured sensor channels. `X_v` is virtual/model-derived, `T` contains internal health parameters, `A` is metadata and `Y` is the RUL target. The latter groups are not used as ordinary predictors. `hs` is preserved as an evaluation metadata field only; its code mapping must be verified before interpreting it.

Published metadata identifies DS05 development units as `1–6` and held-out test units as `7–10`. The inspector reads engine IDs from `A_dev` and `A_test`, reports them in the JSON report, and verifies that development and held-out test sets do not overlap; it does not rely on a hard-coded ID list. DS05 is listed as a 10-engine subset with roughly 6.9 million one-second observations and one degradation/failure mode. See the dataset paper and supporting DS05 dataset summary in the research references below. (https://doi.org/10.3390/data6010005; https://github.com/Adithya-Thonse/N-CMAPSS_DL/blob/main/README.md)

### Extract DS05 from the already downloaded archive

Your download log showed that `ncmapss_full.zip` contains a nested `data_set.zip`, and the nested ZIP contains `data_set/N-CMAPSS_DS05.h5`. The following command extracts **only DS05**; it does not unpack DS06–DS08.

If `data_set.zip` is already present at `phase4_ncmapss/data/raw/data_set.zip`, the script uses it. If not, it can extract the nested `data_set.zip` member from `ncmapss_full.zip` first.

```powershell
.\.venv\Scripts\python.exe phase4_ncmapss\scripts\extract_ds05_from_nested_zip.py
```

Expected file:

```text
phase4_ncmapss/data/raw/N-CMAPSS_DS05.h5
```

The script retains both archives. It can read the inner `data_set.zip`; if that file is absent, it first extracts that nested ZIP from `ncmapss_full.zip`. Do not delete the original archives until HDF5 inspection and preprocessing have passed.

### Inspect the real HDF5 file

```powershell
.\.venv\Scripts\python.exe phase4_ncmapss\scripts\inspect_ncmapss.py
```

Review `phase4_ncmapss/outputs/ncmapss_ds05_inspection.json`. The inspector validates all six data arrays per split (`W`, `X_s`, `X_v`, `T`, `Y`, `A`), their expected column counts, row alignment, variable-name metadata, finite numeric values, actual row counts, engine/flight metadata and non-overlapping development/test engine IDs. It also records a SHA-256 checksum. It reports the actual row counts and IDs rather than hard-coding them. Proceed only when `validation_status` is `passed` and warnings are empty.

### Preprocess into flight-level tables

```powershell
.\.venv\Scripts\python.exe phase4_ncmapss\scripts\preprocess_to_flights.py
```

Expected outputs:

- `phase4_ncmapss/data/processed/ncmapss_ds05_dev_flights.csv`
- `phase4_ncmapss/data/processed/ncmapss_ds05_test_flights.csv`
- `phase4_ncmapss/data/processed/ncmapss_ds05_preprocessing_summary.json`

The script reads HDF5 arrays in chunks, groups by `unit` + `cycle`, and calculates mean, standard deviation, minimum and maximum for the 18 observable inputs. It preserves `flight_class`, `health_state_code` and RUL summaries in separate output columns for metadata/evaluation; the telemetry loader explicitly excludes those values from sensor inputs. It validates that development and test engines remain separate and writes CSVs atomically.

### Phase 4 API and UI

The Settings page exposes a DS05 manager. It checks the HDF5 file, runs inspection and preprocessing, and displays the corresponding reports. TELESENTRY can replay DS05 development flights after preprocessing succeeds.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/v1/datasets/ncmapss/ds05/status` | Archive, HDF5, inspection and processed status |
| GET | `/api/v1/datasets/ncmapss/ds05/report` | Inspection report |
| POST | `/api/v1/datasets/ncmapss/ds05/inspect` | Run HDF5 inspection |
| POST | `/api/v1/datasets/ncmapss/ds05/preprocess` | Build flight-level tables after successful inspection |

### Phase 4 definition of done

- [x] User has extracted the actual 2.42 GiB `N-CMAPSS_DS05.h5` file.
- [x] User's initial metadata inspection reported the expected six root data groups and expected array dimensions/labels.
- [x] DS05-specific extractor, strict inspector, chunked preprocessor, API routes and dashboard labels are included in this package.
- [ ] Run the packaged `inspect_ncmapss.py` on the real DS05 file and obtain `validation_status: passed` with no warnings.
- [ ] Run `preprocess_to_flights.py` on the real DS05 file and review both generated flight tables and the preprocessing summary.
- [ ] Confirm the Settings manager and TELESENTRY replay report the DS05 development engine IDs correctly.

**Important:** The user's pasted HDF5 output confirms the file opens and reports the expected shapes/variable labels. It does not yet prove that all rows are finite, that `A_*` engine IDs match the published split, or that chunked preprocessing completes. Phase 4 is not fully signed off until those remaining local checks pass.

## 4. TELESENTRY and Fleet Operations additions

The Fleet Operations dashboard from the newer ZIP is the front-end baseline. It adds Overview, Engine Assets, Sensor Analytics, RUL Predictions, Alert Centre, Diagnostic Insights and Settings. TELESENTRY can replay either the bundled illustrative CSV or processed N-CMAPSS development flights. Demo cards and sample CSV values are illustrative; they are not the output of trained N-CMAPSS RUL models.

The dashboard's FD001 Diagnostic Insights panel is connected to the actual Phase 3 model API. Other fleet summaries and RUL cards remain demo/illustrative until a separately trained RUL prediction model is integrated.

## 5. Automated verification

Run the consolidated PowerShell verifier (after dependencies are installed):

```powershell
.\verify_project.ps1
```

Or run the checks individually below.

Run all backend/API tests:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests -q
```

Run Phase 4 HDF5 fixture tests:

```powershell
.\.venv\Scripts\python.exe -m unittest phase4_ncmapss.test_phase4_pipeline -v
```

Run Phase 3 acceptance verification:

```powershell
.\.venv\Scripts\python.exe verify_phase3.py
```

JavaScript syntax checks (if Node.js is installed):

```powershell
node --check app.js
Get-ChildItem components -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Passing synthetic HDF5 fixture tests proves the loader/preprocessor code path works; it does not prove the real DS05 file has been downloaded or processed. Phase 4 can only receive strict real-data sign-off after the actual HDF5 inspection and preprocessing commands complete successfully on your computer.

## 6. Research references

- Arias Chao, M., Kulkarni, C., Goebel, K. and Fink, O. (2021), *Aircraft Engine Run-to-Failure Dataset under Real Flight Conditions for Prognostics and Diagnostics*, Data 6(1), 5: https://doi.org/10.3390/data6010005.
- NASA Prognostics Center of Excellence Data Set Repository: https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/

## 7. Safety, data and deployment notes

- The bundled FD001 files and model artifacts are local research assets. Keep the original raw files unchanged.
- N-CMAPSS engine data remains a simulation dataset; flight-condition inputs are derived from flight profiles, not live aircraft feeds.
- Synthetic sensor faults are deliberately injected test cases. They must be labelled as synthetic in reports and presentations.
- SHAP root-cause explanations, calibrated prediction intervals, aircraft fault certification and actual engine maintenance integration are not claimed as completed features in this package.
- TELESENTRY is a local replay service and should be run with one Uvicorn worker because its controller state is in process memory.
- Do not deploy the service publicly or use its output to make operational maintenance decisions.
