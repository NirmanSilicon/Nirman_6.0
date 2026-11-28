# AEROSENTRY Phase 6.4 — LOEO-specific SHAP explanations

Place this `phase6_xai` folder in the `Nirman_6.0` project root, merging it with the existing `phase6_xai` folder (do not overwrite your existing `generate_shap_explanations.py`).

Run from `Nirman_6.0`:
```powershell
.\.venv\Scripts\python.exe .\phase6_xai\generate_loeo_shap.py
```

This script:
- Recreates the selected Phase 5 practical XGBoost configuration (600 estimators, depth 4, learning rate 0.03).
- For Engine 3, trains on Engines 1,2,4,5,6; for Engine 6, trains on Engines 1–5.
- Selects the largest RUL overestimate among held-out rows with actual RUL <= 20 (fallback: largest overestimate if no low-RUL overestimate exists).
- Generates SHAP waterfall plots for those exact held-out predictions.
- Saves fold models, predictions, selected-case metadata and metrics under `phase6_xai/outputs/loeo_shap/`.
- Does not use test engines 7–10 and does not modify Phase 5 artifacts.

The script uses the selected practical model configuration recorded in the project history. It assumes the Phase 5 error analysis used this same configuration. Compare its reproduced predictions against the existing Phase 5 `xgboost_error_predictions.csv`; if they do not match, stop and reconcile the exact training configuration before treating these explanations as reproductions.

SHAP values explain model attribution, not causal sensor effects or certified maintenance decisions.
