@echo off
setlocal
cd /d "%~dp0..\backend"
if exist .venv\Scripts\activate.bat (
  call .venv\Scripts\activate.bat
) else (
  echo Run scripts\setup-local.ps1 first.
  exit /b 1
)
python manage.py runserver
endlocal
