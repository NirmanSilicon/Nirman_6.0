# AXYRA SpaceTech — Database Architecture & Specification (`db_help.md`)

## 1. Overview & Purpose

This document outlines the complete database design, data entity models, storage strategies, and database-specific technology stack for the **AXYRA CubeSat Failure Genealogy Tracer**.

A spacecraft anomaly investigation requires storing high-frequency time-series telemetry streams, graph-structured causal dependencies, statistical machine learning feature attributions, and auditable diagnostic reports.

---

## 2. What Needs to Be Stored in the Database

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 AXYRA DATA DOMAIN MAP                                       │
│                                                                                             │
│  ┌──────────────────────┐   ┌──────────────────────┐   ┌────────────────────────────────┐  │
│  │ 1. Telemetry Streams │   │ 2. Extracted Events  │   │ 3. Causal DAG & Genealogy Runs │  │
│  │  - Raw sensor values │   │  - Z-score anomalies │   │  - Graph nodes & edges         │  │
│  │  - Timestamps (UTC)  │   │  - Sentinel dropouts │   │  - Scored confidence weights   │  │
│  │  - Subsystem channels│   │  - State departures  │   │  - Plain-English evidence text │  │
│  └──────────────────────┘   └──────────────────────┘   └────────────────────────────────┘  │
│                                                                                             │
│  ┌──────────────────────┐   ┌──────────────────────┐   ┌────────────────────────────────┐  │
│  │ 4. AI / ML Attrib.   │   │ 5. Counterfactual    │   │ 6. Diagnostic Reports          │  │
│  │  - 7-feature vectors │   │  - Lead-time offsets │   │  - Post-mortem summaries       │  │
│  │  - SHAP contributions│   │  - Prevented cascades│   │  - ECSS/NASA compliance hashes │  │
│  │  - Voting predictions│   │  - Blast radius maps │   │  - Exported JSON / PDF logs    │  │
│  └──────────────────────┘   └──────────────────────┘   └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Entity Details

1. **Spacecraft & Subsystem Topology (Graph Metadata):**
   - Subsystem identifiers (`thermal_sensor`, `heater_controller`, `battery`, `battery_protection`, `power_bus`, `obc`, `comms`, `payload`).
   - Physical dependency connections, edge types (`thermal`, `control`, `power`), and strength classifications (`critical`, `strong`, `moderate`, `weak`).
   - Normal operating baselines, calibration parameters ($\mu, \sigma$), and safe threshold envelopes.

2. **Raw Telemetry Stream (High-Frequency Time-Series):**
   - Microsecond/millisecond UTC timestamps.
   - Channel identifiers (`THM_CH2_RAW`, `BATT_V`, `EPS_BUS_3V3`, `UHF_RSSI`, `CPU_LOAD`).
   - Numerical sensor measurements, engineering units (`°C`, `V`, `A`, `dBm`, `W`, `%`), and noise flags.

3. **Extracted Anomaly Events:**
   - Event UUID, parent incident ID, timestamp, and triggering component.
   - Event category (`threshold`, `state_change`, `alarm`, `carrier_loss`, `independent_anomaly`).
   - Observed value, baseline deviation ($\Delta\sigma$ / Z-score), and severity level (`WARNING`, `CRITICAL`).

4. **Causal Genealogy Graphs & Evidence Traces:**
   - Incident sessions and run identifiers.
   - Causal DAG edges mapping `source_event_id` $\rightarrow$ `target_event_id`.
   - 3-factor scoring metrics ($S_{\text{temporal}}$, $\text{PathStrength}$, $S_{\text{intermediate}}$) and composite confidence score ($0.0 - 1.0$).
   - Node classifications (`primary_root_cause`, `propagation_event`, `secondary_consequence`, `independent`).
   - Minimum causal explanation set ($E_{\text{primary}}$).
   - Human-auditable, plain-English evidence justification strings.

5. **AI Inference & SHAP Explainability Logs:**
   - Model versions (`ensemble_v4`, `enhanced_ensemble_joblib`).
   - 7-feature statistical window vectors (`feat_mean`, `feat_std`, `feat_min`, `feat_max`, `feat_range`, `feat_rate_of_change`, `feat_skewness`).
   - SHAP local attribution values per feature.
   - Model classification probabilities and ensemble consensus votes.

6. **Counterfactual "What-If" Simulations:**
   - Target intervention event ID and early detection lead time ($\Delta t$).
   - List of prevented downstream failure event IDs.
   - List of surviving unpreventable independent event IDs.
   - Subsystem blast radius mappings.

7. **Diagnostic Post-Mortem Reports:**
   - Formatted incident summaries, timeline traces, root-cause verdicts, export formats (`JSON`, `PDF`), and validation hashes.

---

## 3. Database Technology Stack

To ensure **high performance, data integrity, and scalability**, the database stack is divided into:

### 3.1 Active Database Architecture (Supabase PostgreSQL + Local SQLite Adapter)

| Layer | Technology | Cost Tier | Purpose & Justification |
|---|---|---|---|
| **Cloud PostgreSQL & Realtime Sync** | **Supabase PostgreSQL (Postgres 16+)** | Managed Cloud / Free Tier | Cloud relational store for live incident synchronization, causal DAG persistence, JSONB feature vectors, and real-time frontend subscriptions via `@supabase/supabase-js`. |
| **Instant REST API** | **Supabase PostgREST** | Built-in | Auto-generated high-throughput REST API with row-level security and `on_conflict` upsert capabilities. |
| **Embedded Offline Engine** | **SQLite 3** (`db.sqlite3` with WAL mode) | Zero Config | Embedded local ACID storage. Enables 100% offline development, testing, and zero-config automated builds without cloud credentials. |
| **Storage Adapter** | **`backend/app/core/db_adapter.py`** | In-Tree | Universal dual-write storage adapter that persists to SQLite and syncs with Supabase PostgreSQL. |

### 3.2 Enterprise / Scale-Out Aerospace Deployment (Optional Expansion)

| Layer | Technology | Version | Purpose & Justification |
|---|---|---|---|
| **Relational Core** | **PostgreSQL** | `16.x+` | Enterprise ACID relational store for missions, incidents, causal graph topologies, and user reports. Native JSONB support enables fast indexing of flexible ML feature vectors. |
| **Time-Series Extension** | **TimescaleDB** | `2.14+` | PostgreSQL extension purpose-built for telemetry streams. Automates table partitioning (hypertables), time-bucket aggregations, and 90%+ compression on historical sensor data. |
| **Graph Traversal** | **PostgreSQL Recursive CTEs / Apache AGE** | Latest | In-database recursive graph queries for fast multi-hop upstream root cause candidate discovery and downstream blast radius calculation. |
| **Streaming Cache & Ingestion Buffer** | **Redis** | `7.x+` | In-memory cache for sliding-window telemetry buffers, live pub/sub anomaly stream broadcasting, and ephemeral "what-if" counterfactual scenario results. |

---

## 4. Complete Relational & Time-Series Schema Design

```sql
-- 1. Spacecraft & Subsystems Table
CREATE TABLE spacecraft_subsystems (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    subsystem_type VARCHAR(32) NOT NULL, -- sensor, controller, power, comms, compute, payload
    nominal_min DOUBLE PRECISION,
    nominal_max DOUBLE PRECISION,
    unit VARCHAR(16),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Physical Dependency Edges (Ground Truth DAG)
CREATE TABLE dependency_edges (
    id VARCHAR(64) PRIMARY KEY,
    source_subsystem_id VARCHAR(64) REFERENCES spacecraft_subsystems(id),
    target_subsystem_id VARCHAR(64) REFERENCES spacecraft_subsystems(id),
    dependency_type VARCHAR(32) NOT NULL, -- thermal, control, power, data
    dependency_strength VARCHAR(16) NOT NULL, -- critical (1.0), strong (0.75), moderate (0.5), weak (0.25)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Incident Investigation Sessions
CREATE TABLE incidents (
    incident_id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(256),
    status VARCHAR(32) DEFAULT 'RESOLVED', -- IN_PROGRESS, RESOLVED, ARCHIVED
    duration_seconds INTEGER,
    primary_cause_event_id VARCHAR(64),
    metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. High-Frequency Raw Telemetry (TimescaleDB Hypertable)
CREATE TABLE telemetry_readings (
    timestamp TIMESTAMPTZ NOT NULL,
    incident_id VARCHAR(64) REFERENCES incidents(incident_id),
    component VARCHAR(64) NOT NULL,
    parameter VARCHAR(64) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(16),
    is_synthetic BOOLEAN DEFAULT FALSE
);
-- Convert to Timescale hypertable partitioned on timestamp
-- SELECT create_hypertable('telemetry_readings', 'timestamp');

-- 5. Extracted Anomaly Events
CREATE TABLE incident_events (
    event_id VARCHAR(64) PRIMARY KEY,
    incident_id VARCHAR(64) REFERENCES incidents(incident_id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    component VARCHAR(64) NOT NULL,
    event_type VARCHAR(32) NOT NULL, -- threshold, state_change, alarm, reboot
    observed_value DOUBLE PRECISION,
    z_score DOUBLE PRECISION,
    description TEXT,
    source VARCHAR(32) -- rolling_zscore, sentinel_filter, ai_pattern_match
);

-- 6. Scored Causal Genealogy Edges
CREATE TABLE causal_edges (
    edge_id VARCHAR(64) PRIMARY KEY,
    incident_id VARCHAR(64) REFERENCES incidents(incident_id) ON DELETE CASCADE,
    source_event_id VARCHAR(64) REFERENCES incident_events(event_id),
    target_event_id VARCHAR(64) REFERENCES incident_events(event_id),
    temporal_gap_seconds DOUBLE PRECISION NOT NULL,
    temporal_score DOUBLE PRECISION NOT NULL,
    dependency_strength_score DOUBLE PRECISION NOT NULL,
    intermediate_corroboration_score DOUBLE PRECISION NOT NULL,
    composite_confidence DOUBLE PRECISION NOT NULL,
    is_minimum_explanation BOOLEAN DEFAULT FALSE,
    evidence_justification TEXT NOT NULL
);

-- 7. AI Ensemble Inference & SHAP Explainability Logs
CREATE TABLE ai_inference_logs (
    id VARCHAR(64) PRIMARY KEY,
    incident_id VARCHAR(64) REFERENCES incidents(incident_id),
    event_id VARCHAR(64) REFERENCES incident_events(event_id),
    window_start TIMESTAMPTZ,
    window_end TIMESTAMPTZ,
    anomaly_probability DOUBLE PRECISION NOT NULL,
    is_anomaly BOOLEAN NOT NULL,
    feature_vector JSONB NOT NULL, -- {feat_mean, feat_std, feat_rate_of_change, ...}
    shap_attributions JSONB NOT NULL, -- {feat_rate_of_change: 0.60, feat_mean: 0.63, ...}
    model_version VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Counterfactual "What-If" Queries & Outcomes
CREATE TABLE counterfactual_simulations (
    query_id VARCHAR(64) PRIMARY KEY,
    incident_id VARCHAR(64) REFERENCES incidents(incident_id),
    target_event_id VARCHAR(64) REFERENCES incident_events(event_id),
    lead_time_minutes DOUBLE PRECISION NOT NULL,
    prevented_event_ids JSONB NOT NULL,
    remaining_event_ids JSONB NOT NULL,
    prevented_count INTEGER NOT NULL,
    summary_text TEXT NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Exported Diagnostic Post-Mortem Reports
CREATE TABLE diagnostic_reports (
    report_id VARCHAR(64) PRIMARY KEY,
    incident_id VARCHAR(64) REFERENCES incidents(incident_id),
    report_format VARCHAR(16) DEFAULT 'json', -- json, pdf
    summary TEXT NOT NULL,
    verdict TEXT NOT NULL,
    primary_cause_event_id VARCHAR(64),
    evidence_trace JSONB NOT NULL,
    validation_hash VARCHAR(64),
    exported_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Summary & Migration Roadmap

1. **Current State:** SQLite manages incidents, telemetry JSON arrays, and event graphs cleanly with zero external server dependencies.
2. **Production Evolution:** Upgrading to PostgreSQL + TimescaleDB provides sub-millisecond historical telemetry queries, partitioned storage for billions of telemetry points, and structured JSONB querying for AI model traceability.
