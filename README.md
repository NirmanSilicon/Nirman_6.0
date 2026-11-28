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

## User journey

Onboarding → **Home** (recovery loop, level, recent scans) → **Scan** (live camera guide, quality checks, offline queue) → **Result** (₹ range, route scores, how it was calculated) → **Map** (all listed stores, save ★, log a hand-over) → **Impact** (points, badges, rules).
**About** explains the product: how it works, the business model (with a take-rate calculator) and the "under the hood" model status.

## Gamification (rules are in `backend/app/services/gamify.py`, shown in the app)
Scan +10, clear photo +5, reusable part flagged +1 (max 20/scan), hand-over to a listed recycler +50, daily streak +5. Levels: Scout, Sorter, Recoverer, Loop Keeper. Points only reward scanning before shredding and reaching recyclers.

## Recycler data and central registries
`scripts/build_recyclers.py` parses the CPCB list of authorised dismantlers/recyclers (as on 2023-06-08, 22 states) and geocodes it via OpenStreetMap Nominatim (cached in `data/recyclers/geocode_cache.json`). Odisha/Bhubaneswar entries are curated in `data/recyclers/curated.json` with state-board contacts and validity notes. Each store links to the CPCB EPR portal and, where known, the state board. Hand-overs are user-reported (`POST /v1/dropoffs`), not certificates. `GET /v1/scan/{id}/record` returns a versioned, EPR/DPP-ready record.

## Models (to be integrated)
Nothing is trained here. `inference/` exposes `/predict` and `/info`; the app's About → Under the hood shows whether weights are present.

## Notes
- All ₹ tables in `backend/app/seed/data.py` are **placeholder estimates** with a `source` per row; replace with recycler assay/quotes, then `python -m app.seed --force`.
- The CPCB list is dated and authorisations expire; the UI says to confirm validity with the State Pollution Control Board. Some stores are placed approximately (flagged in the UI).
- Images are stored only when the user consents; `DELETE /v1/scan/{id}` removes record and image (DPDP).
- Reports (PNG/PDF) are English only. The UI is English and Hindi (some new screens fall back to English).
- Dev OTP codes are echoed in the API response when `APP_ENV=dev`; wire an SMS provider in `backend/app/services/otp.py`.
