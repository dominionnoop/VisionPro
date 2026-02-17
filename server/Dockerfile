# ===============================
# STAGE 1: Collect wheels offline
# ===============================
# Use a python image to download wheels
FROM python:3.11.9-slim-bookworm AS wheels

ENV PIP_NO_CACHE_DIR=1
WORKDIR /wheels

RUN python -m pip install --upgrade pip

COPY requirements.txt .

# Download packages to /wheels
# Note: --extra-index-url for PyTorch (matching reference logic)
RUN pip download --dest /wheels --extra-index-url https://download.pytorch.org/whl/cu121 \
    torch==2.3.1 torchvision==0.18.1 && \
    pip download --dest /wheels -r requirements.txt


# =======================================
# STAGE 2: CUDA runtime + install offline
# =======================================
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install Python 3.11 and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-dev \
    python3-pip \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    && ln -sf /usr/bin/python3.11 /usr/bin/python3 \
    && ln -sf /usr/bin/python3.11 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip manually to ensure compatibility
RUN python3 -m pip install --upgrade pip

WORKDIR /app

# Install dependencies from offline wheels (STAGE 1)
COPY --from=wheels /wheels /wheels
RUN pip install --no-index --find-links=/wheels \
    torch==2.3.1 torchvision==0.18.1 && \
    pip install --no-index --find-links=/wheels -r /wheels/requirements.txt && \
    rm -rf /wheels

# Copy application code (This layer changes frequently, so it's last)
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
