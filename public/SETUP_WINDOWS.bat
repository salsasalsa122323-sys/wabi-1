@echo off
title Ethiopia Restaurant ERP - Initial Setup
color 0B
echo ==============================================================
echo    Ethiopia Multi-Branch Restaurant ^& Store ERP System
echo       የመጀመሪያ ጊዜ መጫኛ (First Time Setup)
echo ==============================================================
echo.
echo [1/3] Node.js እየተረጋገጠ ነው...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ==========================================================
    echo [ትኩረት] Node.js በኮምፒውተርዎ ላይ አልተጫነም!
    echo እባክዎ መጀመሪያ https://nodejs.org ገብተው "LTS" የሚለውን አውርደው ይጫኑ።
    echo ==========================================================
    start "" "https://nodejs.org"
    echo.
    pause
    exit /b
)

echo.
echo [2/3] አስፈላጊ የሲስተም ፋይሎችን በመጫን ላይ (Installing dependencies)...
call npm install

echo.
echo [3/3] መጫኑ በተሳካ ሁኔታ ተጠናቋል! (Setup Completed Successfully!)
echo.
echo አሁን "START_ERP.bat" የሚለውን ደብል ክሊክ በማድረግ አፕሊኬሽኑን ማስጀመር ይችላሉ።
echo.
pause
