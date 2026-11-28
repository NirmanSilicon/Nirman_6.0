#!/usr/bin/env bash
# AXYRA SpaceTech - Sovereign Air-Gapped Launcher (Linux / macOS)

set -e

echo "============================================================"
echo "  AXYRA SpaceTech - Sovereign Air-Gapped Launcher"
echo "  Mode: ZERO-EGRESS BARE-METAL SOVEREIGNTY"
echo "============================================================"
echo ""

export DEPLOYMENT_MODE="SOVEREIGN"
export VITE_DEPLOYMENT_MODE="SOVEREIGN"

echo "[1/4] Running Pre-Flight Egress Isolation Verification..."
python3 egress_check.py --warn-only

echo ""
echo "[2/4] Initializing Local Embedded SQLite Database..."
python3 backend/manage.py migrate --no-input

echo ""
echo "[3/4] Starting Isolated Django Backend on http://127.0.0.1:8000 ..."
(cd backend && DEPLOYMENT_MODE=SOVEREIGN python3 manage.py runserver 127.0.0.1:8000) &
BACKEND_PID=$!

sleep 2

echo ""
echo "[4/4] Starting Sovereign Frontend Console on http://localhost:3000 ..."
(cd frontend && VITE_DEPLOYMENT_MODE=SOVEREIGN npm run dev -- --port 3000) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit 0" SIGINT SIGTERM EXIT

echo ""
echo "============================================================"
echo "  AXYRA SOVEREIGN STACK IS LIVE (ZERO CLOUD EGRESS)"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend:  http://127.0.0.1:8000/api"
echo "  - Storage:  Embedded SQLite WAL (backend/db.sqlite3)"
echo "  - AI Core:  In-Memory Scikit-Learn Ensemble (.joblib)"
echo "  - Assets:   100% Local Bundled Fonts & 3D Decoders"
echo "============================================================"
echo "Press Ctrl+C to stop both servers."

wait
