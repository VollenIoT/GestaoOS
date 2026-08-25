@echo off
setlocal
echo =======================================================
echo    GERANDO ARQUIVO APK STANDALONE - VOLLEN OS
echo =======================================================
echo.
echo Este processo vai compilar o arquivo APK nativo oficial do Android.
echo Nao precisa de Expo Go no celular!
echo.
echo Ao terminar, sera fornecido o link direto e o arquivo .apk para voce baixar e instalar no celular.
echo.
cd /d "%~dp0apps\mobile"

call npx eas-cli build -p android --profile preview

echo.
pause
