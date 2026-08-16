@echo off
title AI Video Captions - Frontend (Port 3000)
cd /d "%~dp0frontend"
echo ===================================================
echo Starting AI Video Captions Frontend on port 3000...
echo ===================================================
call npm.cmd run dev
pause
