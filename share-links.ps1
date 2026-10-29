# ──────────────────────────────────────────────
# MyLibrary — Shareable Client Links Launcher
# ──────────────────────────────────────────────
# Usage: .\share-links.ps1
#
# This script starts the full stack (API, Web, Admin)
# and exposes them over secure Cloudflare tunnels with
# shareable HTTPS links for your client.

Write-Host ""
Write-Host "  =======================================================" -ForegroundColor Cyan
Write-Host "     📚 MyLibrary — Client Live Demo Launcher            " -ForegroundColor Cyan
Write-Host "  =======================================================" -ForegroundColor Cyan
Write-Host ""

# Ensure Postgres & Redis are up
Write-Host "  1. Starting Database (PostgreSQL + Redis)..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml up -d postgres redis | Out-Null
Start-Sleep -Seconds 3

# Start API if not running
$apiRunning = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue)
if (-not $apiRunning) {
    Write-Host "  2. Starting API backend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev:api" -WindowStyle Minimized
    Start-Sleep -Seconds 5
} else {
    Write-Host "  2. API backend is already active on port 3000." -ForegroundColor Green
}

# Start Web if not running
$webRunning = (Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue)
if (-not $webRunning) {
    Write-Host "  3. Starting Web Member Portal..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev:web" -WindowStyle Minimized
    Start-Sleep -Seconds 3
} else {
    Write-Host "  3. Web portal is already active on port 5173." -ForegroundColor Green
}

# Start Admin if not running
$adminRunning = (Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue)
if (-not $adminRunning) {
    Write-Host "  4. Starting Admin Dashboard..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev:admin" -WindowStyle Minimized
    Start-Sleep -Seconds 3
} else {
    Write-Host "  4. Admin dashboard is already active on port 5174." -ForegroundColor Green
}

Write-Host ""
Write-Host "  🚀 Launching Cloudflare Tunnels..." -ForegroundColor Yellow
Start-Process .\cloudflared.exe -ArgumentList "tunnel --url http://localhost:5173"
Start-Process .\cloudflared.exe -ArgumentList "tunnel --url http://localhost:5174"

Write-Host ""
Write-Host "  Done! Check the Cloudflare windows for the live shareable links." -ForegroundColor Green
