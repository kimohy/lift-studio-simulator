@echo off
cd /d "%~dp0"
set "LIFT_NODE=node"
where node >nul 2>nul
if errorlevel 1 (
  set "LIFT_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)
if not exist "%LIFT_NODE%" (
  where node >nul 2>nul
  if errorlevel 1 (
    echo Please install Node.js 20 or newer, then run this file again.
    pause
    exit /b 1
  )
)
"%LIFT_NODE%" server.mjs --open
pause
