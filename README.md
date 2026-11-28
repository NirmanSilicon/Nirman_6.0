# AlarmSense (Team Synaptix — NIRMAN 6.0)

**AlarmSense** is an industrial process alarm flood consolidation and root-cause fault diagnosis platform built on the Tennessee Eastman Process (TEP) benchmark. It combines:

- **ISA-18.2 Alarm Flood Consolidation** (`app/services/alarm_engine.py`): Warning/critical Z-score thresholding, dynamic on-delay chattering suppression, episode deduplication, and priority ranking.
- **XGBoost Fault Diagnosis** (`app/services/features.py`, `app/services/predictor.py`): Vectorized sliding-window feature extraction (`312` features across 52 TEP sensors) with episode-stratified XGBoost classification (`100%` episode-level macro F1 on unseen test episodes).
- **TreeSHAP Explainability & Granger Causality** (`app/services/predictor.py`, `app/services/causality.py`): Real-time per-window SHAP feature attributions, lagged Pearson + Granger causality propagation links, and concrete operator playbooks (`app/services/playbooks.py`).
- **Multi-Plant Quick Retrain** (`training/retrain_custom.py`): Upload any labeled factory sensor CSV to train and dynamically activate a custom plant XGBoost model without overwriting the default TEP baseline.

---

## Backend Setup

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

> **macOS note:** `xgboost` requires the OpenMP runtime. If importing `xgboost` fails with `libomp.dylib` not found, install it via Homebrew:
> ```bash
> brew install libomp
> ```

---

## Data Preparation & Training

Place the raw TEP dataset (`python_data_3years.txt`) in `backend/` (or run from `backend/`), then preprocess to Parquet and train the XGBoost classifier:

```bash
cd backend
python scripts/prepare_data.py
python -m training.train_xgb
python -m training.evaluate
```

Generated artifacts are saved to `backend/artifacts/` (`xgb_model.json`, `scaler.joblib`, `baseline.json`, `label_map.json`).

---

## Running the API

From `backend/`:

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Interactive OpenAPI docs are available at `http://localhost:8000/docs`.

---

## Running Tests

From the repository root (configured via `pytest.ini`):

```bash
pytest
```

> Note: Unit tests for `alarm_engine`, `features`, `causality` (synthetic), and `retrain_custom` run standalone. Full integration tests in `tests/test_tep_loader.py`, `tests/test_api.py`, and the real Fault 6 tests require `data/processed/tep_3years.parquet` and trained `artifacts/` locally.

---

## API Endpoints Summary (`/api/v1`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service readiness, active plant model ID/name, and supported fault classes. |
| `GET` | `/api/v1/faults` | Metadata and operator playbooks for Normal (`0`) and all 11 supported TEP faults. |
| `POST` | `/api/v1/simulate/{fault_id}` | Replay an unseen test episode window with optional `episode_index`, `pre_fault_steps`, `step_index`, `window_size`, and `smooth_steps`; returns diagnosis, alarm reduction, `alarm_trend`, `onset_offset_in_window`, SHAP evidence, causal links, and sensor trends. |
| `POST` | `/api/v1/analyze` | Analyze a custom `window_size+` row sensor payload (`{"window": [...]}` or raw list) against the active plant schema. |
| `POST` | `/api/v1/feedback` | Record operator confirmation/rejection feedback (`201 Created`) to `data/feedback.jsonl` and return updated counts. |
| `GET` | `/api/v1/feedback/summary` | Return total/confirmed/rejected feedback counts and the last 10 entries. |
| `GET` | `/api/v1/plants` | List the built-in `"tep"` model and any custom trained plants under `artifacts/plants/`. |
| `POST` | `/api/v1/plants/retrain` | Upload a labeled CSV (`multipart/form-data`) to train and optionally activate a custom plant model (`201 Created`). |
| `POST` | `/api/v1/plants/{plant_id}/activate` | Switch the live `PredictorService` between `"tep"` and a trained custom plant. |
