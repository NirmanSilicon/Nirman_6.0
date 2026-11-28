# ParkSMART Edge AI Vision Client Dockerfile (File 158 / M2 Ownership)
FROM python:3.11-slim

# System dependencies for OpenCV and video decoding
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies
COPY edge/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY edge/ ./edge/
COPY docs/contracts/roi_mapping.example.json ./docs/contracts/roi_mapping.example.json

# Model weights mount point: must be mounted read-only at runtime
VOLUME ["/models"]

# Video input directory mount point
VOLUME ["/data"]

ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["python", "-m", "edge.main"]
