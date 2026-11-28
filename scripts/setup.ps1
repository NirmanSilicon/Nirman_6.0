<#
    First-run setup on Windows.

        .\scripts\setup.ps1              CPU PyTorch (~200 MB)
        .\scripts\setup.ps1 -Cuda        CUDA PyTorch (~3 GB), for an NVIDIA GPU
        .\scripts\setup.ps1 -Dev         also install the test dependencies
        .\scripts\setup.ps1 -SkipNode    Python side only

    Creates .venv, installs both dependency trees and seeds the two .env files.
    Safe to re-run: everything it does is idempotent. Re-running with a different
    PyTorch flavour swaps the wheel in place, so -Cuda can come later.

    If PowerShell refuses to run this at all, the machine is still on the
    default Restricted execution policy. One command fixes it for good:

        Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
#>
[CmdletBinding()]
param(
    [switch] $Cpu,
    [switch] $Cuda,
    # Which CUDA series to pull torch from. cu126 is the conservative choice:
    # it wants a much older graphics driver than cu130 does, and an Ada or
    # Ampere card runs either. See https://download.pytorch.org/whl/ for what
    # exists for a given torch and Python version.
    [string] $CudaIndex = "cu126",
    [switch] $SkipNode,
    [switch] $Dev
)

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $PSScriptRoot
. "$PSScriptRoot\_ui.ps1"

Write-Banner "Belt Sentinel" "windows setup"

# ---- interpreter ------------------------------------------------------------
# Render builds on 3.12 (render.yaml), and the detection stack is the reason to
# match it: Ultralytics and PyTorch publish Windows wheels for a trailing set of
# Python versions, so the newest release on the machine is routinely the one
# with no wheel to install. Prefer 3.12, accept anything from 3.10 up, and say
# plainly what will happen on a version ahead of the wheels.
Write-Section "Interpreter"

$PREFERRED = @("3.12", "3.11", "3.13", "3.10")
$chosen = ""
$chosenVersion = ""

$launcher = Get-Command py -ErrorAction SilentlyContinue
if ($launcher) {
    $installed = @{}
    foreach ($line in (& py -0p 2>$null)) {
        if ($line -match "-V:(\d+\.\d+)[^\s]*\s+\*?\s*(.+\S)") {
            $v = $matches[1]
            if (-not $installed.ContainsKey($v)) { $installed[$v] = $matches[2].Trim() }
        }
    }
    foreach ($v in $PREFERRED) {
        if ($installed.ContainsKey($v)) { $chosen = $installed[$v]; $chosenVersion = $v; break }
    }
    if (-not $chosen -and $installed.Count -gt 0) {
        $newest = ($installed.Keys | Sort-Object { [version] $_ } -Descending)[0]
        $chosen = $installed[$newest]; $chosenVersion = $newest
    }
}

if (-not $chosen) {
    $fallback = Get-Command python -ErrorAction SilentlyContinue
    if ($fallback) {
        $chosen = $fallback.Source
        $chosenVersion = (& $chosen -c "import sys;print('%d.%d' % sys.version_info[:2])")
    }
}

if (-not $chosen) {
    Write-Fail "no Python installation found"
    Write-Note "Install 3.12 from python.org and tick 'Add python.exe to PATH'."
    exit 1
}

Write-Ok ("python {0}  ({1})" -f $chosenVersion, $chosen)
if ($PREFERRED -notcontains $chosenVersion) {
    Write-Warn ("{0} is ahead of the versions PyTorch and Ultralytics ship Windows wheels for" -f $chosenVersion)
    Write-Note "If the install below fails on torch, install Python 3.12 and re-run this script."
}

# ---- virtualenv -------------------------------------------------------------
Write-Section "Virtual environment"

$venv = Join-Path $ROOT ".venv"
$venvPython = Join-Path $venv "Scripts\python.exe"

if (Test-Path -LiteralPath $venvPython) {
    Write-Ok ".venv already exists"
} else {
    Write-Info "creating .venv"
    & $chosen -m venv $venv
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $venvPython)) {
        Write-Fail "could not create the virtual environment"
        exit 1
    }
    Write-Ok "created .venv"
}

# ---- python dependencies ----------------------------------------------------
Write-Section "Python dependencies"

if ($Cpu -and $Cuda) { Write-Fail "-Cpu and -Cuda are mutually exclusive"; exit 1 }

$hasNvidia = $false
try {
    foreach ($g in (Get-CimInstance -ClassName Win32_VideoController -ErrorAction Stop)) {
        if ($g.Name -match "NVIDIA") { $hasNvidia = $true }
    }
} catch { }

# GPU support is opt-in, and deliberately so: the CUDA wheel is a ~3 GB download
# against ~200 MB, and nothing else here needs it. Detecting a GeForce and
# quietly spending that is the wrong default; saying it is there is not.
#
# It also cannot be had by installing requirements.txt. The plain PyPI torch
# wheel for Windows is CPU-only -- pip reports 2.14.0 and torch.cuda.is_available()
# returns False -- so the CUDA build has to come from PyTorch's own index, which
# is why this installs torch separately before the rest.
if ($Cuda) {
    Write-Info ("installing the CUDA PyTorch build from the {0} index (~3 GB)" -f $CudaIndex)
    if (-not $hasNvidia) { Write-Warn "no NVIDIA GPU found on this machine - installing it anyway" }
    & $venvPython -m pip install --upgrade pip --quiet
    & $venvPython -m pip install --index-url ("https://download.pytorch.org/whl/" + $CudaIndex) torch torchvision
    if ($LASTEXITCODE -ne 0) {
        Write-Fail ("could not install torch from the {0} index" -f $CudaIndex)
        Write-Note "Not every CUDA series has a wheel for every torch and Python version."
        Write-Note "Check https://download.pytorch.org/whl/ and pass -CudaIndex cu130 (say)."
        exit 1
    }
    $reqName = "requirements.txt"
} else {
    Write-Info "installing the CPU-only PyTorch build (roughly a tenth of the size)"
    $reqName = "requirements-cpu.txt"
}
if ($Dev) { $reqName = "requirements-dev.txt"; Write-Note "plus the test dependencies" }

$req = Join-Path $ROOT "backend\$reqName"
& $venvPython -m pip install --upgrade pip --quiet
& $venvPython -m pip install -r $req
if ($LASTEXITCODE -ne 0) {
    Write-Fail "pip install failed"
    Write-Note "If it failed resolving torch, the Python version is the usual cause;"
    Write-Note "install 3.12 from python.org, delete .venv, and re-run this script."
    exit 1
}

& $venvPython -c "import fastapi, cv2, uvicorn" 2>$null
if ($LASTEXITCODE -ne 0) { Write-Fail "backend dependencies did not import after install"; exit 1 }
Write-Ok "backend dependencies installed"

# Report what was actually installed rather than what was asked for. A CUDA
# wheel on a machine whose driver is too old still imports, and still runs on
# the CPU; the only honest way to know is to ask torch.
$torchBuild = (& $venvPython -c "import torch;print(torch.__version__, torch.cuda.is_available())" 2>$null)
if ($torchBuild) {
    $parts = $torchBuild.Trim() -split "\s+"
    if ($parts[1] -eq "True") {
        Write-Ok ("torch {0} - CUDA available" -f $parts[0])
    } else {
        Write-Ok ("torch {0} - CPU" -f $parts[0])
        if ($hasNvidia -and -not $Cuda) {
            Write-Note "This machine has an NVIDIA GPU. For ~25 fps instead of ~12,"
            Write-Note "re-run as:  .\scripts\setup.ps1 -Cuda"
        } elseif ($Cuda) {
            Write-Warn "the CUDA build is installed but torch cannot see the GPU"
            Write-Note "Usually a graphics driver older than the CUDA series asked for."
        }
    }
}

# ---- node -------------------------------------------------------------------
if (-not $SkipNode) {
    Write-Section "Frontend dependencies"
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npm) {
        Write-Warn "npm not found - install Node.js 18+ from nodejs.org"
        Write-Note "The backend alone still runs: .\scripts\start.ps1 -BackendOnly"
    } elseif (Test-Path -LiteralPath (Join-Path $ROOT "frontend\node_modules")) {
        Write-Ok "node_modules already present"
    } else {
        Write-Info "npm install (first run only)"
        Push-Location (Join-Path $ROOT "frontend")
        try { & cmd /c "npm install" } finally { Pop-Location }
        if ($LASTEXITCODE -ne 0) { Write-Fail "npm install failed"; exit 1 }
        Write-Ok "frontend dependencies installed"
    }
}

# ---- configuration ----------------------------------------------------------
Write-Section "Configuration"

foreach ($pair in @(@("backend\.env", "backend\.env.example"), @("frontend\.env", "frontend\.env.example"))) {
    $target = Join-Path $ROOT $pair[0]
    $example = Join-Path $ROOT $pair[1]
    if (Test-Path -LiteralPath $target) {
        Write-Ok ("{0} present" -f $pair[0])
    } else {
        Copy-Item -LiteralPath $example -Destination $target
        Write-Warn ("created {0} from the example" -f $pair[0])
    }
}

$dbUrl = Get-EnvValue -Key "DATABASE_URL" -File (Join-Path $ROOT "backend\.env")
if (-not $dbUrl -or $dbUrl -match "<ref>") {
    Write-Fail "DATABASE_URL is not set in backend\.env"
    Write-Note "The incident history lives in Supabase and the backend will not"
    Write-Note "start without it. docs\DEPLOYMENT.md section 1 has the three values."
} else {
    Write-Ok "database: Supabase configured"
}

Write-Hr
Write-Host ("  {0}Start it{1}     .\scripts\start.ps1" -f $GREY, $RESET)
Write-Host ("  {0}Status{1}       .\scripts\status.ps1" -f $GREY, $RESET)
Write-Host ""
