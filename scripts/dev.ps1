param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('product', 'sandbox')]
    [string]$Service
)
$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $workspace
$configuration = Join-Path $workspace '.env'
if (Test-Path -LiteralPath $configuration) {
    foreach ($line in Get-Content -LiteralPath $configuration) {
        if ($line -match '^(AGENT_X_[A-Z_]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim(), 'Process')
        }
    }
}
$interpreter = Join-Path $workspace '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $interpreter)) {
    throw 'Create .venv and install the project first; see README.md.'
}
$env:AGENT_X_PROFILE = 'sandbox'
if ($Service -eq 'product') {
    & $interpreter -m uvicorn agent_x_product.app:create_app --factory --host 127.0.0.1 --port 8000 --reload --reload-dir src
} else {
    & $interpreter -m uvicorn agent_x_sandbox.app:create_app --factory --host 127.0.0.1 --port 8080 --reload --reload-dir src
}
exit $LASTEXITCODE
