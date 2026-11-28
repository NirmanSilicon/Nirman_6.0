# Shared presentation helpers for the Belt Sentinel PowerShell scripts.
# Dot-sourced, never executed directly:  . "$PSScriptRoot\_ui.ps1"
#
# The counterpart of scripts/_ui.sh, kept deliberately close to it so the two
# platforms produce the same screen. Written for Windows PowerShell 5.1, which
# is what Windows 11 ships out of the box -- no ternary operator, no ?? , no
# -AsHashtable, and no && / || between commands.

# --- console capability ------------------------------------------------------
# Two things have to be true before the shared look survives on Windows.
#
# 1. UTF-8 output. The box-drawing and tick glyphs are multi-byte; on a console
#    left at the legacy OEM code page they arrive as mojibake.
# 2. Virtual-terminal processing. Windows Terminal enables it, but PowerShell
#    5.1 in the classic console host does not, and without it every colour
#    escape is printed literally. Turning it on is a kernel32 call.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

function Enable-VirtualTerminal {
    if (-not ("BeltSentinel.Vt" -as [type])) {
        try {
            Add-Type -Namespace BeltSentinel -Name Vt -MemberDefinition @'
[DllImport("kernel32.dll", SetLastError = true)]
public static extern IntPtr GetStdHandle(int nStdHandle);
[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool GetConsoleMode(IntPtr handle, out uint mode);
[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool SetConsoleMode(IntPtr handle, uint mode);
'@ -ErrorAction Stop
        } catch { return $false }
    }
    try {
        $h = [BeltSentinel.Vt]::GetStdHandle(-11)   # STD_OUTPUT_HANDLE
        $mode = 0
        if (-not [BeltSentinel.Vt]::GetConsoleMode($h, [ref] $mode)) { return $false }
        if ($mode -band 0x0004) { return $true }    # already on
        return [BeltSentinel.Vt]::SetConsoleMode($h, $mode -bor 0x0004)
    } catch { return $false }
}

# Honour NO_COLOR, and drop styling when output is redirected so that piping a
# script into a file does not fill it with escape codes.
$script:Styled = $false
if (-not $env:NO_COLOR -and -not [Console]::IsOutputRedirected) {
    $script:Styled = Enable-VirtualTerminal
}

if ($script:Styled) {
    $e = [char] 27
    $DIM = "$e[2m";            $BOLD = "$e[1m";           $RESET = "$e[0m"
    $RED = "$e[38;5;203m";     $GREEN = "$e[38;5;114m"
    $YELLOW = "$e[38;5;221m";  $BLUE = "$e[38;5;75m"
    $AMBER = "$e[38;5;214m";   $GREY = "$e[38;5;244m"
    $CYAN = "$e[38;5;80m";     $MAGENTA = "$e[38;5;176m"
    $HIDE_CURSOR = "$e[?25l";  $SHOW_CURSOR = "$e[?25h"
    $CLEAR = "$e[H$e[2J$e[3J"
} else {
    $DIM = ""; $BOLD = ""; $RESET = ""; $RED = ""; $GREEN = ""; $YELLOW = ""
    $BLUE = ""; $AMBER = ""; $GREY = ""; $CYAN = ""; $MAGENTA = ""
    $HIDE_CURSOR = ""; $SHOW_CURSOR = ""; $CLEAR = ""
}

function Get-TermWidth {
    $w = 80
    try { $w = [Console]::WindowWidth } catch { }
    if (-not $w -or $w -lt 60) { $w = 60 }
    if ($w -gt 100) { $w = 100 }
    return $w
}

# PowerShell's -f binds looser than *, so the repeated rule has to be built
# before it reaches the format string rather than inline inside it.
function Get-Repeated { param([int] $CodePoint, [int] $Count)
    return ([string] [char] $CodePoint) * $Count
}

function Write-Hr {
    $rule = Get-Repeated -CodePoint 0x2500 -Count (Get-TermWidth)
    Write-Host ("{0}{1}{2}" -f $DIM, $rule, $RESET)
}

function Write-Banner {
    param([string] $Title, [string] $Subtitle = "")
    $mark = [string] [char] 0x2597 + [string] [char] 0x2596
    $rule = Get-Repeated -CodePoint 0x2501 -Count ((Get-TermWidth) - 2)
    Write-Host ""
    Write-Host ("{0}{1}  {2} {3}{4}" -f $AMBER, $BOLD, $mark, $Title, $RESET)
    if ($Subtitle) { Write-Host ("{0}     {1}{2}" -f $GREY, $Subtitle, $RESET) }
    Write-Host ("{0}  {1}{2}" -f $DIM, $rule, $RESET)
}

function Write-Section { param([string] $Text)
    Write-Host ""
    Write-Host ("  {0}{1}{2}{3}" -f $BOLD, $CYAN, $Text, $RESET)
}

function Write-Kv { param([string] $Key, [string] $Value, [string] $Colour = "")
    if (-not $Colour) { $Colour = $RESET }
    Write-Host ("  {0}{1,-22}{2} {3}{4}{5}" -f $GREY, $Key, $RESET, $Colour, $Value, $RESET)
}

function Write-Ok   { param([string] $m) Write-Host ("  {0}{1}{2} {3}" -f $GREEN,  [char] 0x2713, $RESET, $m) }
function Write-Warn { param([string] $m) Write-Host ("  {0}!{1} {2}"   -f $YELLOW, $RESET, $m) }
function Write-Fail { param([string] $m) Write-Host ("  {0}{1}{2} {3}" -f $RED,    [char] 0x2717, $RESET, $m) }
function Write-Info { param([string] $m) Write-Host ("  {0}.{1} {2}"   -f $BLUE,   $RESET, $m) }
function Write-Note { param([string] $m) Write-Host ("  {0}{1}{2}"     -f $DIM,    $m, $RESET) }

# --- ports -------------------------------------------------------------------
# The -State Listen filter matters for the same reason -sTCP:LISTEN does in the
# bash version: without it the Vite dev server, which holds an open connection
# to the API, is reported as the backend's pid.
function Get-PortPid {
    param([int] $Port)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
            Select-Object -First 1
        if ($conn) { return [int] $conn.OwningProcess }
    } catch {
        # Get-NetTCPConnection is absent on Windows Server Core and in some
        # locked-down images; netstat is always there.
        $line = (netstat -ano -p TCP | Select-String -Pattern ":$Port\s" |
                 Select-String -Pattern "LISTENING" | Select-Object -First 1)
        if ($line) {
            $parts = ($line.ToString().Trim() -split "\s+")
            return [int] $parts[-1]
        }
    }
    return 0
}

function Test-PortBusy { param([int] $Port) return ((Get-PortPid -Port $Port) -ne 0) }

# --- .env --------------------------------------------------------------------
# Strip inline comments and surrounding whitespace or quotes from a KEY=value
# line, matching env_get in _ui.sh.
function Get-EnvValue {
    param([string] $Key, [string] $File)
    if (-not (Test-Path -LiteralPath $File)) { return "" }
    foreach ($line in (Get-Content -LiteralPath $File -Encoding UTF8)) {
        if ($line -match "^\s*$([regex]::Escape($Key))\s*=(.*)$") {
            $v = $matches[1] -replace "#.*$", ""
            return $v.Trim().Trim('"').Trim("'")
        }
    }
    return ""
}

# --- python ------------------------------------------------------------------
# Resolve the interpreter to run everything with: the project virtualenv if
# setup.ps1 has made one, otherwise whatever python is on PATH. Returning the
# venv's python directly means no script ever has to "activate" anything, which
# would leak into the caller's session.
function Get-ProjectPython {
    param([string] $Root)
    $venv = Join-Path $Root ".venv\Scripts\python.exe"
    if (Test-Path -LiteralPath $venv) { return $venv }
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return ""
}

# Start a detached background process with both streams in one log file.
#
# Start-Process refuses to point -RedirectStandardOutput and -RedirectStandardError
# at the same file, and uvicorn writes its whole log to stderr, so splitting them
# would scatter the interesting lines across two files. Going through cmd's own
# `1>file 2>&1` keeps one log, exactly as nohup does on the other platform.
function Start-Detached {
    param([string] $CommandLine, [string] $WorkingDirectory, [string] $LogFile)
    # cmd strips the outermost pair of quotes from a /c argument, which is why
    # the whole thing is wrapped in one more pair than looks necessary: without
    # it, an interpreter path containing a space loses its own quoting.
    $line = '"' + $CommandLine + ' 1>"' + $LogFile + '" 2>&1"'
    Start-Process -FilePath $env:ComSpec -ArgumentList "/c", $line `
        -WorkingDirectory $WorkingDirectory -WindowStyle Hidden | Out-Null
}
