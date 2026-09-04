@echo off
setlocal
cd /d "%~dp0apps\desktop"
call node src/scripts/publish-update.mjs
pause
