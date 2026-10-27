@echo off
setlocal
echo =======================================================
echo    GERANDO INSTALADOR WINDOWS - VERSAO 4.0.0 ENTERPRISE
echo =======================================================

:: Ajusta versao nos arquivos para 4.0.0
call node "%~dp0..\packages\set-version.js" 4.0.0
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao definir versao 4.0.0
    pause
    exit /b %ERRORLEVEL%
)

:: Adiciona o Cargo/Rust no PATH desta sessao
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
set "CARGO_INCREMENTAL=0"
set "CARGO_BUILD_JOBS=1"
set "RUST_BACKTRACE=1"

cd /d "%~dp0..\apps\desktop"

set "TAURI_SIGNING_PRIVATE_KEY_PATH=%~dp0..\apps\desktop\src-tauri\updater.key"
set "TAURI_SIGNING_PRIVATE_KEY_PASSWORD=sistema-os-updater-key"

echo [1/3] Finalizando processos anteriores...
taskkill /F /IM "SistemaOS.exe" /IM "vollen-os.exe" /IM "cargo.exe" /IM "rustc.exe" >nul 2>&1

echo [2/3] Compilando frontend (Vite + TS)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao compilar frontend.
    pause
    exit /b %ERRORLEVEL%
)

echo [3/3] Compilando instalador NSIS (.exe) versao 4.0.0...
call npx @tauri-apps/cli build --bundles nsis

if %ERRORLEVEL% equ 0 (
    if not exist "%~dp0..\Instaladores" mkdir "%~dp0..\Instaladores"
    copy /Y "src-tauri\target\release\bundle\nsis\*.exe" "%~dp0..\Instaladores\" >nul
    if not exist "%~dp0..\website\downloads" mkdir "%~dp0..\website\downloads"
    copy /Y "src-tauri\target\release\bundle\nsis\*.exe" "%~dp0..\website\downloads\" >nul
    echo.
    echo =======================================================
    echo    SUCESSO! Instalador v4.0.0 copiado para:
    echo    - D:\GestaoOS-producao\Instaladores\
    echo    - D:\GestaoOS-producao\website\downloads\
    echo =======================================================
) else (
    echo.
    echo [ERRO] Ocorreu uma falha na compilacao do instalador.
)

pause
