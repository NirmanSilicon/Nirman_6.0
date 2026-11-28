@echo off
setlocal
cd /d "%~dp0"

echo Starting SANGAM...
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 or newer is required. Install Node.js, then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules\express" (
  echo Installing required packages for the first run...
  call npm ci
  if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_EXE%" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_EXE%" set "CHROME_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if exist "%CHROME_EXE%" (
  start "" "%CHROME_EXE%" "http://localhost:8080"
) else (
  echo Chrome was not found. The app will open in your default browser if available.
  start "" "http://localhost:8080"
)

echo SANGAM is starting. Keep this window open while using the app.
call npm start
if errorlevel 1 (
  echo SANGAM stopped with an error.
  pause
)
endlocal
