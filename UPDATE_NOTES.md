# AEROSENTRY current package update notes

This ZIP is the DS05-ready continuation of the integrated Phase 3/4 project.

## Important before replacing an older project folder

The user confirmed that `N-CMAPSS_DS05.h5` was extracted successfully on their D: drive. The 2.42-GiB HDF5 file and the large NASA ZIP archives are intentionally not included in this project ZIP.

When moving to this ZIP, preserve the already extracted file and place/copy it into the new project's:

`phase4_ncmapss/data/raw/N-CMAPSS_DS05.h5`

Do not delete the existing HDF5 file or either downloaded ZIP archive until the new project successfully inspects the dataset. The new package includes DS05-specific tooling and does not assume DS02 engine IDs.

## DS05 commands

From the project root in PowerShell:

```powershell
.\.venv\Scripts\python.exe phase4_ncmapss\scripts\inspect_ncmapss.py
```

After inspection reports `INSPECTION CHECKS: PASS`:

```powershell
.\.venv\Scripts\python.exe phase4_ncmapss\scripts\preprocess_to_flights.py
```

The code reports the actual dev/test engine IDs from HDF5 metadata and verifies that they do not overlap. It preserves RUL as a target and does not include hidden `T` parameters as ordinary predictors.

## What has and has not been verified

- Phase 3 FD001 software and synthetic anomaly benchmark: verification passes.
- Phase 4 HDF5 inspector/preprocessor: automated synthetic-fixture tests pass.
- DS05 extraction on the user's computer: user-reported successful, 2.42 GiB.
- DS05 real-data inspection and preprocessing: not yet verified because the HDF5 file is not included in this ZIP or mounted in the build workspace.
- N-CMAPSS RUL model training: not included as a completed result; this remains a later modelling step.
