@echo off
title AXYRA SpaceTech - Local Full-Stack Launcher
echo ============================================================
echo    AXYRA SpaceTech - Local Full-Stack ^& AI Model Launcher
echo ============================================================
echo.

echo [1/3] Starting Django REST Backend on http://127.0.0.1:8000 ...
start "AXYRA Backend Server (Django)" cmd /k "python backend/manage.py runserver 127.0.0.1:8000"

timeout /t 2 /nobreak >nul

echo [2/3] Starting Vite Frontend on http://localhost:3000 ...
start "AXYRA Frontend Server (Vite)" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo [3/3] Opening browser at http://localhost:3000 ...
start http://localhost:3000

echo.
echo ============================================================
echo   Both servers are now LIVE on localhost!
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://127.0.0.1:8000/api
echo ============================================================
pause
