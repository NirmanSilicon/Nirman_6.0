# AEROSENTRY integration report — newer dashboard ZIP into the previous Phase 3/4 project

## Source packages

- **Base retained:** previous AEROSENTRY Phase 3 anomaly-detection project plus Phase 4 N-CMAPSS DS05 integration tooling.
- **Feature source reviewed:** `AEROSENTRY_TELESENTRY_Dashboard_Updated(1).zip`.

The feature-source ZIP contains a Fleet Operations frontend, separate page components, an FD001 dataset manager/backend pipeline, and TELESENTRY historical CSV replay. Its own project roadmap assigns different meanings to phases 3 and 4. Those phase labels were not adopted because the user explicitly retained the previous AEROSENTRY roadmap.

## Imported and integrated features

| Feature from dashboard package | Integrated destination | Integration notes |
|---|---|---|
| Fleet Operations application shell | `index.html`, `style.css`, `app.js` | Kept as the main operator workspace |
| Overview | `components/overview/` | Existing fleet summary presentation retained; demo figures remain illustrative |
| Engine Assets | `components/engine-assets/` | Retained asset list and filter interactions |
| Sensor Analytics | `components/sensor-analytics/` | Retained visualization page and controls |
| RUL Predictions | `components/rul-predictions/` | Retained as a presentation page; not represented as a trained N-CMAPSS RUL model |
| Alert Centre | `components/alert-centre/` | Retained alert review/acknowledgement interactions |
| Diagnostic Insights | `components/diagnostic-insights/` | Added a live FD001 API-backed engine-cycle replay panel above the existing demo presentation |
| Settings | `components/settings/` | Retained FD001 manager and added N-CMAPSS DS05 status, inspect and preprocess controls |
| TELESENTRY CSV replay | `components/telemetry/`, `backend/app/services/telemetry/` | Supports sample replay and N-CMAPSS processed development-flight replay when output tables exist |
| FastAPI FD001 intake/preprocessing | `backend/app/` and `scripts/` | Retained and aligned with the bundled FD001 raw data location |

## Phase 3 additions and safeguards

- Loaded the Phase 3 trained anomaly model and FD001 training data into the consolidated backend service.
- Added model status, engine inventory, historical replay and direct-scoring API routes.
- Connected the Diagnostic Insights control to the API. The returned assessment includes the engine ID and cycle from the server-side replay itself, so the dashboard does not substitute an unrelated demo identifier.
- Returned flagged sensor names, rule evidence, anomaly scores and interpretation text.
- Preserved the synthetic benchmark report and its limitations.

## Phase 4 additions and safeguards

- Added DS05 status, inspection, report and preprocessing API routes.
- Added Settings controls for the DS05 local archive extraction/inspection/preprocessing workflow.
- N-CMAPSS TELESENTRY selection is enabled only when both development and test flight summary files and the preprocessing summary are present.
- Prevented `rul_*`, `health_state_code`, `flight_class`, `samples_in_flight`, `hs` and `fc` metadata from being streamed as sensor channels.
- Kept the held-out test engine set distinct from development engines.
- Kept `X_v` virtual channels, `T` hidden health variables, metadata and `Y` RUL targets out of the default 18 measured input channels.

## Items deliberately not represented as complete

1. The user has confirmed the 2.42-GiB DS05 file opens and has provided the actual HDF5 array names and dimensions. The file itself is not mounted in this build workspace, so full finite-value inspection and chunked preprocessing remain to be run in the user's local project.
2. Dashboard RUL cards are not backed by a trained XGBoost/LSTM N-CMAPSS model. They remain illustrative until a future model-training phase.
3. SHAP-based root-cause explanations and calibrated uncertainty estimates are not implemented by this Phase 3/4 scope.
4. TELESENTRY is historical data replay, not a real aircraft sensor connection.
5. Phase 3 synthetic anomaly tests do not establish natural aircraft sensor-fault detection performance.

## Build-time checks

- Backend/API tests: 12 passed.
- Phase 4 HDF5 fixture tests: 6 passed.
- Phase 3 acceptance verification: PASS.
- Python compilation checks: PASS.
- JavaScript syntax checks: PASS.
- Local smoke checks: `/`, `/api/v1/health`, Phase 3 model status and Phase 4 dataset status returned HTTP 200.
