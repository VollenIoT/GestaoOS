@echo off
chcp 65001 > nul
title Gerador de Chave Serial - Vollen OS
cls
node apps/desktop/src/scripts/criar-licenca-interativa.mjs
pause
