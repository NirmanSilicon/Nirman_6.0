$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RepoRoot "backend"
$DriverAppDir = Join-Path $RepoRoot "driver-app"
$EnvFile = Join-Path $DriverAppDir ".env"
$EnvLocalFile = Join-Path $DriverAppDir ".env.local"
$TunnelLog = Join-Path $env:TEMP "parksmart-cloudflared.log"
$ExpoLog = Join-Path $env:TEMP "parksmart-expo.log"
$QrPath = Join-Path $RepoRoot "expo-qr.png"

Write-Host "=== ParkSMART Demo Launcher ===" -ForegroundColor Cyan

# 1. Start FastAPI backend on 0.0.0.0:8000 (skip if already running)
$port8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($port8000) {
    Write-Host "[1/5] FastAPI backend already listening on port 8000 (skipping start)." -ForegroundColor Green
} else {
    Write-Host "[1/5] Starting FastAPI backend on 0.0.0.0:8000..." -ForegroundColor Yellow
    Start-Process -FilePath "python" `
        -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000" `
        -WorkingDirectory $BackendDir `
        -WindowStyle Minimized
    Start-Sleep -Seconds 3
}

# 2. Ensure cloudflared is installed and start quick tunnel to port 8000
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "[2/5] cloudflared not found. Installing via winget..." -ForegroundColor Yellow
    winget install --id Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

if (Test-Path $TunnelLog) { Remove-Item $TunnelLog -Force }
Write-Host "[2/5] Starting Cloudflare quick tunnel to http://localhost:8000..." -ForegroundColor Yellow
Start-Process -FilePath "cloudflared" `
    -ArgumentList "tunnel", "--url", "http://localhost:8000", "--logfile", $TunnelLog `
    -WindowStyle Minimized

$tunnelUrl = $null
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $TunnelLog) {
        $match = Select-String -Path $TunnelLog -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" | Select-Object -First 1
        if ($match) {
            $tunnelUrl = $match.Matches[0].Value
            break
        }
    }
}

if (-not $tunnelUrl) {
    Write-Error "Failed to capture Cloudflare tunnel URL from $TunnelLog"
    exit 1
}
Write-Host "      Tunnel URL: $tunnelUrl" -ForegroundColor Green

# 3. Delete stale .env.local and write URL into driver-app\.env
if (Test-Path $EnvLocalFile) {
    Remove-Item $EnvLocalFile -Force
}
$apiBase = "$tunnelUrl/api/v1"
$envContent = @"
EXPO_PUBLIC_API_URL=$apiBase
EXPO_PUBLIC_API_BASE=$apiBase
EXPO_PUBLIC_DEMO_DRIVER_EMAIL=driver@parksmart.demo
"@
Set-Content -Path $EnvFile -Value $envContent -Encoding UTF8
Write-Host "[3/5] Updated $EnvFile with $apiBase (and removed .env.local)" -ForegroundColor Green

# 4. Start Expo with --tunnel -c and capture exp:// URL
if (Test-Path $ExpoLog) { Remove-Item $ExpoLog -Force }
Write-Host "[4/5] Starting Expo (--tunnel -c)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npx expo start --tunnel -c > `"$ExpoLog`" 2>&1" `
    -WorkingDirectory $DriverAppDir `
    -WindowStyle Minimized

$expoUrl = $null
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $ExpoLog) {
        $match = Select-String -Path $ExpoLog -Pattern "exp://[^\s]+" | Select-Object -First 1
        if ($match) {
            $expoUrl = $match.Matches[0].Value
            break
        }
        $ready = Select-String -Path $ExpoLog -Pattern "Tunnel ready" -Quiet
        if ($ready) {
            try {
                $manifest = Invoke-RestMethod -Uri "http://localhost:8081" -Headers @{ "expo-platform" = "android" } -TimeoutSec 3
                if ($manifest.extra.expoClient.hostUri) {
                    $expoUrl = "exp://" + $manifest.extra.expoClient.hostUri
                    break
                }
            } catch { }
        }
    }
}

if (-not $expoUrl) {
    Write-Error "Failed to capture Expo tunnel URL from $ExpoLog"
    exit 1
}

Write-Host ""
Write-Host "EXPO_TUNNEL_URL:" -ForegroundColor Cyan
Write-Host $expoUrl -ForegroundColor White
Write-Host ""

# 5. Generate expo-qr.png and open it
Write-Host "[5/5] Generating QR code at $QrPath..." -ForegroundColor Yellow
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
python -c "import qrcode" 2>$null
if ($LASTEXITCODE -ne 0) {
    pip install -q "qrcode[pil]"
}
$ErrorActionPreference = $prevEap
python -c "import qrcode; img = qrcode.make('$expoUrl'); img.save(r'$QrPath')"
Start-Process $QrPath

$healthz = try { (Invoke-RestMethod -Uri "$tunnelUrl/healthz" -TimeoutSec 10) | ConvertTo-Json -Compress } catch { "FAILED: $_" }

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "Tunnel URL : $tunnelUrl" -ForegroundColor Green
Write-Host "Healthz    : $healthz" -ForegroundColor Green
Write-Host "Scan expo-qr.png in Expo Go, then log in with driver@parksmart.demo / DemoPass1234" -ForegroundColor Green
Write-Host "Or paste this URL manually in Expo Go: $expoUrl" -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan
