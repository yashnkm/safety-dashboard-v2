@echo off
echo ========================================
echo   Stopping Safety Dashboard Services
echo ========================================
echo.

:: Kill Node.js processes (backend and frontend)
echo Stopping Node.js processes...
taskkill /f /im node.exe 2>nul
if %errorlevel%==0 (
    echo   Node.js processes stopped.
) else (
    echo   No Node.js processes found.
)

:: Kill cloudflared process
echo Stopping Cloudflare Tunnel...
taskkill /f /im cloudflared.exe 2>nul
if %errorlevel%==0 (
    echo   Cloudflare Tunnel stopped.
) else (
    echo   No Cloudflare Tunnel process found.
)

echo.
echo ========================================
echo   All services stopped!
echo ========================================
pause
