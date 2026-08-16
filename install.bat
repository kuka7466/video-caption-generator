@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo           AI Video Caption Generator - 1-Click Installation Setup
echo ==============================================================================
echo.

:: 1. Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from https://www.python.org/downloads/ and check "Add Python to PATH".
    pause
    exit /b 1
)
echo [OK] Python detected.

:: 2. Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js 18+ from https://nodejs.org/.
    pause
    exit /b 1
)
echo [OK] Node.js detected.

:: 3. Setup Backend Environment
echo.
echo [1/3] Setting up Python virtual environment and backend dependencies...
cd backend
if not exist ".env" (
    if exist ".env.example" copy ".env.example" ".env" >nul
)
if not exist ".venv" (
    python -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
cd ..
echo [OK] Backend dependencies installed successfully!

:: 4. Setup Frontend Environment
echo.
echo [2/3] Setting up Next.js frontend dependencies...
cd frontend
if not exist ".env" (
    if exist ".env.example" copy ".env.example" ".env" >nul
)
call npm install --quiet
echo [OK] Frontend dependencies installed!

:: 5. Initialize Prisma Database
echo.
echo [3/3] Initializing local SQLite database...
npx prisma generate --quiet
set DATABASE_URL=file:./data/captions.db
npx prisma db push --skip-generate
cd ..
echo [OK] Database schema initialized!

echo.
echo ==============================================================================
echo   [SUCCESS] Setup Completed! You can now start the app anytime with:
echo   run.bat
echo ==============================================================================
echo.
pause
