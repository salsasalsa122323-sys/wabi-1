@echo off
title Ethiopia Restaurant ERP - Starting Server
color 0A
echo ==============================================================
echo    Ethiopia Multi-Branch Restaurant ^& Store ERP System
echo       የኢትዮጵያ ምግብ ቤትና ስቶር ማኔጅመንት ሲስተም
echo ==============================================================
echo.
echo [1/2] Checking environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js አልተገኘም!
    echo እባክዎ መጀመሪያ Node.js ን ከ https://nodejs.org አውርደው ይጫኑ (Install Node.js).
    echo.
    pause
    exit /b
)

echo [2/2] Starting Local Server on http://localhost:3000 ...
echo አፕሊኬሽኑ በኮምፒውተርዎ ላይ እየጀመረ ነው...
echo.
start "" "http://localhost:3000"
npm run dev
pause
