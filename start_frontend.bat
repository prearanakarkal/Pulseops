@echo off
echo ========================================================
echo Starting PulseOps SRE Mission Control UI on Port 5173...
echo ========================================================
cd /d "%~dp0\frontend"
npm run dev
pause
