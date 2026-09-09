@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" python -m venv .venv
if not exist ".venv\Lib\site-packages\PIL" ".venv\Scripts\python.exe" -m pip install -r requirements.txt

".venv\Scripts\python.exe" run.py

echo.
pause
