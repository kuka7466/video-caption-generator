@echo off
title Download FFmpeg for AI Video Captions
echo ===================================================
echo Checking / Downloading FFmpeg for Video Captions...
echo ===================================================

set TARGET_DIR=%~dp0ffmpeg\bin
if exist "%TARGET_DIR%\ffmpeg.exe" (
    echo FFmpeg is already installed in %TARGET_DIR%.
    pause
    exit /b 0
)

echo Downloading standalone FFmpeg Essentials...
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $zip = Join-Path $env:TEMP 'ffmpeg.zip'; $dest = '%~dp0ffmpeg'; Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile $zip; Expand-Archive -Path $zip -DestinationPath $env:TEMP\ffmpeg_temp -Force; New-Item -ItemType Directory -Force -Path $dest\bin; Copy-Item -Path $env:TEMP\ffmpeg_temp\*\bin\* -Destination $dest\bin -Force; Remove-Item -Recurse -Force $env:TEMP\ffmpeg_temp, $zip; Write-Output 'FFmpeg downloaded successfully.' }"

if exist "%TARGET_DIR%\ffmpeg.exe" (
    echo ===================================================
    echo FFmpeg successfully installed to %TARGET_DIR%!
    echo ===================================================
) else (
    echo ===================================================
    echo Could not download automatically. You can install via winget:
    echo   winget install Gyan.FFmpeg.Essentials
    echo ===================================================
)
pause
