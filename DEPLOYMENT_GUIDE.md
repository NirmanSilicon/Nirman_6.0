# AXYRA SpaceTech — Complete End-to-End Deployment Guide

> **Changelog (2026-09-02):**
> - **Security Sanitization:** Permanently scrubbed all live Supabase secret keys, publishable keys, and project URLs. Replaced with `<YOUR_SUPABASE_...>` environment variable placeholders.
> - **Dual-Mode Restructuring:** Split guide into two clearly labeled pathways: **Cloud Deployment (Public Demo)** and **Sovereign Deployment (Air-Gapped / Bare-Metal On-Premises)**.
> - **Data Egress Comparison Matrix:** Added top-level audit table detailing exact data egress per mode.
> - **Native Sovereign Orchestration:** Added bare-metal air-gapped runbook with `start_sovereign.bat` / `start_sovereign.sh` and `egress_check.py` pre-flight enforcement.

---

## Data Egress & Architectural Comparison

AXYRA SpaceTech supports two first-class deployment modes controlled by the `DEPLOYMENT_MODE` environment variable (`SOVEREIGN` by default):

| Architectural Dimension | Cloud Deployment (`DEPLOYMENT_MODE=CLOUD`) | Sovereign Deployment (`DEPLOYMENT_MODE=SOVEREIGN`) |
|:---|:---|:---|
| **Primary Target** | Public Hackathon Demo / Multi-Tenant SaaS | Air-Gapped Defense, Classified Ground Stations, Sensitive Mission Ops |
| **Telemetry Ingestion Egress** | Streamed & synced to Supabase Cloud PostgreSQL | **Zero egress.** Persisted strictly to local embedded SQLite WAL (`db.sqlite3`) |
| **AI Ensemble Execution** | In-process serverless / cloud instance | **Zero egress.** In-process embedded models (`ai_model/*.joblib`), zero cloud APIs |
| **Active Learning Flywheel** | Human review synced to cloud table | **Zero egress.** Human review stored in local SQLite database |
| **Typography & Assets** | Self-hosted local `@font-face` + Draco/Basis local WASM | **Zero egress.** 100% self-hosted local fonts and 3D decoders |
| **External Network Calls** | Outbound HTTPS permitted to configured Supabase URL | **Blocked & Audited.** Pre-flight `egress_check.py` asserts zero external DNS resolution |
| **Default Fallback Policy** | Explicit configuration required | **Fail-safe default.** If mode is unspecified, defaults to `SOVEREIGN` |

---

# SECTION 1: Cloud Deployment (Public Hackathon Demo)

Use this pathway to deploy the public demonstration stack across Vercel, Render, and Supabase.

### 1. Pre-Deployment Codebase Verification Checklist

| Component | Status | Verification & Configuration Details |
|---|---|---|
| **Frontend Routing** | ✅ Ready | `vercel.json` and `frontend/vercel.json` SPA rewrites configured for client-side routing. |
| **API Client Connector** | ✅ Ready | `backendApi.ts` reads `VITE_API_URL` environment variable for cloud endpoints with fallback to `/api`. |
| **Backend WSGI Server** | ✅ Ready | `gunicorn` and `whitenoise` added to `backend/requirements.txt` and `backend/config/settings.py`. |
| **Start Process** | ✅ Ready | `backend/Procfile` and `render.yaml` configured with `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`. |
| **AI Ensemble Models** | ✅ Ready | `ensemble_model.joblib` and `causal_ensemble_model.joblib` packaged in `ai_model/` for real-time inference. |
| **Database Adapter** | ✅ Ready | `db_adapter.py` supports dual-write to Cloud Supabase and local SQLite with automatic schema migration. |

---

### 2. Step 1: Deploy Backend & AI Model to Render (or Railway)

Deploy the backend first to obtain your live API URL:

1. Go to **[render.com](https://render.com/)** and sign in with GitHub.
2. Click **New +** ➔ **Web Service**.
3. Select your repository: `mishraorosmit/Axyra_SpaceTech`.
4. Configure the service settings:
   - **Name:** `axyra-backend`
   - **Region:** Choose closest region (e.g., Frankfurt, Oregon, Singapore).
   - **Branch:** `main`
   - **Root Directory:** Leave **BLANK** (default root) OR set to `backend`.
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn --chdir backend config.wsgi:application --bind 0.0.0.0:$PORT`
   - **Instance Type:** `Free`
5. Under **Environment Variables**, add:
   - `DEPLOYMENT_MODE`: `CLOUD`
   - `DEBUG`: `False`
   - `ALLOWED_HOSTS`: `*`
   - `DJANGO_SECRET_KEY`: `django-insecure-axrya-cubesat-genealogy-tracer-secret-key`
   - `SUPABASE_URL`: `<YOUR_SUPABASE_URL>`
   - `SUPABASE_SECRET_KEY`: `<YOUR_SUPABASE_SECRET_KEY>`
   - `PYTHON_VERSION`: `3.11.9`
6. Click **Deploy Web Service**.
7. Once deployed, Render will provide your live URL: `https://axyra-backend.onrender.com` (Example).
8. Verify by opening in browser: `https://axyra-backend.onrender.com/api/incidents/` (returns HTTP 200).

---

### 3. Step 2: Deploy Frontend on Vercel

1. Go to **[vercel.com](https://vercel.com/)** and sign in with your GitHub account.
2. Click **Add New...** ➔ **Project**.
3. Select repository `mishraorosmit/Axyra_SpaceTech` and click **Import**.
4. In the **Configure Project** screen:
   - **Project Name:** `axyra-spacetech`
   - **Framework Preset:** `Vite`
   - **Root Directory:** Choose `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Expand **Environment Variables** and add:

| Key | Value | Description |
|---|---|---|
| `VITE_DEPLOYMENT_MODE` | `CLOUD` | Enables cloud connector mode in frontend services. |
| `VITE_API_URL` | `https://axyra-backend.onrender.com` | **Crucial:** Your live Render backend URL from Step 1. |
| `VITE_SUPABASE_URL` | `<YOUR_SUPABASE_URL>` | Supabase project endpoint. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `<YOUR_SUPABASE_PUBLISHABLE_KEY>` | Supabase anon/publishable key. |

6. Click **Deploy**. Vercel will build and deploy the React console in ~40 seconds.
7. Your frontend will be live at: `https://axyra-spacetech.vercel.app` (or custom domain).

---

### 4. Step 3: Configure Cloud Supabase PostgreSQL

1. In your **Supabase Dashboard** ➔ **SQL Editor**, run the schema definitions provided in `db_help.md` (`incidents`, `incident_events`, `causal_graphs`, `counterfactual_runs`, `diagnostic_reports`, `ai_inference_logs`, `engineer_feedback`).
2. Add your sanitized project credentials as environment variables to Render and Vercel:
   - `SUPABASE_URL`: `<YOUR_SUPABASE_URL>` (e.g. `https://your-project.supabase.co`)
   - `SUPABASE_PUBLISHABLE_KEY`: `<YOUR_SUPABASE_PUBLISHABLE_KEY>`
   - `SUPABASE_SECRET_KEY`: `<YOUR_SUPABASE_SECRET_KEY>`

---

# SECTION 2: Sovereign Deployment (Air-Gapped / On-Premises Native)

Use this pathway for complete data sovereignty, classified mission operations, or offline ground stations with **zero external dependencies and zero network egress**.

### 1. Architectural Guarantees in Sovereign Mode
- **Zero Cloud Pings:** All telemetry records, causal DAGs, and engineer feedback are persisted strictly to the local embedded SQLite WAL database (`backend/db.sqlite3`).
- **Zero Cloud AI Dependency:** Telemetry feature extraction, SHAP local explanations, and causal root-cause arbitration execute 100% locally in Python via embedded `scikit-learn` and `joblib` artifacts.
- **Self-Hosted Assets:** All fonts (`Roboto Mono`, `Oswald`) and 3D decoders (Draco, Basis Universal) are bundled directly in `frontend/src/assets/` and `frontend/public/` — zero CDN calls.
- **Fail-Safe Startup Assertion:** `config/settings.py` defaults to `DEPLOYMENT_MODE=SOVEREIGN` and aborts boot if an invalid mode is specified.

---

### 2. Prerequisites for Bare-Metal Sovereign Deployment
- **Python:** 3.10, 3.11, or 3.13 installed locally.
- **Node.js:** v18, v20, or v22 with `npm` installed locally.
- **Network:** Can be 100% physically disconnected / air-gapped.

---

### 3. Step-by-Step Sovereign Setup

#### Step 3.1: Install Dependencies (Pre-Stage in Air-Gap)
If preparing an air-gapped machine, stage wheels and npm packages beforehand:
```powershell
# In repository root
pip install -r backend/requirements.txt
cd frontend
npm install
cd ..
```

#### Step 3.2: Verify Zero-Egress Pre-Flight Check
Run the standalone security script:
```powershell
python egress_check.py
```
- **In an air-gapped environment:** All DNS resolutions fail as expected, confirming total network isolation (`[PASS] Zero network egress confirmed`).
- **On a connected developer machine:** If hostnames resolve, the script alerts you to active Internet connectivity.

#### Step 3.3: One-Click Native Sovereign Launch

**On Windows:**
```powershell
.\start_sovereign.bat
```

**On Linux / macOS:**
```bash
chmod +x ./start_sovereign.sh
./start_sovereign.sh
```

The launcher automatically:
1. Sets `DEPLOYMENT_MODE=SOVEREIGN` and `VITE_DEPLOYMENT_MODE=SOVEREIGN`.
2. Runs `python egress_check.py --warn-only`.
3. Initializes the local SQLite database schema (`backend/db.sqlite3`).
4. Launches the Django REST API on `http://127.0.0.1:8000`.
5. Launches the Vite frontend console on `http://localhost:3000`.

---

### 4. Manual Bare-Metal Execution (Two-Terminal Workflow)

If you prefer running services directly in individual terminal sessions:

**Terminal 1 (Backend API & AI Engine):**
```powershell
$env:DEPLOYMENT_MODE="SOVEREIGN"
cd backend
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

**Terminal 2 (Frontend Mission Console):**
```powershell
$env:VITE_DEPLOYMENT_MODE="SOVEREIGN"
cd frontend
npm run dev -- --port 3000
```

Open `http://localhost:3000` in any web browser. The entire AXYRA console will operate with zero external network connectivity.

---

## 5. Summary of Sovereign Deployment Files

```
├── DEPLOYMENT_GUIDE.md          # Complete deployment guide (Cloud vs. Sovereign)
├── egress_check.py              # Zero-dependency standard library egress isolation verifier
├── start_sovereign.bat          # One-click Windows sovereign launcher
├── start_sovereign.sh           # One-click Linux/macOS sovereign launcher
├── start_local.bat              # Existing standard local runner
├── backend/
│   ├── config/settings.py       # DEPLOYMENT_MODE fail-safe setting & conditional DATABASES
│   ├── app/core/db_adapter.py   # Cloud sync gated behind DEPLOYMENT_MODE == "CLOUD"
│   └── db.sqlite3               # Embedded SQLite database (WAL mode)
└── frontend/
    ├── src/assets/fonts/        # Self-hosted typography files
    ├── public/draco/            # Self-hosted Three.js Draco decoders
    ├── public/basis/            # Self-hosted Three.js Basis Universal transcoders
    └── src/services/supabase.ts # Cloud client gated behind VITE_DEPLOYMENT_MODE === "CLOUD"
```
