# AEROSENTRY Phase 7 — Independent DS05 Evaluation

## Install
Copy the `phase7_evaluation` folder into:
`D:\silicon\folder 24\AEROSENTRY_Phase3_Phase4_DS05\Nirman_6.0`

Do not overwrite existing Phase 4, 5, or 6 folders.

## Run in PowerShell
```powershell
cd "D:\silicon\folder 24\AEROSENTRY_Phase3_Phase4_DS05\Nirman_6.0"
.\.venv\Scripts\python.exe .\phase7_evaluation\run_phase7_evaluation.py
```

## What it does
- Checks that development engines are exactly 1–6 and test engines exactly 7–10.
- Checks for engine overlap, 72 predictor features, missing columns, and non-finite values.
- Trains the selected practical XGBoost configuration on all development flights.
- Evaluates once on test engines 7–10.
- Saves overall, engine-wise, RUL-band, and low-RUL overestimation metrics.
- Saves raw predictions, the final model, feature list, and JSON report.

## Important
Do not tune the model using engines 7–10. The script intentionally stops if the dataset schema or engine split differs from the recorded Phase 4/5 setup. Raw predictions are retained without clipping. This is a research prototype, not a certified maintenance system.
