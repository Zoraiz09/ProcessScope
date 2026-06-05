# Launches the ProcessScope backend + frontend dev servers in parallel.
# Usage:  ./scripts/dev.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

Write-Host "Starting ProcessScope..." -ForegroundColor Green

# Backend (FastAPI on :8000)
$backend = Start-Process -PassThru -WorkingDirectory "$root\backend" `
    -FilePath "$root\backend\venv\Scripts\python.exe" `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"

# Frontend (Vite on :5173)
$frontend = Start-Process -PassThru -WorkingDirectory "$root\frontend" `
    -FilePath "npm" -ArgumentList "run", "dev"

Write-Host "Backend  -> http://localhost:8000  (pid $($backend.Id))"
Write-Host "Frontend -> http://localhost:5173  (pid $($frontend.Id))"
Write-Host "Press Ctrl+C to stop, then close the spawned windows." -ForegroundColor Yellow

Wait-Process -Id $backend.Id, $frontend.Id
