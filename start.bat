@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo           AI Video Caption Generator - 1-Click Master Launcher
echo ==============================================================================
echo.

:: Check if environment setup is needed
if not exist "backend\.venv" (
    echo [NOTICE] First-time setup detected. Running automatic installation...
    call "%~dp0install.bat"
)

if not exist "frontend\node_modules" (
    echo [NOTICE] Frontend packages missing. Installing...
    cd /d "%~dp0frontend" && call npm install --quiet && cd /d "%~dp0"
)

:: Start Backend in a new window
echo [1/2] Starting Python Flask Backend on http://localhost:5000...
start "AI Captions - Backend API" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate.bat && python app.py"

:: Start Frontend in a new window
echo [2/2] Starting Next.js Frontend on http://localhost:3000...
start "AI Captions - Frontend Web" cmd /k "cd /d %~dp0frontend && set DATABASE_URL=file:./data/captions.db && npm run dev"

:: Wait 3 seconds for dev server to spin up and open default browser
timeout /t 3 >nul
start http://localhost:3000

echo.
echo ==============================================================================
echo   [SUCCESS] Both servers are up and running!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo ==============================================================================
echo.
