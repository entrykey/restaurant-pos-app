@echo off
title FilePe Print Station - Health Status
echo ========================================================
echo   Checking FilePe Print Station Health
echo ========================================================
echo.

powershell -Command "try { $res = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/health' -TimeoutSec 3; Write-Host 'STATUS: ONLINE (Healthy)' -ForegroundColor Green; Write-Host 'Cloud API:  ' $res.config.cloudUrl; Write-Host 'Shop ID:    ' $res.config.shopId; Write-Host 'Branch ID:  ' $res.config.branchId; } catch { Write-Host 'STATUS: OFFLINE (Service is not running)' -ForegroundColor Red; Write-Host 'To start it, double-click install-windows-service.bat'; }"

echo.
echo ========================================================
pause
