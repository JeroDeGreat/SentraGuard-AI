@echo off
setlocal EnableExtensions
title SentraGuard AI Launcher

cd /d "%~dp0"

set "APP_URL=http://127.0.0.1:8000"
set "VENV_DIR=%CD%\.venv"
set "LOCK_FILE=%VENV_DIR%\.requirements.lock"
set "NEEDS_INSTALL=1"

call :resolve_python
if errorlevel 1 goto :fail

if not exist "%VENV_DIR%\Scripts\python.exe" (
  echo [1/6] Creating virtual environment...
  call %BOOTSTRAP_PYTHON% -m venv "%VENV_DIR%"
  if errorlevel 1 goto :fail
)

set "PYTHON_EXE=%VENV_DIR%\Scripts\python.exe"

if exist "%LOCK_FILE%" (
  fc /b requirements.txt "%LOCK_FILE%" >nul 2>nul
  if not errorlevel 1 set "NEEDS_INSTALL=0"
)

if "%NEEDS_INSTALL%"=="1" (
  echo [2/6] Installing or updating dependencies...
  "%PYTHON_EXE%" -m pip install --upgrade pip
  if errorlevel 1 goto :fail
  "%PYTHON_EXE%" -m pip install -r requirements.txt
  if errorlevel 1 goto :fail
  copy /Y requirements.txt "%LOCK_FILE%" >nul
) else (
  echo [2/6] Dependencies already installed.
)

if not exist ".env" (
  echo [3/6] Creating .env from template...
  copy /Y ".env.example" ".env" >nul
  if errorlevel 1 goto :fail
) else (
  echo [3/6] Using existing .env file.
)

echo [4/6] Waiting to open the browser when the app is ready...
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$url='%APP_URL%'; for ($i=0; $i -lt 60; $i++) { try { Invoke-WebRequest -UseBasicParsing $url | Out-Null; Start-Process $url; break } catch { Start-Sleep -Seconds 1 } }"

echo [5/6] Starting SentraGuard AI server...
echo [6/6] Press Ctrl+C in this window to stop the app.
"%PYTHON_EXE%" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
goto :eof

:resolve_python
where python >nul 2>nul
if not errorlevel 1 (
  set "BOOTSTRAP_PYTHON=python"
  exit /b 0
)

where py >nul 2>nul
if not errorlevel 1 (
  set "BOOTSTRAP_PYTHON=py -3"
  exit /b 0
)

echo Python was not found. Install Python 3.11+ first, then run this launcher again.
exit /b 1

:fail
echo.
echo SentraGuard AI failed to launch.
echo Check the message above, fix the issue, and run the launcher again.
pause
exit /b 1
