@echo off
setlocal
cd /d "%~dp0..\frontend"
if not exist node_modules (
  echo Run scripts\setup-local.ps1 first.
  exit /b 1
)
npm run dev
endlocal
