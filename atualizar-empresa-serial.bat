@echo off
chcp 65001 > nul
title Atualizar Empresa de Serial Existente - Vollen OS
cls
echo ================================================================
echo    ✏️  ATUALIZAR RAZAO SOCIAL E NOME FANTASIA DE SERIAL EXISTENTE
echo ================================================================
echo.

node apps\desktop\src\scripts\atualizar-licenca-existente.mjs

echo.
pause
