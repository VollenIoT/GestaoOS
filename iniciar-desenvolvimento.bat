@echo off
title Sistema OS Pro - Ambiente de Desenvolvimento Monorepo
color 0A

echo ========================================================
echo        SISTEMA OS PRO - ASSISTENCIA TECNICA
echo      Iniciando Ambiente de Desenvolvimento Local
echo ========================================================
echo.

cd /d "d:\SistemaOS"

echo [1/3] Compilando pacote compartilhado (@sistema-os/shared)...
call npm --prefix packages/shared run build
if %errorlevel% neq 0 (
    echo Error ao compilar packages/shared!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Sincronizando banco de dados SQLite...
call npm --prefix apps/server run prisma:push

echo.
echo [3/3] Iniciando Servidor Fastify (Porta 3333) e Painel Desktop (Porta 3000)...
echo.
echo ========================================================
echo   Servidor Backend: http://localhost:3333
echo  Painel Desktop Web: http://localhost:3000
echo  App Mobile (Expo): npm --prefix apps/mobile run start
echo ========================================================
echo.

call npm run dev
pause
