@echo off
setlocal
echo =======================================================
echo    GERANDO INSTALADOR WINDOWS - VOLLEN OS
echo =======================================================

:: Adiciona o Cargo/Rust no PATH desta sessao caso nao esteja carregado
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

:: Desativa compilação incremental e concorrência para evitar trava de arquivos temporários pelo Windows
set "CARGO_INCREMENTAL=0"
set "CARGO_BUILD_JOBS=1"
set "RUST_BACKTRACE=1"

cd /d "%~dp0apps\desktop"

:: Chave de assinatura para Auto-Update silencioso do Tauri
set "TAURI_SIGNING_PRIVATE_KEY_PATH=%~dp0apps\desktop\src-tauri\updater.key"
set "TAURI_SIGNING_PRIVATE_KEY_PASSWORD=sistema-os-updater-key"

echo [1/2] Finalizando processos e liberando arquivos...
taskkill /F /IM "SistemaOS.exe" /IM "vollen-os.exe" /IM "cargo.exe" /IM "rustc.exe" >nul 2>&1

echo [2/2] Compilando instalador NSIS (.exe) e pacote de Auto-Update...
call npx @tauri-apps/cli build --bundles nsis

if %ERRORLEVEL% equ 0 (
    echo.
    echo =======================================================
    echo    SUCESSO! Instalador gerado em:
    echo    apps\desktop\src-tauri\target\release\bundle\
    echo =======================================================
) else (
    echo.
    echo [ERRO] Ocorreu uma falha na compilacao.
)

pause
