# SmartPPE — Warden's Eye

### AI & IoT-Based Workplace Safety Monitoring System

**SmartPPE — Warden's Eye** is an AI and IoT-based workplace and industrial safety monitoring system designed to improve employee safety through camera-based Personal Protective Equipment (PPE) detection, RFID-based worker identification, supplementary environmental hazard monitoring, and centralized incident management.

The system integrates ESP32 IoT hardware, computer vision, backend services, a database, and role-based monitoring dashboards to provide a unified workplace safety solution across industrial facilities, warehouses, construction sites, laboratories, and restricted operational zones.

> **Important Prototype Disclaimer:**
> - SmartPPE uses **camera-based PPE detection** and **station/checkpoint RFID worker identification**. It does **not** use smart helmets or helmet-mounted sensors.
> - The smoke and flame sensors included in the hardware prototype are **supplementary prototype demonstration components** and must not be described or relied upon as certified industrial life-safety instruments.

---

## 1. Problem Statement & Project Objectives

### Problem Statement
Industrial and workplace environments require continuous compliance with Personal Protective Equipment (PPE) rules, controlled zone access, rapid awareness of environmental anomalies, and accountable incident verification. Manual supervision alone cannot continuously monitor every entry checkpoint or operational zone, and unverified alerts can lead to either missed hazards or alert fatigue.

### Project Objectives
- **RFID Worker Identification:** Identify workers at workplace checkpoints and zones using 13.56 MHz RFID cards and ESP32 + MFRC522 readers.
- **Camera-Based PPE Detection:** Detect missing or properly worn safety equipment (such as safety helmets and high-visibility vests) using a computer vision model.
- **Supplementary Hazard Monitoring:** Demonstrate environmental hazard alerts using ESP32-connected smoke and flame sensor modules.
- **Centralized Incident Management:** Automatically generate, deduplicate, and track safety incidents from PPE violations, environmental alerts, and unknown RFID scans.
- **Role-Based Dashboards & Verification:** Enforce a three-tier role hierarchy (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`) where supervisors verify and resolve incidents within their assigned zones and administrators maintain system-wide oversight.
- **Tamper-Evident Incident Records:** Maintain verifiable incident integrity using canonical SHA-256 cryptographic hashing and hash chaining (with blockchain anchoring planned as a future extension).
- **Scalable Multi-Device & Multi-Camera Architecture:** Support multiple ESP32 units and multiple camera feeds across workplace zones.

---

## 2. Three User Roles

SmartPPE enforces a three-tier role hierarchy (detailed in [`docs/SECURITY_AND_ROLES.md`](docs/SECURITY_AND_ROLES.md)):

| Role | Scope | Core Responsibilities |
|---|---|---|
| **`WORKER`** | Personal (Self) | View own worker profile, assigned workplace zone, personal PPE compliance status, safety notifications, and personal incident history. |
| **`SUPERVISOR`** | Assigned Workplace Zones | Monitor assigned zones, view workers and active RFID presence in assigned zones, receive live zone alerts, review incident evidence, and verify, reject, or resolve incidents in assigned zones. Read-only access to assigned-zone workers (cannot create/delete workers). |
| **`ADMINISTRATOR`** *(Higher Authority)* | System-Wide | Full system overview, create/manage workers and supervisors, manage workplace zones and supervisor-zone assignments, register and monitor ESP32 devices and cameras, view all incidents and advanced analytics, verify record integrity, and review system audit logs. |

---

## 3. Core System Modules & Seven Main Capabilities

### System Modules

| Module | Description |
|---|---|
| **RFID Identification** | Identifies registered workers via MFRC522 RFID readers and records zone scan logs |
| **Camera PPE Detection** | Processes camera frames via the ML pipeline and submits structured PPE detection events |
| **Environmental Monitoring** | Monitors supplementary smoke and flame sensors via ESP32 |
| **Backend & API Layer** | Authenticates users/devices/services, validates payloads, applies incident rules, and serves REST/real-time APIs |
| **Database Layer** | Stores users, workers, zones, zone assignments, devices, cameras, logs, detections, incidents, evidence, and audit trails |
| **Role-Based Dashboards** | Provides dedicated views for Workers, Supervisors, and Administrators |
| **Tamper-Evident Integrity Layer** | Proposed SHA-256 canonical incident hashing and hash chaining (with optional future blockchain anchoring) |

### Seven Main Project Capabilities & Current Status

These seven capabilities form part of the intended SmartPPE project scope. Because the current repository contains specification and architecture documentation while source code integration is pending verification from team branches, their current repository status is reported transparently below:

| # | Core Project Capability | Current Repository Status | Notes |
|---|---|---|---|
| 1 | **Real-Time Dashboard Updates** | `PLANNED` / `NOT VERIFIED` | Event contracts (`rfid:scan`, `ppe:detection`, `sensor:alert`, `incident:new`, `incident:updated`, `device:status`, `camera:status`) defined in [`docs/ApiDocumentation.md`](docs/ApiDocumentation.md). |
| 2 | **Advanced Safety Analytics** | `PLANNED` / `NOT VERIFIED` | Compliance percentage, zone risk breakdown, and trend metrics defined in [`docs/Architecture.md`](docs/Architecture.md) and [`docs/ApiDocumentation.md`](docs/ApiDocumentation.md). |
| 3 | **Multi-Camera Support** | `PLANNED` / `NOT VERIFIED` | Camera registry, zone mapping, and per-camera detection ingestion specified in [`docs/ML_INTEGRATION.md`](docs/ML_INTEGRATION.md) and [`docs/DataBase.md`](docs/DataBase.md). |
| 4 | **Multiple ESP32 Device Support** | `PLANNED` / `NOT VERIFIED` | Per-device identity (`deviceCode`), zone mapping, authentication (`apiKeyHash`), and heartbeat tracking specified in [`docs/HARDWARE_SETUP.md`](docs/HARDWARE_SETUP.md) and [`docs/DataBase.md`](docs/DataBase.md). |
| 5 | **Advanced Role & Permission Management** | `PARTIALLY IMPLEMENTED` | Foundation RBAC (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`) and supervisor zone isolation implemented and verified in `backend/src/middleware/auth.middleware.js`. |
| 6 | **Tamper-Evident Incident Records** | `PLANNED` / `NOT VERIFIED` | Proposed canonical SHA-256 hashing (`recordHash`), hash chaining (`previousHash`), and evidence file hashing (`fileHash`) specified in [`docs/DataBase.md`](docs/DataBase.md). Blockchain anchoring remains a future extension (`NOT STARTED`). |
| 7 | **Scalable Deployment Architecture** | `PLANNED` / `NOT VERIFIED` | Modular decoupling of ESP32 nodes, ML service, backend API, database, and frontend specified in [`docs/Architecture.md`](docs/Architecture.md) and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). |

---

## 4. Hardware Components

Detailed wiring and hardware safety notes are documented in [`docs/HARDWARE_SETUP.md`](docs/HARDWARE_SETUP.md).

- **ESP32 Development Board** (Wi-Fi-enabled microcontroller node)
- **MFRC522 (RC522) 13.56 MHz RFID Reader** (connected via 3.3V SPI)
- **Compatible 13.56 MHz ISO/IEC 14443A RFID Cards / Tags**
- **Smoke Sensor Module** (supplementary prototype demonstration component)
- **Flame Sensor Module** (supplementary prototype demonstration component)
- **Camera Input** (for the separate computer-vision PPE detection pipeline)

---

## 5. Technology Stack Status

In accordance with strict engineering verification standards, distinguish between the **proposed stack** and **verified repository code**:

| Component | Technology | Current Verification Status |
|---|---|---|
| **Microcontroller** | ESP32 (Arduino / C++) | `PROPOSED` / `TO BE CONFIRMED` (firmware not yet committed to repo) |
| **RFID Reader** | MFRC522 (3.3V SPI) | `VERIFIED IN DOCS` (SPI pinout documented in [`docs/HARDWARE_SETUP.md`](docs/HARDWARE_SETUP.md)) |
| **Environmental Sensors** | Smoke Sensor & Flame Sensor | `PROPOSED` / `TO BE CONFIRMED` (exact ESP32 GPIO pins to be confirmed with hardware team) |
| **ML / Computer Vision** | Camera-Based PPE Detection Model | `TO BE CONFIRMED` (developed by ML team member; model weights/scripts not yet committed) |
| **Backend API** | Node.js + Express.js + Zod + Helmet + CORS | `IMPLEMENTED (Foundation Phase)` (`backend/src/*` verified with 10/10 tests) |
| **Database** | MongoDB + Mongoose ODM | `IMPLEMENTED (Foundation Models: User, Zone, Worker, ZoneAssignment)` |
| **Authentication** | JWT (`Bearer` token) + `bcryptjs` password hashing + Rate Limiting | `IMPLEMENTED & VERIFIED` (`/api/auth/register`, `/login`, `/me`, `/logout`) |
| **Role-Based Access Control** | 3-Tier RBAC (`WORKER`, `SUPERVISOR`, `ADMINISTRATOR`) + Zone Isolation | `IMPLEMENTED & VERIFIED` (`backend/src/middleware/auth.middleware.js`) |
| **Real-Time Transport** | Proposed: WebSockets (e.g., Socket.IO) | `PROPOSED` / `NOT IMPLEMENTED` |
| **Frontend Dashboard** | Web Dashboard Framework | `TO BE CONFIRMED` (developed by frontend team member; code not yet committed) |
| **Tamper-Evident Ledger** | Proposed: SHA-256 Hash Chain (Future: Blockchain Anchoring) | `PROPOSED` / `NOT IMPLEMENTED` |
| **Version Control** | Git & GitHub | `VERIFIED` |

---

## 6. System Workflow

1. **Worker Identification:** A worker taps an RFID card on an RC522 reader connected to an ESP32 node.
2. **RFID Ingestion:** The ESP32 sends `POST /api/rfid/scan` with `deviceCode` and `rfidUid` (authenticated via `X-Device-Key`).
3. **Worker Resolution & Cooldown:** The backend resolves the registered worker, enforces a duplicate-scan cooldown window, records the scan in `rfidLogs`, and flags unknown cards.
4. **Camera PPE Detection:** The ML inference service processes camera frames and submits structured detections to `POST /api/detections` (authenticated via `X-ML-Service-Key`).
5. **Environmental Monitoring:** The ESP32 samples smoke and flame sensors and sends threshold events to `POST /api/sensors/events`.
6. **Incident Generation & Deduplication:** When a PPE violation, smoke/flame hazard, or repeated unknown RFID event meets configured rules (and is outside the deduplication cooldown window), the backend creates or updates an incident record.
7. **Real-Time Notification:** Connected Supervisor and Administrator dashboards receive instant updates for their permitted workplace zones.
8. **Supervisor Verification & Integrity Hashing:** An authorized supervisor reviews incident details and evidence, then verifies (`VERIFIED`), rejects (`REJECTED`), or resolves (`RESOLVED`) the incident. Upon verification, the backend computes a canonical SHA-256 `recordHash` chained to `previousHash` and records an audit log entry.

---

## 7. Repository Directory Structure

### 7.1 Actual Current Repository Files (Verified)

```text
Warden-s-Eye/
├── app/                              # Python Desktop ML Safety App & Backend Bridge
│   ├── detection/
│   │   ├── fire_detector.py          # YOLOv11 fire & smoke inference engine
│   │   └── ppe_detector.py           # YOLOv11 PPE & person tracking engine (custom PPE + fallback support)
│   ├── events/
│   │   ├── backend_client.py         # Non-blocking HTTP bridge to POST /api/detections & /api/cameras/heartbeat
│   │   └── manager.py                # Violation cooldown & snapshot evidence capture manager
│   ├── safety/
│   │   └── engine.py                 # Frame-level safety level evaluation (SAFE / WARNING / CRITICAL)
│   ├── ui/
│   │   ├── overlay.py                # OpenCV bounding-box & HUD overlay renderer
│   │   └── window.py                 # Tkinter desktop UI (Webcam, Video File, Smartphone Wi-Fi Stream)
│   ├── utils/
│   │   └── logger.py                 # Console & file logging utility
│   ├── video/
│   │   └── source.py                 # Multi-source video capture (Webcam, File, Smartphone HTTP/RTSP stream)
│   └── config.py                     # Canonical model paths (ml-model/models/) & backend API configuration
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                 # Primary Local MongoDB connection & graceful shutdown
│   │   │   └── env.js                # Environment variable loader
│   │   ├── controllers/
│   │   │   ├── admin.controller.js   # Admin overview, zone/supervisor CRUD & audit logs
│   │   │   ├── auth.controller.js    # Register, login, getMe, logout
│   │   │   ├── camera.controller.js  # Camera registry, Wi-Fi stream probe & camera heartbeat
│   │   │   ├── detection.controller.js # POST /api/detections (SAFE/UNCERTAIN/VIOLATION & RFID correlation)
│   │   │   ├── device.controller.js  # ESP32 device registration, key rotation & heartbeat
│   │   │   ├── rfid.controller.js    # POST /api/rfid/scan & worker zone presence
│   │   │   ├── sensor.controller.js  # POST /api/sensors/events (supplementary smoke & flame)
│   │   │   ├── worker.controller.js  # Role/zone-scoped worker queries & Admin write CRUD
│   │   │   └── zone.controller.js    # Role/zone-scoped workplace zone queries
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js    # JWT verification, RBAC & zone context
│   │   │   ├── deviceAuth.middleware.js # Constant-time SHA-256 X-Device-Key verification
│   │   │   ├── error.middleware.js   # Centralized error & 404 handler
│   │   │   ├── mlAuth.middleware.js  # Constant-time X-ML-Service-Key verification
│   │   │   └── validate.middleware.js# Zod request schema validator
│   │   ├── models/                   # All 12 canonical Mongoose models (User, Zone, Worker, ZoneAssignment,
│   │   │                             # AuditLog, Device, Camera, RfidLog, PpeDetection, SensorEvent, Incident, IncidentEvidence)
│   │   ├── routes/                   # Express route modules (/api/auth, /api/users, /api/workers, /api/zones,
│   │   │                             # /api/admin, /api/devices, /api/rfid, /api/sensors, /api/cameras, /api/detections)
│   │   ├── scripts/
│   │   │   ├── seed-demo.js          # Seeds Local MongoDB with Admin, Supervisor, Workers, Zones, ESP32_001 & CAM_001
│   │   │   ├── smartphone-camera-mock-runner.js # Smartphone Wi-Fi stream probe & mock detection runner
│   │   │   ├── start-local-mongo.js  # Local MongoDB 7.0 daemon launcher (127.0.0.1:27017)
│   │   │   └── verify-db-connection.js # Local MongoDB diagnostic script
│   │   ├── services/
│   │   │   ├── audit.service.js      # Append-only audit logger with recursive secret redaction
│   │   │   ├── heartbeatMonitor.service.js # 90-second offline timeout monitor for ESP32 devices & cameras
│   │   │   └── mockMl.service.js     # Clearly labelled [MOCK_ML_DETECTION] generator
│   │   ├── utils/
│   │   │   ├── AppError.js           # Custom operational HTTP error class
│   │   │   └── apiResponse.js        # Canonical JSON response envelope
│   │   ├── validators/               # Strict Zod schemas for auth, admin, worker, device, rfid, sensor, camera & detection
│   │   ├── app.js                    # Express app, Helmet, CORS, rate limiters & routes
│   │   └── server.js                 # HTTP server bootstrap, heartbeat monitor & SIGINT/SIGTERM handling
│   ├── tests/
│   │   ├── admin-crud.test.js        # Phase 2: 7 tests for all 12 models, Admin CRUD & audit redaction
│   │   ├── foundation.test.js        # Phase 1: 10 tests for Auth, RBAC & zone isolation
│   │   ├── hardware-ingestion.test.js# Phase 3: 7 tests for ESP32 auth, RFID scans, sensors & 90s heartbeat timeout
│   │   └── ml-detection.test.js      # Phase 4: 5 tests for Smartphone Wi-Fi stream, X-ML-Service-Key, SAFE/UNCERTAIN/VIOLATION & mock ML
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
├── docs/                             # Canonical project specification, architecture, API, DB, hardware, ML & testing docs
│   └── plan.md                       # Master 15-phase roadmap & implementation tracker
├── ml-model/                         # Canonical AI/ML Model Weights & Prototype Experiments
│   ├── experiments/                  # 11 standalone prototype & training verification scripts
│   ├── models/
│   │   ├── fire_smoke_best.pt        # Trained YOLOv11 fire & smoke weights ({0: 'smoke', 1: 'fire'})
│   │   └── yolo11n.pt                # Base YOLOv11n person/COCO weights (fallback until ppe_best.pt is added)
│   ├── README.md                     # Model inventory, architecture integration & setup instructions
│   └── requirements.txt              # Python ML dependencies (ultralytics, opencv-python, pillow, numpy)
├── .env.example                      # Placeholder environment variable template (no secrets)
├── .gitignore                        # Git ignore rules protecting secrets, builds, __pycache__ & local DB data
├── IMPLEMENTATION_PLAN.md            # Root phase-wise implementation checklist & architecture blueprint
├── README.md                         # Project overview and documentation index
├── SMARTPPE_TECHNICAL_AUDIT.md       # Complete technical & documentation audit report
└── run.py                            # Main entry point for the SmartPPE Python Desktop ML application
```

### 7.2 Planned Target Code Directories (Remaining Modules To Be Integrated)

```text
Warden-s-Eye/
├── frontend/                         # Planned (Phase 9): Role-based Worker, Supervisor & Admin dashboards
└── hardware/
    ├── esp32/                        # Planned (Phase 7): ESP32 firmware (RC522 + Smoke + Flame + Heartbeat)
    └── circuit-diagrams/             # Planned (Phase 7): Hardware wiring diagrams
```

---

## 8. Documentation Index

All project documentation is maintained in the [`docs/`](docs/) directory:

- **Project Specification:** [`docs/ps.md`](docs/ps.md)
- **System Architecture:** [`docs/Architecture.md`](docs/Architecture.md)
- **Canonical API Documentation:** [`docs/ApiDocumentation.md`](docs/ApiDocumentation.md)
- **Logical Database Schema:** [`docs/DataBase.md`](docs/DataBase.md)
- **Security & Role-Based Access Control:** [`docs/SECURITY_AND_ROLES.md`](docs/SECURITY_AND_ROLES.md)
- **Hardware & ESP32 Setup Guide:** [`docs/HARDWARE_SETUP.md`](docs/HARDWARE_SETUP.md)
- **AI/ML Camera Integration Guide:** [`docs/ML_INTEGRATION.md`](docs/ML_INTEGRATION.md)
- **Testing Strategy & Test Cases:** [`docs/TESTING.md`](docs/TESTING.md)
- **Deployment & Demo Guide:** [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- **Development Workflow & Team Guide:** [`docs/DEVELOPMENT_WORKFLOW.md`](docs/DEVELOPMENT_WORKFLOW.md)
- **Technical Audit Report:** [`SMARTPPE_TECHNICAL_AUDIT.md`](SMARTPPE_TECHNICAL_AUDIT.md)

---

## 9. Backend Installation, Setup & Running Tests

The Backend Foundation (`backend/`) is implemented and verified with automated tests.

### 9.1 Prerequisites
- **Node.js** `>= 20.0.0` (verified on Node.js `v24.13.0`)
- **MongoDB** (local instance or MongoDB Atlas URI for running the live server; automated tests use `mongodb-memory-server` automatically)

### 9.2 Installation & Environment Configuration
```bash
cd backend
npm install
cp .env.example .env
```
Edit `backend/.env` and set your `MONGODB_URI` and a strong `JWT_SECRET`.

### 9.3 Starting the Backend Server
```bash
# Development mode (auto-reload):
npm --prefix backend run dev

# Production / standard start:
npm --prefix backend start
```

### 9.4 Running the Automated Foundation Test Suite
```bash
npm --prefix backend test
```
*(Runs all 10 integration & RBAC security test suites covering database connection, registration validation, bcrypt password hashing, JWT login/verification, token revocation, worker self-only access, supervisor zone isolation, and administrator access.)*

---

## 10. Limitations & Safety Disclaimers

1. **Camera PPE Detection vs. Worker Identity:** Camera-based PPE object detection identifies visible safety equipment and compliance states (`helmet`, `no_helmet`, `safety_vest`, `no_safety_vest`), **not** a specific named worker. `workerId` remains `null` on camera detections unless linked through a verified identification mechanism.
2. **Supplementary Prototype Sensors:** Smoke and flame sensor modules are included strictly for prototype hazard-alert demonstration. They are not calibrated or certified for real industrial fire/gas life-safety protection.
3. **Tamper-Evident Records vs. Blockchain:** Incident integrity is designed around canonical SHA-256 hashing and hash chaining first; on-chain blockchain anchoring is a planned future extension and is not currently implemented.

---

**Project Name:** SmartPPE — Warden's Eye  
**Category:** AI + IoT + Computer Vision + Workplace & Industrial Safety Monitoring
