@echo off
setlocal enabledelayedexpansion
title AI Video Captions - Launcher

echo ================================================================
echo               AI Video Captions - Master Launcher
echo ================================================================
echo.

cd /d "%~dp0"

:: 1. Check Python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in system PATH!
    echo Please install Python 3.11+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

:: 2. Check Node.js
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in system PATH!
    echo Please install Node.js 20+ from https://nodejs.org/
    pause
    exit /b 1
)

:: 3. Setup Python Backend Environment if not present
if not exist "%~dp0backend\.venv\Scripts\python.exe" (
    echo [1/3] First-run setup: Initializing Python virtual environment...
    python -m venv "%~dp0backend\.venv"
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo Installing backend dependencies...
    "%~dp0backend\.venv\Scripts\pip.exe" install -r "%~dp0backend\requirements.txt"
    echo Backend environment ready.
) else (
    echo [OK] Python virtual environment ready.
)

:: 4. Setup Frontend Node Dependencies if not present
if not exist "%~dp0frontend\node_modules" (
    echo [2/3] First-run setup: Installing frontend dependencies...
    cd /d "%~dp0frontend"
    call npm install
    call npx prisma generate
    call npx prisma db push
    cd /d "%~dp0"
    echo Frontend environment ready.
) else (
    echo [OK] Frontend node_modules ready.
)

:: 5. Check / Ensure FFmpeg
set "FFMPEG_FOUND=0"
where ffmpeg >nul 2>&1
if %ERRORLEVEL% equ 0 set "FFMPEG_FOUND=1"
if exist "%~dp0tools\ffmpeg\bin\ffmpeg.exe" set "FFMPEG_FOUND=1"

if "!FFMPEG_FOUND!"=="0" (
    echo [3/3] First-run setup: Downloading FFmpeg...
    if exist "%~dp0tools\download-ffmpeg.bat" (
        call "%~dp0tools\download-ffmpeg.bat"
    )
) else (
    echo [OK] FFmpeg engine ready.
)

echo.
echo ================================================================
echo Starting AI Video Captions (Backend: 5000, Frontend: 3000)...
echo ================================================================
echo.

:: Start Backend
start "AI Video Captions - Backend" cmd /k "cd /d ""%~dp0backend"" && call .venv\Scripts\activate && python app.py"

:: Start Frontend
start "AI Video Captions - Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

:: Wait for initialization and open browser
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo App launched successfully! Leave the backend and frontend terminal windows open.
