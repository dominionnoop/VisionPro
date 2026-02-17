# GPU Support Setup Guide

## Prerequisites
Before running the project, ensure your host machine is ready:

### 1. NVIDIA Drivers
- Install latest NVIDIA drivers for your GPU.
- Download from: https://www.nvidia.com/Download/index.aspx

### 2. NVIDIA Container Toolkit
This is **required** for Docker to see your GPU.

**Windows (WSL2):**
```bash
wsl --install
# Follow official guide to install nvidia-container-toolkit in WSL2
```

**Linux:**
```bash
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

---

## Verifying GPU Access

Once requirements are installed, verify your system:

```bash
# Check NVIDIA driver on host
nvidia-smi

# Check inside Docker (after running make up)
docker exec aatron_backend nvidia-smi
```

---

## Project Configuration

This project is configured to use GPU by default via `local.yml`.

- **Dockerfile**: `server/Dockerfile` (Multi-Stage Build)
- **Compose**: `local.yml`
- **Volume**: `aatron_postgres_data`

### Running the Project
```bash
make build  # First time will download wheels (takes time)
make up     # Starts everything
```

### Troubleshooting
If you see error: `could not select device driver "" with capabilities: [[gpu]]`
- It means **NVIDIA Container Toolkit** is missing or not running.
- Please install it according to the "Prerequisites" section.
