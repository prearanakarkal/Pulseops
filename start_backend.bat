@echo off
echo ========================================================
echo Starting PulseOps Autonomous SRE Backend on Port 8000...
echo ========================================================
cd /d "%~dp0"
backend\.venv\Scripts\uvicorn.exe backend.main:app --reload --port 8000 --host 0.0.0.0
pause
