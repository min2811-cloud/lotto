@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [1/3] Preparing app data + service worker version...
".venv\Scripts\python.exe" scripts\deploy_prep.py
if errorlevel 1 goto end

echo [2/3] git commit...
git add -A
git commit -m "app update"

echo [3/3] git push...
git push

:end
echo.
echo Done. Press any key to close.
pause >nul
