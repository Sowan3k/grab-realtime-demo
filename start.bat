@echo off
title Grab Real-Time Demo — CSE443 Assignment 2
cd /d "%~dp0"

echo ============================================================
echo   Grab Real-Time Demo — CSE443 Assignment 2
echo ============================================================
echo.

:: Check that Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in your PATH.
    echo Download it from https://nodejs.org  (LTS version recommended)
    echo.
    pause
    exit /b 1
)

:: Check that npm is installed
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not found. Reinstall Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo [1/2] Installing dependencies (skipped if already installed)...
call npm install --prefer-offline 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: npm install failed. Check your internet connection or Node.js version.
    pause
    exit /b 1
)

echo.
echo [2/2] Starting server on http://localhost:3000 ...
echo.
echo  Press Ctrl+C to stop the server.
echo ============================================================
echo.

:: Open browser after a short delay so the server has time to start
start "" /b cmd /c "timeout /t 2 >nul && start http://localhost:3000"

:: Start the Node server (blocking — this window stays open as the log feed)
npm start
pause
