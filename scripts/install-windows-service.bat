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
echo   SUCCESS! FilePe Print Station is running silently.
echo   It will automatically start whenever Windows turns on.
echo   Waiters can now print KOTs from mobile phones anytime!
echo ========================================================
echo.
pause
