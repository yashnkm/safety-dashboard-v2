@echo off
echo Creating startup shortcut...

:: Create a shortcut in the Windows Startup folder
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SCRIPT_PATH=C:\Protecther Safety Dashboard\safety-dashboard-v2\start-dashboard.bat

:: Use PowerShell to create the shortcut
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP_FOLDER%\Safety Dashboard.lnk'); $s.TargetPath = '%SCRIPT_PATH%'; $s.WorkingDirectory = 'C:\Protecther Safety Dashboard\safety-dashboard-v2'; $s.Description = 'Start Protecther Safety Dashboard'; $s.Save()"

echo.
echo Shortcut created in Windows Startup folder!
echo The dashboard will now start automatically when Windows starts.
echo.
echo Location: %STARTUP_FOLDER%\Safety Dashboard.lnk
echo.
pause
