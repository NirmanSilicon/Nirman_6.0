<#
    Start the Belt Sentinel stack on Windows.

        .\scripts\start.ps1                       backend + frontend
        .\scripts\start.ps1 -BackendOnly          backend only
        .\scripts\start.ps1 -Source device://0    start and immediately watch a camera

    Idempotent: if something is already listening on a port it is reported and
    left alone rather than being silently replaced.

    The counterpart of scripts/start.sh. Run setup.ps1 once before the first use.
#>
[CmdletBinding()]
param(
    [switch] $BackendOnly,
    [string] $Source = "",
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
New-Item -ItemType Directory -Path $RUN_DIR -Force | Out-Null

function Test-Url {
    param([string] $Url, [int] $TimeoutSec = 2)
    try {
        Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec | Out-Null
        return $true
    } catch { return $false }
}

Write-Banner "Belt Sentinel" "starting services"

# ---- preflight --------------------------------------------------------------
Write-Section "Preflight"

$PY = Get-ProjectPython -Root $ROOT
if (-not $PY) {
    Write-Fail "no Python found"
    Write-Note "Run .\scripts\setup.ps1 first."
    exit 1
}
$pyVersion = (& $PY -c "import sys;print('.'.join(map(str,sys.version_info[:3])))")
if ($PY -like "*.venv*") {
    Write-Ok "python $pyVersion  (.venv)"
} else {
    Write-Ok ("python {0}  ({1})" -f $pyVersion, $PY)
}

& $PY -c "import fastapi, cv2, uvicorn" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Backend dependencies missing"
    Write-Note "Install them with:  .\scripts\setup.ps1"
    exit 1
}
Write-Ok "backend dependencies"

$envFile = Join-Path $ROOT "backend\.env"
if (-not (Test-Path -LiteralPath $envFile)) {
    Copy-Item -LiteralPath (Join-Path $ROOT "backend\.env.example") -Destination $envFile
    Write-Warn "created backend\.env from the example"
}

# A .env freshly copied from the example carries the <ref> placeholder, which is
# not empty but is not a connection string either.
$dbUrl = Get-EnvValue -Key "DATABASE_URL" -File $envFile
if (-not $dbUrl -or $dbUrl -match "<ref>") {
    Write-Fail "DATABASE_URL is not set in backend\.env"
    Write-Note "The incident history lives in Supabase; the backend will not start"
    Write-Note "without it. See docs\DEPLOYMENT.md section 1 for the three values."
    exit 1
}
Write-Ok "database: Supabase configured"

$detector = Get-EnvValue -Key "DETECTOR" -File $envFile
if ($detector -eq "yolo") {
    $modelRel = Get-EnvValue -Key "MODEL_PATH" -File $envFile
    if (-not $modelRel) { $modelRel = "models/belt_v1.pt" }
    $modelPath = Join-Path $ROOT ("backend\" + ($modelRel -replace "/", "\"))
    if (Test-Path -LiteralPath $modelPath) {
        Write-Ok "detector: trained YOLO model"
    } else {
        Write-Warn ("DETECTOR=yolo but no weights at backend\{0}" -f $modelRel)
        Write-Note "The backend will fall back to the synthetic mock detector."
    }
} else {
    Write-Warn "detector: mock (synthetic defects - not a trained model)"
    Write-Note "Switch to the trained model with DETECTOR=yolo in backend\.env"
}

# ---- backend ----------------------------------------------------------------
Write-Section "Backend"

$health = "http://127.0.0.1:$BackendPort/api/health"

if (Test-PortBusy -Port $BackendPort) {
    Write-Warn ("port {0} already in use by pid {1} - leaving it alone" -f $BackendPort, (Get-PortPid -Port $BackendPort))
} else {
    $log = Join-Path $RUN_DIR "backend.log"
    $cmdline = '"{0}" -m uvicorn app.main:app --host 0.0.0.0 --port {1}' -f $PY, $BackendPort
    Start-Detached -CommandLine $cmdline -WorkingDirectory (Join-Path $ROOT "backend") -LogFile $log
    Write-Info "starting uvicorn on :$BackendPort"

    # Importing torch and loading the weights takes a while on a cold start, so
    # the wait is generous: 40 half-second attempts, as on the other platform.
    for ($i = 0; $i -lt 40; $i++) {
        if (Test-Url -Url $health) { break }
        Start-Sleep -Milliseconds 500
    }

    if (Test-Url -Url $health) {
        # Record the pid that actually holds the port rather than the launcher's:
        # the process tree here is cmd -> python, and it is python that matters.
        $backendPid = Get-PortPid -Port $BackendPort
        Set-Content -LiteralPath (Join-Path $RUN_DIR "backend.pid") -Value $backendPid -Encoding ascii
        Write-Ok ("backend healthy  (pid {0})" -f $backendPid)
    } else {
        Write-Fail "backend did not become healthy within 20s"
        Write-Note "Log: .run\backend.log"
        if (Test-Path -LiteralPath $log) {
            Get-Content -LiteralPath $log -Tail 5 | ForEach-Object { Write-Host ("      " + $_) }
        }
        exit 1
    }
}

# ---- frontend ---------------------------------------------------------------
if (-not $BackendOnly) {
    Write-Section "Frontend"

    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Fail "npm not found - install Node.js 18+ from nodejs.org"
        Write-Note "The API is up; the dashboard needs the dev server."
    } else {
        # Install when node_modules is missing, or when package.json / the lock
        # file changed since the last install (npm stamps node_modules with its
        # own copy of the lock). A new dependency then just works on the next run.
        $feDir = Join-Path $ROOT "frontend"
        $nmDir = Join-Path $feDir "node_modules"
        $stamp = Join-Path $nmDir ".package-lock.json"
        $needInstall = -not (Test-Path -LiteralPath $nmDir)
        if (-not $needInstall) {
            if (-not (Test-Path -LiteralPath $stamp)) {
                $needInstall = $true
            } else {
                $stampTime = (Get-Item -LiteralPath $stamp).LastWriteTime
                foreach ($f in @("package.json", "package-lock.json")) {
                    $fp = Join-Path $feDir $f
                    if ((Test-Path -LiteralPath $fp) -and (Get-Item -LiteralPath $fp).LastWriteTime -gt $stampTime) {
                        $needInstall = $true
                    }
                }
            }
        }
        if ($needInstall) {
            Write-Warn "frontend dependencies changed - running npm install"
            $installLog = Join-Path $RUN_DIR "npm-install.log"
            Push-Location (Join-Path $ROOT "frontend")
            try { & cmd /c ('npm install 1>"' + $installLog + '" 2>&1') } finally { Pop-Location }
            if ($LASTEXITCODE -ne 0) {
                Write-Fail "npm install failed - see .run\npm-install.log"
                exit 1
            }
            Write-Ok "dependencies installed"
        } else {
            Write-Ok "frontend dependencies up to date"
        }

        if (Test-PortBusy -Port $FrontendPort) {
            Write-Warn ("port {0} already in use by pid {1} - leaving it alone" -f $FrontendPort, (Get-PortPid -Port $FrontendPort))
        } else {
            Start-Detached -CommandLine "npm run dev" `
                           -WorkingDirectory (Join-Path $ROOT "frontend") `
                           -LogFile (Join-Path $RUN_DIR "frontend.log")
            Write-Info "starting vite on :$FrontendPort"

            for ($i = 0; $i -lt 60; $i++) {
                if (Test-Url -Url "http://localhost:$FrontendPort/") { break }
                Start-Sleep -Milliseconds 500
            }

            if (Test-Url -Url "http://localhost:$FrontendPort/") {
                $frontendPid = Get-PortPid -Port $FrontendPort
                Set-Content -LiteralPath (Join-Path $RUN_DIR "frontend.pid") -Value $frontendPid -Encoding ascii
                Write-Ok ("frontend ready  (pid {0})" -f $frontendPid)
            } else {
                Write-Fail "frontend did not respond within 30s"
                Write-Note "Log: .run\frontend.log"
            }
        }
    }
}

# ---- optional source --------------------------------------------------------
if ($Source) {
    Write-Section "Source"
    try {
        $body = @{ uri = $Source } | ConvertTo-Json -Compress
        Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$BackendPort/api/stream/start" `
            -ContentType "application/json" -Body $body -TimeoutSec 30 | Out-Null
        Write-Ok "streaming $Source"
    } catch {
        Write-Fail "could not start $Source"
        Write-Note "Pick a source from the dashboard instead."
    }
}

# ---- summary ----------------------------------------------------------------
# The address phones use when they scan a belt's QR label.
$lanIp = $null
try {
    # The adapter carrying the default route is the real network, not a
    # Hyper-V / WSL virtual switch.
    $route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction Stop |
        Sort-Object -Property RouteMetric | Select-Object -First 1
    $lanIp = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $route.InterfaceIndex -ErrorAction Stop |
        Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' } |
        Select-Object -First 1 -ExpandProperty IPAddress
} catch { }

Write-Hr
Write-Host ("  {0}{1}Dashboard{2}   {3}http://localhost:{4}{5}" -f $BOLD, $GREEN, $RESET, $CYAN, $FrontendPort, $RESET)
if ($lanIp) {
    Write-Host ("  {0}Phones / QR{1} {2}http://{3}:{4}{5}   (same Wi-Fi; allow Node.js through the firewall)" -f $GREY, $RESET, $CYAN, $lanIp, $FrontendPort, $RESET)
}
Write-Host ("  {0}API docs{1}    {2}http://localhost:{3}/docs{4}" -f $GREY, $RESET, $CYAN, $BackendPort, $RESET)
Write-Host ("  {0}Logs{1}        {2}.run\backend.log  ~  .run\frontend.log{3}" -f $GREY, $RESET, $DIM, $RESET)
Write-Host ""
Write-Host ("  {0}Stop with{1}   .\scripts\stop.ps1     {2}Status{3}  .\scripts\status.ps1" -f $GREY, $RESET, $GREY, $RESET)
Write-Host ""
