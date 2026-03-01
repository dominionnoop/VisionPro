# deploy.ps1
# Dynamic CUDA deployment script for Aatron (Windows)

Write-Host "========================================="
Write-Host "  Aatron Deployment Script (Dynamic CUDA)"
Write-Host "========================================="

# Default versions
$env:CUDA_VERSION = "12.1.0"
$env:PYTORCH_CU_VERSION = "cu121"

# Check if nvidia-smi exists
$nvidiaSmiPath = "C:\Windows\System32\nvidia-smi.exe"

if (Test-Path $nvidiaSmiPath) {
    Write-Host "nvidia-smi found. Checking NVIDIA driver version..." -ForegroundColor Yellow
    
    # Run nvidia-smi and filter for the CUDA Version line
    $smiOutput = & $nvidiaSmiPath
    $cudaLine = $smiOutput | Select-String -Pattern "CUDA Version:\s*(\d+\.\d+)"
    
    if ($cudaLine -ne $null) {
        $detectedCuda = $cudaLine.Matches.Groups[1].Value
        Write-Host "Detected Max CUDA Version: $detectedCuda" -ForegroundColor Cyan
        
        $detectedCudaFloat = [float]$detectedCuda
        
        if ($detectedCudaFloat -lt 12.1) {
            Write-Host "CUDA < 12.1 detected. Falling back to CUDA 11.8." -ForegroundColor Yellow
            $env:CUDA_VERSION = "11.8.0"
            $env:PYTORCH_CU_VERSION = "cu118"
        } else {
            Write-Host "CUDA >= 12.1 detected. Using CUDA 12.1." -ForegroundColor Green
            $env:CUDA_VERSION = "12.1.0"
            $env:PYTORCH_CU_VERSION = "cu121"
        }
    } else {
        Write-Host "Could not parse CUDA version. Defaulting to 12.1." -ForegroundColor Yellow
    }
} else {
    Write-Host "nvidia-smi NOT found. Proceeding with default 12.1 (Will run on CPU if no GPU available)." -ForegroundColor Red
}

Write-Host "-----------------------------------------"
Write-Host "Building with args:"
Write-Host "CUDA_VERSION: $($env:CUDA_VERSION)"
Write-Host "PYTORCH_CU_VERSION: $($env:PYTORCH_CU_VERSION)"
Write-Host "-----------------------------------------"

# Build and deploy
Write-Host "Starting docker-compose build..." -ForegroundColor Cyan
docker-compose -f local.yml build

Write-Host "Starting deployment..." -ForegroundColor Cyan
docker-compose -f local.yml up -d

Write-Host "========================================="
Write-Host "Deployment initiated. Check logs with: docker-compose -f local.yml logs -f" -ForegroundColor Green
