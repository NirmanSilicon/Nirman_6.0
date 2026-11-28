<div align="center">

# 🛰️ AXYRA — CubeSat Failure Genealogy Tracer
### `A spacecraft does not always fail at the moment the alarm appears.`

**Trace the cascade. Reason through ambiguity. Empirically calibrate the causal weights. Simulate the intervention.**

<br>

[![SOA Ideathon 2026](https://img.shields.io/badge/🚀%20SOA%20Ideathon-2026-00E5FF?style=for-the-badge&labelColor=0A0D14)](#)
[![Space Technology](https://img.shields.io/badge/🛰️%20Space%20Tech-Open%20Innovation-7928CA?style=for-the-badge&labelColor=0A0D14)](#)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white&labelColor=0A0D14)](#)
[![React](https://img.shields.io/badge/React-19%20TS-61DAFB?style=for-the-badge&logo=react&logoColor=black&labelColor=0A0D14)](#)
[![Django REST](https://img.shields.io/badge/Django%20REST-Backend-092E20?style=for-the-badge&logo=django&logoColor=white&labelColor=0A0D14)](#)
[![Circom](https://img.shields.io/badge/Circom-Groth16%20zk--SNARK-orange?style=for-the-badge&logo=codeforces&logoColor=white&labelColor=0A0D14)](#)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity&logoColor=white&labelColor=0A0D14)](#)
[![Polygon](https://img.shields.io/badge/Polygon-Amoy%20Testnet-8247E5?style=for-the-badge&logo=polygon&logoColor=white&labelColor=0A0D14)](#)

<br>

```text
📥 INPUTS  ──►  🤖 AI (INTELLIGENCE CORE)  ──►  📤 OUTPUT (Genealogy, Verified Links & Dossier)
                         └─► 🔒 Cryptographic Provenance (Local Audit / Optional ZK & Chain)
```

</div>

---

### 📝 Changelog
- **2026-09-05 (Update 14)**: Completed **Canonical End-to-End Integration & Spacecraft Replay Simulator**.
  - Unified the entire investigation pipeline through `AnalysisOrchestrator` (`backend/app/core/orchestrator.py`), executing sequential telemetry ingestion, dynamic mission graph compilation, hybrid physics/stats anomaly detection, TEG with Arrow-of-Time and reachability constraints, 22-feature learned causal scoring, failure genealogy, structural counterfactual simulation, and local SHA-256 integrity signing.
  - Implemented `EvidenceSelectionEngine` (`backend/app/core/evidence_selection.py`) computing optimal Next Best Evidence (NBE) observation commands to maximize Shannon information gain ($IG$) and actively discriminate competing hypotheses.
  - Built `SpacecraftReplaySimulator` (`frontend/src/components/simulation/SpacecraftReplaySimulator.tsx`) delivering an aerospace engineering operations aesthetic with scrubbable chronological timeline, MET ($T+\text{mm:ss}$) / UTC timekeeping, Subsystem State Matrix (EPS, Battery, TCS, OBC, Comms, ADCS, Payload), animated edge illumination upon causal arrival, and dual-mode comparison (Observed Cascade vs. Counterfactual Mitigated Branch).
  - Established unified `AnalysisContext` in frontend as single source of truth across Mission Lab, Causal Reconstruction, Caelis AI, Evidence Trace, and Incident Report workspaces with explicit offline Sovereign Mode handling and zero fake success fallbacks.
- **2026-09-04 (Update 13)**: Refactored the **Cryptographic Verification & Provenance Layer** into an auxiliary extension decoupled from the core causal genealogy pipeline. Established the 3-tier verification architecture: Tier 1 (Normal Operation) relies entirely on local cryptographic SHA-256 integrity signing and hash-chained audit logging, ensuring 100% offline functionality in Sovereign Air-Gapped mode with zero external RPC or blockchain dependencies. Tier 2 (Advanced Verification) provides optional on-demand Groth16 Zero-Knowledge proofs for compact claims (verdict confirmed, policy threshold satisfied, model parameters bound to a Poseidon commitment) without exposing private telemetry or putting the entire graph in the circuit. Tier 3 (External Provenance) moves on-chain anchoring (`AuditAnchor.sol`), parametric insurance claims (`ParametricPolicy.sol`), and 3-of-4 multi-party threshold sign-off (`MultiSigSignOff.sol`) completely outside the main flight investigation loop, removing hard gates from operational incident resolution.
- **2026-09-04 (Update 12)**: Implemented **Uncertainty Reasoning & Out-of-Distribution (OOD) Layer** across anomaly detection, causal edges, root-cause ranking, and counterfactual simulation (`infer_telemetry.py`, `temporal_event_graph.py`, `structural_simulator.py`, `schemas.py`, `serializers.py`, `EvidenceTracePage.tsx`).
  - Standardized unified 4-tier confidence taxonomy across all system layers: `HIGH CONFIDENCE`, `MODERATE CONFIDENCE`, `LOW CONFIDENCE`, and `INSUFFICIENT EVIDENCE`.
  - Replaced forced single root-cause attribution: when candidate explanations remain too close (margin $\Delta < 0.12$), the system sets `is_ambiguous_root = True`, downgrades the incident tier, and explicitly surfaces `competing_hypotheses` with per-candidate confidence, downstream event count, and operational rationale.
  - Added an open-set out-of-distribution rejection layer in Caelis AI: evaluates ensemble estimator disagreement ($\sigma_{\text{estimators}} > 0.28$) and statistical conformal envelope z-score departure ($z_{\text{max}} > 6.5, z_{\text{mean}} > 3.8$). Incident windows meeting these criteria are flagged as `UNKNOWN / OUT-OF-DISTRIBUTION` (`pattern_status`) rather than forced into a known failure class.
  - Formalized explicit missing evidence reporting on multi-hop causal paths (`missing_evidence`), uncertain edge flagging (`uncertain_edges`), and non-propagating independent anomaly isolation (`independent_events`).
  - Updated EvidenceTrace UI with interactive competing hypotheses cards, telemetry gap alerts, pattern status badges, and 4-tier confidence ratings.
- **2026-09-04 (Update 11)**: Implemented **Structural Counterfactual Simulation Engine** (`structural_simulator.py`). Upgraded the counterfactual engine from topological graph reachability (`nx.descendants`) to module-level structural forward simulation across canonical causal module definitions. Major modules expose deterministic state-evolution equations ($\dot{s}_i = f(s_i, u_i)$), input couplings, failure transition triggers, and recovery/protection rules. Operators can inject Pearl-style interventions $do(X_t=x^*)$ (e.g., "Clamp thermal sensor at T+290s", "Prevent BMS protection at T+440s", or slider-based root-cause prevention). The engine simulates downstream subsystem states forward in discrete time ($\Delta t = 1.0\text{s}$), evaluates thresholds, and compares simulated trajectories against the observed incident trajectory. Categorizes all downstream anomalies into `PREVENTED`, `REMAINING`, and `SHIFTED` (delayed or accelerated) events. Computes mission-impact difference ($\Delta\text{Severity}$, $\Delta\text{CriticalSubsystems}$), lead-time-aware simulation confidence ($C \ge 0.90$ with $\ge 5\text{s}$ lead time), and explicit assumptions. Baseline graph-reachability is computed and displayed side-by-side for legacy verification.
- **2026-09-04 (Update 10)**: Implemented **Constrained Learned Causal Edge Scorer & Hard Structural Constraint Gating** (`learned_causal_scorer.py`, `causal_features.py`). Evolved from the fixed 3-weight linear formula into a calibrated supervised meta-ensemble (`CalibratedClassifierCV` over LogisticRegression, RandomForest, GradientBoosting) predicting valid causal edge probability $P(\text{candidate edge is valid} \mid \mathbf{x})$. Extracts a 22-dimensional causal feature vector spanning temporal plausibility, path decay, intermediate corroboration, anomaly confidence, SHAP attribution, physics residual consistency, event severity, and operating context. Non-negotiable hard structural constraints ($T_{\text{cause}} < T_{\text{effect}}$, reachability in $G_{\text{craft}}$, propagation window, forbidden structural couplings) are enforced strictly outside the ML model. Benchmark evaluation on 45 held-out scenarios slashes False Causal Edges by 93.75% (48 down to 3) and cuts False Discovery Rate from 1.42% to 0.09%, while preserving the legacy 3-weight scorer as a baseline.
- **2026-09-04 (Update 9)**: Implemented **Physics-Informed Anomaly Detection Layer** (`backend/app/core/physics_anomaly/`). Augmented the ML ensemble with lightweight discrete-time physical predictors for highest-value CubeSat channels (battery thermal response under Joule heating and radiative cooling, power bus voltage drop under load and BMS isolation, sensor integrity bounds and slew rate limits). For each channel, computes observed value, predicted value, residual ($r = y_{\text{obs}} - y_{\text{pred}}$), and normalized residual z-scores ($z_{\text{res}} = |r| / \sigma_{\text{expected}}$). Categorizes every anomaly into a strict 4-way classification matrix (`statistically_abnormal`, `physically_inconsistent`, `both`, `neither`), and exposes physical consistency to candidate causal edges in the Temporal Event Graph. Pure statistical anomaly detection remains available via `use_physics=False` for regression-free baseline comparison.
- **2026-09-04 (Update 8)**: Introduced the **Temporal Event Graph (TEG)** representation (`temporal_event_graph.py`). Formalized the **Two-Graph Model**: the static *Spacecraft Dependency Graph* ($G_{\text{craft}} = (V_{\text{modules}}, E_{\text{dependencies}})$) defines physical and cyber coupling topology from canonical templates, while the dynamic *Temporal Event Graph* ($G_{\text{event}} = (V_{\text{events}}, E_{\text{causal\_candidates}})$) represents the concrete incident cascade where nodes are timestamped events and directed edges carry temporal distance ($\Delta t = t_j - t_i$) and allowed propagation windows derived from canonical subsystem templates. Enforced the hard arrow of time ($T_{\text{cause}} < T_{\text{effect}}$) natively at the event level, rejecting backwards and concurrent causality. Enabled same-component internal transitions ($S_D = 1.0$), verified intermediate event corroboration ($S_I$), and isolated non-causal anomalies as `role="independent"`, fully replacing static graph filtering while preserving 100% mathematical parity and frontend visual compatibility.
- **2026-09-04 (Update 7)**: Implemented **Canonical CubeSat Causal Template Library & Dynamic Mission Graph Generation**. Fully eliminated hardcoded topology assumptions from `causal_engine.py` and `dependency_graph.py`. Subsystems are now defined via 8 canonical templates (`EPS`, `Battery`, `Thermal`, `ADCS`, `OBC`, `Communications`, `Payload`, `FlightSoftware`) specifying states, measurable variables, allowed interfaces, propagation delays, failure modes, and structural rules. Mission dependency graphs are dynamically validated (missing modules, invalid references, strict DAG cycle detection, parameter bounds, duplicate IDs) and compiled on-the-fly from JSON/YAML configurations (`canonical_cubesat.json`), preserving 100% mathematical and root-cause parity across existing incident cascades while enabling arbitrary novel spacecraft topologies.
- **2026-09-04 (Update 6)**: Introduced **Mission Architecture Compatibility Boundary** (`backend/app/core/mission_model/` and `frontend/src/types/missionArchitecture.ts`). Decoupled legacy hardcoded DAGs and global parameters into clean, forward-compatible abstractions: `MissionConfig`, `SubsystemTemplate`, `CausalModelSpec`, `EventRecord`, and `MissionCausalGraph`. The canonical CubeSat reference architecture is preserved as the standard reference profile (`STANDARD_CUBESAT_13_NODE_TEMPLATE`) wrapped via a legacy adapter (`legacy_adapter.py`) ensuring 100% mathematical, functional, and API contract parity while unlocking future multi-spacecraft configurability.
- **2026-09-02 (Update 5)**: Implemented **Zero-Knowledge Causal Scoring & Multi-Party Blockchain Verification Layer (Tasks A - D)**. Authored Circom 2.x circuit (`causal_verdict.circom`) proving causal verdict correctness under production ensemble weights without revealing private telemetry feature scores ($S_T, S_D, S_I$). Deployed `AuditAnchor.sol` for immutable SHA-256 anchoring, `ParametricPolicy.sol` for instant smart-contract escrow claim payouts, and `MultiSigSignOff.sol` for 3-of-4 stakeholder consensus (Manufacturer, Operator, Insurer, Launch Provider). Connected Django API with multi-sig gating for `RESOLVED` status transitions and integrated interactive ZK console & claim simulator into the Incident Report.
- **2026-09-02 (Update 4)**: Introduced **Sovereign Air-Gapped Deployment Architecture** (`DEPLOYMENT_MODE=SOVEREIGN` fail-safe default, asserted at boot). Permanently scrubbed all plain-text Supabase credentials. Self-hosted typography (`Roboto Mono` and `Oswald` WOFF2 fonts) and local Three.js Draco/Basis decoders with zero external CDN egress. Added standalone zero-dependency `egress_check.py` to assert complete network isolation, and provided one-click native launchers (`start_sovereign.bat`, `start_sovereign.sh`).
- **2026-09-02 (Update 3)**: Evaluated **StackingClassifier Architecture (v3.1)** and executed empirical **Causal Weight Collinearity Diagnostics (Tasks A & B)**. Stacking meta-learner achieves **97.32% Accuracy / 0.9774 F1** (+0.0096 Acc, +0.0087 F1 over baseline, cutting false negatives by 50.4%: 276 down to 137). Stacking artifact held for review under Drift Governance Gate (PSI = 3.4851, held for review / not auto-promoted). Diagnosed causal temporal weight via VIF ($S_T=1.01$ clean, $S_D=7.08, S_I=7.10$ collinear, $r=0.9266$); tuned Elastic Net ($l_1\text{-ratio}=0.9, C=0.1$); extracted SHAP attributions on causal decision layer; calibrated consensus weights to $w_T=0.0475, w_D=0.6320, w_I=0.3205$.
- **2026-09-02 (Update 2)**: Added **Real Incident Replay Mode** with verified historical NASA telemetry archives (NASA CAPSTONE 2022 lunar CubeSat telecommand lockup & NASA Dellingr 6U 2017 UHF freeze / 24-hr power watchdog reset). Extended system DAG to 13 nodes (adding `flight_software` with bidirectional control loops) and introduced a rigorous `timing_confidence` taxonomy (`documented` vs `estimated`).

---

## 🛡️ Deployment Modes: Cloud vs. Sovereign Air-Gapped

AXYRA provides first-class support for both public demonstrations and classified / air-gapped ground station operations:

| Feature / Dimension | 🌐 Cloud Mode (`DEPLOYMENT_MODE=CLOUD`) | 🔒 Sovereign Mode (`DEPLOYMENT_MODE=SOVEREIGN` - Default) |
|:---|:---|:---|
| **Intended Target** | Public Web Demo (Render + Vercel + Supabase) | Classified Ground Stations, Air-Gapped Mission Control |
| **Telemetry Storage** | Dual-write to Cloud PostgreSQL + local SQLite | **Zero egress.** Persisted strictly to embedded SQLite WAL (`db.sqlite3`) |
| **AI Ensemble Inference** | In-process execution via Django REST API | **Zero egress.** In-process local `.joblib` model execution |
| **Fonts & 3D Assets** | Self-hosted local assets (zero CDN egress) | **Zero egress.** 100% self-hosted fonts & Draco/Basis decoders |
| **Outbound Network Calls**| Allowed to configured Supabase endpoints | **Strictly blocked.** `egress_check.py` asserts zero external DNS resolution |
| **Launch Command** | Cloud provider auto-deploy / standard scripts | Windows: `.\start_sovereign.bat` \| Linux/macOS: `./start_sovereign.sh` |
| **Standalone Verifier** | N/A | `python egress_check.py` (Asserts zero external connectivity) |

---

---

## 🌌 1. Executive Summary & The Core Problem

During a complex in-orbit satellite anomaly, mission operators are flooded with dozens of simultaneous subsystem alarms:

```text
🚨 [T+300s] 🌡️ Thermal Sensor : -999.0 °C [SENTINEL FREEZE]
🚨 [T+305s] 🔥 Heater Controller : State -> FULL_POWER (100%)
🚨 [T+342s] 🔋 Battery Pack : Temperature Critical -> 68.4 °C
🚨 [T+344s] 🛡️ Battery Protection : Over-temp trip -> ISOLATED
🚨 [T+345s] ⚡ Power Bus : Main voltage dropped -> 0.0 V
🚨 [T+346s] 🧠 On-Board Computer (OBC) : Brownout / Halting
🚨 [T+347s] 📡 RF Communications : Carrier Lost (-900.0 dBm)
🚨 [T+348s] 📷 Science Payload : Power rail dead / Offline
```

Conventional operations tools simply tell you **what is currently broken**. But in aerospace cascading incidents (such as the famous **SS/L $422M reversed-causality satellite failure** or the **NASA CAPSTONE communication blackout**), fixing the last visible symptom does not prevent the next mission disaster.

### 🎯 The Fundamental Questions We Answer
1. **Origin & Ambiguity:** What candidate root triggers initiated the cascade? When multiple plausible explanations exist within close confidence margins, does the system preserve competing hypotheses rather than forcing a misleading single answer?
2. **Path:** How did electrical, thermal, and control dependencies propagate the failure step-by-step?
3. **Isolation:** Which simultaneous alarms were completely independent noise / cyber anomalies?
4. **Counterfactual:** *"What if we had caught and overridden the initial thermal sensor fault 10 minutes earlier?"*
5. **Real-Flight Ground Truth:** Can the causal engine accurately reconstruct real historical NASA flight anomalies?

---

## 🧩 2. System Architecture: The 11-Stage End-to-End Pipeline

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    THE COMPLETE ACTIVE PIPELINE                                      │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                      │
│  [1] Mission Configuration             Declarative JSON/YAML schemas (e.g. canonical_cubesat.json)    │
│            │                                                                                         │
│            ▼                                                                                         │
│  [2] Causal Module Library             8 Subsystem templates (EPS, Battery, Thermal, ADCS, OBC, etc.)│
│            │                                                                                         │
│            ▼                                                                                         │
│  [3] Generated Mission Model           Dynamic G_craft compilation & semantic interface validation   │
│            │                                                                                         │
│            ▼                                                                                         │
│  [4] Telemetry / Event Extraction      Calibrated ESA OPS-SAT noise, NASA replays, fault injector   │
│            │                                                                                         │
│            ▼                                                                                         │
│  [5] Hybrid Anomaly Detection          Statistical ML ensemble + discrete-time physics predictors    │
│            │                           (Residuals, normalized z-scores, 4-way classification matrix) │
│            ▼                                                                                         │
│  [6] Temporal Event Graph (TEG)        G_event active cascade, event nodes, delays, arrow of time    │
│            │                                                                                         │
│            ▼                                                                                         │
│  [7] Constrained Learned Causal Scorer 22 features, hard constraints outside ML, CalibratedClassifier│
│            │                           (93.75% false-edge reduction; legacy 3-weight retained as BL) │
│            ▼                                                                                         │
│  [8] Failure Genealogy                 Root cause isolation, causal roles & minimum explanation sets │
│            │                                                                                         │
│            ▼                                                                                         │
│  [9] Structural Counterfactual Sim     Forward state simulation do(X_t=x*), prevented/shifted events │
│            │                           (Baseline topological reachability retained for comparison)   │
│            ▼                                                                                         │
│  [10] Uncertainty & Hypotheses         4-tier confidence, ambiguity margin Δ<0.12, competing causes, │
│            │                           missing evidence tracking & open-set OOD rejection layer      │
│            ▼                                                                                         │
│  [11] Engineer Investigation Output    Master Flight Dossier, interactive DAG playback, What-If,     │
│                                        local SHA-256 audit sign-off (with opt-in ZK/chain provenance)│
│                                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

> ### 🛡️ 3-Tier Cryptographic Verification & Provenance Model
> - **Tier 1 — Normal Operation (Local Cryptographic Audit & Signatures):** Every incident receives a local SHA-256 integrity hash and tamper-evident audit log entry upon detection and resolution. Operates 100% offline with zero network egress in Sovereign Air-Gapped mode.
> - **Tier 2 — Advanced Verification (Optional Zero-Knowledge Proofs):** Proves compact claims (causal verdict validity under calibrated weights, policy threshold satisfaction, model configuration integrity) via Groth16 zk-SNARKs without revealing proprietary telemetry or embedding the entire graph/model.
> - **Tier 3 — External Provenance (Optional Multi-Party & Chain Anchoring):** Optional on-chain notary (`AuditAnchor.sol`), parametric insurance claims (`ParametricPolicy.sol`), and 3-of-4 multi-party threshold sign-off (`MultiSigSignOff.sol`) operating outside the core investigation loop.

---

## 🖥️ 3. Master 5-Page Frontend Architecture

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. HOME PAGE                                                                           │
│    Executive Mission Overview, 3D WebGL CubeSat Model, Live Telemetry Marquee & Case   │
│    Board Summary.                                                                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. MISSION LAB                                                                         │
│    Telemetry Generator, Physics Fault Injector (T+300s Thermal Freeze) & Raw CSV/JSON  │
│    Data Importer with Real-Time Channel Oscillographs.                                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. CAUSAL RECONSTRUCTION (Unified Causal Workspace)                                   │
│    Interactive Causal Genealogy DAG, Chronological Stepped Playback, Streamlined       │
│    "Verified Causal Links (Click for Interaction Evidence)", and Streamlined           │
│    "What-If Counterfactual Simulator" with dynamic cascade rescue animations.          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. SIGNAL INTERPRETATION & ANOMALY RECOGNITION (Caelis AI Cockpit)                     │
│    AI Pattern Matching & Classification, Interactive SHAP Feature Contribution Bars,   │
│    and Live Microsecond Flight-Recorder Event Stream.                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 5. INCIDENT REPORT (Master Flight Dossier)                                             │
│    Complete arranged output: Executive Summary + Caelis AI Diagnostics + Causal DAG    │
│    + Verified Interaction Links + What-If Prevention Results + Cryptographic Sign-Off. │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 4. The 11-Stage Active Pipeline Engineering Walkthrough

### 🛰️ Stage 1 — Mission Configuration
- **Declarative Blueprint:** Spacecraft architectures, operational parameters, and subsystem boundaries are declared via JSON/YAML mission configuration files (`simulation/missions/canonical_cubesat.json` or custom configurations).
- **Validation Engine:** Validated by `backend/app/core/mission_model/mission_schema.py` against 5 structural rules: missing mandatory modules, duplicate IDs, invalid dependency targets, directed cycles (in strict DAG mode), and parameter range bounds.

### 📚 Stage 2 — Causal Module Library
- **Canonical Subsystem Specifications:** Formally defined in `backend/app/core/mission_model/canonical_templates/` covering the 8 core CubeSat domains: EPS/Power, Battery, Thermal, ADCS, OBC, Communications, Payload, and Flight Software.
- **Physical Semantics:** Specifies measurable telemetry variables, operational state machines, allowed coupling interfaces, physics-based propagation delay ranges $[\Delta t_{\text{min}}, \Delta t_{\text{max}}]$, failure modes, and structural rules.

### 🌐 Stage 3 — Generated Mission Model
- **Dynamic Dependency Graph Compilation:** Compiled on-the-fly by `graph_generator.py` (`generate_mission_dependency_graph()`) into fully annotated NetworkX directed graphs ($G_{\text{craft}}$), decoupling downstream reasoning from static node counts.
- **Standard Reference Profile:** Encapsulates the canonical CubeSat topology (`STANDARD_CUBESAT_13_NODE_TEMPLATE`) with 16 cyber-physical dependency edges across thermal, electrical, software, and control domains:
  $$\text{Thermal Sensor} \xrightarrow{\text{control}} \text{Heater} \xrightarrow{\text{thermal}} \text{Battery} \xrightarrow{\text{protection}} \text{BMS} \xrightarrow{\text{power}} \text{Power Bus} \xrightarrow{\text{power}} \{\text{Comms, OBC} \xrightarrow{\text{data}} \text{Payload}\}$$
  $$\text{Comms} \xleftrightarrow[\text{control}]{\text{software}} \text{Flight Software} \xleftrightarrow[\text{software}]{\text{software}} \text{OBC}$$
- **Path Strength Decay:** Multi-hop paths incorporate exponential geometric decay: $\text{PathStrength}(u, v) = \prod_{e \in \text{path}} w_e$.

### 🧪 Stage 4 — Telemetry & Event Extraction
- **Calibrated Baseline Telemetry:** Sensor noise ($\mu, \sigma$) and multi-rate sampling cadences are calibrated from the **European Space Agency OPS-SAT flight dataset (`OPSSAT-AD`)**.
- **Real Incident Replay Archive:** Ingests ground-truth flight archives (NASA CAPSTONE 2022, NASA Dellingr 2017) and 2,767 NASA PCoE Li-Ion battery degradation cycles.
- **Deterministic Fault Injection:** Injects canonical cascading failures ($T+300\text{s}$ Thermal Freeze to $T+448\text{s}$ Payload blackout) and spliced NASA NOS3/CuCD-ID cyber anomalies.

### 🧹 Stage 5 — Hybrid Statistical + Physics Anomaly Detection
- **Discrete-Time Dynamic Predictors:** Models physical dynamics from subsystem template parameters:
  - *Thermal Dynamics:* Radiative dissipation to deep space and Joule heating ($\dot{T} = -\frac{1}{\tau}(T - T_{\text{sink}}) + \frac{P_{\text{heater}} u(t)}{C_{\text{thermal}}}$).
  - *Power Bus:* Bus rail voltage under load impedance and BMS protection trips ($V_{\text{bus}} = (V_{\text{nom}} - I_{\text{load}} R_{\text{internal}}) \cdot (1 - \text{BMS\_Trip})$).
  - *Sensor Integrity:* Enforces hard operational bounds, sentinel dropouts (`-999.0 °C`), and maximum slew rate limits ($|\Delta y / \Delta t| > \dot{y}_{\text{max}}$).
- **Residual Feature Calculation:** Computes observed $y_{\text{obs}}$, predicted $y_{\text{pred}}$, residual $r = y_{\text{obs}} - y_{\text{pred}}$, and normalized residual z-score $z_{\text{res}} = |r| / \sigma_{\text{expected}}$.
- **4-Way Anomaly Matrix:** Categorizes every anomaly into `statistically_abnormal`, `physically_inconsistent`, `both`, or `neither`.

### ⏱️ Stage 6 — Temporal Event Graph (TEG)
- **Two-Graph Separation:** Separates static cyber-physical topology ($G_{\text{craft}}$) from dynamic incident event cascades ($G_{\text{event}}$).
- **Native Arrow of Time:** Enforces $T_{\text{cause}} < T_{\text{effect}}$ natively at edge creation, precluding backward reachability and concurrent ambiguity.
- **Physical Propagation Windows:** Evaluates delay windows $[\Delta t_{\text{min}}, \Delta t_{\text{max}}]$ queried from canonical subsystem templates.
- **Same-Component Progression & Corroboration:** Models internal state progression ($S_D = 1.0$) and intermediate node corroboration ($S_I$).

### 🧠 Stage 7 — Constrained Learned Causal Scoring
- **Supervised Meta-Ensemble:** Predicts candidate causal edge validity probabilities $P(\text{edge is valid} \mid \mathbf{x})$ via a calibrated meta-ensemble (`CalibratedClassifierCV` over LogisticRegression, RandomForest, GradientBoosting, Brier score = 0.0007).
- **Non-Bypassable Hard Constraints Outside ML:** Temporal arrow ($T_{\text{cause}} < T_{\text{effect}}$), reachability in $G_{\text{craft}}$, propagation delay window limits, and forbidden structural cross-couplings are strictly enforced *outside* the ML model.
- **22-Dimensional Causal Feature Vector:** Extracts temporal plausibility, path decay, intermediate corroboration, anomaly confidence, SHAP attribution, physics residual consistency, event severity, and operating context.
- **False-Edge Reduction:** Slashes false causal edges by 93.75% (48 down to 3 on 45 held-out scenarios; FDR: 0.09%).
- **Markov Causal Parsimony:** Prioritizes immediate physical parents ($\text{hops}=1$) over multi-hop ancestor shortcuts.
- **Legacy 3-Weight Scorer Baseline:** Preserves the calibrated linear formula ($w_T = 0.0475, w_D = 0.6320, w_I = 0.3205$) as an evaluation baseline.

### 🌳 Stage 8 — Failure Genealogy & Root-Cause Reduction
- **Greedy Minimum Causal Set Reduction:** Eliminates redundant propagation edges to isolate the smallest defensible primary root-cause trigger set ($E_{\text{primary}}$).
- **Event Role Classification:** Categorizes nodes into `primary` root cause, `propagation` event, `secondary` consequence, or `independent` anomaly.

### ⚡ Stage 9 — Structural Counterfactual Simulation
- **Deterministic Forward Simulation:** Discrete-time forward state simulation ($\Delta t = 1.0\text{s}$) across canonical module state-transition rules ($\dot{s} = f(s, u)$), failure transitions, and protection rules.
- **Pearl Structural Interventions ($do(X_t = x^*)$):** Injects physical interventions (clamping sensor readings, overriding protection switches, or early root mitigation with lead-time slider).
- **Trajectory Comparison:** Compares simulated vs. observed trajectories to categorize downstream failures into `PREVENTED`, `REMAINING`, and `SHIFTED` (with temporal delta $\Delta t_{\text{shift}}$ and severity shift).
- **Impact Quantification:** Computes severity score reduction ($\Delta\text{Severity}$), rescued critical subsystems (`EPS`, `OBC`, `Payload`), and lead-time-aware confidence ($\ge 0.90$ with $\ge 5\text{s}$ lead time).
- **Baseline Reachability Retention:** Computes and returns legacy topological reachability side-by-side (`baseline_reachability`) for comparative verification.

### 🎯 Stage 10 — Uncertainty Reasoning & Alternative Hypotheses
- **Unified 4-Tier Confidence Scale:** `HIGH CONFIDENCE` ($\ge 0.85$), `MODERATE CONFIDENCE` ($\ge 0.60$), `LOW CONFIDENCE` ($\ge 0.35$), and `INSUFFICIENT EVIDENCE` ($< 0.35$) applied uniformly across anomaly detection, causal edges, root-cause ranking, and counterfactual simulation.
- **Ambiguity Detection & Competing Hypotheses:** When top candidate root causes are within close scoring margins ($\Delta < 0.12$), sets `is_ambiguous_root = True` and surfaces `competing_hypotheses` with per-candidate scores, margins, and operational rationales.
- **Open-Set Out-of-Distribution Rejection:** Evaluates epistemic ensemble disagreement ($\sigma_{\text{estimators}} > 0.28$) and conformal envelope z-score departure ($z_{\text{max}} > 6.5, z_{\text{mean}} > 3.8$) to flag novel incidents as `UNKNOWN / OUT-OF-DISTRIBUTION`.
- **Missing Evidence Tracking:** Identifies unobserved intermediate components along expected causal paths (`missing_evidence`) and flags borderline transitions (`uncertain_edges`).
- **Independent Anomaly Isolation:** Isolates concurrent uncoupled anomalies as `independent_events`.

### 📋 Stage 11 — Engineer Investigation Output
- **Master Flight Dossier:** Synthesizes executive findings, Caelis AI diagnostics, Causal Genealogy DAG, verified physical interaction proofs, counterfactual mitigation metrics, and ECSS-Q-ST-30-02C / NASA-STD-8729.1A compliance.
- **Local SHA-256 Sign-Off (Tier 1 Default):** Generates deterministic cryptographic hash signatures and persists tamper-evident audit logs completely offline.
- **Optional Provenance Extensions (Tier 2 & Tier 3):** Opt-in verification endpoints for compact Groth16 ZK proof verification and external on-chain notary/multisig settlement.

---

## ⚖️ 5. The Philosophy: Transparent Causality vs. Black-Box AI

```text
❌ Black-Box "Magic" AI               ✅ AXYRA Causal Genealogy
──────────────────────────────         ──────────────────────────────────────────────────
"The Neural Net says the heater        "Thermal sensor freeze at T+300s triggered heater at
 caused the power bus failure.         T+305s via critical control dependency (12s gap,
 Trust the 99.4% probability."         temporal plausibility 1.00). 100% of intermediate
                                       battery & BMS components logged corroborating faults."
```

| Criterion | Generic Anomaly Detectors | AXYRA Genealogy Tracer |
| :--- | :--- | :--- |
| **Workflow** | Monolithic black box | Intuitive `INPUTS` $\to$ `AI` $\to$ `OUTPUT` |
| **Output** | List of anomaly timestamps | Directed Causal Genealogy Tree + Master Dossier |
| **Temporal Law** | Often ignores directionality | Hard constraint: causes must precede effects |
| **Explainability** | Black-box latent embeddings | Verifiable, plain-English evidence per edge |
| **Weight Selection**| Arbitrary heuristic guessing | Empirically learned via Multi-Model Ensemble on ground truth |
| **Intervention** | Not supported | Counterfactual simulation of prevented cascades |

---

## 🛠️ 6. Technology Stack

<div align="center">

| Layer | Technology | Version | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| 🎨 **Frontend UI** | React + TypeScript | 19.x / 5.7+ | 5-page stateful mission console & component tree |
| ⚡ **Build Tool** | Vite | 6.x | Instant HMR and optimized asset bundling |
| 🌍 **Orbital 3D** | Three.js + React Three Fiber | 0.185+ / 9.x | Photorealistic 3D CubeSat hardware viewer |
| ✨ **Animations** | Framer Motion + GSAP + Lenis | 12.x / 3.12+ | Kinetic stepped playback and smooth navigation |
| 🕸️ **Causal DAG** | NetworkX | 3.x | In-memory graph traversal and reachability analysis |
| 🤖 **Ensemble ML** | scikit-learn + joblib | 1.6+ / 1.4+ | Multi-model ensemble calibration (LR + RF + GB + ET + Voting) |
| 🧹 **Data Engine** | pandas + NumPy | 2.x / 1.26+ | High-throughput telemetry rolling window math |
| 🚀 **Backend API** | Django REST Framework | 5.x / 3.15+ | High-speed serialized REST endpoints |
| 💾 **Storage** | SQLite3 | 3.x | Lightweight local-first incident persistence |

</div>

---

## 📁 7. Repository Layout

```text
🛰️ Axyra_SpaceTech/
├── 🤖 ai_model/
│   ├── __init__.py                    # Python package declaration
│   ├── scenario_factory.py            # Generates N=250 ground-truth labeled scenarios
│   ├── train_causal_weights.py        # Multi-model ensemble training & calibration
│   ├── run_pipeline.py                # Automated one-click execution pipeline
│   ├── scenarios.jsonl                # Generated scenario training dataset (250 incidents)
│   ├── weights.json                   # Learned consensus weights & validation metrics
│   └── ensemble_model.joblib          # Serialized trained Multi-Model Ensemble
│
├── 🧠 backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── schemas.py             # Pydantic / REST schema definitions
│   │   │   ├── serializers.py         # DRF serializers for JSON responses
│   │   │   ├── urls.py                # REST API route declarations
│   │   │   └── views.py               # Incident, analyze & counterfactual endpoints
│   │   ├── core/
│   │   │   ├── mission_model/         # Dynamic Mission Causal Model & TEG System
│   │   │   │   ├── canonical_templates/# 8 Subsystem Templates (EPS, Thermal, Battery, etc.)
│   │   │   │   ├── structural_simulator.py # Structural Counterfactual Forward Simulator
│   │   │   │   ├── temporal_event_graph.py # Temporal Event Graph (TEG) Active Incident Model
│   │   │   │   ├── mission_schema.py  # JSON/YAML Mission Config Schema & Validator
│   │   │   │   ├── graph_generator.py # Dynamic Dependency Graph Generator
│   │   │   │   ├── mission_graph.py   # Compiled Causal Graph & Counterfactual Engine
│   │   │   │   └── legacy_adapter.py  # 100% Backward-compatible boundary facade
│   │   │   ├── dependency_graph.py    # Spacecraft Dependency Graph Generator
│   │   │   ├── event_extraction.py    # Stage 2: Rolling Z-scores & sentinels
│   │   │   └── causal_engine.py       # Stage 3 & 4: TEG Candidate Evaluation & Root Classification
│   │   └── simulate/
│   │       ├── log_generator.py       # Stage 1a: Calibrated baseline telemetry stream
│   │       └── fault_injector.py      # Stage 1b: Canonical cascade & CuCD injection
│   ├── config/                        # Django project configuration & settings
│   ├── tests/
│   │   ├── test_simulation.py         # Telemetry generator, fault injector & real incidents
│   │   ├── test_drift_governance.py   # PSI math, drift gates, audit hash chain, approval API
│   │   ├── test_mission_model.py      # Mission architecture boundary & parity verification
│   │   ├── test_mission_graph_generation.py # Dynamic graph generation, templates & cycle validation
│   │   ├── test_temporal_event_graph.py # TEG arrow of time, delays, and dynamic causality
│   │   ├── test_physics_anomaly.py    # Discrete-time physics predictors & hybrid anomaly detection
│   │   ├── test_learned_causal_scorer.py # 22-feature causal scoring, hard constraint gating
│   │   ├── test_structural_counterfactual.py # Forward state simulation vs reachability baseline
│   │   ├── test_uncertainty_reasoning.py # Ambiguity margins, competing hypotheses, OOD rejection
│   │   ├── test_all_endpoints.py      # REST API endpoints & serializer validation
│   │   └── test_zk_chain.py           # ZK proof generation, verification & smart contracts
│   ├── manage.py                      # Django CLI management entrypoint
│   └── requirements.txt               # Backend dependencies

│
├── 🎨 frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home/                  # 1. HOME PAGE: Mission Hero & 3D CubeSat
│   │   │   ├── MissionLab/            # 2. MISSION LAB: Telemetry Generator & Injector
│   │   │   ├── Reconstruction/        # 3. CAUSAL RECONSTRUCTION: DAG + Links + What-If
│   │   │   ├── Caelis/                # 4. SIGNAL INTERPRETATION: Caelis AI & SHAP
│   │   │   └── IncidentReport/        # 5. INCIDENT REPORT: Complete Master Dossier
│   │   ├── components/                # Modular UI primitives, badges, and 3D viewers
│   │   ├── services/                  # Centralized API communication layer
│   │   ├── types/                     # TypeScript schemas matching backend Pydantic models
│   │   ├── styles/                    # Tailwind CSS tokens & dark mission control styling
│   │   ├── App.tsx                    # Top-level view orchestrator & navigation state
│   │   └── main.tsx                   # Vite mount root
│   ├── package.json                   # Frontend dependencies & build scripts
│   └── vite.config.ts                 # Vite compiler configuration
│
├── 🧪 simulation/
│   ├── OPSSAT-AD/                     # Real ESA OPS-SAT telemetry flight dataset
│   ├── CubeSat cybersecurity dataset/ # Real CuCD-ID space packet captures
│   ├── calibrate_from_opssat.py       # Extracts noise & sampling distributions
│   ├── extract_from_cucd.py           # Extracts independent cyber telemetry anomaly
│   ├── calibration.json               # Extracted Gaussian parameters
│   ├── independent_event.json         # Spliced space-packet anomaly payload
│   └── weights.json                   # Synced calibrated weights
│
├── DOCUMENTATION_AI_MODEL.MD          # Deep technical AI Ensemble documentation
├── DOCUMENTATION_SIMULATION.MD        # Deep technical simulation documentation
├── frontend_parts.md                  # Master frontend build spec & component blueprint
├── tech_stack.md                      # Engineering stack rules & conventions
├── workflow.md                        # Master pipeline specification (INPUTS -> AI -> OUTPUT)
└── README.md                          # Project overview & architectural guide
```

---

## ⚡ 8. Quickstart & Local Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/mishraorosmit/Axyra_SpaceTech.git
cd Axyra_SpaceTech
```

### 2️⃣ Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```
> *Verify backend health:*
> ```bash
> python manage.py test tests
> # Ran 92 tests in ~51s — OK (All 11 test suites passing)
> ```

### 3️⃣ Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
> *Open [http://localhost:5173](http://localhost:5173) to explore the interactive mission dashboard.*

---

## 🎬 9. Demo Walkthrough Script (120-Second Flow)

```text
⏱️ 0:00 - 0:15  │  1. THE PROBLEM
                │  "Spacecraft failures cascade across subsystems. In the SS/L $422M satellite incident,
                │   engineers spent days reading reversed alarms."
────────────────┼─────────────────────────────────────────────────────────────────────────────
⏱️ 0:15 - 0:35  │  2. INPUTS & MISSION LAB
                │  Demonstrate Mission Lab: generate calibrated telemetry with ESA noise and inject
                │  the canonical cascading fault at T+300s.
────────────────┼─────────────────────────────────────────────────────────────────────────────
⏱️ 0:35 - 0:55  │  3. AI ENGINE (Signal Interpretation & Causal DAG)
                │  Show Caelis AI SHAP feature importance, followed by Causal Engine execution
                │  which deterministically isolates the root trigger: Thermal Sensor (-999°C).
────────────────┼─────────────────────────────────────────────────────────────────────────────
⏱️ 0:55 - 1:20  │  4. OUTPUT: CAUSAL RECONSTRUCTION & WHAT-IF
                │  Explore Causal Genealogy DAG with stepped playback, inspect "Verified Causal Links",
                │  and slide the "What-If" counterfactual tool to prove 5 of 6 failures prevented!
────────────────┼─────────────────────────────────────────────────────────────────────────────
⏱️ 1:20 - 2:00  │  5. OUTPUT: MASTER INCIDENT REPORT & CLOSE
                │  Open the master Incident Report packaging AI diagnosis, verified links, what-if
                │  results, and cryptographic sign-off. "From hours of chaos to seconds of clarity."
```

---

<div align="center">

### 🛰️ Trace the Cascade · Pinpoint the Cause · Prevent the Failure

`SOA IDEATHON 2026`  
**SPACE TECHNOLOGY & AEROSPACE OPEN INNOVATION**

*Team Leader:* **Orosmit Mishra**  
*Concept & System Architecture by Orosmit Mishra*

</div>
