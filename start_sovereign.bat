@echo off
title AXYRA SpaceTech - Sovereign Air-Gapped Launcher
echo ============================================================
echo   AXYRA SpaceTech - Sovereign Air-Gapped Launcher
echo   Mode: ZERO-EGRESS BARE-METAL SOVEREIGNTY
echo ============================================================
echo.

set DEPLOYMENT_MODE=SOVEREIGN
set VITE_DEPLOYMENT_MODE=SOVEREIGN

echo [1/4] Running Pre-Flight Egress Isolation Verification...
python egress_check.py --warn-only
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Pre-flight egress check failed! Aborting startup.
    pause
    exit /b 1
)

echo.
echo [2/4] Initializing Local Embedded SQLite Database...
python backend/manage.py migrate --no-input

echo.
echo [3/4] Starting Isolated Django Backend on http://127.0.0.1:8000 ...
start "AXYRA Sovereign Backend (Port 8000)" cmd /k "set DEPLOYMENT_MODE=SOVEREIGN && python backend/manage.py runserver 127.0.0.1:8000"

timeout /t 2 /nobreak >nul

echo.
echo [4/4] Starting Sovereign Frontend Console on http://localhost:3000 ...
start "AXYRA Sovereign Frontend (Port 3000)" cmd /k "set VITE_DEPLOYMENT_MODE=SOVEREIGN && cd frontend && npm run dev -- --port 3000"

timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo   AXYRA SOVEREIGN STACK IS LIVE (ZERO CLOUD EGRESS)
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://127.0.0.1:8000/api
echo   - Storage:  Embedded SQLite WAL (backend/db.sqlite3)
echo   - AI Core:  In-Memory Scikit-Learn Ensemble (.joblib)
echo   - Assets:   100%% Local Bundled Fonts ^& 3D Decoders
echo ============================================================
start http://localhost:3000
pause
