@echo off
title AI Video Captions - Backend (Port 5000)
cd /d "%~dp0backend"
set PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%
set FLASK_DEBUG=true
set PORT=5000
echo ===================================================
echo Starting AI Video Captions Backend on port 5000...
echo ===================================================
call .venv\Scripts\activate.bat
python app.py
pause
