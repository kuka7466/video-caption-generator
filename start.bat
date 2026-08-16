@echo off
title AI Video Captions Launcher
echo ===================================================
echo Starting AI Video Captions (Backend + Frontend)...
echo ===================================================
start "AI Video Captions Backend" "%~dp0run-backend.bat"
timeout /t 2 /nobreak >nul
start "AI Video Captions Frontend" "%~dp0run-frontend.bat"
timeout /t 4 /nobreak >nul
start http://localhost:3000
echo ===================================================
echo Both services launched! 
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo ===================================================
