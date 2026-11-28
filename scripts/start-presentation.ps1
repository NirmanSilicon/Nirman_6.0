param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $workspace
$logDirectory = Join-Path $workspace 'reports\presentation'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$pythonPath = (Get-Command python).Source
$venvPython = Join-Path $workspace '.venv\Scripts\python.exe'
if (Test-Path -LiteralPath $venvPython) { $pythonPath = $venvPython }
if (-not $SkipBuild) {
    Push-Location web
    try {
        if (-not (Test-Path node_modules\next)) { & npm.cmd ci --no-audit --no-fund; if ($LASTEXITCODE) { throw 'Frontend dependency installation failed' } }
        & npm.cmd run build
        if ($LASTEXITCODE) { throw 'Frontend build failed' }
    } finally { Pop-Location }
}
function Test-Ready([string]$Url) {
    try { return (Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { return $false }
}
$processes = @()
$processFile = Join-Path $logDirectory 'processes.json'
if (Test-Path -LiteralPath $processFile) {
    foreach ($record in @(Get-Content -LiteralPath $processFile -Raw | ConvertFrom-Json)) {
        if (Get-Process -Id $record.id -ErrorAction SilentlyContinue) { $processes += $record }
    }
}
foreach ($service in @(@('product',18000), @('sandbox',18081), @('evaluation',18082))) {
    $serviceName = $service[0]
    if (-not (Test-Ready "http://127.0.0.1:$($service[1])/healthz")) {
        $process = Start-Process -FilePath $pythonPath -ArgumentList @('scripts/service.py', $serviceName) -WorkingDirectory $workspace -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory "$serviceName.out.log") -RedirectStandardError (Join-Path $logDirectory "$serviceName.err.log")
        $processes += @{name=$serviceName; id=$process.Id; port=$service[1]}
    }
}
if (-not (Test-Ready 'http://127.0.0.1:13080/api/evaluation/catalog')) {
    $nodePath = (Get-Command node).Source
    $process = Start-Process -FilePath $nodePath -ArgumentList @('node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','13080') -WorkingDirectory (Join-Path $workspace 'web') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'frontend.out.log') -RedirectStandardError (Join-Path $logDirectory 'frontend.err.log')
    $processes += @{name='frontend'; id=$process.Id; port=13080}
}
$processes | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logDirectory 'processes.json')
$deadline = (Get-Date).AddSeconds(40)
do {
    $ready = (Test-Ready 'http://127.0.0.1:18000/healthz') -and (Test-Ready 'http://127.0.0.1:18081/healthz') -and (Test-Ready 'http://127.0.0.1:18082/healthz') -and (Test-Ready 'http://127.0.0.1:13080/api/evaluation/catalog')
    if (-not $ready) { Start-Sleep -Milliseconds 500 }
} while (-not $ready -and (Get-Date) -lt $deadline)
if (-not $ready) { throw "A service did not become ready. Inspect logs in $logDirectory" }
Write-Output 'Agent-X presentation is running:'
Write-Output '  Initial evaluation: http://localhost:18082'
Write-Output '  Landing page:       http://localhost:13080'
Write-Output '  Evaluation in web:  http://localhost:13080/evaluation'
Write-Output '  Extended agent lab: http://localhost:13080/lab'
