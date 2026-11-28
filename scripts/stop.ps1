<#
    Stop the Belt Sentinel stack on Windows.

        .\scripts\stop.ps1            stop backend + frontend
        .\scripts\stop.ps1 -All       also stop any running training run

    Windows consoles have no SIGTERM, so the graceful half of the bash version
    cannot be reproduced by signalling. What it was protecting is reproduced
    instead: the stream is stopped through the API first, which is what releases
    the camera and flushes the incident engine, and only then is the process
    ended. `taskkill /T` is tried before `/F` so a well-behaved child of the
    tree gets its own chance to close.
#>
[CmdletBinding()]
param(
    [switch] $All,
    [int] $BackendPort = 0,
    [int] $FrontendPort = 0
)

$ROOT = Split-Path -Parent $PSScriptRoot
. "$PSScriptRoot\_ui.ps1"

if ($BackendPort -eq 0) {
    if ($env:BACKEND_PORT) { $BackendPort = [int] $env:BACKEND_PORT } else { $BackendPort = 8000 }
}
if ($FrontendPort -eq 0) {
    if ($env:FRONTEND_PORT) { $FrontendPort = [int] $env:FRONTEND_PORT } else { $FrontendPort = 5173 }
}

$RUN_DIR = Join-Path $ROOT ".run"

Write-Banner "Belt Sentinel" "stopping services"

function Test-ProcessAlive {
    param([int] $ProcessId)
    if ($ProcessId -le 0) { return $false }
    return [bool] (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

function Stop-Tree {
    param([int] $ProcessId, [string] $Label)
    if (-not (Test-ProcessAlive -ProcessId $ProcessId)) { return $false }

    # /T takes the children with it: the backend runs as cmd -> python, and Vite
    # spawns esbuild workers that otherwise outlive the parent and hold the port.
    #
    # Without /F this asks politely, which for a windowless console process is
    # usually refused outright -- "can only be terminated forcefully" -- and
    # taskkill says so immediately with a non-zero exit code. Waiting out a full
    # timeout after an answer like that would be five seconds of pretending, so
    # only a request that was actually accepted is given time to take effect.
    & taskkill /PID $ProcessId /T 2>$null | Out-Null
    $accepted = ($LASTEXITCODE -eq 0)

    # Two seconds, not the twenty quarter-seconds the bash version waits. A
    # console process with no window never sees the close request at all, so
    # for uvicorn this grace period is almost always spent for nothing -- and
    # the work its shutdown hook does that matters (releasing the camera,
    # flushing the incident engine) has already been done through the API
    # above. What is left is a database pool the Supabase pooler reclaims.
    if ($accepted) {
        for ($i = 0; $i -lt 8; $i++) {
            if (-not (Test-ProcessAlive -ProcessId $ProcessId)) {
                Write-Ok ("{0} stopped  (pid {1})" -f $Label, $ProcessId)
                return $true
            }
            Start-Sleep -Milliseconds 250
        }
    }

    & taskkill /PID $ProcessId /T /F 2>$null | Out-Null
    Start-Sleep -Milliseconds 300
    if (Test-ProcessAlive -ProcessId $ProcessId) {
        Write-Fail ("{0} would not stop  (pid {1})" -f $Label, $ProcessId)
        return $false
    }
    if ($accepted) {
        Write-Warn ("{0} force-killed  (pid {1}, ignored the close request)" -f $Label, $ProcessId)
    } else {
        Write-Ok ("{0} stopped  (pid {1})" -f $Label, $ProcessId)
    }
    return $true
}

# ---- release the camera before killing anything -----------------------------
# The backend closes the source and flushes the incident engine on shutdown. A
# killed process runs no shutdown hook, so ask it to do that work while it is
# still alive and able to.
try {
    Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$BackendPort/api/stream/stop" `
        -TimeoutSec 5 | Out-Null
    Write-Info "stream stopped cleanly"
} catch {
    # Nothing listening, or no stream running. Either way there is nothing to
    # release and the kill below is all that is needed.
}

Write-Section "Services"
$stopped = $false
$handled = @{}

foreach ($svc in @("backend", "frontend")) {
    $pidFile = Join-Path $RUN_DIR "$svc.pid"
    if (Test-Path -LiteralPath $pidFile) {
        $recorded = 0
        [int]::TryParse((Get-Content -LiteralPath $pidFile -Raw).Trim(), [ref] $recorded) | Out-Null
        if (Stop-Tree -ProcessId $recorded -Label $svc) { $stopped = $true }
        $handled[$recorded] = $true
        Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    }
}

# Catch processes started by hand, outside these scripts.
foreach ($entry in @(@("backend", $BackendPort), @("frontend", $FrontendPort))) {
    $portPid = Get-PortPid -Port $entry[1]
    if ($portPid -ne 0 -and -not $handled.ContainsKey($portPid)) {
        if (Stop-Tree -ProcessId $portPid -Label ("{0} on :{1}" -f $entry[0], $entry[1])) { $stopped = $true }
    }
}

# Vite's esbuild workers can survive their parent and keep the port bound.
$strays = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match "vite" }
foreach ($stray in $strays) {
    & taskkill /PID $stray.ProcessId /T /F 2>$null | Out-Null
    Write-Info "cleaned up stray vite worker"
    $stopped = $true
}

if (-not $stopped) { Write-Note "nothing was running" }

# ---- training ---------------------------------------------------------------
$trainProcs = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match "training[\\/]train\.py" }
$trainProc = $trainProcs | Select-Object -First 1

if ($trainProc) {
    Write-Section "Training"
    if ($All) {
        Stop-Tree -ProcessId $trainProc.ProcessId -Label "training" | Out-Null
        Write-Note "Ultralytics checkpoints each epoch - resume from training\runs\*\weights\last.pt"
    } else {
        Write-Warn ("training still running (pid {0}) - left alone" -f $trainProc.ProcessId)
        Write-Note "Stop it too with:  .\scripts\stop.ps1 -All"
    }
}

Write-Hr
Write-Host ""
