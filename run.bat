@echo off
setlocal

echo ==============================================================================
echo           Starting AI Video Caption Generator (Local Dev Servers)
echo ==============================================================================
echo.

:: Check if .venv exists
if not exist "backend\.venv" (
    echo [NOTICE] Virtual environment not found. Running 1-click install first...
    call install.bat
)

:: Start Backend in a new window
echo [1/2] Launching Python Flask Backend on http://localhost:5000...
start "AI Captions - Backend API" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate.bat && python app.py"

:: Start Frontend in a new window
echo [2/2] Launching Next.js Frontend on http://localhost:3000...
start "AI Captions - Frontend Web" cmd /k "cd /d %~dp0frontend && set DATABASE_URL=file:./data/captions.db && npm run dev"

:: Wait a brief moment and open browser
timeout /t 3 >nul
start http://localhost:3000

echo.
echo Both servers are running!
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
