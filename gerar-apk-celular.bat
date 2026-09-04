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

echo [1/3] Gerando o bundle JavaScript e assets...
cd /d "%~dp0apps\mobile"
if not exist "android\app\src\main\assets" mkdir "android\app\src\main\assets"
node ..\..\node_modules\react-native\cli.js bundle --platform android --dev false --entry-file index.js --bundle-output android\app\src\main\assets\index.android.bundle --assets-dest android\app\src\main\res

echo.
echo [2/3] Compilando o aplicativo nativo Android...
cd /d "%~dp0apps\mobile\android"
call gradlew.bat assembleRelease

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   SUCESSO! APK NATIVO GERADO COM SUCESSO!
    echo ========================================================
    echo.
    if exist "app\build\outputs\apk\release\APK-Vollen-GestaoOS.apk" (
        copy /Y "app\build\outputs\apk\release\APK-Vollen-GestaoOS.apk" "%~dp0APK-Vollen-GestaoOS.apk" >nul 2>&1
    ) else if exist "app\build\outputs\apk\release\app-release.apk" (
        copy /Y "app\build\outputs\apk\release\app-release.apk" "%~dp0APK-Vollen-GestaoOS.apk" >nul 2>&1
    )
    echo O arquivo APK foi gerado e salvo na raiz como:
    echo   ==^> APK-Vollen-GestaoOS.apk
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
        if exist "app\build\outputs\apk\debug\APK-Vollen-GestaoOS.apk" (
            copy /Y "app\build\outputs\apk\debug\APK-Vollen-GestaoOS.apk" "%~dp0APK-Vollen-GestaoOS.apk" >nul 2>&1
        ) else if exist "app\build\outputs\apk\debug\app-debug.apk" (
            copy /Y "app\build\outputs\apk\debug\app-debug.apk" "%~dp0APK-Vollen-GestaoOS.apk" >nul 2>&1
        )
        echo O arquivo APK foi gerado e salvo na raiz como:
        echo   ==^> APK-Vollen-GestaoOS.apk
    ) else (
        echo.
        echo [ERRO] Ocorreu uma falha na compilação do APK.
    )
)

pause
