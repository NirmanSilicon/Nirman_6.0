# Ouroboros: AI-powered e-waste intelligence

**One phone photo in → value and next step out.** Implements `PRD.md` (MVP: DDR4 RAM modules, English + Hindi PWA).

## Architecture

```
PWA (React/Vite) ──served by──► app (FastAPI) ──► inference (model service; mock until weights are added)
                                  ├─► PostgreSQL + PostGIS (scans, tables, recyclers)
                                  └─► S3-compatible object store (images, only with consent)
```

The web app and API ship as **one image** (`Dockerfile`): the PWA is built at image time and served by FastAPI from the same origin.

| Path | What |
|---|---|
| `web/` | React + Vite + Tailwind + i18next PWA (camera guide, offline queue, history, map, share) |
| `backend/` | FastAPI: `/v1/scan`, `/v1/scan/{id}[/report|/image]`, `/v1/scans`, `/v1/recyclers`, `/v1/prices`, OTP auth |
| `inference/` | Model-agnostic service with a fixed contract; **no models are trained in this repo** |
| `models/` | Drop trained weights here (see `models/README.md`) |

## Run

```bash
cp .env.example .env      # change secrets
docker compose up -d --build
open http://localhost:8080          # API docs: /docs
```

`INFERENCE_MODE=mock` (default) returns clearly flagged demo detections so the whole pipeline works before models exist; the UI shows a demo banner. To integrate real models, place `detector.pt` in `models/` and run `INFERENCE_MODE=yolo INSTALL_ML=1 docker compose up -d --build`.

Frontend dev: `cd web && npm i && npm run dev` (proxies `/v1` to `localhost:8000`). Backend tests: `cd backend && pip install -r requirements-dev.txt && pytest`.

## Notes
- All ₹ tables in `backend/app/seed/data.py` are **placeholder estimates** with a `source` per row; replace with recycler assay/quotes, then `python -m app.seed --force`.
- Seeded recyclers are **sample rows, not real CPCB listings**; load the real list with `python -m app.seed.import_recyclers file.csv`.
- Images are stored only when the user consents; `DELETE /v1/scan/{id}` removes record and image (DPDP).
- Reports (PNG/PDF) are English only. Hindi covers the UI and recommendations.
- Dev OTP codes are echoed in the API response when `APP_ENV=dev`; wire an SMS provider in `backend/app/services/otp.py`.
