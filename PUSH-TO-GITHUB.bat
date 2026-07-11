@echo off
setlocal enabledelayedexpansion
title AI Auto Tasker - Auto Push to GitHub
color 0A

echo ============================================
echo   AI Auto Tasker - One Click GitHub Push
echo ============================================
echo.

set "CURNAME="
set "CUREMAIL="
for /f "delims=" %%A in ('git config --global user.name 2^>nul') do set "CURNAME=%%A"
for /f "delims=" %%A in ('git config --global user.email 2^>nul') do set "CUREMAIL=%%A"

if "!CURNAME!"=="" (
    echo Git identity set nahi hai ya khali hai, thoda setup chahiye.
    echo.
    set "GITNAME="
    set "GITEMAIL="
    set /p GITNAME="Apna naam likho (jaise: Waleed): "
    set /p GITEMAIL="Apna GitHub email likho: "
    git config --global user.name "!GITNAME!"
    git config --global user.email "!GITEMAIL!"
    echo.
    echo Identity set ho gayi: !GITNAME! / !GITEMAIL!
    echo.
) else if "!CUREMAIL!"=="" (
    echo Git identity set nahi hai ya khali hai, thoda setup chahiye.
    echo.
    set "GITNAME="
    set "GITEMAIL="
    set /p GITNAME="Apna naam likho (jaise: Waleed): "
    set /p GITEMAIL="Apna GitHub email likho: "
    git config --global user.name "!GITNAME!"
    git config --global user.email "!GITEMAIL!"
    echo.
    echo Identity set ho gayi: !GITNAME! / !GITEMAIL!
    echo.
)

echo Pehle GitHub par ek EMPTY repo bana lo (agar nahi banaya):
echo    https://github.com/new
echo    Name: ai-auto-tasker-desktop
echo    (README/gitignore/license sab UNCHECKED rehne do)
echo.
echo Repo banane ke baad us page par green "Code" button
echo dabao, HTTPS URL ke bagal wale copy icon se copy karo.
echo Wo URL "https://github.com/" se shuru hoga aur ".git"
echo par khatam hoga - jaise:
echo   https://github.com/hamzaWaleedAslam/ai-auto-tasker-desktop.git
echo.

:askurl
set "REPOURL="
set /p REPOURL="Apna ASLI GitHub repo URL yahan paste karo aur Enter dabao: "

if "!REPOURL!"=="" (
    echo.
    echo URL khali hai. Dobara paste karo.
    echo.
    goto askurl
)

echo !REPOURL! | findstr /C:"tumhara-username" >nul
if not errorlevel 1 (
    echo.
    echo Ye example text hai, apna ASLI repo URL nahi. Dobara try karo.
    echo.
    goto askurl
)

echo !REPOURL! | findstr /B /C:"https://github.com/" >nul
if errorlevel 1 (
    echo.
    echo Ye valid GitHub URL nahi lag raha. URL "https://github.com/" se
    echo shuru hona chahiye. Dobara paste karo.
    echo.
    goto askurl
)

echo.
echo Confirm: ye URL use hoga -^> !REPOURL!
echo.
echo ============================================
echo   Pushing your files now...
echo ============================================
echo.

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote remove origin >nul 2>&1
git remote add origin "!REPOURL!"
git push -u origin main

if errorlevel 1 (
    echo.
    echo ============================================
    echo   PUSH FAILED. Upar wala error message
    echo   screenshot lekar Claude ko bhejo.
    echo ============================================
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   DONE! Ab browser mein apni repo kholo:
echo   !REPOURL!
echo   Upar "Actions" tab par click karo.
echo   Build 2-4 minute mein complete hoga,
echo   phir "Artifacts" section se .exe download
echo   kar lena.
echo ============================================
echo.
pause
