@echo off
title XingYue Writing

echo ============================================
echo   XingYue Writing
echo   Backend : http://localhost:3001
echo   Frontend: http://localhost:5173
echo ============================================
echo.

echo [1/2] Starting backend...
cd /d G:\fanqie\ai-rankings-project\backend
if not exist node_modules (
  echo Backend dependencies missing. Please run: cd /d G:\fanqie\ai-rankings-project\backend ^&^& npm install
  pause
  exit /b 1
)
start /b node --watch src\index.js > server.out.log 2> server.err.log

echo [2/2] Starting frontend...
cd /d G:\fanqie\ai-rankings-project\frontend
if not exist node_modules (
  echo Frontend dependencies missing. Please run: cd /d G:\fanqie\ai-rankings-project\frontend ^&^& npm install
  pause
  exit /b 1
)
start /b npm run dev > frontend.out.log 2> frontend.err.log

echo.
echo Waiting for services to start (5s)...
timeout /t 5 /nobreak > nul

echo Opening http://localhost:5173 ...
start http://localhost:5173

echo.
echo ============================================
echo   All services started.
echo   Frontend: http://localhost:5173
echo   Backend : http://localhost:3001
echo.
echo   Press any key to stop all services.
echo ============================================
pause > nul
