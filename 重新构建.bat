@echo off
setlocal
cd /d "%~dp0" || exit /b 1
echo Rebuilding offline files. Internet is required for development dependencies.
echo Close the running application before continuing.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\rebuild.ps1"
if errorlevel 1 (
    echo [ERROR] Rebuild failed. See details above.
    pause
    exit /b 1
)
echo Build complete. Run the normal launcher to open the application.
pause
