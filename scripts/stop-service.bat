@echo off
title FilePe Print Station - Stop
echo ========================================================
echo   Stopping FilePe Print Station
echo ========================================================
echo.

powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*pos-print-bridge.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host 'Stopped process ID:' $_.ProcessId }"

echo.
echo FilePe Print Station has been stopped.
echo.
pause

