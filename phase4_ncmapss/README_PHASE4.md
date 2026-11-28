# AEROSENTRY — Phase 4: N-CMAPSS DS05 integration

## Current status

The DS05-specific software path is included: HDF5 inspection, chunked flight aggregation, FastAPI routes, Settings controls and TELESENTRY source activation. The real `N-CMAPSS_DS05.h5` is intentionally not bundled in this project ZIP (it is approximately 2.42 GiB). The user has confirmed that the HDF5 file opens and has reported its actual root arrays, dimensions and variable names. The full packaged inspector and flight preprocessor still need to run against that real file.

## Data contract

N-CMAPSS HDF5 subsets provide development and test arrays for operating conditions (`W`), measured physical signals (`X_s`), virtual sensors (`X_v`), simulator health parameters (`T`), RUL labels (`Y`) and auxiliary metadata (`A`). The exact dimensions, variable names, engine IDs and row counts are read from the selected subset file; this DS05 pipeline does not assume DS02 engine IDs or hard-code the DS05 split; actual IDs are read from `A_dev` and `A_test`.

The default observable input baseline expects four operating-condition descriptors in `W` and 14 measured physical sensor channels in `X_s` (18 candidate inputs total). It excludes `X_v` and `T` from ordinary model inputs, excludes `A` metadata from predictors, and preserves `Y` as a target/label only. The inspector validates the actual schema before preprocessing.

## 1. Python environment

From the project root (Windows / VS Code):

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install -r phase4_ncmapss\requirements-phase4.txt
```

If you already have a working `.venv`, do not recreate it unless it was moved from another drive.

## 2. Place or extract the DS05 HDF5 file

Expected location:

```text
phase4_ncmapss/data/raw/N-CMAPSS_DS05.h5
```

If `phase4_ncmapss/data/raw/data_set.zip` exists, extract only DS05 with. If it does not exist but `ncmapss_full.zip` exists, the script first extracts the nested `data_set.zip`:

```powershell
.\.venv\Scripts\python.exe phase4_ncmapss\scripts\extract_ds05_from_nested_zip.py
```

If DS05 is already extracted elsewhere, copy the HDF5 file into the expected location. No additional dataset download is required when the file is already available.

## 3. Inspect the real HDF5 structure

```powershell
.\.venv\Scripts\python.exe phase4_ncmapss\scripts\inspect_ncmapss.py
```

The inspector checks all six array families, array dimensions, row alignment, expected metadata labels, finite numeric values, rows per split, engine IDs, engine/flight counts and a SHA-256 checksum. It verifies that development and test engine IDs do not overlap and does not impose an assumed engine-ID list.

Report: `phase4_ncmapss/outputs/ncmapss_ds05_inspection.json`.

If the inspection reports warnings, review them before preprocessing. A passing synthetic fixture test is not a substitute for real-file inspection.

## 4. Preprocess into flight-level tables

Only after real inspection passes:

```powershell
.\.venv\Scripts\python.exe phase4_ncmapss\scripts\preprocess_to_flights.py
```

The script reads `A_var` metadata to group observations by engine and flight/cycle. It uses chunked reads, handles a flight crossing chunk boundaries, aggregates `W` and `X_s` into mean/std/min/max features, and preserves `Y` labels in separate `rul_*` columns. `X_v`, `T`, and `A` are not included as sensor predictors.

Outputs:

- `phase4_ncmapss/data/processed/ncmapss_ds05_dev_flights.csv`
- `phase4_ncmapss/data/processed/ncmapss_ds05_test_flights.csv`
- `phase4_ncmapss/data/processed/ncmapss_ds05_preprocessing_summary.json`

The script rejects duplicate engine/flight keys and any overlap between development and test engine IDs. Do not tune on the held-out test split.

## 5. Phase 4 fixture and project tests

```powershell
.\.venv\Scripts\python.exe -m unittest phase4_ncmapss.test_phase4_pipeline -v
.\verify_project.ps1
```

Synthetic HDF5 fixture tests validate the loader code path, not the full NASA file. Real-data completion requires the actual inspection report and both processed output tables.

## Phase 4 definition of done

- [x] DS05-aware HDF5 inspector implemented.
- [x] Chunked flight-level preprocessor implemented.
- [x] Hidden simulator parameters and target leakage excluded from predictors.
- [x] Development/test engine-overlap checks implemented.
- [x] FastAPI and dashboard dataset management integrated.
- [x] Synthetic HDF5 fixture tests pass.
- [ ] Actual `N-CMAPSS_DS05.h5` inspection passes on the user's computer.
- [ ] Actual development and test flight tables are generated and reviewed.
- [ ] Real-data report/checksum and preprocessing summary are archived.

**Status:** software implementation is ready; strict Phase 4 real-data sign-off remains pending the user's actual DS05 inspection and preprocessing run.

## Scope note

N-CMAPSS is simulator-generated engine data using flight-condition profiles derived from recorded commercial flight data. It is not live aircraft engine telemetry and does not certify predictive maintenance decisions.

## Dataset citation

Arias Chao, M.; Kulkarni, C.; Goebel, K.; Fink, O. (2021). *Aircraft Engine Run-to-Failure Dataset under Real Flight Conditions for Prognostics and Diagnostics*. Data, 6(1), 5. https://doi.org/10.3390/data6010005
