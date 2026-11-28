# Kernel Colonels: Ouroboros (NIRMAN 6.0 / HACKNATION 2026)

**One phone photo in, value and next step out.** AI-powered e-waste intelligence and circular recovery platform. Full requirements: `PRD.md`.

## Team
Manish Prakash Sahu, Mohit Kumar, Trashi Sharma, Mrikhil Mittal Mohanty, Pratyush Kumar Sahoo.

## Run it
```bash
cp .env.example .env
docker compose up -d --build      # app at http://localhost:8080, API docs at /docs
```
Stack: React PWA and FastAPI served as one image, PostgreSQL + PostGIS, S3-compatible object store, and a model service.

## What is real
- Photo to component presence (trained ConvNeXt-Tiny multi-label classifier, test mAP 0.833), ₹ value range, route scoring with a visible explanation, 529 CPCB-listed recyclers across 22 states on a map, hand-over logging, points/levels/badges, English and Hindi UI, offline scan queue.
- Every ₹ figure traces to a table row (`backend/app/seed/data.py`).

## Honest limits
- The model reports which component types are present, not where or how many; counts are estimated as ranges.
- Metal and reuse prices are **placeholder estimates** pending recycler assay data.
- The CPCB list is dated June 2023; authorisations expire, so the UI tells users to confirm with the state board.
- The model weights (`ouroboros_pcb_classifier.pt`, 107 MB) are not in git. Place the file in `models/` to enable it; without it the service runs a clearly flagged mock. Metrics are in `models/metrics/`.

## Tests
`cd backend && pip install -r requirements-dev.txt && pytest` (9 tests: valuation, routing, quality gate, gamification, presence handling).
