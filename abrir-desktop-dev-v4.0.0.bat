@echo off
setlocal enabledelayedexpansion
title Vollen OS - Executar Aplicativo Desktop (Gestao de OS e Vendas V4)
color 0B

echo ========================================================
echo            VOLLEN - GESTAO DE OS E VENDAS V4
echo        Iniciando Desktop em Modo Dev (v4.0.0 Enterprise)
echo ========================================================
echo.

cd /d "%~dp0"

:: Ajusta versao para 4.0.0
call node "%~dp0packages\set-version.js" 4.0.0

:: Adiciona Rust / Cargo no PATH caso necessario
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

echo [1/2] Compilando shared...
call npm --prefix packages/shared run build

echo.
echo [2/2] Abrindo a janela do Vollen OS Desktop v4.0.0 Enterprise...
echo.

cd /d "%~dp0apps\desktop"
call npx @tauri-apps/cli dev

pause
