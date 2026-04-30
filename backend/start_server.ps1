[CmdletBinding()]
param(
    [parameter(Position = 0)]
    [string]$ServerHost = '0.0.0.0',
    [int]$Port = 8000,
    [switch]$Migrate,
    [switch]$CollectStatic,
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$venvPath = Join-Path $PSScriptRoot '.venv'

if (-not (Test-Path $venvPath)) {
    Write-Host "Creation de l'environnement virtuel (.venv)..." -ForegroundColor Yellow
    py -3 -m venv $venvPath
}

Write-Host "Activation de l'environnement virtuel..." -ForegroundColor Green
& (Join-Path $venvPath 'Scripts/Activate.ps1')

if (-not $SkipInstall) {
    Write-Host 'Mise a jour de pip et installation des dependances...' -ForegroundColor Green
    python -m pip install --upgrade pip
    pip install -r requirements.txt
}

if ($Migrate) {
    Write-Host 'Application des migrations...' -ForegroundColor Green
    python manage.py migrate
}

if ($CollectStatic) {
    Write-Host 'Collecte des fichiers statiques...' -ForegroundColor Green
    python manage.py collectstatic --no-input
}

if (-not $env:DJANGO_SETTINGS_MODULE) {
    $env:DJANGO_SETTINGS_MODULE = 'backend.settings'
}

$runServerCommand = "python manage.py runserver ${ServerHost}:$Port"
Write-Host "Demarrage du serveur : $runServerCommand" -ForegroundColor Green
Invoke-Expression $runServerCommand
