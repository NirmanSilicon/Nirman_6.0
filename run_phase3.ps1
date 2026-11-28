$ErrorActionPreference = 'Stop'

Write-Host '=== AEROSENTRY Phase 3: training and evaluation ===' -ForegroundColor Cyan
python phase3_complete.py
if ($LASTEXITCODE -ne 0) { throw 'Phase 3 training/evaluation failed.' }

Write-Host '=== AEROSENTRY Phase 3: verification ===' -ForegroundColor Cyan
python verify_phase3.py
if ($LASTEXITCODE -ne 0) { throw 'Phase 3 verification failed.' }

Write-Host ''
Write-Host 'Phase 3 checks passed. To start the local API and console, run:' -ForegroundColor Green
Write-Host 'uvicorn anomaly_api:app --host 127.0.0.1 --port 8000'
Write-Host 'Then open http://127.0.0.1:8000/phase3'
