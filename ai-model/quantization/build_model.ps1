param(
    [string]$Quant = "Q4_K_M",
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$QUANTIZE_EXE = "C:\Users\niraj\OneDrive\Documents\llama-b12317-bin-win-cpu-x64\llama-quantize.exe"

$aiModelDir = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $aiModelDir
$trainingDir = Join-Path $aiModelDir "training"
$mergeScript = Join-Path $trainingDir "merge_model.py"
$androidDir = Join-Path $repoRoot "android-app"
$convertScript = Join-Path $androidDir "llama.cpp\convert_hf_to_gguf.py"
$mergedModelDir = Join-Path $aiModelDir "models\merged\vidyanova-qwen-0.5b"
$quantizedDir = Join-Path $aiModelDir "models\quantized"
$f16Model = Join-Path $quantizedDir "tutor-model-f16.gguf"
$quantizedModel = Join-Path $quantizedDir "tutor-model.gguf"
$assetsDir = Join-Path $androidDir "app\src\main\assets"
$assetModel = Join-Path $assetsDir "tutor-model.gguf"

function Invoke-CheckedCommand {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory,
        [string]$FailureMessage
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        & $FilePath @Arguments
        $commandExitCode = $LASTEXITCODE
    } catch {
        throw "$FailureMessage Could not start '$FilePath': $($_.Exception.Message)"
    } finally {
        Pop-Location
    }

    if ($null -eq $commandExitCode -or $commandExitCode -ne 0) {
        throw "$FailureMessage Exit code: $commandExitCode"
    }
}

try {
    if (-not (Get-Command python -ErrorAction Stop)) {
        throw "Python was not found on PATH."
    }
    if (-not (Test-Path -LiteralPath $mergeScript -PathType Leaf)) {
        throw "Merge script not found: $mergeScript"
    }
    if (-not (Test-Path -LiteralPath $convertScript -PathType Leaf)) {
        throw "GGUF converter not found: $convertScript"
    }
    if (-not (Test-Path -LiteralPath $QUANTIZE_EXE -PathType Leaf)) {
        throw "llama-quantize.exe not found: $QUANTIZE_EXE"
    }
    if (-not (Test-Path -LiteralPath $quantizedDir -PathType Container)) {
        New-Item -ItemType Directory -Path $quantizedDir -Force | Out-Null
    }
    if (-not (Test-Path -LiteralPath $assetsDir -PathType Container)) {
        New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
    }

    Write-Host "Step 1/6: Merging the LoRA model..."
    Invoke-CheckedCommand `
        -FilePath "python" `
        -Arguments @("merge_model.py") `
        -WorkingDirectory $trainingDir `
        -FailureMessage "Step 1 failed: model merge."

    if (-not (Test-Path -LiteralPath $mergedModelDir -PathType Container)) {
        throw "Step 1 completed without producing the merged model: $mergedModelDir"
    }

    Write-Host "Step 2/6: Converting the merged model to F16 GGUF..."
    Invoke-CheckedCommand `
        -FilePath "python" `
        -Arguments @($convertScript, $mergedModelDir, "--outfile", $f16Model, "--outtype", "f16") `
        -WorkingDirectory $repoRoot `
        -FailureMessage "Step 2 failed: F16 GGUF conversion."

    if (-not (Test-Path -LiteralPath $f16Model -PathType Leaf)) {
        throw "Step 2 completed without producing the F16 model: $f16Model"
    }

    Write-Host "Step 3/6: Quantizing model as $Quant..."
    if (Test-Path -LiteralPath $quantizedModel -PathType Leaf) {
        Remove-Item -LiteralPath $quantizedModel -Force
    }
    Invoke-CheckedCommand `
        -FilePath $QUANTIZE_EXE `
        -Arguments @("tutor-model-f16.gguf", "tutor-model.gguf", $Quant) `
        -WorkingDirectory $quantizedDir `
        -FailureMessage "Step 3 failed: GGUF quantization."

    if (-not (Test-Path -LiteralPath $quantizedModel -PathType Leaf)) {
        throw "Step 3 completed without producing the quantized model: $quantizedModel"
    }

    Write-Host "Step 4/6: Copying model into Android assets..."
    Copy-Item -LiteralPath $quantizedModel -Destination $assetModel -Force

    Write-Host "Step 5/6: Final model file"
    $modelFile = Get-Item -LiteralPath $assetModel
    Write-Host ("{0} ({1:N2} MB)" -f $modelFile.FullName, ($modelFile.Length / 1MB))

    if ($Build) {
        Write-Host "Step 6/6: Building Android debug APK..."
        $gradleWrapper = Join-Path $androidDir "gradlew.bat"
        Invoke-CheckedCommand `
            -FilePath $gradleWrapper `
            -Arguments @(":app:assembleDebug") `
            -WorkingDirectory $androidDir `
            -FailureMessage "Step 6 failed: Android debug build."

        $apkPath = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
        if (-not (Test-Path -LiteralPath $apkPath -PathType Leaf)) {
            throw "Build completed without producing the expected APK: $apkPath"
        }

        $apkFile = Get-Item -LiteralPath $apkPath
        Write-Host ("APK: {0} ({1:N2} MB)" -f $apkFile.FullName, ($apkFile.Length / 1MB))
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
