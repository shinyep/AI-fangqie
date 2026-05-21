@echo off
setlocal enabledelayedexpansion
title AI Rankings - Stop
echo.
echo ==========================================
echo   Stopping AI Rankings services...
echo ==========================================
echo.

for %%p in (3001 5173) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr /c:":%%p " ^| findstr "LISTENING"') do (
        for /f "tokens=1 delims=," %%b in ('tasklist /fi "PID eq %%a" /fo csv /nh 2^>nul') do (
            set "PNAME=%%~b"
            if /i "!PNAME!"=="node.exe" (
                echo  Killing node.exe (PID: %%a, port: %%p^)
                taskkill /pid %%a >nul 2>&1
                timeout /t 1 /nobreak >nul
                taskkill /f /pid %%a 2>nul
            )
        )
    )
)

echo.
echo  All services stopped.
echo.
pause
