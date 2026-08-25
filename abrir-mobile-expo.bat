@echo off
echo =======================================================
echo    INICIANDO AMBIENTE DE TESTES NO CELULAR (EXPO)
echo =======================================================
echo.
echo 1. No seu celular Android ou iPhone, instale o app "Expo Go" na Play Store / App Store.
echo 2. Conecte o celular na mesma rede Wi-Fi do computador.
echo 3. Escaneie o QR Code que vai aparecer abaixo com a camera do celular (ou app Expo Go).
echo.
cd /d "%~dp0apps\mobile"
call npx expo start --tunnel
pause
