# ParkSMART Backend Platform Service

Backend platform API service for **ParkSMART**, an integrated AI-powered smart parking and commercial loading-zone management platform deployed in Bhubaneswar, Odisha, India.

---

## 1. Quick Start & Execution Steps

### Prerequisites
* **Docker & Docker Compose** (v2.20+)
* **Python 3.12+**
* **PostgreSQL 16** with PostGIS 3.4 and `btree_gist` extensions

### Step 1: Configure Environment
Copy the environment template:
```bash
cp .env.example .env
```
Ensure database connection and JWT credentials are configured:
```env
APP_ENV=development
DATABASE_URL=postgresql+asyncpg://parksmart:CHANGE_ME@db:5432/parksmart
JWT_SECRET=CHANGE_ME_MIN_32_CHARS_LONG_SECRET_KEY
JWT_ALGORITHM=HS256
MQTT_BROKER=mosquitto
MQTT_PORT=1883
```

### Step 2: Launch Containerized Services
Start the PostgreSQL database, Mosquitto MQTT broker, and FastAPI backend:
```bash
docker compose up --build -d
```

### Step 3: Run Database Migrations
Apply the full schema migrations up to the frozen baseline:
```bash
docker compose exec api alembic upgrade head
```

### Step 4: Seed Bhubaneswar Demonstration Data
Populate demo entities, zones, loading docks, facilities, and initial camera registries:
```bash
docker compose exec api python scripts/seed_demo.py
```

### Step 5: Run Automated Tests
Execute the complete test suite:
```bash
# Unit and integration tests
docker compose exec api pytest tests/unit tests/integration -v

# End-to-end tests
docker compose exec api pytest tests/e2e -v
```

Interactive OpenAPI Swagger documentation is available at:
* **Interactive Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **OpenAPI 3.1.0 Contract:** `docs/openapi.json`

---

## 2. Occupancy Transitions & Quality Invariants

### A. Camera Telemetry to Bay State Machine
1. **MQTT Telemetry Topic:** Edge nodes and camera simulators publish detection events on:
   ```
   parksmart/{zone_id}/{camera_id}/occupancy
   ```
2. **Detection Processing:**
   * Each event carries `observed_at`, `camera_id`, `occupancy` (`occupied` | `free`), and `confidence`.
   * **Future Timestamp Guard:** Updates with `observed_at` > 30 seconds into the future are rejected.
   * **Out-of-Order Guard:** Updates older than the current `current_bay_status.observed_at` are dropped to prevent stale frame overwrites.
   * **Zero Frame Retention:** In compliance with municipal privacy mandates, zero camera frames or vehicle crops are written to disk.

### B. Data State Thresholds & Freshness
The backend continuously derives `data_state` for every bay and zone:
* **`LIVE` ($\le 120$ seconds):** Telemetry received within the last 2 minutes. Rendered as active real-time data in UI.
* **`STALE` ($> 120$ and $\le 600$ seconds):** Telemetry received within 2 to 10 minutes. Marked as degraded/stale.
* **`UNAVAILABLE` ($> 600$ seconds or null):** Telemetry is older than 10 minutes or camera is offline.

### C. The Cardinal Rule: Missing Camera Updates Never Return Free
> **CRITICAL INVARIANT:** If a camera update is missing, delayed, or unavailable, the system **NEVER** reports the bay as `free`.
* When `data_state` is `UNAVAILABLE` or `UNKNOWN`, `current_bay_status.occupancy` is strictly returned as `unknown`.
* For zone live summaries, if no bays have live camera telemetry, `available` and `occupied` counts return `null` (never misleading `0`, and never false `free` counts).
* Unreported or disconnected hardware is never masked as available parking.

### D. Concurrency & Reservation Exclusion Locks
* Overlap protection is enforced at the database kernel level via PostgreSQL exclusion constraints:
  - `ex_parking_reservation_no_overlap` on `(bay_id WITH =, during WITH &&)`
  - `ex_loading_reservation_no_overlap` on `(bay_id WITH =, during WITH &&)`
* Candidate bay assignment iterates available bays in ascending code order (`BAY-01`, `BAY-02`, etc.) inside nested database savepoints (`async with db.begin_nested()`). If a race condition fires constraint error `23P01`, the savepoint cleanly rolls back and attempts the next candidate bay. When all bays collide, the system raises 409 `BOOKING_OVERLAP`.

### E. Provenance Stamping
Every endpoint returning occupancy, crowd telemetry, arrival probabilities, or forecasts strictly includes an immutable `provenance` tag:
* `observed`: Live hardware/camera vision telemetry.
* `forecast`: Statistical or machine learning predictive model output.
* `simulated`: Synthesized testing or simulation profile.
* `manual`: Manual administrative or operator override.

---

## 3. Schema Freeze Baseline

The relational schema is finalized and frozen across Alembic versions `0001` to `0007`:
* `0001_extensions.py`: PostGIS, `btree_gist`, `citext`, `uuid-ossp`
* `0002_users_business.py`: `app_user`, `user_role`, `business`, `business_member`, `refresh_token`
* `0003_infrastructure.py`: `city`, `zone`, `parking_facility`, `parking_bay`, `camera`, `camera_bay_mapping`
* `0004_observations.py`: `current_bay_status`, `occupancy_event`, `occupancy_history`, `crowd_observation`, `crowd_aggregate_15m`
* `0005_reservations.py`: `parking_reservation`, `loading_reservation`, `reservation_status_history`
* `0006_forecasting.py`: `forecast_model_registry`, `forecast_prediction_point`, `forecast_performance_metric`
* `0007_ops_audit.py`: `audit_log`, `system_health_metric`, `notification` (with immutable audit trigger)

---

## 4. API Endpoints Reference

| Prefix | Domain | Description |
| :--- | :--- | :--- |
| `/api/v1/auth` | Authentication | Registration, Argon2id login, rotating refresh tokens, logout |
| `/api/v1/users` | Users | Profile inspection, role management |
| `/api/v1/businesses` | Commercial | Loading businesses, fleet vehicles, staff permissions |
| `/api/v1/zones` | Infrastructure | Zones, centroid coordinates, live occupancy telemetry, nearby discovery |
| `/api/v1/bays` | Infrastructure | Bay metadata, real-time bay status |
| `/api/v1/parking-reservations` | Reservations | Bay booking, cancellation cutoff (30m), check-in grace (15m), state machine |
| `/api/v1/loading` | Commercial Loading | 30-min delivery dock slot availability, commercial reservations |
| `/api/v1/availability` | Intelligence | Arrival probability via Monte Carlo (2,000 draws), multi-zone comparison |
| `/api/v1/recommendations` | Intelligence | Weighted multi-criteria recommendations (prob, distance, price, crowd) |
| `/api/v1/admin` | Administration | User approvals, business approvals, zone/bay/fee upserts, manual override |
| `/api/v1/reports` | Analytics | Historical occupancy, loading turnaround times, fee revenue |
| `/api/v1/audit` | Compliance | Query append-only audit trail logs |
| `/api/v1/payments` | Payments | Stubs (returns 501 in prototype) |
