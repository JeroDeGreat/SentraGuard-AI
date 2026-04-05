@echo off
setlocal EnableExtensions
title SentraGuard AI Launcher

cd /d "%~dp0"

set "APP_HOST=%SENTRAGUARD_HOST%"
if "%APP_HOST%"=="" set "APP_HOST=127.0.0.1"
set "APP_PORT=%SENTRAGUARD_PORT%"
if "%APP_PORT%"=="" set "APP_PORT=8000"
set "APP_URL=http://127.0.0.1:%APP_PORT%"
set "VENV_DIR=%CD%\.venv"
set "LOCK_FILE=%VENV_DIR%\.requirements.lock"
set "NEEDS_INSTALL=1"
set "SKIP_SERVER=%SENTRAGUARD_SKIP_SERVER%"

call :resolve_python
if errorlevel 1 goto :fail

if not exist "%VENV_DIR%\Scripts\python.exe" (
  echo [1/6] Creating virtual environment...
  call %BOOTSTRAP_PYTHON% -m venv "%VENV_DIR%"
  if errorlevel 1 goto :fail
)

set "PYTHON_EXE=%VENV_DIR%\Scripts\python.exe"
call :ensure_venv_pip
if errorlevel 1 goto :fail

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

if /I "%SKIP_SERVER%"=="1" (
  echo [4/6] Setup completed. Server launch skipped because SENTRAGUARD_SKIP_SERVER=1.
  exit /b 0
)

echo [4/6] Waiting to open the browser when the app is ready...
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$url='%APP_URL%'; for ($i=0; $i -lt 60; $i++) { try { Invoke-WebRequest -UseBasicParsing $url | Out-Null; Start-Process $url; break } catch { Start-Sleep -Seconds 1 } }"

echo [5/6] Starting SentraGuard AI server...
echo [6/6] Press Ctrl+C in this window to stop the app.
"%PYTHON_EXE%" -m uvicorn backend.app.main:app --host %APP_HOST% --port %APP_PORT% --reload
goto :eof

:ensure_venv_pip
"%PYTHON_EXE%" -m pip --version >nul 2>nul
if not errorlevel 1 exit /b 0

echo [1/6] Virtual environment is missing pip. Attempting repair...
call :run_ensurepip
"%PYTHON_EXE%" -m pip --version >nul 2>nul
if not errorlevel 1 exit /b 0

echo [1/6] Pip repair failed. Rebuilding the virtual environment...
call %BOOTSTRAP_PYTHON% -m venv --clear "%VENV_DIR%"
if errorlevel 1 exit /b 1
set "PYTHON_EXE=%VENV_DIR%\Scripts\python.exe"
call :run_ensurepip
"%PYTHON_EXE%" -m pip --version >nul 2>nul
if not errorlevel 1 exit /b 0

echo Python created the virtual environment but pip is still unavailable.
echo Install the full Python 3.11+ distribution with ensurepip support, then run this launcher again.
exit /b 1

:run_ensurepip
set "REPAIR_TEMP=%LOCALAPPDATA%\Temp\SentraGuardAI"
if not exist "%REPAIR_TEMP%" mkdir "%REPAIR_TEMP%" >nul 2>nul
setlocal
set "TEMP=%REPAIR_TEMP%"
set "TMP=%REPAIR_TEMP%"
"%PYTHON_EXE%" -m ensurepip --upgrade
set "ENSUREPIP_EXIT=%ERRORLEVEL%"
endlocal & exit /b %ENSUREPIP_EXIT%

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
