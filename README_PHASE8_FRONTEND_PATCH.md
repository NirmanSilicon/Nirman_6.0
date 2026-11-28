# AEROSENTRY Phase 8 Frontend Integration Patch

This patch updates only the RUL Predictions component:
- `components/rul-predictions/rul-predictions.html`
- `components/rul-predictions/rul-predictions.js`
- `components/rul-predictions/rul-predictions.css`

It preserves the existing component mount contract (`export function mount(root, api)`), existing demo fleet data as a clearly labelled separate section, and the existing FastAPI base URL preference `aerosentry-api-base-url`.

## Install
1. Stop the frontend development server if it is running.
2. Make a backup copy of the three existing files listed above.
3. Extract this ZIP into the `Nirman_6.0` project root, allowing the three matching files under `components/rul-predictions/` to replace the old versions.
4. Restart or hard-refresh the frontend.
5. Keep the FastAPI backend running at `http://127.0.0.1:8000` (or configure the saved API base URL in Settings).

## What it connects
- `GET /api/v1/rul/ds05/status`
- `GET /api/v1/rul/ds05/engines`
- `GET /api/v1/rul/ds05/engine/{engine_id}/history`

The page plots actual development labels against raw XGBoost predictions, shows raw and non-negative display values, and exports the selected engine's history.

## Important boundaries
- Only development engines 1–6 are selectable through this history view.
- Independent test engines 7–10 are displayed as metadata only and are never requested by this UI.
- Development labels are explicitly labelled as development analysis, not independent test results.
- Raw model predictions are retained. The non-negative value is only a presentation convenience.
- This patch does not connect live aircraft telemetry, does not certify maintenance decisions, and does not implement SHAP rendering.
- SHAP `/explain` currently accepts feature rows; the current history endpoint returns predictions and labels, not the 72-feature vectors needed to call it directly from the browser.
- The separate model-comparison button remains disabled until a second evaluated model is integrated.
