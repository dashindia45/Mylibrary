# ──────────────────────────────────────────────
# MyLibrary — One-Command Demo Launch Script
# ──────────────────────────────────────────────
# Usage:  .\start-demo.ps1
# Stop:   .\start-demo.ps1 -Stop

param(
    [switch]$Stop,
    [switch]$Rebuild
)

$ErrorActionPreference = "Stop"
$composeFile = "docker-compose.prod.yml"

function Write-Banner {
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║     📚 MyLibrary — Study Seat Booking        ║" -ForegroundColor Cyan
    Write-Host "  ║         Management Platform                   ║" -ForegroundColor Cyan
    Write-Host "  ╚═══════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

if ($Stop) {
    Write-Banner
    Write-Host "  🛑 Stopping all services..." -ForegroundColor Yellow
    docker compose -f $composeFile down
    Write-Host "  ✅ All services stopped." -ForegroundColor Green
    exit 0
}

Write-Banner

# Check Docker
Write-Host "  ⏳ Checking Docker..." -ForegroundColor Yellow
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Docker not running" }
    Write-Host "  ✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Docker Desktop is not running. Please start it first." -ForegroundColor Red
    exit 1
}

# Build & start
Write-Host ""
Write-Host "  🚀 Building and starting all services..." -ForegroundColor Yellow
Write-Host "     (This may take 2-5 minutes on first run)" -ForegroundColor DarkGray
Write-Host ""

if ($Rebuild) {
    docker compose -f $composeFile up --build -d
} else {
    docker compose -f $composeFile up --build -d
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Build failed. Check the errors above." -ForegroundColor Red
    exit 1
}

# Wait for API health
Write-Host ""
Write-Host "  ⏳ Waiting for API to be ready..." -ForegroundColor Yellow
$maxRetries = 30
$retryCount = 0
do {
    Start-Sleep -Seconds 3
    $retryCount++
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health" -TimeoutSec 3 -ErrorAction Stop
        if ($response.success) { break }
    } catch {}
    Write-Host "     Attempt $retryCount/$maxRetries..." -ForegroundColor DarkGray
} while ($retryCount -lt $maxRetries)

if ($retryCount -ge $maxRetries) {
    Write-Host "  ⚠️  API took longer than expected. Check: docker compose -f $composeFile logs api" -ForegroundColor Yellow
} else {
    Write-Host "  ✅ API is healthy!" -ForegroundColor Green
}

# Wait a moment for DB setup
Write-Host "  ⏳ Waiting for database setup..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Print access info
Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║              🎉 DEMO IS READY!               ║" -ForegroundColor Green
Write-Host "  ╠═══════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║                                               ║" -ForegroundColor Green
Write-Host "  ║  🌐 Member Portal:  http://localhost:5173     ║" -ForegroundColor Green
Write-Host "  ║  🔧 Admin Panel:    http://localhost:5174     ║" -ForegroundColor Green
Write-Host "  ║  📡 API Health:     http://localhost:3000     ║" -ForegroundColor Green
Write-Host "  ║                                               ║" -ForegroundColor Green
Write-Host "  ║  👤 Admin Login:    admin@mylibrary.in        ║" -ForegroundColor Green
Write-Host "  ║     (OTP logs to console — check API logs)    ║" -ForegroundColor Green
Write-Host "  ║                                               ║" -ForegroundColor Green
Write-Host "  ║  📋 View logs:                                ║" -ForegroundColor Green
Write-Host "  ║     docker compose -f $composeFile logs -f    ║" -ForegroundColor Green
Write-Host "  ║                                               ║" -ForegroundColor Green
Write-Host "  ║  🛑 Stop demo:                                ║" -ForegroundColor Green
Write-Host "  ║     .\start-demo.ps1 -Stop                    ║" -ForegroundColor Green
Write-Host "  ║                                               ║" -ForegroundColor Green
Write-Host "  ╚═══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Open in browser
Start-Process "http://localhost:5173"
Start-Sleep -Seconds 1
Start-Process "http://localhost:5174"
