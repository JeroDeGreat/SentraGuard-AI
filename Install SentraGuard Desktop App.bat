@echo off
setlocal EnableExtensions
title Install SentraGuard AI Desktop App

cd /d "%~dp0"

echo [1/3] Building the desktop app bundle...
call "%~dp0Build SentraGuard Desktop App.bat"
if errorlevel 1 goto :fail

echo [2/3] Creating or updating the desktop shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Create Desktop Shortcut.ps1"
if errorlevel 1 goto :fail

echo [3/3] SentraGuard AI desktop install completed.
echo You can now launch SentraGuard AI from the desktop shortcut.
if not "%SENTRAGUARD_NO_PAUSE%"=="1" pause
exit /b 0

:fail
echo.
echo SentraGuard desktop install failed.
if not "%SENTRAGUARD_NO_PAUSE%"=="1" pause
exit /b 1
