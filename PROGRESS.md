# NIRMAN 6.0 progress snapshot — Team Unplayed

This branch is a mid-hackathon push of **CARRY / Belt Sentinel**, a real-time vision system for conveyor-belt damage and joint rupture.

## Included now
- FastAPI backend: API, detector pipeline, sources, event bus, Supabase-backed store, analytics helpers, tests
- Requirements, launch scripts (`run.cmd`, `scripts/start|stop|status|setup`), Docker/Render/Vercel config
- Project README, design notes, and markdown docs/ADRs
- Frontend scaffold: Vite + React + Tailwind config, entry files, and a progress landing page

## Held for the final submission
- Frontend feature pages and components (live monitor, sources, incidents, belts/QR, analytics, 3D model, digital twin, camera sender)
- YOLO model weight files (`backend/models/belt_v1.pt`, `belt_v2.pt`) — use `DETECTOR=mock` until then, or place weights locally (they are gitignored)
- Training pipeline, datasets, and result plots
- Kaggle notebooks

Copy `backend/.env.example` and `frontend/.env.example` to `.env` and fill in local values. Do not commit secrets.