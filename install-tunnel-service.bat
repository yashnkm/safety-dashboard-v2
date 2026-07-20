@echo off
echo ========================================
echo Installing Cloudflare Tunnel as Windows Service
echo ========================================
echo.
echo Service Name: cloudflared-safety
echo Tunnel: safety-backend
echo.

REM Check if running as admin
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as Administrator"
    pause
    exit /b 1
)

echo Installing service...
sc create cloudflared-safety binPath= "\"C:\Program Files (x86)\cloudflared\cloudflared.exe\" tunnel --config C:\Users\PC-09\.cloudflared\safety-config.yml run safety-backend" start= auto DisplayName= "Cloudflare Tunnel - Safety Dashboard"

if %errorLevel% EQU 0 (
    echo.
    echo Starting service...
    sc start cloudflared-safety

    echo.
    echo ========================================
    echo SUCCESS! Tunnel installed as service
    echo ========================================
    echo.
    echo Service will now start automatically on boot.
    echo.
    echo Useful commands:
    echo   Check status: sc query cloudflared-safety
    echo   Stop:         sc stop cloudflared-safety
    echo   Start:        sc start cloudflared-safety
    echo   Uninstall:    sc delete cloudflared-safety
    echo.
) else (
    echo.
    echo ERROR: Failed to create service
    echo Please check if cloudflared is installed at:
    echo C:\Program Files ^(x86^)\cloudflared\cloudflared.exe
    echo.
)

pause
