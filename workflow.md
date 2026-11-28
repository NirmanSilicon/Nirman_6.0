# CubeSat Failure Genealogy Tracer — Master Workflow & Pipeline Guide

> **Core Workflow Architecture:** `INPUTS` ──► `AI (INTELLIGENCE CORE)` ──► `OUTPUT`  
> *Designed for instant judge explainability, deterministic rigor, and end-to-end flight operations clarity.*

---

### 📝 Architecture Changelog
- **2026-09-05 (Update 12)**: Completed **Canonical End-to-End Orchestration & Spacecraft Replay Simulator**.
  - Implemented `AnalysisOrchestrator` (`backend/app/core/orchestrator.py`) executing unified sequential analysis from input prep to dynamic mission graph, hybrid physics/stats anomaly detection, TEG with Arrow-of-Time and reachability constraints, 22-feature learned causal scoring, failure genealogy, structural counterfactual simulation, and local SHA-256 integrity signing.
  - Added `EvidenceSelectionEngine` (`backend/app/core/evidence_selection.py`) computing Next Best Evidence recommendations with Shannon Information Gain ($IG$) and telemetry cost calculations to actively discriminate competing hypotheses.
  - Implemented `SpacecraftReplaySimulator` (`frontend/src/components/simulation/SpacecraftReplaySimulator.tsx`) featuring a scrubbable timeline with MET ($T+\text{mm:ss}$) / UTC timekeeping, Subsystem State Matrix (EPS, Battery, TCS, OBC, Comms, ADCS, Payload), animated edge illumination upon causal arrival, and dual-mode comparison (Observed Cascade vs. Counterfactual Mitigated Branch).
  - Established unified `AnalysisContext` in frontend as single source of truth across Mission Lab, Causal Reconstruction, Caelis AI, Evidence Trace, and Incident Report workspaces with explicit offline Sovereign Mode handling.
- **2026-09-04 (Update 11)**: Refactored the **Cryptographic Verification & Provenance Layer** into a decoupled 3-tier architecture supporting the core system instead of competing with it. Normal operations are powered by local cryptographic SHA-256 integrity signatures and hash-chained audit logging, ensuring 100% offline, zero-network functionality in Sovereign Mode. Advanced verification is offered via optional on-demand Groth16 Zero-Knowledge proofs that attest to compact, meaningful claims (approved causal verdict produced, confidence satisfies policy threshold, approved model/configuration parameters used) without exposing private telemetry or putting the full graph/model in circuit. External on-chain anchoring (`AuditAnchor.sol`), parametric policy execution (`ParametricPolicy.sol`), and 3-of-4 multi-party threshold sign-off (`MultiSigSignOff.sol`) are moved completely outside the primary flight investigation loop, removing hard gates from incident resolution.
- **2026-09-04 (Update 10)**: Implemented **Uncertainty Reasoning & Out-of-Distribution (OOD) Layer** across anomaly detection, causal edges, root-cause ranking, and counterfactual simulation (`infer_telemetry.py`, `temporal_event_graph.py`, `structural_simulator.py`, `schemas.py`, `serializers.py`, `EvidenceTracePage.tsx`).
  - Standardized unified 4-tier confidence taxonomy across all system layers: `HIGH CONFIDENCE`, `MODERATE CONFIDENCE`, `LOW CONFIDENCE`, and `INSUFFICIENT EVIDENCE`.
  - Replaced forced single root-cause attribution: when candidate explanations remain too close (margin $\Delta < 0.12$), the system sets `is_ambiguous_root = True`, downgrades the incident tier, and explicitly surfaces `competing_hypotheses` with per-candidate confidence, downstream event count, and operational rationale.
  - Added an open-set out-of-distribution rejection layer in Caelis AI: evaluates ensemble estimator disagreement ($\sigma_{\text{estimators}} > 0.28$) and statistical conformal envelope z-score departure ($z_{\text{max}} > 6.5, z_{\text{mean}} > 3.8$). Incident windows meeting these criteria are flagged as `UNKNOWN / OUT-OF-DISTRIBUTION` (`pattern_status`) rather than forced into a known failure class.
  - Formalized explicit missing evidence reporting on multi-hop causal paths (`missing_evidence`), uncertain edge flagging (`uncertain_edges`), and non-propagating independent anomaly isolation (`independent_events`).
  - Updated EvidenceTrace UI with interactive competing hypotheses cards, telemetry gap alerts, pattern status badges, and 4-tier confidence ratings.
- **2026-09-04 (Update 9)**: Implemented **Structural Counterfactual Simulation Engine** (`structural_simulator.py`). Upgraded the counterfactual engine from topological graph reachability (`nx.descendants`) to module-level structural forward simulation across canonical causal module definitions. Major modules expose deterministic state-evolution equations ($\dot{s}_i = f(s_i, u_i)$), input couplings, failure transition triggers, and recovery/protection rules. Operators can inject Pearl-style interventions $do(X_t=x^*)$ (e.g., "Clamp thermal sensor at T+290s", "Prevent BMS protection at T+440s", or slider-based root-cause prevention). The engine simulates downstream subsystem states forward in discrete time ($\Delta t = 1.0\text{s}$), evaluates thresholds, and compares simulated trajectories against the observed incident trajectory. Categorizes all downstream anomalies into `PREVENTED`, `REMAINING`, and `SHIFTED` (delayed or accelerated) events. Computes mission-impact difference ($\Delta\text{Severity}$, $\Delta\text{CriticalSubsystems}$), lead-time-aware simulation confidence ($C \ge 0.90$ with $\ge 5\text{s}$ lead time), and explicit assumptions. Baseline graph-reachability is computed and displayed side-by-side for legacy verification.
- **2026-09-04 (Update 8)**: Implemented **Constrained Learned Causal Edge Scorer & Hard Structural Constraint Gating** (`learned_causal_scorer.py`, `causal_features.py`). Evolved causal edge evaluation from the fixed 3-weight linear formula into a calibrated supervised meta-ensemble (`CalibratedClassifierCV` over LogisticRegression, RandomForest, GradientBoosting) predicting $P(\text{candidate edge is a valid causal relationship} \mid \mathbf{x})$. Extracts a 22-dimensional feature vector across temporal plausibility, path decay, intermediate corroboration, anomaly confidence, SHAP attribution, physics residual consistency, event severity, and operating context. Non-negotiable hard structural constraints ($T_{\text{cause}} < T_{\text{effect}}$, reachability in $G_{\text{craft}}$, propagation window, forbidden structural couplings) are strictly enforced *outside* the ML model. Benchmark evaluation on 45 held-out scenarios showed a **93.75% reduction in False Causal Edges** (48 down to 3) and slashed False Discovery Rate from 1.42% to 0.09%, while preserving legacy scoring as an evaluation baseline.
- **2026-09-04 (Update 7)**: Implemented **Physics-Informed Anomaly Detection Layer** (`backend/app/core/physics_anomaly/`). Augmented the ML ensemble with discrete-time physical predictors for critical CubeSat channels:
  - `ThermalHeaterPredictor`: Discrete-time battery thermal response under radiative sink dissipation and Joule heating ($\dot{T} = -\frac{1}{\tau}(T - T_{\text{sink}}) + \frac{P_{\text{heater}} u(t)}{C_{\text{thermal}}}$).
  - `PowerBusVoltagePredictor`: Power rail voltage drop under load and BMS isolation ($V_{\text{bus}} = (V_{\text{nom}} - I_{\text{load}} R_{\text{internal}}) \cdot (1 - \text{BMS\_Trip})$).
  - `SensorIntegrityPredictor`: Sentinel dropout catching, physical boundary checks, and sample-to-sample slew rate limits.
  - Computes observed values, predicted values, residuals ($r = y_{\text{obs}} - y_{\text{pred}}$), and normalized residual z-scores ($z_{\text{res}} = |r| / \sigma_{\text{expected}}$).
  - Categorizes all anomalies into a 4-way classification matrix: `statistically_abnormal`, `physically_inconsistent`, `both`, `neither`.
  - Exposes physical consistency to candidate causal edges in the Temporal Event Graph, while preserving baseline statistical detection (`use_physics=False`).
- **2026-09-04 (Update 6)**: Introduced the **Temporal Event Graph (TEG)** active incident representation (`temporal_event_graph.py`). Formalized the **Two-Graph Model**:
  1. *Spacecraft Dependency Graph* ($G_{\text{craft}} = (V_{\text{modules}}, E_{\text{dependencies}})$): Static cyber-physical connectivity and multi-hop path strength derived from canonical subsystem templates and mission configurations.
  2. *Temporal Event Graph* ($G_{\text{event}} = (V_{\text{events}}, E_{\text{causal\_candidates}})$): Dynamic active incident graph where nodes are concrete anomalous events at specific timestamps, and edges represent candidate/evaluated causal transitions carrying temporal distance ($\Delta t = t_j - t_i$) and plausible propagation windows derived from canonical templates.
  - Enforces the hard arrow of time ($T_{\text{cause}} < T_{\text{effect}}$) natively at candidate edge creation. Time is no longer an external filter on a static graph; causal candidates are dynamically generated event-to-event relationships, supporting same-component internal state progressions ($S_D = 1.0$), verified intermediate corroboration ($S_I$), and isolation of concurrent unrelated anomalies.
- **2026-09-04 (Update 5)**: Implemented **Canonical CubeSat Causal Template Library & Dynamic Mission Graph Generation**. Decoupled static graph assumptions across `dependency_graph.py` and `causal_engine.py`. Spacecraft architectures are now compiled dynamically from 8 canonical subsystem templates (`EPS`, `Battery`, `Thermal`, `ADCS`, `OBC`, `Communications`, `Payload`, `FlightSoftware`) and validated mission configuration files (JSON/YAML). Includes 5-point validation engine (missing modules, duplicate IDs, broken references, DAG cycles, and parameter range bounds) and structural interface rule checks, maintaining exact causal scoring parity across all existing incident cascades.
- **2026-09-04 (Update 4)**: Introduced **Mission Architecture Compatibility Boundary** (`backend/app/core/mission_model/` and `frontend/src/types/missionArchitecture.ts`). Decouples static topologies and hardcoded scoring parameters into formal domain abstractions: `MissionConfig`, `SubsystemTemplate`, `CausalModelSpec`, `EventRecord`, and `MissionCausalGraph`. The canonical CubeSat reference architecture is preserved as the default reference profile (`STANDARD_CUBESAT_13_NODE_TEMPLATE`) wrapped via `legacy_adapter.py`, ensuring 100% mathematical, functional, and API contract parity.
- **2026-09-02 (Update 3)**: Integrated **Learned StackingClassifier (v3.1)** and empirical **Causal Weight Collinearity Diagnostics (Tasks A & B)**. Stacking meta-learner achieves **97.32% Accuracy / 0.9774 F1** (+0.0096 Acc, +0.0087 F1 over baseline, cutting false negatives by 50.4%: 276 down to 137). Stacking artifact held for review under Drift Governance Gate (PSI = 3.4851, held for review / not auto-promoted). Diagnosed causal temporal weight via VIF ($S_T=1.01$ clean, $S_D=7.08, S_I=7.10$ collinear, $r=0.9266$); tuned Elastic Net ($l_1\text{-ratio}=0.9, C=0.1$); extracted SHAP attributions for causal decision layer; consensus weights updated to $w_T=0.0475, w_D=0.6320, w_I=0.3205$. Hard temporal filter and 3-term linear formula preserved.
- **2026-09-02 (Update 2)**: Added **Production Drift Governance Gate** (`ai_model/drift_monitor.py`, `ai_model/drift_reference_set.csv`) and cryptographically hash-chained audit logging. Integrated automated PSI drift check into retraining workflow and added human approval endpoint (`POST /api/feedback/approve-model/`).
- **2026-09-02 (Update 1)**: Integrated **Real Incident Replay Mode** alongside synthetic cascade generation. Added support for verified historical NASA incident replays (NASA CAPSTONE 2022 lunar CubeSat telecommand lockup & NASA Dellingr 6U 2017 UHF freeze / 24-hr power watchdog reset). Extended spacecraft architecture with `flight_software` and bidirectional control/software edges. Established formal `timing_confidence` taxonomy (`documented` vs `estimated`).

---

## 🌌 1. The One-Sentence Idea

> When a spacecraft experiences cascading subsystem failures, **AXYRA** takes multi-channel telemetry streams (**INPUTS**), processes them through anomaly pattern matching and ensemble-calibrated causal reasoning (**AI**), and produces an interactive causal genealogy, verified physical interaction proofs, counterfactual "what-if" simulations, and a flight-ready incident report (**OUTPUT**).

---

## 🔄 2. The Complete 11-Stage Active Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       THE COMPLETE ACTIVE PIPELINE                                       │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                          │
│  [1] Mission Configuration             Declarative JSON/YAML schemas (canonical_cubesat.json)            │
│            │                                                                                             │
│            ▼                                                                                             │
│  [2] Causal Module Library             8 Subsystem templates (EPS, Battery, Thermal, ADCS, OBC, etc.)    │
│            │                                                                                             │
│            ▼                                                                                             │
│  [3] Generated Mission Model           Dynamic G_craft compilation & semantic interface validation       │
│            │                                                                                             │
│            ▼                                                                                             │
│  [4] Telemetry / Event Extraction      Calibrated ESA OPS-SAT noise, NASA replays, fault injector       │
│            │                                                                                             │
│            ▼                                                                                             │
│  [5] Hybrid Anomaly Detection          Statistical ML ensemble + discrete-time physics predictors        │
│            │                           (Residuals, normalized z-scores, 4-way classification matrix)     │
│            ▼                                                                                             │
│  [6] Temporal Event Graph (TEG)        G_event active cascade, event nodes, delays, arrow of time        │
│            │                                                                                             │
│            ▼                                                                                             │
│  [7] Constrained Learned Causal Scorer 22 features, hard constraints outside ML, CalibratedClassifierCV │
│            │                           (93.75% false-edge reduction; legacy 3-weight retained as BL)     │
│            ▼                                                                                             │
│  [8] Failure Genealogy                 Root cause isolation, causal roles & minimum explanation sets     │
│            │                                                                                             │
│            ▼                                                                                             │
│  [9] Structural Counterfactual Sim     Forward state simulation do(X_t=x*), prevented/shifted events     │
│            │                           (Baseline topological reachability retained for comparison)       │
│            ▼                                                                                             │
│  [10] Uncertainty & Hypotheses         4-tier confidence, ambiguity margin Δ<0.12, competing causes,     │
│            │                           missing evidence tracking & open-set OOD rejection layer          │
│            ▼                                                                                             │
│  [11] Engineer Investigation Output    Master Flight Dossier, interactive DAG playback, What-If,         │
│                                        local SHA-256 audit sign-off (with opt-in ZK/chain provenance)    │
│                                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

> ### 🛡️ 3-Tier Cryptographic Verification & Provenance Model
> - **Tier 1 — Normal Operation (Local Cryptographic Audit & Signatures):** Every incident receives a local SHA-256 integrity hash and tamper-evident audit log entry upon detection and resolution. Operates 100% offline with zero network egress in Sovereign Air-Gapped mode.
> - **Tier 2 — Advanced Verification (Optional Zero-Knowledge Proofs):** Proves compact claims (causal verdict validity under calibrated weights, policy threshold satisfaction, model configuration integrity) via Groth16 zk-SNARKs without revealing proprietary telemetry or embedding the entire graph/model.
> - **Tier 3 — External Provenance (Optional Multi-Party & Chain Anchoring):** Optional on-chain notary (`AuditAnchor.sol`), parametric insurance claims (`ParametricPolicy.sol`), and 3-of-4 multi-party threshold sign-off (`MultiSigSignOff.sol`) operating outside the core investigation loop.

---

## 🛠️ 3. Detailed Breakdown of the 3 Workflow Pillars

### 📥 Pillar 1: INPUTS (Data & Physical Blueprint)

The input layer feeds raw, realistic spacecraft telemetry and architectural topology into the system via two distinct paradigms:

1. **Mission Configuration, Canonical Templates & Dynamic Graph Generation (Stage 0)**:
   - Formally managed via `backend/app/core/mission_model/` and TypeScript mirror `frontend/src/types/missionArchitecture.ts`.
   - Subsystem semantics defined via 8 canonical templates (`EPS`, `Battery`, `Thermal`, `ADCS`, `OBC`, `Communications`, `Payload`, `FlightSoftware`) specifying measurable variables, allowed interfaces, propagation delays, failure modes, and structural rules.
   - Spacecraft topologies defined via declarative JSON/YAML schemas (`canonical_cubesat.json` or custom configurations), validated against 5 critical rules (missing modules, duplicate IDs, invalid references, strict DAG cycle detection, and parameter bounds).
   - Dynamically compiled into NetworkX directed graphs via `graph_generator.py` (`generate_mission_dependency_graph()`). `STANDARD_CUBESAT_13_NODE_TEMPLATE` and `canonical_cubesat.json` serve as the default canonical reference topology:
     $$\text{Thermal Sensor} \xrightarrow{\text{critical}} \text{Heater} \xrightarrow{\text{strong}} \text{Battery} \xrightarrow{\text{critical}} \text{Protection} \xrightarrow{\text{critical}} \text{Power Bus} \xrightarrow{\text{critical}} \{\text{Comms, OBC} \xrightarrow{\text{strong}} \text{Payload}\}$$
     $$\text{Comms} \xleftrightarrow[\text{critical}]{\text{strong}} \text{Flight Software} \xleftrightarrow[\text{strong}]{\text{critical}} \text{OBC}$$
   - Multi-hop geometric decay path calculation: $\text{PathStrength}(u, v) = \prod_{e \in \text{path}} w_e$.
   - Directly consumed by `causal_engine.py` without hardcoded component dependencies, maintaining 100% mathematical, functional, and API contract parity.


2. **Dual Input Generation Modes (Stage 1)**:
   - **Mode A: Synthetic Cascade Injection & Baseline Calibration**:
     - *ESA OPS-SAT Calibration:* Sensor noise ($\mu, \sigma$) and multi-rate sampling cadences (Power at 1.0 Hz, Thermal at 0.2 Hz) extracted directly from real flight data (`OPSSAT-AD`).
     - *NASA PCoE Li-Ion Battery Cycles:* 2,767 real discharge cycles labeled with physical State-of-Health (SOH < 80% = degraded).
     - *Canonical Cascade Injection:* Injects an 8-event cascading domino failure ($T+300\text{s}$ to $T+448\text{s}$) from sensor freezing to payload blackout.
     - *CuCD Cyber Splicing:* Injects an independent space-packet anomaly (`comms_uplink_handler` at $T+450\text{s}$) to rigorously test non-causal isolation.
   - **Mode B: Real Incident Replay (NASA Mission Archive Ground Truth)**:
     - Replays documented anomalies from verified NASA flight archives structured under `simulation/real_incidents/`:
       1. **NASA CAPSTONE (2022)**: Malformed diagnostic telecommand sent to radio $\rightarrow$ transponder carrier muted $\rightarrow$ autonomous FDIR software watchdog failed to reboot radio due to software bug $\rightarrow$ multi-day DSN loss of contact.
       2. **NASA Dellingr 6U (2017)**: UHF transmitter microcontroller lockup post-ISS deployment $\rightarrow$ autonomous 24-hr flight software health watchdog countdown trip $\rightarrow$ EPS whole-spacecraft power cycle $\rightarrow$ clean OBC restart and UHF beacon recovery.
     - *Timing Confidence Methodology:* Every replay event carries a strict `timing_confidence` tag: `"documented"` (exact published sequence from NASA report) vs `"estimated"` (demo pacing interval $\Delta t$).
   - **User Log Importer:** Supports drag-and-drop ingestion of external CSV/JSON mission telemetry logs.

---

### 🤖 Pillar 2: AI (Intelligence Core)

The AI engine combines statistical machine learning pattern recognition with deterministic causal reasoning:

#### Part A: Signal Interpretation & Hybrid Anomaly Recognition (`Caelis AI`)
- **Heterogeneous Classifier Ensemble (Pipeline v3.0):** Integrates `RandomForestClassifier` (250 trees), `GradientBoostingClassifier` (250 stages), `ExtraTreesClassifier` (250 trees), and `VotingClassifier` with soft probability consensus trained on 41,222 rows across 5 real datasets.
- **Physics-Informed Predictor Layer (`backend/app/core/physics_anomaly/`):**
  - Lightweight discrete-time forward models parameter-configured from canonical mission templates:
    - *Thermal/Battery:* Discrete-time Euler integration of radiative heat transfer and Joule heating:
      $$T_{\text{pred}}[k+1] = T[k] + \Delta t \left[ -\frac{1}{\tau}(T[k] - T_{\text{sink}}) + \frac{P_{\text{heater}} \cdot u[k]}{C_{\text{thermal}}} \right]$$
    - *Power Bus Voltage:* Resistance drop and battery management protection trip:
      $$V_{\text{pred}}[k] = \begin{cases} V_{\text{nom}} - I_{\text{load}} \cdot R_{\text{internal}}, & \text{if } \text{BMS\_Trip} = 0 \\ 0.0\text{V} \text{ (or leakage rail)}, & \text{if } \text{BMS\_Trip} = 1 \end{cases}$$
    - *Sensor Integrity:* Sentinel values (`-999.0`), physical operational limits ($[V_{\text{min}}, V_{\text{max}}]$), and maximum allowable slew rates ($|\Delta y / \Delta t| > \dot{y}_{\text{max}}$).
- **Residual & Normalized Residual Metrics:**
  - Residual: $r = y_{\text{obs}} - y_{\text{pred}}$
  - Normalized residual z-score: $z_{\text{res}} = \frac{|r|}{\sigma_{\text{expected}}}$
- **4-Way Anomaly Classification Matrix:**
  1. `statistically_abnormal`: ML ensemble or rolling z-score flags anomaly without physical equation violation (e.g. mild frequency shift or unusual duty cycle).
  2. `physically_inconsistent`: Violates first-principles dynamics, bounds, or slew rates while statistical deviation is subtle.
  3. `both`: Severe physical law departure accompanied by extreme statistical excursion (e.g. thermal runaway, short circuit).
  4. `neither`: Nominal telemetry within physical and statistical envelopes (or discrete state transitions).
- **Baseline Comparison Mode:** Pure statistical detection remains accessible via `use_physics=False` (`extract_events_baseline()`) for benchmark parity.
- **SHAP Feature Attribution:** Calculates exact feature contributions explaining why an anomaly was flagged:
  $$\text{Anomaly Confidence} \approx \phi_0 + \sum_{i} \phi_i(\text{feat}_i)$$
  *(Top drivers: `feat_rate_of_change` 31.9%, `feat_mean` 27.2%, `feat_skewness` 10.0%, augmented with `feat_residual` and `feat_residual_normalized`).*
- **Production Drift Governance Gate:** Protects the model from drift during continuous active learning retraining runs via Population Stability Index ($\text{PSI}$) thresholds on `ai_model/drift_reference_set.csv`.

#### Part B: Constrained Learned Causal Scorer & Minimum Explanation Engine (Two-Graph Model)
- **Two Distinct Graph Representations:**
  1. *Spacecraft Dependency Graph ($G_{\text{craft}}$):* Captures static cyber-physical couplings across subsystems and components (generated from canonical templates + mission config). Used to look up upstream ancestor paths and compute geometric path decay: $\text{PathStrength}(u, v) = \prod_{e \in \text{path}} w_e$.
  2. *Temporal Event Graph ($G_{\text{event}}$):* Active incident graph where nodes are concrete events at specific timestamps ($t_i$) carrying 4-way anomaly classification and physics residuals. Directed edges carry temporal distances ($\Delta t = t_j - t_i$), plausible propagation delay windows $[\text{min\_seconds}, \text{max\_seconds}]$, and physical consistency validations.
- **Hard Structural Constraints (Strictly Outside the ML Model):**
  - *Native Arrow of Time:* $T_{\text{cause}} < T_{\text{effect}}$ embedded directly at candidate edge generation within the Temporal Event Graph, completely rejecting backward reachability and concurrent events ($T_{\text{cause}} = T_{\text{effect}}$).
  - *Subsystem Reachability in $G_{\text{craft}}$:* Requires directed path from cause component to effect component unless on the same component.
  - *Propagation Window Compliance:* Elapsed time must not exceed subsystem physics window.
  - *Forbidden Structural Couplings:* Physical isolation violations rejected unconditionally with $P = 0.0$.
- **Learned Probabilistic Edge Scoring (Production Mode):**
  $$P(\text{candidate edge } (e_i \to e_j) \text{ is valid} \mid \mathbf{x}_{ij}) = \mathcal{M}_{\text{ensemble}}(\mathbf{x}_{ij})$$
  - Extracts a 22-dimensional feature vector $\mathbf{x}_{ij}$ across temporal plausibility, path decay, intermediate corroboration, anomaly confidence, SHAP attribution, physics residuals, severity, and operating context.
  - Trained via `CalibratedClassifierCV(method='sigmoid')` over LogisticRegression, RandomForest, and GradientBoosting meta-ensemble.
  - Slashes False Causal Edges by **93.75%** (48 down to 3 on 45 held-out scenarios; False Discovery Rate: 1.42% $\to$ 0.09%).
- **Markov Causal Parsimony:** Immediate physical parents ($\text{hops}=1$) are prioritized over multi-hop ancestor bypasses unless the multi-hop confidence exceeds direct parent confidence by $>0.10$.
- **Legacy Compatibility Mode:**
  $$\text{Confidence}(e_i \to e_j) = w_T \cdot S_{\text{temporal}}(\Delta t, \text{window}) + w_D \cdot S_{\text{dependency}}(c_i, c_j) + w_I \cdot S_{\text{intermediate}}$$
  Preserved via `LegacyCausalScorer` (`scorer_type="legacy"`, $w_T=0.0475, w_D=0.6320, w_I=0.3205$) for comparative evaluation.
- **Role Classification, Ambiguity Detection & Uncertainty Reasoning:** Categorizes every event node into `primary` root candidate (valid downstream, no upstream explanation), `propagation`, `secondary` consequence, or `independent` noise. If top candidate explanations remain close in score (margin $\Delta < 0.12$), the system flags `is_ambiguous_root = True` and surfaces `competing_hypotheses` rather than artificially forcing a single root cause. Evaluates missing intermediate evidence (`missing_evidence`), uncertain edges (`uncertain_edges`), and rates overall incident confidence on a standardized 4-tier scale (`HIGH CONFIDENCE`, `MODERATE CONFIDENCE`, `LOW CONFIDENCE`, `INSUFFICIENT EVIDENCE`).
- **Structural Counterfactual Simulation Engine (`structural_simulator.py`):**
  - Replaces pure topological graph reachability (`nx.descendants`) with deterministic module-level forward simulation using canonical causal module specifications.
  - **Module State Evolution & Transition Rules:**
    - Each canonical subsystem module exposes state variables ($s$), input variables ($u$), deterministic evolution equations ($s_{t+\Delta t} = f(s_t, u_t)$), failure threshold criteria ($\text{eval}(s_t, u_t) \to \text{failure\_state}$), and protection/recovery behaviors.
    - *Example (Battery & Power Rail):* Overcurrent or overtemperature trips battery BMS protection ($\text{protection\_state} = \text{"TRIPPED"}$), cutting power rail voltage to $0.0\text{V}$, causing subsequent OBC and Payload blackouts.
  - **Pearl-Style Structural Interventions ($do(X_t = x^*)$):**
    - The engine translates high-level interventions into concrete state/input clamps at intervention timestamp $t_{\text{intervene}}$:
      - *Sensor Clamp:* $do(\text{temp\_sensor} = 20.0^\circ\text{C})$ at $T+290\text{s}$ prevents false freeze reading, keeping heater duty nominal and averting battery under-voltage.
      - *BMS Protection Override:* $do(\text{bms\_protection\_active} = \text{False})$ at $T+440\text{s}$ sustains bus voltage, preventing payload blackout while shifting battery health degradation.
      - *Root Trigger Mitigation:* Clamping the root anomaly at offset $\Delta t_{\text{intervene}} \le 0$ neutralizes the failure trigger before downstream propagation begins.
  - **Discrete Forward Propagation & Trajectory Comparison:**
    - Simulates all downstream subsystems forward in discrete time ($\Delta t = 1.0\text{s}$) through incident duration ($T_{\text{end}}$).
    - Evaluates subsystem state transitions at each step and generates the *counterfactual trajectory*.
    - Cross-references counterfactual trajectory against the *observed incident trajectory* to classify every observed failure event:
      1. `PREVENTED`: Failure condition is never reached under the intervention.
      2. `REMAINING`: Failure condition still occurs at identical timing (e.g. independent noise, or secondary trigger not driven by the intervened path).
      3. `SHIFTED`: Failure occurs at a modified timestamp ($t_{\text{new}} \ne t_{\text{orig}}$), reporting delay/acceleration shift ($\Delta t_{\text{shift}}$) and altered severity.
  - **Quantified Mission Impact & Lead-Time-Aware Confidence:**
    - Computes mission severity reduction ($\Delta \text{Severity} = \sum \text{Sev}_{\text{prevented}}$) and identifies critical subsystems rescued from failure (e.g. `EPS`, `OBC`, `Payload`).
    - Evaluates intervention timing feasibility: $\text{EffectiveLeadTime} = \max(\text{lead\_time}, t_{\text{first\_event}} - t_{\text{intervene}})$. If lead time $\ge 5\text{s}$, simulation confidence evaluates to $\ge 0.90$ with high operational feasibility.
    - Emits explicit model assumptions (e.g., "Downstream subsystem propagation governed by canonical module transition rules; unmodeled external space environment effects held constant; discrete 1.0s Euler integration").
  - **Legacy Baseline Retention:**
    - Computes and returns legacy topological graph reachability side-by-side (`baseline_reachability`), enabling operators to compare the topological ceiling against physically validated structural outcomes.
    - Selectable via `method="structural"` (default) or `method="reachability"` (legacy compatibility).

---

### 📤 Pillar 3: OUTPUT (Interactive Interfaces & Executive Deliverables)

The output layer provides clear, transparent visual analytics and mission-ready reports across 5 dedicated frontend pages:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              5 MASTER FRONTEND PAGES                                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. HOME PAGE                                                                           │
│    • Executive Mission Overview & 3D Interactive WebGL CubeSat                         │
│    • Real-time Mission Marquee Ticker & Orbital Anomaly Case Board                     │
│                                                                                        │
│ 2. MISSION LAB                                                                         │
│    • Telemetry Generator, Physics Fault Injector & CSV/JSON Data Importer              │
│    • Real-time Waveform Oscillographs & Multi-Rate Channel Monitor                     │
│                                                                                        │
│ 3. CAUSAL RECONSTRUCTION (Unified Causal Analysis Hub)                                 │
│    • Interactive Causal Genealogy DAG (Root glow, confidence tags, timeline playback)  │
│    • Verified Causal Links: Click for interaction evidence, delays, physics proofs     │
│    • Counterfactual "What-If" Simulator: Early-intervention slider & cascade rescue   │
│                                                                                        │
│ 4. SIGNAL INTERPRETATION & ANOMALY RECOGNITION (Caelis AI Cockpit)                     │
│    • Real-time Anomaly Classification & Flight-Recorder Event Stream                  │
│    • Interactive SHAP Feature Contribution Bars & Bayesian Prior Matrix                │
│    • Active Learning Feedback Loop Review & Drift Health Monitor                      │
│                                                                                        │
│ 5. INCIDENT REPORT (Comprehensive Master Investigation Dossier)                        │
│    • Complete arranged synthesis: Caelis AI Diagnosis + Causal Tree + Verified Links   │
│    • What-If Prevention Metrics + Telemetry Frames + ECSS/NASA Cryptographic Sign-Off  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 4. Why This Architecture Wins Over Black-Box AI

| Capability | Generic Black-Box ML | AXYRA 3-Pillar Architecture |
|---|---|---|
| **Workflow Clarity** | Opaque end-to-end neural net | Clean `INPUTS` $\to$ `AI` $\to$ `OUTPUT` separation |
| **Explainability** | Uninterpretable softmax probability | Plain-English interaction evidence for every causal link |
| **Physics Grounding** | May violate physical causality | Constrained by DAG topology & temporal arrow of time |
| **Scoring Rigor** | Hand-picked arbitrary weights | Empirically learned via Heterogeneous Ensemble on 250 flight missions |
| **Intervention Simulation** | Not possible | Counterfactual graph pruning ("what if caught 10m earlier?") |
| **Model Governance** | Blind silent degradation | PSI Drift Gate (<0.10 auto-approval) + Hash-Chained Audit Trail |
| **Executive Readiness** | Raw alert log | ECSS-compliant FMEA master report with cryptographic verification |

---

## ⚡ 5. Verification & Definition of Done

1. **Pipeline Execution:** Complete 11-stage pipeline executes seamlessly end-to-end (`scratch/test_e2e_investigation.py`), generating verified failure genealogy, structural counterfactual simulations, and local SHA-256 integrity signatures.
2. **Drift Governance Gate:**
   - Evaluates candidate models against frozen benchmark `ai_model/drift_reference_set.csv`.
   - Auto-approves candidates with $\text{PSI} < 0.10$; quarantines candidates with $\text{PSI} \ge 0.10$ in `pending_review/`.
   - Standalone integrity verification: `python ai_model/drift_monitor.py --verify-chain` verifies 100% cryptographic tamper resistance.
3. **AI & Causal Validation:**
   - Constrained Learned Causal Scorer slashes false causal edges by 93.75% (48 down to 3) with FDR reduced from 1.42% to 0.09%.
   - Structural counterfactual forward simulation accurately categorizes `PREVENTED`, `REMAINING`, and `SHIFTED` anomalies with lead-time-aware confidence ($C \ge 0.90$).
4. **Backend Test Suites (92 Tests Passing):**
   - `python manage.py test tests`: Executes all 11 comprehensive test suites in ~51s:
     - `test_simulation.py`: Telemetry generator, fault injector & real incidents
     - `test_drift_governance.py`: PSI drift math, drift gates, audit hash chain, approval API
     - `test_mission_model.py`: Mission architecture boundary & parity verification
     - `test_mission_graph_generation.py`: Dynamic graph generation, templates & cycle validation
     - `test_temporal_event_graph.py`: TEG arrow of time, delays, and dynamic causality
     - `test_physics_anomaly.py`: Discrete-time physics predictors & hybrid anomaly detection
     - `test_learned_causal_scorer.py`: 22-feature causal scoring, hard constraint gating
     - `test_structural_counterfactual.py`: Forward state simulation vs reachability baseline
     - `test_uncertainty_reasoning.py`: Ambiguity margins, competing hypotheses, OOD rejection
     - `test_all_endpoints.py`: REST API endpoints & serializer validation
     - `test_zk_chain.py`: ZK proof generation, verification & smart contracts
5. **Frontend Verification:**
   - `npm run lint`: Zero TypeScript type errors across all components.
   - `npm run build`: Production bundle built cleanly with zero compilation errors.
6. **Sovereign Isolation Gate:**
   - `python egress_check.py --warn-only`: Verifies strict network egress isolation and zero external dependencies.
