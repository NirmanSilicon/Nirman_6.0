# C.A.R.R.Y -- one container: the FastAPI backend serving the built dashboard.
#
# Frontend and API share one origin, so there is no CORS to configure, the
# WebSockets (live events, browser cameras) ride the same HTTPS domain, and a
# belt's QR label only ever needs that one address.
#
#   docker build -t carry .
#   docker run -p 8000:8000 --env-file backend/.env carry
#
# On Dokploy / Coolify: Build type = Dockerfile, port 8000, add a domain with
# HTTPS. Camera access in the browser requires HTTPS.

# ---- 1. dashboard -----------------------------------------------------------
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# Vite compiles VITE_* values into the bundle at build time, and frontend/.env
# is not in git -- so the rig's Supabase project (3D Model tab, sensor
# corroboration on Analytics) is passed in as build arguments. In Dokploy:
# Advanced -> Build-time Arguments. These are the *anon* key and URL, which
# end up readable in the browser anyway; never put the service key here.
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
# Empty API base: the dashboard calls the API on its own origin. Any .env that
# slipped into the context is removed so a local VITE_API_BASE cannot leak in.
RUN rm -f .env .env.local
ENV VITE_API_BASE=""
RUN npm run build

# ---- 2. API + detector ------------------------------------------------------
FROM python:3.12-slim AS app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DEVICE=cpu \
    DETECTOR=yolo \
    MODEL_PATH=models/belt_v2.pt \
    DETECTOR_BACKEND=auto \
    IMG_SIZE=640 \
    STATIC_DIR=/app/backend/static

# OpenCV (pulled in by ultralytics) needs these shared libraries at import.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
# CPU-only torch: the default wheel bundles CUDA and is several GB larger.
COPY backend/requirements.txt backend/requirements-cpu.txt ./
RUN pip install -r requirements-cpu.txt

COPY backend/ ./
COPY --from=frontend /app/frontend/dist ./static
RUN mkdir -p media/uploads media/snapshots
# belt_v2 is the model trained on this prototype rig; belt_v1 (public industrial
# imagery) finds almost nothing on it. 640 px is the resolution belt_v2 was
# trained at. Export the ONNX copies now, so the first stream does not wait.
# IMG_SIZE=512 roughly doubles speed on a 2-vCPU server (117 -> ~70 ms/frame)
# at some cost in accuracy; both sizes are exported.
RUN python scripts/export_onnx.py 512 640

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT:-8000}/api/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
