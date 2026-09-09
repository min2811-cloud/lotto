@echo off
chcp 65001 >nul
cd /d "%~dp0"
".venv\Scripts\python.exe" -m tools.kakao_auth
echo.
echo 창을 닫으려면 아무 키나 누르세요.
pause >nul
