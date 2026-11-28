# RAIL-PULSE Production Deployment Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Deploy the complete RAIL-PULSE railway digital twin system (FastAPI backend, LightGBM ML models, PostgreSQL/PostGIS database, Redis state store, WebSockets, and React 19 frontend) into a resilient, production-grade cloud environment with SSL/TLS and automated CI/CD.

**Architecture:** Multi-container production deployment using Docker Compose orchestrating the ASGI application server, PostgreSQL 16 with PostGIS 3.4 spatial extensions, Redis 7 caching, and an automated TLS reverse proxy (Caddy / Nginx) routing HTTPS and WebSocket (`/ws/stream`) traffic.

**Tech Stack:** Docker, Docker Compose, Caddy / Nginx, PostgreSQL 16 + PostGIS 3.4, Redis 7, Python 3.13, FastAPI, Uvicorn, LightGBM, React 19, Vite, GitHub Actions.

---

## Architecture Overview

```
                      INTERNET / CLIENTS
             (Web Browsers, Mobile Apps, SIH Jury)
                               │
                               ▼
               ┌─────────────────────────────────┐
               │   Cloud Server (EC2 / Droplet)  │
               │   Caddy / Nginx Reverse Proxy   │
               │   • Automated Let's Encrypt SSL │
               │   • HTTP/2 & Gzip Compression   │
               └───────────────┬─────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │                                     │
            ▼ (HTTP /assets, /api/v1, /)          ▼ (WebSocket /ws/stream)
┌──────────────────────────────────────────────────────────┐
│ railpulse-api Container (FastAPI + Uvicorn)              │
│ • Production React 19 Static Frontend (mounted at /)     │
│ • REST Endpoints (/api/v1/forecast, /api/v1/rescue, etc) │
│ • LightGBM CQR ML Quantile Engine (local artifacts)      │
│ • 1.5s Non-blocking Broadcaster Loop                     │
└──────────────────────────┬───────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│ railpulse-postgis       │ │ railpulse-redis         │
│ PostgreSQL 16 + PostGIS │ │ Redis 7 Alpine          │
│ • 17 corridor stations  │ │ • State caching         │
│ • 30 track blocks       │ │ • Circuit-breaker buffer│
│ • Highway matrix routes │ │ • Snapshot persistence  │
└─────────────────────────┘ └─────────────────────────┘
```

---

## Deployment Option Comparison

| Deployment Strategy | Best For | Estimated Cost | Setup Complexity | WebSocket & ML Latency |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: Single Cloud VM (Recommended)**<br>(AWS EC2 `t3.medium`, DigitalOcean `4GB Droplet`, or Hetzner `CPX21`) | Live Hackathon Demos, Jury Evaluation, Production Showcase | ~\$12 – \$20 / month | Low (Single-command Docker Compose + Caddy) | **Zero egress latency** (co-located PostGIS, Redis & LightGBM) |
| **Option B: Managed PaaS Stack**<br>(Render / Railway + Supabase PostGIS + Redis Cloud + Vercel) | Teams without Linux VM experience | ~\$25 – \$45 / month | Medium (Multiple vendor accounts and connection strings) | Adds 20–80ms network round-trip between API, DB, and Redis |
| **Option C: Enterprise Cloud Native**<br>(AWS ECS / GCP Cloud Run + Cloud SQL PostGIS + Memorystore) | Enterprise Multi-Tenant Scaling | ~\$80+ / month | High (IAM, VPC peering, Terraform/IaC) | Optimized for horizontal autoscaling |

---

## Phase 1: Container & Build Hardening

### Task 1.1: Multi-Stage Dockerfile for Self-Contained Builds
**Goal:** Build the React 19 frontend inside Docker so deployment does not require manual local `npm run build`.

- **File:** `Dockerfile`
- **Changes:**
  - Stage 1 (`frontend-builder`): Node 22 Alpine, runs `npm ci` and `npm run build`.
  - Stage 2 (`runtime`): Python 3.13-slim with `libgomp1`, copies `dist/` from Stage 1 into `/app/frontend/dist`.
- **Verification:** `docker build -t railpulse-prod .` builds cleanly in under 2 minutes.

### Task 1.2: Production Docker Compose (`docker-compose.prod.yml`)
**Goal:** Define production specifications with volume durability, logging limits, and reverse proxy.

- **File:** `docker-compose.prod.yml`
- **Services:**
  - `caddy`: Handles automatic HTTPS with Let's Encrypt, HTTP/2, WebSocket upgrade proxying to `api:8000`.
  - `api`: Restricted to 1 Uvicorn worker for deterministic simulation tick execution.
  - `postgis`: Persistent named volume with PostgreSQL parameters tuned for PostGIS.
  - `redis`: Append-Only File (`appendonly yes`) enabled for durable state storage.
- **Verification:** `docker compose -f docker-compose.prod.yml config` validates with 0 errors.

---

## Phase 2: Reverse Proxy & Networking Configuration

### Task 2.1: Automated Caddy Reverse Proxy
**Goal:** Zero-maintenance SSL/TLS certificate issuing and WebSocket proxying.

- **File:** `deploy/Caddyfile`
- **Configuration:**
  ```caddyfile
  {domain_or_ip} {
      encode zstd gzip

      # API & Frontend Static Assets
      reverse_proxy api:8000 {
          header_up Host {host}
          header_up X-Real-IP {remote_host}
          header_up X-Forwarded-For {remote_host}
          header_up X-Forwarded-Proto {scheme}
      }

      # Static asset caching headers
      @static {
          path /assets/* /fonts/* *.js *.css *.png *.svg *.ico
      }
      header @static Cache-Control "public, max-age=31536000, immutable"

      # WebSocket Stream proxying
      handle /ws/* {
          reverse_proxy api:8000
      }
  }
  ```

---

## Phase 3: Automated Database Seeding & Startup Hook

### Task 3.1: Automated Production Database Migration & Seeder
**Goal:** Ensure new cloud instances automatically provision PostgreSQL extensions, run table migrations, and seed corridor topologies on first boot.

- **File:** `scripts/entrypoint.sh`
- **Logic:**
  1. Wait for PostgreSQL port 5432 to report ready (`pg_isready`).
  2. Run `python scripts/seed_database.py` (idempotent `ON CONFLICT DO UPDATE`).
  3. Execute `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- **Verification:** Container restarts without duplicate key errors or data loss.

---

## Phase 4: CI/CD Pipeline (GitHub Actions)

### Task 4.1: Automated Continuous Integration Workflow
**Goal:** Run linting, backend unit tests, and frontend build on every pull request to `main`.

- **File:** `.github/workflows/ci.yml`
- **Jobs:**
  - `backend-test`: Python 3.13, installs requirements, runs `pytest tests/ -q` (62 tests) and `ruff check .`.
  - `frontend-build`: Node 22, `npm ci`, runs `npm run build`.

### Task 4.2: Automated Cloud Server Deployment Workflow
**Goal:** Automatically deploy approved code to the production server via SSH and Docker Compose.

- **File:** `.github/workflows/deploy.yml`
- **Steps:**
  1. Trigger on push to `main`.
  2. SSH into target cloud VM via GitHub Secrets (`SERVER_HOST`, `SERVER_USER`, `SSH_PRIVATE_KEY`).
  3. `git pull origin main`.
  4. `docker compose -f docker-compose.prod.yml up --build -d`.
  5. Run healthcheck verification (`curl -f http://localhost:8000/api/v1/health`).

---

## Phase 5: Verification & Go-Live Checklist

| Step | Action | Expected Outcome |
| :--- | :--- | :--- |
| **5.1** | Domain DNS Setup | `A` record pointing `railpulse.yourdomain.com` to cloud server public IP |
| **5.2** | Firewall / Security Groups | Port `80` (HTTP) and `443` (HTTPS) open; `5432` and `6379` restricted to internal network |
| **5.3** | Live HTTPS Check | `https://railpulse.yourdomain.com` loads with green padlock (Let's Encrypt) |
| **5.4** | Live WebSocket Check | Browser console confirms `ws://` successfully upgraded to `wss://` with 1.5s live packets |
| **5.5** | Multi-Corridor Switch | Switching between `ECoR_BHC_PURI` and `SER_HWH_KGP` renders properly |
| **5.6** | Rescue Evaluation | Cuttack & Santragachi road rescue calculation returns calibrated route & savings |
| **5.7** | Backup Automation | Daily cron running `pg_dump` to offsite volume or S3 bucket |

---

## Execution Handoff

When ready to proceed, choose the target deployment option:
1. **Option A (Cloud VM with Docker Compose + Caddy)**: We generate the production compose, Caddyfile, entrypoint script, and CI/CD workflow.
2. **Option B (Managed PaaS - Render/Railway)**: We generate `render.yaml` or Railway configuration files with remote PostGIS/Redis wiring.
