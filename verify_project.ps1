$ErrorActionPreference = 'Stop'
$Python = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path $Python)) {
    throw 'Virtual environment not found. Create it first: py -m venv .venv; then install requirements.'
}

function Invoke-Check([string]$Label, [scriptblock]$Command) {
    Write-Host "`n=== $Label ===" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed (exit code $LASTEXITCODE)."
    }
}

Invoke-Check 'Backend and API tests' { & $Python -m pytest backend\tests -q }
Invoke-Check 'Phase 4 HDF5 fixture tests' { & $Python -m unittest phase4_ncmapss.test_phase4_pipeline -v }
Invoke-Check 'Phase 3 model verification' { & $Python verify_phase3.py }
Invoke-Check 'Python compilation' { & $Python -m compileall -q backend phase4_ncmapss scripts phase3_complete.py verify_phase3.py }

$Node = Get-Command node -ErrorAction SilentlyContinue
if ($Node) {
    Invoke-Check 'Frontend JavaScript syntax' {
        node --check app.js
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        Get-ChildItem components -Recurse -Filter *.js | ForEach-Object {
            node --check $_.FullName
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        }
    }
} else {
    Write-Host 'Node.js not found; skipped JavaScript syntax check.' -ForegroundColor Yellow
}

Write-Host "`nAEROSENTRY Phase 3/4 software verification: PASS" -ForegroundColor Green
Write-Host 'Note: Phase 4 still requires inspection/preprocessing with the real N-CMAPSS DS05 HDF5 file.' -ForegroundColor Yellow
