# AEROSENTRY Phase 6 — Explainable AI

## Install location
Extract the `phase6_xai` folder directly into the `Nirman_6.0` project root, beside `phase4_ncmapss` and `phase5_rul`.

## Run from the Nirman_6.0 root in PowerShell
```powershell
.\.venv\Scripts\python.exe .\phase6_xai\generate_shap_explanations.py
```

## What this script does
- Reads only `phase4_ncmapss/data/processed/ncmapss_ds05_dev_flights.csv`.
- Requires exactly development engines 1–6 and 72 predictor features.
- Trains the selected practical XGBoost configuration (600 estimators, depth 4, learning rate 0.03) on all development engines.
- Saves the model, metadata, feature list, in-sample predictions, global SHAP importance, beeswarm/bar plots, and exploratory Engine 3/6 waterfall plots.

## Methodological safeguards
- Does not read the DS05 test file or use engines 7–10.
- In-sample metrics are not independent performance estimates.
- Engine 3/6 waterfall plots are exploratory and are not explanations of earlier LOEO held-out predictions. Exact LOEO explanations require reproducing the matching fold model without the held-out engine.
- SHAP describes model attribution, not causal sensor effects or certified maintenance advice.
- Does not modify Phase 5 files.
