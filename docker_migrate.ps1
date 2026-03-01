# Docker Desktop Data Relocation Script
# This script moves the WSL2 'docker-desktop-data' distribution to Drive D.

$TargetDrive = "D:"
$TargetDir = "$TargetDrive\Docker\data"
$ExportFile = "$TargetDrive\docker-desktop-data-export.tar"

# 1. Ensure Target Directory exists
if (!(Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
    Write-Host "✅ Created target directory: $TargetDir" -ForegroundColor Cyan
}

Write-Host "⚠️  Checking Docker Desktop Status..." -ForegroundColor Yellow
$process = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "🛑 Please SHUT DOWN Docker Desktop manually before proceeding!" -ForegroundColor Red
    Write-Host "Right-click the Docker icon in the system tray and select 'Quit Docker Desktop'."
    exit
}

Write-Host "🚀 Starting Migration Process..." -ForegroundColor Green

# 2. Export the data distribution
Write-Host "📦 Exporting Docker data to $ExportFile... (This may take several minutes)" -ForegroundColor Cyan
wsl --export docker-desktop-data $ExportFile

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Export failed. Please ensure WSL2 is working." -ForegroundColor Red
    exit
}

# 3. Unregister the current distribution
Write-Host "🗑️  Unregistering current Docker data from Drive C..." -ForegroundColor Yellow
wsl --unregister docker-desktop-data

# 4. Import the distribution to Drive D
Write-Host "📥 Importing Docker data to $TargetDir..." -ForegroundColor Cyan
wsl --import docker-desktop-data $TargetDir $ExportFile --version 2

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Import failed." -ForegroundColor Red
    exit
}

# 5. Cleanup
Write-Host "🧹 Cleaning up temporary export file..." -ForegroundColor Cyan
Remove-Item $ExportFile

Write-Host "✨ Migration Complete!" -ForegroundColor Green
Write-Host "📍 Your Docker images/containers/cache are now stored on: $TargetDir" -ForegroundColor White
Write-Host "You can now start Docker Desktop again." -ForegroundColor Cyan
