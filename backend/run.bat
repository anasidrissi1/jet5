@echo off
REM Script de démarrage rapide du backend Django
REM Écoute sur 0.0.0.0:8000 pour accepter les connexions de toutes les interfaces

cd /d "%~dp0"
python manage.py runserver 0.0.0.0:8000
