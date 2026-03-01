#!/bin/bash
# deploy.sh
# Dynamic CUDA deployment script for Aatron

echo "========================================="
echo "  Aatron Deployment Script (Dynamic CUDA)"
echo "========================================="

# Default versions
CUDA_VERSION="12.1.0"
PYTORCH_CU_VERSION="cu121"

# Check if nvidia-smi exists
if command -v nvidia-smi &> /dev/null; then
    echo "nvidia-smi found. Checking NVIDIA driver version..."
    
    # Get highest supported CUDA version from nvidia-smi (e.g., "12.2", "11.8")
    DETECTED_CUDA=$(nvidia-smi | grep "CUDA Version:" | awk '{print $9}')
    
    if [ -n "$DETECTED_CUDA" ]; then
        echo "Detected Max CUDA Version: $DETECTED_CUDA"
        
        # Simple string comparison (assumes format XX.X)
        if [[ "$DETECTED_CUDA" < "12.1" ]]; then
            echo "CUDA < 12.1 detected. Falling back to CUDA 11.8."
            CUDA_VERSION="11.8.0"
            PYTORCH_CU_VERSION="cu118"
        else
            echo "CUDA >= 12.1 detected. Using CUDA 12.1."
            CUDA_VERSION="12.1.0"
            PYTORCH_CU_VERSION="cu121"
        fi
    else
        echo "Could not parse CUDA version. Defaulting to 12.1."
    fi
else
    echo "nvidia-smi NOT found. Proceeding with default 12.1 (Will run on CPU if no GPU available)."
fi

echo "-----------------------------------------"
echo "Building with args:"
echo "CUDA_VERSION: $CUDA_VERSION"
echo "PYTORCH_CU_VERSION: $PYTORCH_CU_VERSION"
echo "-----------------------------------------"

# Export variables for docker-compose
export CUDA_VERSION=$CUDA_VERSION
export PYTORCH_CU_VERSION=$PYTORCH_CU_VERSION

# Build and deploy
echo "Starting docker-compose build..."
docker-compose -f local.yml build

echo "Starting deployment..."
docker-compose -f local.yml up -d

echo "========================================="
echo "Deployment initiated. Check logs with: docker-compose -f local.yml logs -f"
