# JET5 — setup local (Windows PowerShell)
# Usage: .\scripts\setup-local.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "=== JET5 setup local ===" -ForegroundColor Cyan

# Backend .env
$BackendEnv = Join-Path $Root "backend\.env"
$BackendExample = Join-Path $Root "backend\.env.example"
if (-not (Test-Path $BackendEnv) -and (Test-Path $BackendExample)) {
    Copy-Item $BackendExample $BackendEnv
    Write-Host "Created backend/.env from .env.example"
}

# Frontend .env
$FrontendEnv = Join-Path $Root "frontend\.env"
$FrontendExample = Join-Path $Root "frontend\.env.example"
if (-not (Test-Path $FrontendEnv) -and (Test-Path $FrontendExample)) {
    Copy-Item $FrontendExample $FrontendEnv
    Write-Host "Created frontend/.env from .env.example"
}

# Python venv
$Venv = Join-Path $Root "backend\.venv"
if (-not (Test-Path $Venv)) {
    Write-Host "Creating Python virtual environment..."
    py -3 -m venv $Venv
}

$Python = Join-Path $Venv "Scripts\python.exe"
$Pip = Join-Path $Venv "Scripts\pip.exe"

Write-Host "Installing backend dependencies..."
& $Pip install -r (Join-Path $Root "backend\requirements.txt")

Write-Host "Running migrations..."
Push-Location (Join-Path $Root "backend")
& $Python manage.py migrate --noinput
& $Python manage.py check
Pop-Location

Write-Host "Installing frontend dependencies..."
Push-Location (Join-Path $Root "frontend")
if (-not (Test-Path "node_modules")) {
    npm install
}
Pop-Location

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Backend:  cd backend && .\.venv\Scripts\activate && python manage.py runserver"
Write-Host "Frontend: cd frontend && npm run dev"
Write-Host "Admin:    http://localhost:8000/jet5-secure-panel-2026/"
