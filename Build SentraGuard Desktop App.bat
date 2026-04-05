@echo off
setlocal EnableExtensions
title Build SentraGuard AI Desktop App

cd /d "%~dp0"

echo [1/5] Preparing the project environment...
set "SENTRAGUARD_SKIP_SERVER=1"
call "%~dp0Launch SentraGuard AI.bat"
if errorlevel 1 goto :fail

set "BUILD_PYTHON=%CD%\.venv\Scripts\python.exe"

echo [2/5] Installing desktop packaging dependencies...
"%BUILD_PYTHON%" -m pip install -r requirements-desktop.txt
if errorlevel 1 goto :fail

echo [3/5] Cleaning previous build output...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

echo [4/5] Building SentraGuard AI desktop app...
"%BUILD_PYTHON%" -m PyInstaller --noconfirm "SentraGuard AI.spec"
if errorlevel 1 goto :fail

echo [5/5] Desktop app ready:
echo %CD%\dist\SentraGuard AI\SentraGuard AI.exe
exit /b 0

:fail
echo.
echo SentraGuard desktop build failed.
pause
exit /b 1
