# AEROSENTRY FastAPI backend — integrated Phase 3/4 service

This service combines FD001 data intake/preprocessing, Phase 3 model-backed anomaly scoring, Phase 4 N-CMAPSS DS05 management and TELESENTRY historical telemetry replay.

## Start

From the project root:

```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

API docs: http://127.0.0.1:8000/docs

## Main routes

### FD001 data pipeline
- `GET /api/v1/datasets/fd001/status`
- `POST /api/v1/datasets/fd001/upload`
- `POST /api/v1/datasets/fd001/validate`
- `GET /api/v1/datasets/fd001/report`
- `POST /api/v1/datasets/fd001/preprocess`
- `GET /api/v1/datasets/fd001/metadata`

### Phase 3 anomaly detection
- `GET /api/v1/anomaly/fd001/status`
- `GET /api/v1/anomaly/fd001/engines`
- `GET /api/v1/anomaly/fd001/analyze?engine_id=1&end_cycle=60`
- `POST /api/v1/anomaly/fd001/score`

### Phase 4 N-CMAPSS DS05
- `GET /api/v1/datasets/ncmapss/ds05/status`
- `GET /api/v1/datasets/ncmapss/ds05/report`
- `POST /api/v1/datasets/ncmapss/ds05/inspect`
- `POST /api/v1/datasets/ncmapss/ds05/preprocess`

### TELESENTRY
- `GET /api/v1/telemetry/status`
- `GET /api/v1/telemetry/engines?data_source=sample|ncmapss`
- `POST /api/v1/telemetry/start`
- `POST /api/v1/telemetry/pause`
- `POST /api/v1/telemetry/resume`
- `POST /api/v1/telemetry/stop`
- `WS /api/v1/telemetry/ws`

## Configuration

- `AEROSENTRY_FD001_DIR`: raw FD001 folder (default `data/raw/FD001`).
- `AEROSENTRY_FD001_OUTPUT`: processed FD001 output folder (default `data/processed/FD001`).
- `AEROSENTRY_MAX_UPLOAD_BYTES`: max upload size per file (default 50 MiB).
- `AEROSENTRY_CORS_ORIGINS`: comma-separated allowed browser origins.
- `AEROSENTRY_TELEMETRY_CSV`: optional path to telemetry CSV; default is the bundled illustrative sample.

## Phase 3 semantics

The anomaly endpoint returns multiple checks: Local Outlier Factor score, Isolation Forest score, local sensor-deviation and flatline checks, triggered rules and flagged sensors. These are anomaly indicators, not confirmed fault classifications or physical root-cause diagnoses. The bundled evaluation is based on controlled synthetic spike/drift/stuck-at injections into FD001-derived sequences; FD001 itself does not contain ground-truth isolated sensor failure labels.

## Phase 4 semantics

The N-CMAPSS API invokes the HDF5 inspection and chunked preprocessing scripts. Processed development flights are eligible for TELESENTRY replay only after successful data inspection and preprocessing. The held-out test split remains separate. `Y` (RUL), `T` hidden health parameters and other target/evaluation metadata are not telemetry sensor inputs.

## Operational boundary

TELESENTRY replays historical rows and stores controller state in process memory. Run a single Uvicorn worker for this prototype. Do not expose the service publicly or use it as an aircraft maintenance/airworthiness system. NASA C-MAPSS/N-CMAPSS are simulation datasets, not live aircraft telemetry.
