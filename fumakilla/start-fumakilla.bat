@echo off
setlocal

set "APP_DIR=%~dp0fumakilla-qc"
set "BACKEND_DIR=%APP_DIR%\backend"
set "FRONTEND_DIR=%APP_DIR%\frontend"

echo Starting Fumakilla QC...
echo Backend  : http://localhost:4003/api/health
echo Frontend : http://localhost:3003
echo.

if not exist "%BACKEND_DIR%\package.json" (
  echo Backend folder not found: "%BACKEND_DIR%"
  pause
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo Frontend folder not found: "%FRONTEND_DIR%"
  pause
  exit /b 1
)

if not exist "%BACKEND_DIR%\node_modules" (
  echo Installing backend dependencies...
  pushd "%BACKEND_DIR%"
  call npm install
  if errorlevel 1 (
    popd
    echo Backend npm install failed.
    pause
    exit /b 1
  )
  popd
)

if not exist "%FRONTEND_DIR%\node_modules" (
  echo Installing frontend dependencies...
  pushd "%FRONTEND_DIR%"
  call npm install
  if errorlevel 1 (
    popd
    echo Frontend npm install failed.
    pause
    exit /b 1
  )
  popd
)

echo Generating Prisma client...
pushd "%BACKEND_DIR%"
call npm run db:generate
if errorlevel 1 (
  popd
  echo Prisma generate failed. Check backend .env and npm dependencies.
  pause
  exit /b 1
)
popd

start "Fumakilla Backend :4003" cmd /k "cd /d "%BACKEND_DIR%" && npm run dev"
start "Fumakilla Frontend :3003" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo Fumakilla QC started.
echo Open http://localhost:3003 in your browser.
echo Login: admin@fumakilla.co.id / fumakilla2026
pause
