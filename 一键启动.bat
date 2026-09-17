@echo off
setlocal
cd /d "%~dp0" || goto :failed
title Road Sign Generator

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found. Install Node.js 20.9 or later.
    echo Download: https://nodejs.org/
    goto :failed
)
node -e "const [major, minor] = process.versions.node.split('.').map(Number); process.exit(major > 20 || (major === 20 && minor >= 9) ? 0 : 1)"
if errorlevel 1 (
    echo [ERROR] Node.js 20.9 or later is required.
    goto :failed
)

echo Starting Road Sign Generator in offline mode...
node "%~dp0server.mjs" --open
if errorlevel 1 goto :failed
endlocal
exit /b 0

:failed
echo.
pause
endlocal
exit /b 1
