@echo off
title FilePe Print Station - Setup
echo ========================================================
echo   Installing FilePe Print Station as Windows Background Service
echo ========================================================
echo.

set SCRIPT_DIR=%~dp0
set VBS_TARGET=%SCRIPT_DIR%start-silent.vbs
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_DIR%\FilePe-Print-Station.lnk

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%VBS_TARGET%\"'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Save()"

echo [1/2] Added FilePe Print Station to Windows Startup folder.
echo       Location: %SHORTCUT_PATH%
echo.

echo [2/2] Launching FilePe Print Station in background now...
wscript.exe "%VBS_TARGET%"

timeout /t 2 >nul
powershell -Command "try { $res = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/health' -TimeoutSec 3; Write-Host '       Status: ACTIVE (ONLINE)'; Write-Host '       Shop: ' $res.config.shopId; Write-Host '       Cloud: ' $res.config.cloudUrl; } catch { Write-Host '       Status: Running' }"

echo.
echo ========================================================
echo   SUCCESS! FilePe Print Station is active.
echo   - Windows Startup : ENABLED (Starts automatically on boot)
echo   - Universal Relay : Relays to all thermal printers in POS
echo ========================================================
echo.
echo What would you like to do next?
echo   [1] Open Live Status Window (Recommended: see incoming print jobs)
echo   [2] Minimize to Background (FilePe Print Station continues running silently)
echo.
set /p "CHOICE=Enter choice [1 or 2, default is 1]: "

if "%CHOICE%"=="2" (
    echo.
    echo [OK] FilePe Print Station is running silently in the background.
    echo Return to your FilePe POS browser tab to see the green ACTIVE badge.
    timeout /t 4 >nul
    exit /b 0
)

echo.
echo Opening FilePe Print Station Live Monitor...
start "FilePe Print Station - Live Monitor" cmd /k "title FilePe Print Station - Live Console && color 0A && echo ======================================================== && echo   FILEPE PRINT STATION - LIVE MONITOR && echo ======================================================== && node \"%SCRIPT_DIR%pos-print-bridge.js\""
timeout /t 2 >nul
exit /b 0

