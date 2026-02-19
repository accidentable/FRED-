# FRED-OS Startup Script
# Starts both the Python backend server and the React frontend.
# Usage: .\start.ps1

Write-Host ""
Write-Host "  FRED-OS Terminal Orchestrator" -ForegroundColor Cyan
Write-Host "  ==============================" -ForegroundColor Cyan
Write-Host ""

$ROOT = $PSScriptRoot
if (-not $ROOT) { $ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path }
$SERVER_DIR = Join-Path (Join-Path $ROOT "apps") "server-py"
$VENV_DIR = Join-Path $SERVER_DIR ".venv"

# --- Check Python ------------------------------------------------------------
Write-Host "[1/4] Checking Python..." -ForegroundColor Yellow
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "  [X] Python not found. Please install Python 3.11+." -ForegroundColor Red
    exit 1
}
$pyVersion = & python --version 2>&1
Write-Host "  [OK] $pyVersion" -ForegroundColor Green

# --- Setup Virtual Environment -----------------------------------------------
Write-Host "[2/4] Setting up Python virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path $VENV_DIR)) {
    Write-Host "  Creating .venv..." -ForegroundColor DarkGray
    & python -m venv $VENV_DIR
}

$activateScript = Join-Path (Join-Path $VENV_DIR "Scripts") "Activate.ps1"
. $activateScript

Write-Host "  Installing Python dependencies..." -ForegroundColor DarkGray
& pip install -r (Join-Path $SERVER_DIR "requirements.txt") --quiet 2>$null
Write-Host "  [OK] Python dependencies ready" -ForegroundColor Green

# --- Check .env --------------------------------------------------------------
Write-Host "[3/4] Checking .env configuration..." -ForegroundColor Yellow
$envFile = Join-Path $ROOT ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "  [!] .env file not found. Copying from .env.example..." -ForegroundColor DarkYellow
    Copy-Item (Join-Path $ROOT ".env.example") $envFile
    Write-Host "  [!] Please edit .env and add your API keys." -ForegroundColor Yellow
}
else {
    Write-Host "  [OK] .env file found" -ForegroundColor Green
}

# --- Start Services ----------------------------------------------------------
Write-Host "[4/4] Starting services..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  [PY]  Python API Server -> http://localhost:3001" -ForegroundColor Magenta
Write-Host "  [WEB] React Frontend    -> http://localhost:5173" -ForegroundColor Blue
Write-Host ""
Write-Host "  Press Ctrl+C to stop all services." -ForegroundColor DarkGray
Write-Host ""

# Start Python server in background
$serverJob = Start-Job -ScriptBlock {
    param($venvDir, $serverDir)
    $activate = Join-Path (Join-Path $venvDir "Scripts") "Activate.ps1"
    . $activate
    Set-Location $serverDir
    & python -m uvicorn app.main:app --reload --port 3001 --host 0.0.0.0
} -ArgumentList $VENV_DIR, $SERVER_DIR

# Start frontend in background
$webJob = Start-Job -ScriptBlock {
    param($rootDir)
    Set-Location $rootDir
    & pnpm dev:web
} -ArgumentList $ROOT

# Stream output from both
try {
    while ($true) {
        Receive-Job $serverJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "[SERVER] $_" -ForegroundColor Magenta }
        Receive-Job $webJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "[WEB]    $_" -ForegroundColor Blue }
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host "Stopping services..." -ForegroundColor Yellow
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Stop-Job $webJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob, $webJob -Force -ErrorAction SilentlyContinue
    Write-Host "All services stopped." -ForegroundColor Green
}
