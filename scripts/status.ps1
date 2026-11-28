<#
    One-screen status of everything: services, stream, incidents, model, training.

        .\scripts\status.ps1

    The counterpart of scripts/status.sh. That one shells out to python to read
    JSON because bash cannot; PowerShell parses it natively, so the two produce
    the same screen from rather different code.
#>
[CmdletBinding()]
param(
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

$API = "http://127.0.0.1:$BackendPort"

function Get-Json {
    param([string] $Url, [int] $TimeoutSec = 3)
    try { return Invoke-RestMethod -Uri $Url -TimeoutSec $TimeoutSec } catch { return $null }
}

function Get-Field {
    param($Object, [string] $Name)
    if ($null -eq $Object) { return $null }
    $prop = $Object.PSObject.Properties[$Name]
    if ($null -eq $prop) { return $null }
    return $prop.Value
}

Write-Banner "Belt Sentinel" "status"

# ---- services ---------------------------------------------------------------
Write-Section "Services"

$healthy = Get-Json -Url "$API/api/health"
if ($healthy) {
    Write-Ok ("backend    :{0}  (pid {1})" -f $BackendPort, (Get-PortPid -Port $BackendPort))
} else {
    Write-Fail ("backend    :{0}  not responding" -f $BackendPort)
}

try {
    Invoke-WebRequest -Uri "http://localhost:$FrontendPort/" -UseBasicParsing -TimeoutSec 3 | Out-Null
    Write-Ok ("frontend   :{0}  (pid {1})" -f $FrontendPort, (Get-PortPid -Port $FrontendPort))
} catch {
    Write-Fail ("frontend   :{0}  not responding" -f $FrontendPort)
}

# ---- stream -----------------------------------------------------------------
$stream = Get-Json -Url "$API/api/stream/status"
if ($stream) {
    Write-Section "Stream"
    if (Get-Field $stream "running") {
        $label = Get-Field $stream "label"
        if (-not $label) { $label = Get-Field $stream "uri" }
        $read = [double] (Get-Field $stream "frames_read")
        $skipped = [double] (Get-Field $stream "frames_skipped")
        $ratio = 0.0
        if ($read -gt 0) { $ratio = $skipped / $read * 100 }

        Write-Kv "State" "STREAMING" $GREEN
        Write-Kv "Source" $label
        Write-Kv "Detector" (Get-Field $stream "detector")
        Write-Kv "Capture" ("{0:N1} fps" -f [double] (Get-Field $stream "capture_fps"))
        Write-Kv "Inference" ("{0:N1} fps  ({1:N0} ms)" -f `
            [double] (Get-Field $stream "inference_fps"), [double] (Get-Field $stream "inference_ms"))

        $frameColour = $RESET
        if ($ratio -gt 50) { $frameColour = $YELLOW }
        Write-Kv "Frames" ("{0:N0} read  ~  {1:N0} processed  ~  {2:N0} skipped ({3:N0}%)" -f `
            $read, [double] (Get-Field $stream "frames_processed"), $skipped, $ratio) $frameColour

        $counts = Get-Field $stream "counts"
        if ($counts) {
            $parts = @()
            foreach ($p in $counts.PSObject.Properties) { $parts += ("{0}x{1}" -f $p.Name, $p.Value) }
            if ($parts.Count -gt 0) { Write-Kv "Detected" ($parts -join "  ") }
        }
    } else {
        Write-Kv "State" "IDLE" $DIM
        $last = Get-Field $stream "label"
        if (-not $last) { $last = Get-Field $stream "uri" }
        if ($last) { Write-Kv "Last source" $last }
    }
}

# ---- incidents --------------------------------------------------------------
$summary = Get-Json -Url "$API/api/incidents/summary"
if ($summary) {
    Write-Section "Incidents (last 8h)"
    $total = Get-Field $summary "total"
    if ($null -eq $total) { $total = 0 }
    Write-Kv "Total" $total

    $bySeverity = Get-Field $summary "by_severity"
    $colours = @{
        critical = $RED; high = $AMBER; medium = $YELLOW; low = $CYAN; info = $GREY
    }
    if ($bySeverity) {
        foreach ($sev in @("critical", "high", "medium", "low", "info")) {
            $n = Get-Field $bySeverity $sev
            if ($n) {
                $name = $sev.Substring(0, 1).ToUpper() + $sev.Substring(1)
                Write-Kv $name $n $colours[$sev]
            }
        }
    }
}

# ---- model ------------------------------------------------------------------
Write-Section "Model"

$envFile = Join-Path $ROOT "backend\.env"
$detector = Get-EnvValue -Key "DETECTOR" -File $envFile
$weights = Join-Path $ROOT "backend\models\belt_v1.pt"
if (Test-Path -LiteralPath $weights) {
    $mb = [math]::Round((Get-Item -LiteralPath $weights).Length / 1MB, 1)
    Write-Ok ("weights present  (backend\models\belt_v1.pt, {0}M)" -f $mb)
} else {
    Write-Warn "no trained weights installed"
}
$detectorColour = $YELLOW
if ($detector -eq "yolo") { $detectorColour = $GREEN }
if (-not $detector) { $detector = "unset" }
Write-Kv "DETECTOR setting" $detector $detectorColour

# ---- training ---------------------------------------------------------------
Write-Section "Training"

$trainProc = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match "training[\\/]train\.py" } |
    Select-Object -First 1

if ($trainProc) {
    $results = Join-Path $ROOT "training\runs\belt_v1\results.csv"
    $epoch = ""
    if (Test-Path -LiteralPath $results) {
        $last = Get-Content -LiteralPath $results -Tail 1
        if ($last) { $epoch = ($last -split ",")[0].Trim() }
    }
    if ($epoch) {
        Write-Ok ("running  (pid {0}, epoch {1})" -f $trainProc.ProcessId, $epoch)
    } else {
        Write-Ok ("running  (pid {0})" -f $trainProc.ProcessId)
    }
    Write-Note "Raw log:  .run\train.log"
} else {
    Write-Note "not running"
}

Write-Hr
Write-Host ""
