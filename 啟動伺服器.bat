@echo off
title TQM Server
echo ==========================================
echo Starting TQM Server...
echo Please keep this window open!
echo ==========================================
echo.
cd /d "%~dp0server"
echo Current Directory: %CD%
echo.
start "TQM Server" cmd /k "node server.js"
echo Waiting for server to start...
timeout /t 5 /nobreak >nul
echo Opening browser...
start "" "http://localhost:3002"
echo.
echo Server is running in a separate window.
echo Close the server window to stop the server.
pause