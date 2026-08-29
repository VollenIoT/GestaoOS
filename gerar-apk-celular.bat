@echo off
setlocal enabledelayedexpansion
title Vollen OS - Gerador de APK Nativo (Android Standalone)
color 0A

echo ========================================================
echo        VOLLEN OS - GERANDO APK NATIVO (STANDALONE)
echo ========================================================
echo.
echo Este script vai compilar o arquivo APK nativo completo.
echo Ele roda 100%% independente, sem precisar do Expo Go ou Metro.
echo.

cd /d "%~dp0apps\mobile\android"

echo [1/2] Limpando e preparando compilação...
call gradlew.bat assembleRelease

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   SUCESSO! APK NATIVO GERADO COM SUCESSO!
    echo ========================================================
    echo.
    echo O arquivo APK foi gerado em:
    echo apps\mobile\android\app\build\outputs\apk\release\app-release.apk
    echo.
    echo Basta enviar esse arquivo para o celular e instalar!
) else (
    echo.
    echo Tentando gerar APK no modo Debug Standalone...
    call gradlew.bat assembleDebug
    if %ERRORLEVEL% equ 0 (
        echo.
        echo ========================================================
        echo   SUCESSO! APK DEBUG NATIVO GERADO!
        echo ========================================================
        echo apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk
    ) else (
        echo.
        echo [ERRO] Ocorreu uma falha na compilação do APK.
    )
)

pause
