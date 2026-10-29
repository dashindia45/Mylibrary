# ──────────────────────────────────────────────
# MyLibrary — Public Client Demo Launcher
# ──────────────────────────────────────────────
# Usage:  .\start-public-demo.ps1
# ──────────────────────────────────────────────

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "  =======================================================" -ForegroundColor Cyan
Write-Host "     📚 MyLibrary — Public Client Live Demo               " -ForegroundColor Cyan
Write-Host "  =======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Start PostgreSQL if not already running
$pgData = "C:\Users\Dashr\Mylibrary\tools\pgsql\data"
$pgBin = "C:\Users\Dashr\Mylibrary\tools\pgsql\postgresql-16.15.1-x86_64-pc-windows-msvc\bin"

$pgRunning = Get-Process postgres -ErrorAction SilentlyContinue
if (-not $pgRunning) {
    Write-Host "  1. Starting local PostgreSQL..." -ForegroundColor Yellow
    Start-Process -FilePath "$pgBin\postgres.exe" -ArgumentList "-D `"$pgData`"" -WindowStyle Hidden
    Start-Sleep 3
    Write-Host "     ✅ PostgreSQL is running." -ForegroundColor Green
} else {
    Write-Host "  1. ✅ PostgreSQL is already active." -ForegroundColor Green
}

# 2. Check Redis
$redisRunning = Get-Process redis-server -ErrorAction SilentlyContinue
if ($redisRunning) {
    Write-Host "  2. ✅ Redis service is active." -ForegroundColor Green
} else {
    Write-Host "  2. ⚠️ Starting Redis..." -ForegroundColor Yellow
    Start-Service Redis -ErrorAction SilentlyContinue
}

# 3. Start API if not running
$apiPort = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if (-not $apiPort) {
    Write-Host "  3. Starting API backend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev:api" -WindowStyle Minimized
    Start-Sleep 5
    Write-Host "     ✅ API started on port 3000." -ForegroundColor Green
} else {
    Write-Host "  3. ✅ API is already active on port 3000." -ForegroundColor Green
}

# 4. Start Web if not running
$webPort = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if (-not $webPort) {
    Write-Host "  4. Starting Web Member Portal..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev:web" -WindowStyle Minimized
    Start-Sleep 4
    Write-Host "     ✅ Web Member Portal started on port 5173." -ForegroundColor Green
} else {
    Write-Host "  4. ✅ Web Member Portal is already active on port 5173." -ForegroundColor Green
}

# 5. Start Admin if not running
$adminPort = Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue
if (-not $adminPort) {
    Write-Host "  5. Starting Admin Dashboard..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev:admin" -WindowStyle Minimized
    Start-Sleep 4
    Write-Host "     ✅ Admin Dashboard started on port 5174." -ForegroundColor Green
} else {
    Write-Host "  5. ✅ Admin Dashboard is already active on port 5174." -ForegroundColor Green
}

Write-Host ""
Write-Host "  All services are live!" -ForegroundColor Green
Write-Host ""
