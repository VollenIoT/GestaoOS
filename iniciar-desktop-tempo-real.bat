@echo off
title Vollen OS - Modo Tempo Real
cd /d "%~dp0\apps\desktop"
echo ========================================================
echo   Iniciando Vollen OS no Modo Tempo Real
echo ========================================================
echo.
npx @tauri-apps/cli dev
echo.
echo ========================================================
echo O processo foi encerrado.
pause
