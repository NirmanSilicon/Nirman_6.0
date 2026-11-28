# CubeSat Failure Genealogy Tracer — Master Tech Stack Guide

### 📝 Changelog
- **2026-09-04 (Update 10)**: Implemented **Constrained Learned Causal Edge Scorer & Hard Structural Constraint Gating** (`learned_causal_scorer.py`, `causal_features.py`). Evolved causal scoring from the fixed 3-weight linear formula into a calibrated supervised meta-ensemble (`CalibratedClassifierCV` over LogisticRegression, RandomForest, GradientBoosting) predicting $P(\text{candidate edge is a valid causal relationship} \mid \mathbf{x})$. Extracts a 22-dimensional feature vector across temporal plausibility, path decay, intermediate corroboration, anomaly confidence, SHAP attribution, physics residual consistency, event severity, and operating context. Non-negotiable hard structural constraints ($T_{\text{cause}} < T_{\text{effect}}$, reachability in $G_{\text{craft}}$, propagation window, forbidden structural couplings) are strictly enforced *outside* the ML model. Benchmark evaluation on 45 held-out scenarios showed a **93.75% reduction in False Causal Edges** (48 down to 3) and slashed False Discovery Rate from 1.42% to 0.09%, while preserving legacy scoring as an evaluation baseline.
- **2026-09-04 (Update 9)**: Implemented **Physics-Informed Anomaly Detection Layer** (`backend/app/core/physics_anomaly/`). Augmented the ML ensemble with discrete-time forward physical predictors (`ThermalHeaterPredictor`, `PowerBusVoltagePredictor`, `SensorIntegrityPredictor`) parameterized from mission subsystem configurations. Extracted observed, predicted, residual ($r = y_{\text{obs}} - y_{\text{pred}}$), and normalized residual z-scores ($z_{\text{res}} = |r| / \sigma_{\text{expected}}$). Categorized anomalies into a 4-way classification matrix: `statistically_abnormal`, `physically_inconsistent`, `both`, `neither`. Exposes physical consistency to candidate causal edges in the Temporal Event Graph while preserving baseline statistical detection (`use_physics=False`).
- **2026-09-04 (Update 8)**: Introduced the **Temporal Event Graph (TEG)** active incident representation (`backend/app/core/mission_model/temporal_event_graph.py`). Formalized the **Two-Graph Architecture**:
  1. *Spacecraft Dependency Graph* ($G_{\text{craft}}$): Static cyber-physical topology and path decay derived from canonical subsystem templates and mission configs.
  2. *Temporal Event Graph* ($G_{\text{event}}$): Dynamic active incident representation of concrete events at specific timestamps, evaluating directed candidate edges carrying temporal distance ($\Delta t$) and plausible propagation delay windows from canonical subsystem templates.
  - Replaced time-as-external-filter with native event-to-event causality ($T_{\text{cause}} < T_{\text{effect}}$), same-component internal transitions ($S_D = 1.0$), intermediate event corroboration ($S_I$), and isolation of concurrent non-causal anomalies. Updated DRF serializers and TypeScript interfaces.
- **2026-09-04 (Update 7)**: Implemented **Canonical CubeSat Causal Template Library & Dynamic Mission Graph Generation**. Decoupled static graph assumptions across `dependency_graph.py` and `causal_engine.py`. Subsystems are now defined via 8 canonical templates (`EPS`, `Battery`, `Thermal`, `ADCS`, `OBC`, `Communications`, `Payload`, `FlightSoftware`) specifying states, measurable variables, allowed interfaces, propagation delays, failure modes, and structural rules. Mission dependency graphs are dynamically validated (missing modules, invalid references, strict DAG cycle detection, parameter bounds, duplicate IDs) and compiled on-the-fly from JSON/YAML configurations (`canonical_cubesat.json`), preserving 100% mathematical and root-cause parity across existing incident cascades while enabling arbitrary novel spacecraft topologies.
- **2026-09-04 (Update 6)**: Introduced **Mission Architecture Compatibility Boundary** (`backend/app/core/mission_model/` and `frontend/src/types/missionArchitecture.ts`). Decouples static topologies and hardcoded scoring parameters into formal domain abstractions: `MissionConfig`, `SubsystemTemplate`, `CausalModelSpec`, `EventRecord`, and `MissionCausalGraph`. The canonical CubeSat reference architecture is preserved as the default reference profile (`STANDARD_CUBESAT_13_NODE_TEMPLATE`) wrapped via `legacy_adapter.py`, ensuring 100% mathematical, functional, and API contract parity.
- **2026-09-02 (Update 5)**: Introduced **Zero-Knowledge & Multi-Party Blockchain Verification Layer (Tasks A - D)**. Added independent Node.js/TypeScript microservice at `zk_chain_service/` (Express, Circom 2.x, snarkjs Groth16, ethers.js v6, Hardhat). Circuit `causal_verdict.circom` cryptographically proves causal scoring formula $S = w_T S_{\text{temporal}} + w_D \text{PathStrength} + w_I S_{\text{intermediate}}$ without exposing private telemetry scores ($S_T, S_D, S_I$). Deployed `AuditAnchor.sol` for immutable audit log and dossier anchoring, `ParametricPolicy.sol` for smart-contract escrow payouts upon verified Groth16 proofs, and `MultiSigSignOff.sol` for 3-of-4 multi-party incident finality quorum. Connected Django backend via `zk_client.py` and updated `drift_monitor.py` with `--check-onchain`.
- **2026-09-02 (Update 4)**: Introduced **Sovereign Air-Gapped Deployment Architecture** (`DEPLOYMENT_MODE=SOVEREIGN` fail-safe default, asserted at boot). Sanitized all exposed Supabase secret keys to `<YOUR_SUPABASE_...>` placeholders. Bundled 100% self-hosted typography (`Roboto Mono`, `Oswald` WOFF2 files in `frontend/src/assets/fonts/` via `@font-face`) and local Three.js Draco/Basis WASM decoders in `frontend/public/` with zero CDN links. Added standalone zero-dependency `egress_check.py` testing the 5 audited outbound hostnames, and created native one-click air-gapped launchers (`start_sovereign.bat`, `start_sovereign.sh`). Gated cloud PostgREST synchronization behind `DEPLOYMENT_MODE == "CLOUD"`.
- **2026-09-02 (Update 3)**: Integrated **Learned StackingClassifier Architecture (v3.1)** and empirical **Causal Weight Collinearity Diagnostics (Tasks A & B)**. Meta-learner achieves **97.32% Accuracy / 0.9774 F1** (+0.0096 Acc, +0.0087 F1 over Soft Voting baseline, cutting false negatives in half: 276 down to 137). Stacking artifact saved to `ensemble_model_stacking.joblib` alongside canonical artifact, quarantined under Drift Governance Gate (PSI = 3.4851, held for review / not auto-promoted). Diagnosed causal temporal weight via VIF ($S_T=1.01$ clean, $S_D=7.08, S_I=7.10$ collinear, $r=0.9266$); tuned Elastic Net ($l_1\text{-ratio}=0.9, C=0.1$); extracted SHAP attributions on causal decision layer; consensus weights updated to $w_T=0.0475, w_D=0.6320, w_I=0.3205$. Confirmed runtime 3-term linear formula and hard temporal filter remain preserved.
- **2026-09-02 (Update 2)**: Added **Production Drift Governance Gate** (`ai_model/drift_monitor.py`, `ai_model/drift_reference_set.py` / `.csv`, `pending_review/`, `model_governance_audit.jsonl`). Integrated Population Stability Index (PSI) verification into `retrain_all.py`, added `POST /api/feedback/approve-model/`, and added `backend/tests/test_drift_governance.py`.
- **2026-09-02 (Update 1)**: Integrated **Real Incident Replay Mode** with ground-truth mission definitions in `simulation/real_incidents/` (`capstone_2022.json`, `dellingr_2017.json`) and `simulation/real_incident_loader.py`. Extended spacecraft architecture (adding `flight_software` with bidirectional control/software edges). Added formal `timing_confidence` field in data contracts.

---

**Purpose of this file:** Single source of truth for the tech stack, architecture, data contracts, and coding conventions across the project. Paste this file into any AI coding assistant before asking it to generate code to guarantee 100% interoperability across backend, AI model, and frontend.

---

## 1. Project Summary

We are building **AXYRA** — an autonomous flight-operations system that:

1. **INPUTS**: Ingests multi-channel telemetry streams (calibrated against real European Space Agency OPS-SAT data and documented historical NASA incident replays) and models spacecraft physics using dynamic mission dependency graphs generated from canonical subsystem templates and JSON/YAML mission configurations (with the canonical CubeSat reference profile).

2. **AI (INTELLIGENCE CORE)**: Classifies anomalies using a Heterogeneous Ensemble (`RandomForest`, `GradientBoosting`, `ExtraTrees` with Soft Voting baseline or learned `StackingClassifier`) fused with discrete-time physics predictors (battery thermal, bus voltage, sensor integrity), SHAP explainability, and scores causal failure chains using a **Constrained Learned Causal Edge Scorer** (`CalibratedClassifierCV` meta-ensemble over 22 causal features) with non-bypassable hard structural constraints ($T_{\text{cause}} < T_{\text{effect}}$, reachability in $G_{\text{craft}}$, propagation window, forbidden structural couplings) enforced outside the ML model (preserving the legacy 3-weight linear formula as a baseline compatibility mode).
3. **PROVENANCE & AUDIT**: Generates local SHA-256 cryptographic audit logs and tamper-evident hash chaining by default (100% offline, Sovereign Air-Gapped mode). Supports an optional auxiliary ZK/blockchain extension (`zk_chain_service/`) for Groth16 causal verdict proofs, on-chain integrity anchoring (`AuditAnchor.sol`), parametric claims (`ParametricPolicy.sol`), and multi-party sign-off (`MultiSigSignOff.sol`).
4. **OUTPUT**: Renders an interactive Causal Genealogy DAG with stepped temporal playback, streamlined Verified Causal Links, a Structural Counterfactual "What-If" simulator, and a master flight-ready ECSS/NASA incident dossier.

---

## 2. Fixed Tech Stack

| Layer | Technology | Version | Purpose & Rationale |
|---|---|---|---|
| **Frontend Framework** | React + TypeScript | React 19.x, TS 5.x | Function components + hooks only. Stateful 5-page mission console. |
| **Build Tool** | Vite | 6.x | Fast HMR, TypeScript bundling. |
| **Graph Visualization** | React Flow (`reactflow`) | 11.x | For the Causal Genealogy DAG and node-link cascades. |
| **Charts & Oscillographs**| Recharts | 3.x | Telemetry oscillographs, timeline scatter plots, and SHAP bar charts. |
| **3D WebGL** | Three.js + React Three Fiber | 0.185+ / 9.x | Photorealistic 3D CubeSat hardware viewer. |
| **Styling** | Tailwind CSS | 4.x | Dark aerospace mission control styling (`#05070A` Void, `#0D1117` Panel). |
| **Backend Framework** | Python + Django REST Framework | Python 3.11+, DRF 3.15+ | High-speed REST endpoints for analysis, graph queries, and reports. |
| **ZK & Blockchain Service** | Node.js + Express + TypeScript | Node 20+, TS 5.x | Dedicated microservice at `zk_chain_service/` (:3001). |
| **Zero-Knowledge Circuit** | Circom + circomlib | 2.2+ / 2.0+ | Groth16 R1CS circuit & Poseidon commitment hash. |
| **ZK Prover & Verifier** | snarkjs | 0.7+ | Powers-of-Tau ceremony, witness generation, and Groth16 proving. |
| **Blockchain Smart Contracts** | Solidity + Hardhat + Ethers.js | Sol 0.8.20 / Ethers v6 | Smart contracts: `AuditAnchor`, `ParametricPolicy`, `MultiSigSignOff`. |
| **Target Networks** | Local Hardhat / Polygon Amoy | 31337 / 80002 | Deterministic local dev node; one-line switch to Polygon Amoy testnet. |
| **Graph / DAG Logic** | NetworkX | 3.x | Causal reasoning graph structure and multi-hop reachability analysis. |
| **Machine Learning & Physics** | scikit-learn + joblib + NumPy | 1.6+ / 1.4+ / 1.26+ | Multi-Model Telemetry Ensemble, discrete-time physics predictors, Constrained Learned Causal Scorer (`CalibratedClassifierCV`), and SHAP explainability. |
| **Data Wrangling** | pandas + NumPy | 2.x / 1.26+ | Rolling Z-score anomaly math, residuals ($y_{\text{obs}} - y_{\text{pred}}$), and noise generation. |
| **Data Validation** | Pydantic | v2 | Request/response models and schema serialization. |
| **Local Data Store** | SQLite3 via stdlib / JSON | — | Local-first incident and weights persistence (WAL mode). |
| **Deployment Modes** | `DEPLOYMENT_MODE` | `SOVEREIGN` (def) / `CLOUD` | Dual-mode environment gate with fail-safe boot assertion. |
| **Egress Isolation** | `egress_check.py` | Python stdlib (socket) | Pre-flight DNS isolation check testing all 5 audited hostnames. |
| **Native Launchers** | `.bat` / `.sh` | Windows & Unix | One-click native bare-metal launchers with zero Docker requirement. |

---

## 3. Master 3-Pillar System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              1. INPUTS                                                 │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  • Raw Flight Telemetry Streams (calibrated with real ESA OPS-SAT noise & sampling cadences)           │
│  • Spliced Independent Cyber Telemetry (NASA NOS3 / CuCD-ID Space-Packet Anomaly)                      │
│  • Real Incident Replay Archive (NASA CAPSTONE 2022 & Dellingr 2017 Ground-Truth Datasets)            │
│  • Spacecraft Dependency Graph (G_craft: Canonical Templates + JSON/YAML Mission Config)               │
│  • Temporal Event Graph (G_event: Concrete Event Nodes, Delays & Propagation Windows)                  │
│  • Mission Lab Workbench (Configurable Cascade Injection & CSV/JSON Data Importer)                      │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       2. AI (INTELLIGENCE CORE)                                        │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  A. SIGNAL INTERPRETATION & HYBRID ANOMALY RECOGNITION (Caelis AI Engine)                              │
│     - Multi-Model Ensemble (Random Forest + Gradient Boosting + Extra Trees + Soft Voting)             │
│     - Discrete-Time Physics Predictors (Thermal/Heater, Power Bus, Sensor Integrity)                   │
│     - Residual Metrics: Observed vs Predicted, Residual (y_obs - y_pred), Z-Residual                   │
│     - 4-Way Anomaly Matrix: statistically_abnormal, physically_inconsistent, both, neither             │
│     - SHAP Local Feature Attributions (feat_rate_of_change, feat_mean, feat_skewness, feat_std)        │
│     - Drift Governance Gate: Population Stability Index (PSI) on fixed benchmark reference set         │
│                                                   │                                                    │
│  B. CONSTRAINED LEARNED CAUSAL EDGE SCORER (Temporal Event Graph)                                      │
│     - Non-Bypassable Hard Constraints Outside ML: Arrow of Time, Reachability, Window, Couplings       │
│     - 22-Dimensional Feature Vector: Temporal, Path Decay, Intermediates, SHAP, Physics Residuals, etc│
│     - Calibrated Supervised Meta-Ensemble: CalibratedClassifierCV (LR + RF + GB, Brier = 0.0007)       │
│     - Slashes False Causal Edges by 93.75% (48 -> 3 on 45 test scenarios; FDR: 1.42% -> 0.09%)        │
│     - Markov Parsimony: Direct physical parents prioritized over multi-hop ancestor bypasses           │
│     - Legacy Baseline Mode: 3-Weight Linear Formula (w_T=0.0475, w_D=0.6320, w_I=0.3205) preserved     │
│     - Minimum Causal Explanation: Isolates Root Trigger vs. Propagation vs. Independent Cyber Noise   │
│     - Structural Counterfactual Simulator: Forward state simulation do(X_t=x*) (reachability baseline) │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              3. OUTPUT                                                 │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  • CAUSAL RECONSTRUCTION                                                                               │
│    ├─ Interactive Causal Genealogy DAG (Root Glow, Node Confidence, Stepped Temporal Playback)         │
│    ├─ Verified Causal Links (Click for Interaction Evidence: delays, coupling physics proofs)          │
│    └─ Structural Counterfactual "What-If" Simulator (Intervention offset & cascade rescue simulation)  │
│  • INCIDENT REPORT (Master Flight Dossier)                                                             │
│    ├─ Complete arranged synthesis: Caelis AI results + Causal DAG + Verified Links + What-If + Sign-off│
│    ├─ Uncertainty & Competing Hypotheses (Ambiguity margins, alternative roots, OOD rejection)        │
│    └─ Local Cryptographic Audit (SHA-256 hash chaining; optional ZK / blockchain provenance)           │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

> ### 🛡️ 3-Tier Cryptographic Verification & Provenance Model
> - **Tier 1 — Normal Operation (Local Cryptographic Audit & Signatures):** Every incident receives a local SHA-256 integrity hash and tamper-evident audit log entry upon detection and resolution. Operates 100% offline with zero network egress in Sovereign Air-Gapped mode.
> - **Tier 2 — Advanced Verification (Optional Zero-Knowledge Proofs):** Proves compact claims (causal verdict validity under calibrated weights, policy threshold satisfaction, model configuration integrity) via Groth16 zk-SNARKs without revealing proprietary telemetry or embedding the entire graph/model.
> - **Tier 3 — External Provenance (Optional Multi-Party & Chain Anchoring):** Optional on-chain notary (`AuditAnchor.sol`), parametric insurance claims (`ParametricPolicy.sol`), and 3-of-4 multi-party threshold sign-off (`MultiSigSignOff.sol`) operating outside the core investigation loop.

---

## 4. Repository Structure

```
Axyra_SpaceTech/
├── ai_model/
│   ├── build_telemetry_ensemble.py # Stage 1: Main ensemble training & validation pipeline
│   ├── enhance_ensemble.py         # Stage 2: Hyperopt, isotonic calibration & SHAP computation
│   ├── drift_monitor.py            # Stage 2 Gate: PSI calculation, drift classification & audit log
│   ├── drift_reference_set.py      # Generator/loader for immutable benchmark reference set
│   ├── drift_reference_set.csv     # Frozen 2,000-row benchmark dataset (never regenerated)
│   ├── active_learning.py          # Active learning feedback collector & fine-tuning
│   ├── pending_review/             # Quarantined candidate models & drift reports awaiting approval
│   ├── model_governance_audit.jsonl# Cryptographically hash-chained audit trail
│   ├── retrain_all.py              # Unified 5-stage retraining orchestrator with drift gate
│   ├── scenario_factory.py         # Generates N=250 ground-truth labeled scenarios
│   ├── train_causal_weights.py     # Multi-model ensemble training & calibration
│   ├── run_pipeline.py             # Automated one-click execution pipeline
│   ├── weights.json                # Learned consensus weights & validation metrics
│   └── ensemble_model.joblib       # Serialized trained Multi-Model Ensemble
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── schemas.py          # Pydantic schema definitions (Event, CausalEdge, etc.)
│   │   │   ├── serializers.py      # DRF serializers (includes ApproveModelSerializer)
│   │   │   ├── urls.py             # REST API route declarations (includes /api/feedback/approve-model/)
│   │   │   └── views.py            # Incident, analyze, counterfactual & feedback governance endpoints
│   │   ├── core/
│   │   │   ├── physics_anomaly/    # Physics-Informed Anomaly Predictors & Hybrid Detector
│   │   │   │   ├── predictors.py      # ThermalHeater, PowerBusVoltage & SensorIntegrity predictors
│   │   │   │   └── hybrid_detector.py # HybridAnomalyDetector (4-way matrix & causal coupling)
│   │   │   ├── mission_model/      # Architecture Boundary: MissionConfig, SubsystemTemplate, CausalModelSpec
│   │   │   │   ├── canonical_templates/# 8 Subsystem Templates (EPS, Thermal, Battery, etc.)
│   │   │   │   ├── temporal_event_graph.py # Temporal Event Graph (TEG) Active Incident Model
│   │   │   │   ├── mission_schema.py  # JSON/YAML Mission Config Schema & Validator
│   │   │   │   ├── graph_generator.py # Dynamic Dependency Graph Generator
│   │   │   │   ├── mission_config.py  # Mission parameters, environment noise & sampling rules
│   │   │   │   ├── subsystem_template.py # Spacecraft profiles & STANDARD_CUBESAT_13_NODE_TEMPLATE
│   │   │   │   ├── causal_model.py    # CausalModelSpec, consensus weights & hop bounds
│   │   │   │   ├── event_model.py     # Universal EventRecord abstraction
│   │   │   │   ├── mission_graph.py   # Compiled MissionCausalGraph & counterfactuals
│   │   │   │   └── legacy_adapter.py  # Zero-regression bridge to legacy build_dependency_graph
│   │   │   ├── dependency_graph.py # Subsystem Dependency Graph Adapter (delegates to dynamic graph generator)
│   │   │   ├── event_extraction.py # Stage 2: Hybrid Statistical + Physics Event Extraction
│   │   │   └── causal_engine.py    # Stage 3 & 4: TEG Candidate Evaluation & Root Classification
│   │   └── simulate/
│   │       ├── log_generator.py    # Stage 1a: Calibrated baseline telemetry stream
│   │       └── fault_injector.py   # Stage 1b: Canonical cascade, CuCD injection & real incidents
│   ├── config/                     # Django project configuration & settings
│   ├── tests/
│   │   ├── test_simulation.py             # Telemetry generator, fault injector & real incidents
│   │   ├── test_drift_governance.py       # PSI math, drift gates, audit hash chain, approval API
│   │   ├── test_mission_model.py          # Mission architecture boundary & parity verification
│   │   ├── test_mission_graph_generation.py # Dynamic graph generation, templates & cycle validation
│   │   ├── test_temporal_event_graph.py   # TEG arrow of time, delays, and dynamic causality
│   │   ├── test_physics_anomaly.py        # Discrete-time physics predictors & hybrid anomaly detection
│   │   ├── test_learned_causal_scorer.py  # 22-feature causal scoring, hard constraint gating
│   │   ├── test_structural_counterfactual.py # Forward state simulation vs reachability baseline
│   │   ├── test_uncertainty_reasoning.py  # Ambiguity margins, competing hypotheses, OOD rejection
│   │   ├── test_all_endpoints.py          # REST API endpoints & serializer validation
│   │   └── test_zk_chain.py               # ZK proof generation, verification & smart contracts
│   ├── manage.py                   # Django CLI management entrypoint
│   └── requirements.txt            # Backend dependencies
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home/               # 1. HOME PAGE: Tactical Overview & 3D CubeSat
│   │   │   ├── MissionLab/         # 2. MISSION LAB: Telemetry Generator, Fault Injector & Real Incidents
│   │   │   ├── Reconstruction/     # 3. CAUSAL RECONSTRUCTION: DAG + Links + What-If
│   │   │   ├── Caelis/             # 4. SIGNAL INTERPRETATION: Caelis AI & SHAP
│   │   │   └── IncidentReport/     # 5. INCIDENT REPORT: Complete Master Dossier
│   │   ├── components/             # Reusable UI primitives, badges, and 3D viewers
│   │   ├── services/               # Centralized API communication layer (caelisClient.ts, feedbackApi.ts)
│   │   ├── types/                  # TypeScript interfaces mirroring backend schemas (missionArchitecture.ts)
│   │   ├── styles/                 # Tailwind CSS tokens & dark mission control styling
│   │   ├── App.tsx                 # Root layout & active page navigator
│   │   └── main.tsx                # Vite mount root
│   ├── package.json
│   └── vite.config.ts
│
├── simulation/
│   ├── real_incidents/             # Documented historical NASA flight incident definitions
│   │   ├── capstone_2022.json      # NASA CAPSTONE (2022) telecommand & watchdog failure
│   │   └── dellingr_2017.json      # NASA Dellingr (2017) UHF lockup & 24-hr power reset
│   ├── real_incident_loader.py     # Pydantic loader & replay telemetry generator
│   ├── OPSSAT-AD/                  # Real ESA OPS-SAT telemetry flight dataset
│   ├── CubeSat cybersecurity dataset/# Real CuCD-ID space packet captures
│   ├── calibrate_from_opssat.py    # Extracts noise & sampling distributions
│   ├── extract_from_cucd.py        # Extracts independent cyber telemetry anomaly
│   ├── calibration.json            # Extracted Gaussian parameters
│   └── weights.json                # Synced calibrated weights
│
├── DOCUMENTATION_AI_MODEL.MD       # Deep technical AI Ensemble documentation
├── DOCUMENTATION_SIMULATION.MD     # Deep technical simulation documentation
├── frontend_parts.md               # Master frontend build spec & component blueprint
├── tech_stack.md                   # Engineering stack rules & conventions
├── workflow.md                     # Master pipeline specification (INPUTS -> AI -> OUTPUT)
└── README.md                       # Project overview & architectural guide
```


---

## 5. Master Data Contracts (Backend Pydantic & Frontend TypeScript)

### 5.1 Event Schema (Hybrid Statistical + Physics-Informed)
```python
class Event(BaseModel):
    id: str
    timestamp: datetime
    component: str          # matches node ID in dependency graph
    event_type: Literal["threshold", "state_change", "alarm", "reboot"]
    value: float | None
    description: str
    parameter: str | None = None
    severity: Literal["info", "warning", "critical"] = "warning"
    confidence: float = 0.85
    timing_confidence: Literal["documented", "estimated"] = "documented"
    predicted_value: float | None = None
    residual: float | None = None
    normalized_residual: float | None = None
    anomaly_classification: Literal[
        "statistically_abnormal",
        "physically_inconsistent",
        "both",
        "neither"
    ] = "neither"
    is_statistical_anomaly: bool = False
    is_physical_anomaly: bool = False
    physics_evidence: dict | None = None
```

### 5.2 Causal DAG Response
```python
class CausalNode(BaseModel):
    event_id: str
    component: str
    role: Literal["primary", "propagation", "secondary", "independent", "unknown"]
    confidence: float          # 0.0–1.0
    confidence_label: Literal["high", "moderate", "low", "insufficient_evidence"]
    upstream_edge_ids: list[str]

class CausalEdge(BaseModel):
    id: str
    source_event_id: str
    target_event_id: str
    dependency_type: Literal["power", "thermal", "control", "data"]
    dependency_strength: Literal["critical", "strong", "moderate", "weak"]
    temporal_gap_seconds: float
    evidence: str               # human-readable verified link interaction proof

class GenealogyResponse(BaseModel):
    incident_id: str
    nodes: list[CausalNode]
    edges: list[CausalEdge]
    primary_cause_event_id: str
    minimum_explanation_event_ids: list[str]
```

### 5.3 Counterfactual What-If Request / Response
```python
class CounterfactualRequest(BaseModel):
    incident_id: str
    target_event_id: str        # the failure being mitigated
    intervention_minutes_earlier: float

class CounterfactualResponse(BaseModel):
    prevented_event_ids: list[str]
    remaining_event_ids: list[str]
    summary: str                 # "5 of 6 downstream failure events prevented"
```

### 5.4 Master Incident Report Dossier
```python
class MasterIncidentDossier(BaseModel):
    incident_id: str
    mission_time: str
    status: Literal["INVESTIGATING", "ROOT_CAUSE_ISOLATED", "RESOLVED"]
    primary_root_cause: str
    caelis_ai: dict             # AI diagnosis, model confidence, and SHAP vectors
    genealogy_nodes: list[CausalNode]
    genealogy_edges: list[CausalEdge]
    what_if_analysis: CounterfactualResponse
    telemetry_proofs: list[dict]
    recommendations: list[str]
    sha256_signature: str
```

### 5.5 Next Best Evidence (NBE) & Canonical Analysis Contract
```python
class ExpectedObservationOutcome(BaseModel):
    outcome: str
    favors_hypothesis_id: str
    favors_component: str
    expected_confidence: float
    description: str

class NextBestEvidence(BaseModel):
    recommended_observation: str
    target_signal: str
    target_component: str
    rationale: str
    hypothesis_ids: list[str]
    expected_outcomes: list[ExpectedObservationOutcome]
    expected_information_gain: float  # Shannon information gain in bits
    telemetry_cost: Literal["LOW", "MEDIUM", "HIGH"]
    priority: str = "HIGH"

class CanonicalAnalysisResponse(BaseModel):
    incident_id: str
    mission_id: str
    status: Literal["ANALYZED", "NO_EVIDENCE", "FAILED", "OUT_OF_DISTRIBUTION", "PARTIAL"]
    created_at: str
    summary: str
    telemetry_window: dict
    detected_events: list[dict]
    hypotheses: list[dict]
    causal_graph: dict  # {"nodes": [...], "edges": [...]}
    cascade: dict
    physics: dict
    next_best_evidence: NextBestEvidence
    counterfactual_simulation: dict | None
    warnings: list[str]
    provenance: dict  # {"scorer_type": "learned", "sovereign_mode": True, "sha256": "..."}
```

**Convention:** every ID is a string (not an int) to keep frontend/backend serialization trivial. Timestamps are ISO 8601 strings over the wire, `datetime` objects only inside Python.

---

## 6. End-to-End Pipeline Architecture & Module Responsibilities

The system executes a strictly sequential, validated 12-stage active pipeline:

| Stage | Name | Key Modules | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Mission Configuration** | `mission_schema.py`, `mission_config.py` | `canonical_cubesat.json` / custom mission JSON | Validated `MissionConfig` object |
| **2** | **Causal Module Library** | `canonical_templates/*.py`, `module_spec.py` | Mission subsystem requirements | 8 canonical subsystem specs with physical bounds & delays |
| **3** | **Generated Mission Model** | `graph_generator.py`, `dependency_graph.py` | `MissionConfig` + canonical templates | NetworkX $G_{\text{craft}}$ directed dependency graph |
| **4** | **Telemetry / Event Extraction** | `log_generator.py`, `fault_injector.py`, `event_extraction.py` | Telemetry logs (CSV / stream) | Structured `Event` objects with `parameter`, `severity`, `confidence` |
| **5** | **Hybrid Statistical + Physics Anomaly Detection** | `physics_anomaly/hybrid_detector.py`, `predictors.py` | Telemetry stream + physics models | Residuals, z-scores, 4-way classification matrix |
| **6** | **Temporal Event Graph (TEG)** | `temporal_event_graph.py` | `Event` list + $G_{\text{craft}}$ | $G_{\text{event}}$ active incident graph with arrow-of-time filtering |
| **7** | **Constrained Causal Scoring** | `learned_causal_scorer.py`, `causal_features.py` | Candidate event pairs in $G_{\text{event}}$ | 22-feature vector, calibrated causal probabilities |
| **8** | **Failure Genealogy** | `temporal_event_graph.py`, `causal_engine.py` | Evaluated causal transitions | Root trigger, propagation roles, minimum explanation set |
| **9** | **Structural Counterfactual Simulation** | `structural_simulator.py` | Target event, intervention offset | Forward state simulation $do(X_t=x^*)$, prevented/shifted events |
| **10** | **Uncertainty & Alternative Hypotheses** | `temporal_event_graph.py`, `infer_telemetry.py` | Genealogy graph, score deltas | 4-tier confidence, ambiguity margin ($\Delta < 0.12$), competing roots |
| **11** | **Next Best Evidence (NBE) Engine** | `evidence_selection.py` | Ambiguity, entropy deltas | Targeted commands, Shannon $IG$, cost/bandwidth trade-offs |
| **12** | **Engineer Investigation Output & Replay Simulator** | `orchestrator.py`, `SpacecraftReplaySimulator.tsx`, `views.py` | Complete canonical state | Scrubbable chronological replay, master dossier, local SHA-256 |



---

## 7. Causal Reasoning Core — Implementation Rules

1. **Dynamic Mission Graph Generation:** The mission dependency graph ($G_{\text{craft}}$) is dynamically validated and compiled from 8 canonical CubeSat subsystem templates (`EPS`, `Battery`, `Thermal`, `ADCS`, `OBC`, `Communications`, `Payload`, `FlightSoftware`) and mission configuration schemas (JSON/YAML) into an annotated `networkx.DiGraph`.
2. **Constrained Learned Causal Edge Scorer (Production Mode):** Causal candidates in the Temporal Event Graph ($G_{\text{event}}$) are scored using a calibrated supervised meta-ensemble (`CalibratedClassifierCV` over LogisticRegression, RandomForest, GradientBoosting) extracting a 22-dimensional feature vector across temporal, topological path decay, intermediate corroboration, anomaly confidence, SHAP attribution, physics residual consistency, event severity, and operating context.
3. **Hard Structural Constraints (Strictly Outside the ML Model):**
   - **Strict Arrow of Time:** $T_{\text{cause}} < T_{\text{effect}}$. An event at $t=305\text{s}$ can never cause an event at $t \le 305\text{s}$.
   - **Subsystem Reachability:** Cause and effect must either be on the same component or connected via a directed path in $G_{\text{craft}}$.
   - **Propagation Delay Window:** $\Delta t = t_j - t_i$ must not violate canonical subsystem delay bounds.
   - **Forbidden Structural Relationships:** Cross-subsystem connections violating physical isolation rules are rejected immediately with $P = 0.0$.
4. **Markov Causal Parsimony:** Immediate physical parents ($\text{hops}=1$) receive precedence over multi-hop ancestor bypasses unless the indirect ancestor exceeds the direct cause by $>0.10$ confidence, preserving physical intermediate propagation roles.
5. **Legacy Baseline Compatibility Mode:** The historical 3-weight linear scoring formula:
   $$\text{Confidence} = w_T \cdot S_{\text{temporal}} + w_D \cdot S_{\text{dependency}} + w_I \cdot S_{\text{intermediate}}$$
   ($w_T=0.0475, w_D=0.6320, w_I=0.3205$) is fully preserved via `LegacyCausalScorer` (`scorer_type="legacy"`) for direct comparative benchmarking and regression testing.
6. **Minimum Causal Explanation Set Reduction:** Uses greedy set cover:
   - Pick the highest-confidence unexplained root trigger.
   - Mark all downstream failure events reachable through verified causal edges as explained.
   - Repeat until all events are explained or isolated as independent anomalies / noise.
7. **Every Score Must Carry a Plain-English Evidence String:** Every edge carries a synthesized explainable evidence sentence documenting temporal delay, propagation window compliance, and coupling physics proofs.

---

### Active Learning & Model Retraining

#### 1. Real-Time Active Learning Feedback Flywheel (`ai_model/active_learning.py`)
- Operators confirm or override causal determinations directly in the UI.
- Verdicts are persisted to `engineer_feedback` in SQLite/Supabase.
- Incremental retraining (`POST /api/feedback/trigger-retrain/`) applies warm-start partial fits on base estimators with human records weighted **$3.0\times$** higher than synthetic samples.

#### 2. Full Retraining Orchestrator (`ai_model/retrain_all.py`)
```powershell
# From project root, with venv active:
python ai_model/retrain_all.py
```

Runs all 5 stages in order:
0. `Stage 0`: Human Feedback Pre-Merge (`ai_model/active_learning.py` → `human_feedback_pool.csv`)
1. `Stage 1`: `build_telemetry_ensemble.py` → `ensemble_model.joblib` (RF+GB+ET+LR with per-dataset Z-norm)
2. `Stage 2`: `enhance_ensemble.py` → `enhanced_ensemble.joblib` (hyperopt + isotonic calibration + SHAP)
3. `Stage 3`: `scenario_factory.py` + `train_causal_weights.py` → `weights.json` (causal engine weights)
4. `Stage 4`: Auto-sync all artefacts to `backend/` and `simulation/`

To verify:
```powershell
python ai_model/infer_telemetry.py --demo
python ai_model/test_and_verify_model.py
```

---

## 9. Coding Conventions

- **Python (Backend & AI):**
  - Strict type hints on all functions and Pydantic models.
  - Causal core functions in `causal_engine.py` and `dependency_graph.py` must stay pure Python (using NetworkX/pandas/NumPy) to ensure fast, deterministic unit testability.
- **TypeScript (Frontend):**
  - Function components and custom hooks only.
  - Shared types in `src/types/` must mirror backend Pydantic schemas.
  - Zero inline `fetch` calls — all requests route through `src/services/` or `src/api/client.ts`.
- **Styling:**
  - Standardized CSS custom properties in `src/index.css` mapped to Tailwind CSS tokens.