@echo off
setlocal EnableExtensions
title Start SentraGuard AI

cd /d "%~dp0"

set "APP_EXE=%CD%\dist\SentraGuard AI\SentraGuard AI.exe"

if exist "%APP_EXE%" (
  start "" "%APP_EXE%"
  exit /b 0
)

echo SentraGuard desktop app is not built yet.
echo Running first-time desktop setup now...
echo.
set "SENTRAGUARD_NO_PAUSE=1"
call "%~dp0Install SentraGuard Desktop App.bat"
if errorlevel 1 goto :fallback

if exist "%APP_EXE%" (
  start "" "%APP_EXE%"
  exit /b 0
)

:fallback
echo Desktop build is unavailable right now. Falling back to the browser launcher.
call "%~dp0Launch SentraGuard AI.bat"
