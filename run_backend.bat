@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [AEROSENTRY] Creating Python virtual environment...
    py -3.11 -m venv .venv 2>nul
    if errorlevel 1 py -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Could not create the virtual environment. Install Python 3.11 or 3.12 and try again.
        pause
        exit /b 1
    )
    echo [AEROSENTRY] Installing backend dependencies...
    .venv\Scripts\python.exe -m pip install --upgrade pip
    .venv\Scripts\python.exe -m pip install -r backend\requirements.txt
    if errorlevel 1 (
        echo [ERROR] Dependency installation failed.
        pause
        exit /b 1
    )
)

echo [AEROSENTRY] Starting integrated Phase 3/4 API at http://127.0.0.1:8000
.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
endlocal
