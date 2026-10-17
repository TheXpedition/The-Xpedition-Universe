@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas Node.js 24 LTS. Descargalo de https://nodejs.org/
  echo Despues de instalarlo, vuelve a abrir este archivo.
  pause
  exit /b 1
)
node launcher.mjs
if errorlevel 1 pause
