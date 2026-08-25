@echo off
setlocal enabledelayedexpansion
title Vollen OS - Executar Aplicativo Desktop (Modo Direto)
color 0B

echo ========================================================
echo                  VOLLEN - GESTAO DE OS
echo             Iniciando Aplicativo Desktop Nativo
echo ========================================================
echo.

cd /d "%~dp0"

:: Adiciona Rust / Cargo no PATH caso necessario
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

echo [1/2] Verificando dependencias e inicializando servicos...
call npm --prefix packages/shared run build

echo.
echo [2/2] Abrindo a janela do Vollen OS Desktop...
echo.

cd /d "%~dp0apps\desktop"
call npx @tauri-apps/cli dev

pause
