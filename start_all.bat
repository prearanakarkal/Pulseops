@echo off
echo ========================================================
echo Launching PulseOps Full Stack (Backend + Frontend)
echo ========================================================
cd /d "%~dp0"

echo Starting FastAPI Backend on Port 8000...
start "PulseOps Backend (Port 8000)" cmd /k "backend\.venv\Scripts\uvicorn.exe backend.main:app --reload --port 8000 --host 0.0.0.0"

timeout /t 2 /nobreak >nul

echo Starting Vite React Frontend on Port 5173...
start "PulseOps Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo ========================================================
echo Both servers started!
echo Frontend: http://localhost:5173
echo Backend API Docs: http://localhost:8000/docs
echo ========================================================
pause
