@echo off
setlocal EnableExtensions
title SentraGuard AI Network Demo

cd /d "%~dp0"

set "SENTRAGUARD_HOST=0.0.0.0"
set "SENTRAGUARD_PORT=8000"

echo SentraGuard AI will bind to 0.0.0.0:8000 so another PC on your network can send interactions.
echo.
echo Share this URL pattern with your teammate:
echo http://YOUR-PC-IP:8000
echo.

call "%~dp0Launch SentraGuard AI.bat"
