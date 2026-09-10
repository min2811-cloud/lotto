@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo Paste your GitHub repository URL and press Enter.
echo Example: https://github.com/yourname/lotto.git
echo.
set /p REPOURL="URL: "

if "%REPOURL%"=="" goto end

git remote remove origin 2>nul
git remote add origin %REPOURL%
git branch -M main
git add -A
git commit -m "app" 2>nul
git push -u origin main

echo.
echo If a browser window opened, log in to GitHub to allow the upload.
echo Then go to your repo: Settings - Pages - Deploy from a branch - main - /docs - Save

:end
echo.
pause >nul
