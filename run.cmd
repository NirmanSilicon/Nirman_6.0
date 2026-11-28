@echo off
rem ===========================================================================
rem  C.A.R.R.Y - the one command that runs this on Windows.
rem
rem    run                        install anything missing, start, open the
rem                               dashboard. Safe to run again at any time.
rem    run device://0             the same, streaming a camera immediately
rem    run file://media/uploads/belt.mp4      ... or a test video
rem    run stop                   stop both services
rem    run status                 services, stream, incidents, model, training
rem    run setup                  re-install dependencies (CPU PyTorch)
rem    run gpu                    re-install with the CUDA build, for an NVIDIA
rem                               GPU: ~3 GB, and roughly twice the frame rate
rem    run train                  start a detached training run
rem
rem  It is a .cmd rather than a .ps1 on purpose. Windows ships with the
rem  Restricted execution policy, which refuses every PowerShell script until
rem  the user changes a machine setting; a batch file is exempt, and launching
rem  PowerShell from inside one with -ExecutionPolicy Bypass asks nothing of
rem  anybody. Double-clicking this in Explorer works too.
rem
rem  Everything below delegates to scripts\*.ps1 rather than reimplementing
rem  them, so there is one copy of the real logic to keep correct.
rem ===========================================================================

setlocal EnableExtensions
cd /d "%~dp0"

set "PS=powershell -NoProfile -ExecutionPolicy Bypass -File"

rem A double-click starts this as `cmd /c ""...\run.cmd" "`, so its own name is
rem in the command line, and without a pause the window would close with all the
rem output still in it. Typed at a prompt the name is absent and no key is asked
rem for. PowerShell wraps a .cmd the same way Explorer does, so `.\run.cmd` from
rem there pauses too -- a keypress in a window that was staying open anyway, and
rem the cheaper of the two mistakes to make.
set "HOLD="
echo %cmdcmdline% | find /i "%~nx0" >nul && set "HOLD=1"

if /i "%~1"=="stop"    goto :do_stop
if /i "%~1"=="status"  goto :do_status
if /i "%~1"=="setup"   goto :do_setup
if /i "%~1"=="gpu"     goto :do_gpu
if /i "%~1"=="train"   goto :do_train
if /i "%~1"=="help"    goto :usage
if /i "%~1"=="-h"      goto :usage
if /i "%~1"=="--help"  goto :usage
if /i "%~1"=="/?"      goto :usage

rem Anything else is either a source URI or a typo. Requiring the "://" keeps a
rem mistyped verb from being handed to the pipeline as a camera address.
set "SRC="
if not "%~1"=="" (
    echo %~1 | findstr /c:"://" >nul || goto :unknown
    set "SRC=%~1"
)

rem ---- restart cleanly ------------------------------------------------------
rem Stop whatever an earlier run left behind first. Otherwise start.ps1 finds
rem the ports busy, leaves the old processes alone, and the dashboard keeps
rem talking to yesterday's backend -- new code never loads.
%PS% "scripts\stop.ps1" >nul 2>&1

rem ---- first run -------------------------------------------------------------
rem setup.ps1 is idempotent, but it is not instant, so only call it when
rem something it produces is actually missing.
if not exist ".venv\Scripts\python.exe" goto :bootstrap
if not exist "frontend\node_modules"    goto :bootstrap
goto :start

:bootstrap
echo.
echo   First run - installing dependencies. This takes a few minutes.
echo.
%PS% "scripts\setup.ps1"
if errorlevel 1 goto :failed

:start
if defined SRC (
    %PS% "scripts\start.ps1" -Source "%SRC%"
) else (
    %PS% "scripts\start.ps1"
)
if errorlevel 1 goto :failed
start "" "http://localhost:5173"
goto :done

rem ---- verbs -----------------------------------------------------------------
:do_stop
%PS% "scripts\stop.ps1"
if errorlevel 1 goto :failed
goto :done

:do_status
%PS% "scripts\status.ps1"
if errorlevel 1 goto :failed
goto :done

:do_setup
%PS% "scripts\setup.ps1"
if errorlevel 1 goto :failed
goto :done

:do_gpu
%PS% "scripts\setup.ps1" -Cuda
if errorlevel 1 goto :failed
goto :done

:do_train
%PS% "scripts\train.ps1"
if errorlevel 1 goto :failed
echo.
echo   Follow it with:  Get-Content .run\train.log -Wait -Tail 40
echo   Options ^(--fast, --epochs^):  .\scripts\train.ps1 -Fast
goto :done

rem ---- help and exits --------------------------------------------------------
:unknown
echo.
echo   Unrecognised argument: %~1
echo   A source has to look like device://0 or file://media/uploads/belt.mp4
echo.

:usage
echo.
echo   run                     start everything and open the dashboard
echo   run device://0          ... streaming a camera straight away
echo   run stop                stop both services
echo   run status              one screen: services, stream, incidents, model
echo   run setup               re-install dependencies
echo   run gpu                 re-install with CUDA PyTorch (NVIDIA, ~3 GB)
echo   run train               start a detached training run
echo.
goto :done

:failed
echo.
echo   Something above failed. The logs are in .run\
if defined HOLD pause
exit /b 1

:done
if defined HOLD pause
exit /b 0
