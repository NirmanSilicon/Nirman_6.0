# AEROSENTRY Phase 8 — DS05 RUL API integration

## Included
- `backend/app/services/rul_prediction.py`: artifact loading, 72-feature validation, XGBoost inference, development-engine historical inference, optional SHAP.
- `backend/app/routers/rul.py`: FastAPI routes.
- `backend/tests/test_rul_api.py`: basic route tests.

## Install into existing project
Copy the `backend/app/services/rul_prediction.py` and `backend/app/routers/rul.py` into the matching locations in your existing project. Create `backend/app/routers/__init__.py` if the routers folder does not already have one (an empty file is fine). Copy the test into `backend/tests/`.

## Register router in existing backend/app/main.py
Add this import alongside your other app imports:
```python
from app.routers.rul import router as rul_router
```
After the `app = FastAPI(...)` declaration and before route declarations, add:
```python
app.include_router(rul_router)
```
Do not replace main.py. These are the only required edits to it.

## Required artifacts
The service expects:
`phase7_evaluation/outputs/xgboost_ds05_final_dev_engines_1_6.joblib`
`phase7_evaluation/outputs/feature_columns.json`

The paths are resolved from the project root inferred from `backend/app/services/rul_prediction.py`.

## Endpoints
- `GET /api/v1/rul/ds05/status`
- `GET /api/v1/rul/ds05/engines` (development engines only)
- `POST /api/v1/rul/ds05/predict` with `{ "features": { ...72 feature/value pairs... } }`
- `POST /api/v1/rul/ds05/predict/batch` with `{ "rows": [ {...}, ... ] }`
- `GET /api/v1/rul/ds05/engine/{engine_id}/history` (engines 1–6 only; explicitly marked development analysis)
- `POST /api/v1/rul/ds05/explain` with `{ "rows": [ {...} ] }`

## Safety / evaluation boundaries
- The model accepts the same 72 flight-level aggregate features used in Phase 7; it does not accept arbitrary raw sensor samples.
- Historical engine endpoint reads development flights only, never engines 7–10.
- Test engines 7–10 remain excluded from operational engine listing/history endpoints.
- SHAP is lazy-loaded and reports attributions, not physical causation.
- Raw regression output is preserved. A nonnegative convenience value is also returned but does not replace the raw value.
- This is a research prototype, not certified maintenance software.

## Frontend
The frontend folders (`static/` and `components/`) were not included in the uploads received so far. Therefore this package does not modify frontend files. After installing the API, the dashboard can call these endpoints; frontend wiring requires the relevant JS source files to avoid guessing element IDs and current API conventions.

## Test
From project root:
```powershell
.\.venv\Scripts\python.exe -m pytest .\backend\tests\test_rul_api.py -q
```
Then run the existing backend test suite.
