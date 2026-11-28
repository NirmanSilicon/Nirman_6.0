# start_local.ps1
# One-click launcher for AXYRA SpaceTech (Local Development)
# Launches Django Backend (port 8000) and Vite Frontend (port 3000)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   AXYRA SpaceTech - Local Full-Stack & AI Model Launcher  " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition

# 1. Start Backend in a background process / window
Write-Host "[1/3] Starting Django REST Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
$BackendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot'; Write-Host '>>> DJANGO BACKEND SERVER RUNNING ON PORT 8000 <<<' -ForegroundColor Green; python backend/manage.py runserver 127.0.0.1:8000" -PassThru

Start-Sleep -Seconds 2

# 2. Start Frontend in a background process / window
Write-Host "[2/3] Starting Vite Frontend on http://localhost:3000 ..." -ForegroundColor Green
$FrontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot/frontend'; Write-Host '>>> VITE FRONTEND SERVER RUNNING ON PORT 3000 <<<' -ForegroundColor Green; npm run dev" -PassThru

Start-Sleep -Seconds 3

# 3. Open Browser
Write-Host "[3/3] Opening browser at http://localhost:3000 ..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Both servers are now LIVE on localhost!" -ForegroundColor Yellow
Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  - Backend:  http://127.0.0.1:8000/api" -ForegroundColor White
Write-Host "  - Swagger / Docs: http://127.0.0.1:8000/api/incidents/" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
