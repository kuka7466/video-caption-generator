@echo off
title AI Video Captions - Cache Cleaner
echo ================================================================
echo             AI Video Captions - Cache & Temp Cleaner
echo ================================================================
echo.

echo Cleaning temporary files and build caches...

:: 1. Clean frontend Next.js build cache
if exist "%~dp0frontend\.next" (
    echo Deleting frontend\.next build cache...
    rmdir /s /q "%~dp0frontend\.next"
)

:: 2. Clean backend temp files
if exist "%~dp0backend\data\temp" (
    echo Deleting backend\data\temp...
    rmdir /s /q "%~dp0backend\data\temp"
    mkdir "%~dp0backend\data\temp"
)

:: 3. Clean Python pycache and pytest cache
if exist "%~dp0backend\.pytest_cache" (
    rmdir /s /q "%~dp0backend\.pytest_cache"
)

for /d /r "%~dp0backend" %%d in (__pycache__) do (
    if exist "%%d" rmdir /s /q "%%d"
)

echo.
echo ================================================================
echo [SUCCESS] All cache and temporary files cleared successfully!
echo ================================================================
pause
