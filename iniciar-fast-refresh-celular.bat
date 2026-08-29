@echo off
setlocal
echo =======================================================
echo   SISTEMA OS - MODO FAST REFRESH AO VIVO (VIA CABO USB)
echo =======================================================
echo.
echo 1. Verificando conexao USB do celular via ADB...
adb devices
echo.

:: Configura o redirecionamento de porta para o celular conversar com o PC
echo 2. Configurando tunel de conexao USB (porta 8081)...
adb reverse tcp:8081 tcp:8081
echo.

:: Pega o primeiro ID de dispositivo conectado
for /f "skip=1 tokens=1" %%d in ('adb devices') do (
    if not "%%d"=="" if not "%%d"=="List" (
        set DEVICE_ID=%%d
        goto :found_device
    )
)

:found_device
if defined DEVICE_ID (
    echo Dispositivo conectado: %DEVICE_ID%
    set ADB_CMD=adb -s %DEVICE_ID%
) else (
    set ADB_CMD=adb
)

echo.
echo 3. Instalando o APK de desenvolvimento no celular (caso necessario)...
cd /d "%~dp0apps\mobile\android"
call gradlew.bat app:installDebug

echo.
echo 4. Abrindo o aplicativo no celular...
%ADB_CMD% shell am start -n com.vollen.sistemaos/.MainActivity

echo.
echo =======================================================
echo   INICIANDO O SERVIDOR FAST REFRESH AO VIVO
echo   Qualquer alteracao no codigo sera atualizada
echo   AUTOMATICAMENTE na tela do seu celular!
echo =======================================================
echo.
echo [DICA] Mantenha esta janela aberta enquanto desenvolve.
echo.

cd /d "%~dp0apps\mobile"
npx expo start --dev-client

