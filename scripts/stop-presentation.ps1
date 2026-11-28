$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$processFile = Join-Path $workspace 'reports\presentation\processes.json'
if (-not (Test-Path -LiteralPath $processFile)) { Write-Output 'No managed presentation processes recorded.'; return }
foreach ($record in @(Get-Content -LiteralPath $processFile -Raw | ConvertFrom-Json)) {
    $managedProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($record.id)"
    if (-not $managedProcess) { continue }
    $isFrontend = $record.name -eq 'frontend' -and $managedProcess.Name -eq 'node.exe' -and $managedProcess.CommandLine -match 'next.*start.*13080'
    $isBackend = $record.name -in @('product','sandbox','evaluation') -and $managedProcess.Name -match '^python' -and $managedProcess.CommandLine -match ('scripts/service.py\s+' + [regex]::Escape($record.name))
    if ($isFrontend -or $isBackend) { Stop-Process -Id $record.id; Write-Output ("Stopped Agent-X " + $record.name) }
}
Write-Output 'Only recorded Agent-X processes were targeted. Separately launched evaluation processes keep running.'
