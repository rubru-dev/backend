@echo off
echo Starting all apps...

start "Backend :8000" cmd /k "cd /d "%~dp0new-app\backend" && npm run dev"
start "Frontend :3000" cmd /k "cd /d "%~dp0new-app\frontend" && npm run dev"
start "Rubahrumah :3001" cmd /k "cd /d "%~dp0rubahrumah" && npm run dev"
start "Website :4000" cmd /k "cd /d "%~dp0website-rubahrumah" && npm run dev"

echo All apps started!
