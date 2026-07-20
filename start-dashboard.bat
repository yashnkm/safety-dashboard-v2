@echo off
echo ========================================
echo   Protecther Safety Dashboard Startup
echo ========================================
echo.

:: Set the project directory
set PROJECT_DIR=C:\Protecther Safety Dashboard\safety-dashboard-v2

:: Start all services via PM2
echo Starting all services via PM2...
cd /d "%PROJECT_DIR%"
pm2 resurrect

echo.
echo ========================================
echo   All services started via PM2!
echo ========================================
echo.
echo   Frontend:  https://kpi.protecther.in
echo   Backend:   https://api.protecther.in/api
echo   Local:     http://localhost:3001
echo.
echo   Run "pm2 list" to check status
echo   Run "pm2 logs" to view logs
echo ========================================
timeout /t 5 /nobreak > nul
