$ErrorActionPreference = "Stop"

$project = $PSScriptRoot
$farmdocPython = "$HOME\OneDrive\Desktop\nirman\farmDoc\.venv\Scripts\python.exe"
$farmdocFolder = "$project\farmdoc"

Write-Host "============================================"
Write-Host "        STARTING FASALSATHI + FARMDOC"
Write-Host "============================================"

if (!(Test-Path $farmdocPython)) {
    Write-Host "FarmDoc Python environment not found: $farmdocPython"
    Read-Host "Press Enter to exit"
    exit 1
}

# Start FarmDoc AI backend in the background
$apiPort = Get-NetTCPConnection -LocalPort 8002 -State Listen -ErrorAction SilentlyContinue

if (!$apiPort) {
    Write-Host "Starting FarmDoc AI backend..."

    Start-Process `
        -FilePath $farmdocPython `
        -ArgumentList "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8002" `
        -WorkingDirectory $farmdocFolder `
        -WindowStyle Hidden `
        -RedirectStandardOutput "$farmdocFolder\farmdoc-api.log" `
        -RedirectStandardError "$farmdocFolder\farmdoc-api-error.log"

    Start-Sleep -Seconds 4
} else {
    Write-Host "FarmDoc API port 8002 is already running."
}

Write-Host "Starting FasalSathi main website..."
Write-Host "Website: http://127.0.0.1:8000"
Write-Host "FarmDoc API: http://127.0.0.1:8002"
Write-Host "Press CTRL+C to stop FasalSathi."

Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:8000"

python -m uvicorn main:app --host 127.0.0.1 --port 8000
