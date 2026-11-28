# CubeSat Simulation Model & Calibration Pipeline — Technical Documentation

### 📝 Changelog
- **2026-09-04 (Update 6)**: Implemented **Structural Counterfactual Simulation Engine & Uncertainty Layer** (`structural_simulator.py`). Upgraded counterfactual reasoning from graph reachability (`nx.descendants`) to deterministic discrete-time forward simulation ($\dot{s} = f(s, u)$) across canonical causal module specifications. Operators inject Pearl interventions $do(X_t=x^*)$ (sensor clamping, BMS overrides, root-cause prevention), categorizing downstream events into `PREVENTED`, `REMAINING`, and `SHIFTED`. Quantifies mission impact difference ($\Delta\text{Severity}$, rescued critical subsystems), computes lead-time-aware confidence ($C \ge 0.90$ with $\ge 5\text{s}$ lead time), and retains baseline topological reachability side-by-side for comparative verification.
- **2026-09-04 (Update 5)**: Implemented **Constrained Learned Causal Edge Scorer & Hard Structural Gating** (`learned_causal_scorer.py`, `causal_features.py`). Evolved from the fixed 3-weight linear equation into a calibrated supervised meta-ensemble (`CalibratedClassifierCV` over LogisticRegression, RandomForest, GradientBoosting) predicting $P(\text{candidate edge is valid} \mid \mathbf{x})$. Extracts a 22-dimensional feature vector across temporal plausibility, path decay, intermediate corroboration, anomaly confidence, SHAP attribution, physics residual consistency, event severity, and operating context. Non-negotiable hard structural constraints ($T_{\text{cause}} < T_{\text{effect}}$, reachability in $G_{\text{craft}}$, propagation window, forbidden structural couplings) are enforced strictly outside the ML model. Benchmark evaluation on 45 held-out scenarios showed a **93.75% reduction in False Causal Edges** (48 down to 3) and slashed False Discovery Rate from 1.42% to 0.09%, while preserving legacy scoring as an evaluation baseline.
- **2026-09-04 (Update 4)**: Implemented **Physics-Informed Anomaly Detection Layer** (`backend/app/core/physics_anomaly/`). Coupled discrete-time forward physical predictors (`ThermalHeaterPredictor`, `PowerBusVoltagePredictor`, `SensorIntegrityPredictor`) to mission template physics parameters. Injected telemetry evaluations compute observed, predicted, residual ($r = y_{\text{obs}} - y_{\text{pred}}$), and normalized residual z-scores. Telemetry anomalies are classified into a 4-way matrix (`statistically_abnormal`, `physically_inconsistent`, `both`, `neither`), and physical consistency is exposed to candidate causal edges in the Temporal Event Graph. Preserved baseline statistical extraction (`use_physics=False` / `extract_events_baseline`).
- **2026-09-04 (Update 3)**: Introduced the **Temporal Event Graph (TEG)** representation (`temporal_event_graph.py`). Formalized the **Two-Graph Model**:
  1. *Spacecraft Dependency Graph* ($G_{\text{craft}}$): Physical coupling and path decay compiled dynamically from canonical templates.
  2. *Temporal Event Graph* ($G_{\text{event}}$): Dynamic active incident representation where nodes are concrete anomalous events at specific timestamps, and directed edges carry temporal distance ($\Delta t$) and plausible propagation windows from canonical subsystem templates.
  - Native enforcement of the hard arrow of time ($T_{\text{cause}} < T_{\text{effect}}$), internal component state transitions ($S_D = 1.0$), and intermediate event corroboration ($S_I$).
- **2026-09-04 (Update 2)**: Implemented **Canonical CubeSat Causal Template Library & Dynamic Mission Graph Generation**. Decoupled static graph assumptions from the simulation and causal reasoning pipeline. Spacecraft models are now generated from 8 canonical subsystem templates (`EPS`, `Battery`, `Thermal`, `ADCS`, `OBC`, `Communications`, `Payload`, `FlightSoftware`) and mission configurations (`canonical_cubesat.json`), automatically establishing dependency structures, propagation windows, and interface rules.
- **2026-09-04 (Update 1)**: Introduced **Mission Architecture Compatibility Boundary** (`backend/app/core/mission_model/` and `frontend/src/types/missionArchitecture.ts`). Encapsulated telemetry simulation parameters into `MissionConfig` and coupled baseline generator defaults with `SubsystemTemplate` component specifications (`STANDARD_CUBESAT_13_NODE_TEMPLATE`).
- **2026-09-02**: Synced calibrated consensus causal weights ($w_T = 0.0475, w_D = 0.6320, w_I = 0.3205$) across `simulation/weights.json`, `backend/weights.json`, and project root. Documented Variance Inflation Factor (VIF) collinearity diagnostics ($S_T=1.01$ clean, $S_D=7.08, S_I=7.10$ collinear, $r=0.9266$) and Elastic Net regularization ($l_1\text{-ratio}=0.9, C=0.1$). Preserved the non-negotiable hard temporal precedence filter ($t_B < t_A \implies \text{reject}$) and 3-term linear formula shape for legacy baseline evaluation.
- **2026-09-02**: Introduced **Real Incident Replay Mode** with ground-truth mission definitions in `simulation/real_incidents/`. Documented JSON schema (`IncidentEvent`, `RealIncidentDefinition`), `real_incident_loader.py` engine, calibrated noise reuse, `timing_confidence` methodology (`documented` vs `estimated`), and official citations for NASA CAPSTONE (2022) and NASA Dellingr (2017).

---

## 1. Executive Summary: The 11-Stage Active Pipeline

This document details the mathematical calibration, dataset extraction workflows, and simulation software implementation structured across the complete 11-stage active pipeline:

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       THE COMPLETE ACTIVE PIPELINE                                     │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│  [1] Mission Configuration             Declarative JSON/YAML schemas (e.g. canonical_cubesat.json)      │
│            │                                                                                           │
│            ▼                                                                                           │
│  [2] Causal Module Library             8 Subsystem templates (EPS, Battery, Thermal, ADCS, OBC, etc.)  │
│            │                                                                                           │
│            ▼                                                                                           │
│  [3] Generated Mission Model           Dynamic G_craft compilation & semantic interface validation     │
│            │                                                                                           │
│            ▼                                                                                           │
│  [4] Telemetry / Event Extraction      Calibrated ESA OPS-SAT noise, NASA replays, fault injector     │
│            │                                                                                           │
│            ▼                                                                                           │
│  [5] Hybrid Anomaly Detection          Statistical ML ensemble + discrete-time physics predictors      │
│            │                           (Residuals, normalized z-scores, 4-way classification matrix)   │
│            ▼                                                                                           │
│  [6] Temporal Event Graph (TEG)        G_event active cascade, event nodes, delays, arrow of time      │
│            │                                                                                           │
│            ▼                                                                                           │
│  [7] Constrained Learned Causal Scorer 22 features, hard constraints outside ML, CalibratedClassifierCV│
│            │                           (93.75% false-edge reduction; legacy 3-weight retained as BL)   │
│            ▼                                                                                           │
│  [8] Failure Genealogy                 Root cause isolation, causal roles & minimum explanation sets   │
│            │                                                                                           │
│            ▼                                                                                           │
│  [9] Structural Counterfactual Sim     Forward state simulation do(X_t=x*), prevented/shifted events   │
│            │                           (Baseline topological reachability retained for comparison)     │
│            ▼                                                                                           │
│  [10] Uncertainty & Hypotheses         4-tier confidence, ambiguity margin Δ<0.12, competing causes,   │
│            │                           missing evidence tracking & open-set OOD rejection layer        │
│            ▼                                                                                           │
│  [11] Engineer Investigation Output    Master Flight Dossier, interactive DAG playback, What-If,       │
│                                        local SHA-256 audit sign-off (with opt-in ZK/chain provenance)  │
│                                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology & Language Stack — Explained for Beginners

### 2.1 The Big Picture Analogy: The "Domino Effect" in Space
Imagine a miniature satellite (a CubeSat) orbiting Earth. Inside, it has many interconnected parts working together:
* A **temperature sensor** monitors cold space conditions.
* A **heater** turns on to keep the battery warm when it gets too cold.
* A **battery** stores electrical energy and feeds the main power line.
* A **power bus** distributes electricity to the radio transmitter, onboard computer, and camera payload.

If a single temperature sensor fails and gets stuck reading `-999 °C` (extreme cold), the heater panics and turns on at 100% full blast. The runaway heater boils the battery. The battery's safety switch trips to prevent an explosion. With the battery disconnected, the power bus dies—meaning the radio goes dead, the computer halts, and the payload turns off.

To a mission operator on the ground, **seven alarms go off almost simultaneously**. It looks like everything broke at once!

> **What our software does:** Our tool acts like an **automated digital detective**. It reads thousands of sensor readings (**INPUTS**), processes them with machine learning pattern recognition and causal graph reasoning (**AI**), and visualizes the exact chain of cause-and-effect with verified interaction proofs and a master report (**OUTPUT**).

---

### 2.2 Quick Reference Tech Summary Table

| Technology / Tool | What It Is (Layman Analogy) | Why We Chose It (The "Why") | How It Works in the Simulation (The "How") |
| :--- | :--- | :--- | :--- |
| **Python 3.11+** | The **Master Conductor / Brain** | Simple to read, fast to write, zero compilation delays, and the global standard for aerospace and data science. | Runs all backend logic: calibration, sensor generation, fault cascades, and the causal detective engine. |
| **NumPy** | The **Realistic Noise & Jitter Generator** | Real satellites never produce perfectly flat numbers; they fluctuate with electrical and cosmic noise. NumPy makes the simulation look 100% real. | Uses Gaussian (bell curve) statistical math to add realistic sensor noise ($\mu, \sigma$) calibrated from real European Space Agency (ESA) flight data. |
| **pandas** | The **Smart Spreadsheet on Steroids** | Telemetry logs have tens of thousands of rows. pandas can filter, clean, and scan millions of numbers in fractions of a second. | Ingests raw telemetry tables, computes rolling averages over 20-second windows, and flags when numbers spike beyond normal ranges. |
| **NetworkX** | The **Satellite Blueprint & Road Map** | Rather than installing a heavy, complex graph database, NetworkX provides a lightweight in-memory map of how satellite parts connect. | Compiles dynamic mission dependency graphs from canonical subsystem templates and calculates multi-hop path decay and candidate causal paths. |
| **FastAPI / DRF & Pydantic** | The **Strict Translator & Messenger** | Prevents crashes by ensuring every message sent between the Python backend and web frontend is strictly validated and formatted. | Packages the simulation logs, causal tree, and "what-if" counterfactual answers into clean JSON and serves them over high-speed web APIs. |
| **JSON & CSV** | The **Simple, Portable Data Vaults** | No database servers to crash during a demo; files can be opened in Excel, Notepad, or VS Code. | CSV stores continuous time-stamped sensor streams (`incident_log.csv`); JSON stores calibration parameters and the final causal tree results. |
| **React + TypeScript** | The **Mission Control Dashboard** | Creates a modern, interactive web interface where users can click, explore, and run "what if" simulations without installing software. | Renders the 5-page visual interface in the browser and ensures frontend code is safe and free of type errors. |
| **React Flow & Recharts** | The **Visual Tree & Timeline Artists** | Humans cannot understand 10,000 lines of raw CSV numbers; visual diagrams make complex failure cascades instantly clear. | React Flow draws the interactive failure genealogy tree; Recharts plots live sensor timeline graphs (voltage drops, temperature spikes). |
| **Tailwind CSS** | The **Aesthetic & Styling Painter** | Provides a sleek, dark-mode "aerospace mission control" aesthetic without writing hundreds of lines of custom CSS. | Styles the entire dashboard with glowing status badges, glassmorphic panels, and responsive layouts. |

---

## 3. The Dual-Dataset Calibration Strategy

1. **OPSSAT-AD (ESA)**:
   - Supplies real flight sensor noise ($\sigma$), nominal means ($\mu$), and multi-rate sampling intervals ($\Delta t$) for thermal, power, and computational subsystems.
2. **CuCD-ID (NASA NOS3 / cFS)**:
   - Supplies real CCSDS space packet structures and independent telecommand anomalies (`command_flooding` on `comms_uplink_handler`) to rigorously test non-causal isolation.

---

## 4. Stages 1–3 — Mission Configuration, Causal Module Library & Dynamic Mission Model

Rather than hardcoding static graphs, AXYRA compiles the spacecraft subsystem dependency graph ($G_{\text{craft}}$) dynamically from declarative configurations and canonical subsystem templates:

1. **Stage 1 — Mission Configuration (`MissionConfig`):**
   - Declarative JSON/YAML schemas (such as `simulation/missions/canonical_cubesat.json`) specifying orbit type, baseline noise parameters, and subsystem module lists.
2. **Stage 2 — Causal Module Library (`canonical_templates/`):**
   - 8 reusable subsystem templates (`EPS`, `Battery`, `Thermal`, `ADCS`, `OBC`, `Communications`, `Payload`, `FlightSoftware`) exposing states, measurable variables, allowed interfaces, propagation delays, failure modes, and structural rules.
3. **Stage 3 — Generated Mission Model ($G_{\text{craft}}$):**
   - Compiled on-the-fly into a `networkx.DiGraph` by `graph_generator.py`, validated against 5-point semantic checks (missing modules, duplicate IDs, broken references, DAG cycles, and parameter bounds).

```text
                 ┌───────────────────────────┐
                 │       thermal_sensor      │
                 └─────────────┬─────────────┘
                               │ (control, critical, weight=1.0)
                               ▼
                 ┌───────────────────────────┐
                 │     heater_controller     │
                 └─────────────┬─────────────┘
                               │ (thermal, strong, weight=0.75)
                               ▼
                 ┌───────────────────────────┐
                 │          battery          │
                 └─────────────┬─────────────┘
                               │ (control, critical, weight=1.0)
                               ▼
                 ┌───────────────────────────┐
                 │     battery_protection    │
                 └─────────────┬─────────────┘
                               │ (power, critical, weight=1.0)
                               ▼
                 ┌───────────────────────────┐
                 │         power_bus         │
                 └──────┬─────────────┬──────┘
                        │             │
      (power, critical) │             │ (power, critical)
                        ▼             ▼
       ┌──────────────────┐   ┌───────────────────────────┐
       │      comms       │   │            obc            │
       └────────▲───┬─────┘   └──────┬────────────▲───────┘
  (control, crit│   │ (sw, strong)   │(sw, crit)  │(sw, strong)
                ▼   ▼                ▼            │
       ┌──────────────────┐   ┌───────────────────┴───────┐
       │ flight_software  │◄──┤          payload          │
       └──────────────────┘   └───────────────────────────┘
                                ▲
     ┌──────────────────────────┴─┐
     │    comms_uplink_handler    │  ◄── (Independent CuCD Spliced Telecommand)
     └────────────────────────────┘
```

---

## 5. Stage 1 — Calibrated Simulation Engine (Inputs)

### 5.1 Canonical Cascade Timeline
```text
T+0s ────────────────► thermal_sensor freezes / invalid (-999.0 degC)
                           │
T+8s (Δt=8s) ────────► heater_controller erratic PWM runaway (duty_cycle = 1.0)
                           │
T+95s (Δt=87s) ──────► battery temperature rises outside normal range (42.0 degC)
                           │
T+140s (Δt=45s) ─────► battery crosses critical threshold (61.0 degC)
                           │
T+142s (Δt=2s) ──────► battery_protection trips (trip_state = 1.0)
                           │
T+143s (Δt=1s) ──────► power_bus voltage drops (2.1 V)
                           │
T+144s (Δt=1s) ──────► obc cpu_load collapses due to power loss (cpu_load = 0.0)
                           │
T+146s (Δt=2s) ──────► comms link lost (-999.0 dBm)
                           │
T+148s (Δt=2s) ──────► payload offline due to OBC & power loss (operational_state = 0.0)
```

---

## 5.2 Real Incident Replay & Timing Confidence Methodology

To demonstrate real-world aerospace validity, AXYRA provides **Real Incident Replay** capability backed by documented NASA flight failure archives.

### 5.2.1 Directory Architecture & JSON Schema
Definitions live under `simulation/real_incidents/*.json` and are loaded via `simulation/real_incident_loader.py`.

```json
{
  "scenario_id": "capstone_2022",
  "display_name": "CAPSTONE (2022) — Real Incident Replay",
  "source_citation": "NASA CAPSTONE mission status reporting, 2022",
  "source_url": "https://blogs.nasa.gov/artemis/2022/07/06/capstone-mission-status-update/",
  "narrative_summary": "On July 4, 2022, NASA's CAPSTONE lunar CubeSat lost communications after a malformed diagnostic telecommand disabled the spacecraft transceiver...",
  "events": [
    {
      "order": 1,
      "component": "comms",
      "parameter": "signal_strength_dbm",
      "value": -48.2,
      "description": "Malformed diagnostic telecommand sent to spacecraft transponder",
      "timing_confidence": "documented",
      "relative_offset_seconds": null,
      "notes": "Exact second-level timing not publicly available; causal order is documented by NASA, precise Δt is estimated for demo purposes."
    },
    {
      "order": 2,
      "component": "comms",
      "parameter": "signal_strength_dbm",
      "value": -999.0,
      "description": "Spacecraft radio transponder disabled by malformed command; carrier mute",
      "timing_confidence": "documented",
      "relative_offset_seconds": 12,
      "notes": "NASA status report confirms radio went offline immediately after commanding."
    },
    {
      "order": 3,
      "component": "flight_software",
      "parameter": "fdir_state",
      "value": 0.0,
      "description": "Autonomous FDIR watchdog failed to trigger radio power-cycle due to flight software bug",
      "timing_confidence": "documented",
      "relative_offset_seconds": 45,
      "notes": "NASA confirmed the autonomous fault detection system was intended to reboot the radio but failed due to an onboard software defect."
    },
    {
      "order": 4,
      "component": "obc",
      "parameter": "cpu_load",
      "value": 0.88,
      "description": "Onboard computer telemetry queue backpressure during prolonged contact loss",
      "timing_confidence": "estimated",
      "relative_offset_seconds": 90,
      "notes": "Estimated CPU/RTOS telemetry buffering behavior during contact loss."
    },
    {
      "order": 5,
      "component": "comms",
      "parameter": "signal_strength_dbm",
      "value": -999.0,
      "description": "Deep Space Network (DSN) confirmed total loss of signal (LOS)",
      "timing_confidence": "documented",
      "relative_offset_seconds": 120,
      "notes": "NASA Deep Space Network tracking stations logged prolonged signal loss."
    }
  ]
}
```

### 5.2.2 Documented vs. Estimated Timing Confidence Taxonomy
- **`documented`**: Causal facts, sequence ordering, and error states explicitly confirmed by official NASA / mission status reports.
- **`estimated`**: Micro-level time offsets ($\Delta t$) or secondary telemetry buffering behaviors normalized for high-resolution interactive dashboard visualization. Estimated timestamps are explicitly rendered in the UI with a `~` prefix and dotted tooltip.

### 5.2.3 Historical Case Studies Modeled
1. **NASA CAPSTONE (2022)**:
   - *Citation:* NASA CAPSTONE Mission Status Reporting & Deep Space Network Telemetry Review (2022)
   - *Source URL:* [NASA Artemis Blog — CAPSTONE Status Update](https://blogs.nasa.gov/artemis/2022/07/06/capstone-mission-status-update/)
   - *Causal Chain:* Telecommand formatting defect $\rightarrow$ transceiver muted $\rightarrow$ flight software watchdog exception $\rightarrow$ loss of signal $\rightarrow$ ground autonomous recovery.
2. **NASA Dellingr 6U (2017)**:
   - *Citation:* NASA GSFC / IEEE Aerospace: *Lessons Learned from Dellingr: NASA GSFC's First 6U CubeSat* (2018)
   - *Source URL:* [NASA Technical Reports Server (NTRS 20180005374)](https://ntrs.nasa.gov/citations/20180005374)
   - *Causal Chain:* Post-ISS deployment UHF freeze $\rightarrow$ 24-hr autonomous EPS power watchdog trip $\rightarrow$ whole-spacecraft power cycle $\rightarrow$ OBC reboot $\rightarrow$ beacon lock restored.

---

## 6. Stage 2 & 3 — AI Intelligence Core & Causal Scoring

### 6.1 Hybrid Statistical & Physics-Informed Event Extraction
The event extraction pipeline combines rolling statistical z-scores with discrete-time physical predictors (`backend/app/core/physics_anomaly/`):
- **Statistical Detector:**
  - Evaluates moving mean and standard deviation over a sliding window ($W=20$):
    $$z_t = \frac{x_t - \mu_{t-1}}{\sigma_{t-1}}$$
  - Warning threshold: $|z_t| \ge 4.0$, Critical threshold: $|z_t| \ge 5.0$.
  - Sentinel catches hardware dropouts (`-999.0 °C`, `-900.0 dBm`).
- **Physics-Informed Predictors:**
  - *Thermal/Battery:* Discrete-time Euler forward model tracking radiative dissipation ($\tau=450\text{s}, T_{\text{sink}}=-10^\circ\text{C}$) and Joule heating from heater power ($P=8\text{W}, C=120\text{J/}^\circ\text{C}$).
  - *Power Bus:* Dynamic voltage drop model under internal battery impedance ($R=0.05\,\Omega$) and BMS over-temperature isolation state.
  - *Sensor Integrity:* Strict channel boundaries and slew rate thresholds ($\dot{T}_{\text{max}} = 3.5^\circ\text{C/s}$).
- **Residuals & 4-Way Anomaly Classification:**
  - Residual: $r = y_{\text{obs}} - y_{\text{pred}}$
  - Normalized residual: $z_{\text{res}} = |r| / \sigma_{\text{expected}}$
  - Classes: `statistically_abnormal`, `physically_inconsistent`, `both`, `neither`.
- **Baseline Parity Mode:** Pure statistical extraction without physics models is retained via `use_physics=False` (`extract_events_baseline`).

### 6.2 Constrained Learned Causal Scorer in the Temporal Event Graph (TEG)
- **Two-Graph Separation:**
  1. *Spacecraft Dependency Graph ($G_{\text{craft}}$):* Static topology providing physical coupling paths and geometric strength decay.
  2. *Temporal Event Graph ($G_{\text{event}}$):* Active incident graph where nodes are concrete anomalous events at specific timestamps, and edges represent evaluated causal transitions carrying temporal distance ($\Delta t = t_j - t_i$), plausible propagation windows from canonical subsystem templates, and physical consistency evidence.
- **Embedded Non-Bypassable Hard Constraints:**
  - *Arrow of Time:* Candidate pairs evaluated only when $t_{\text{cause}} < t_{\text{effect}}$, natively precluding backward reachability and concurrent ambiguity.
  - *Reachability in $G_{\text{craft}}$:* Cause component must reach effect component along directed paths in the validated mission graph.
  - *Propagation Windows:* $\Delta t$ checked against canonical subsystem template bounds.
  - *Forbidden Structural Couplings:* Physically isolated connections are strictly rejected outside the ML model.
- **Learned Probabilistic Edge Scoring:**
  $$P(\text{candidate edge } (e_i \to e_j) \text{ is valid} \mid \mathbf{x}_{ij}) = \mathcal{M}_{\text{ensemble}}(\mathbf{x}_{ij})$$
  - Model: `CalibratedClassifierCV(method='sigmoid')` wrapping LogisticRegression + RandomForest + GradientBoosting meta-ensemble.
  - Evaluates 22 features: temporal plausibility, path strength decay, intermediate corroboration, anomaly confidence, SHAP attribution, physics residual consistency, event severity, and operating context.
  - **Slashes False Causal Edges by 93.75%:** Down from 48 false edges in legacy scoring to 3 in the learned model across 45 held-out scenarios (FDR: 1.42% $\to$ 0.09%).
- **Markov Causal Parsimony:** Immediate physical parents ($\text{hops}=1$) receive priority over multi-hop ancestor bypasses unless the indirect ancestor exceeds direct parent confidence by $>0.10$.

### 6.3 Legacy 3-Weight Consensus Baseline Mode
- **Scored using Empirically Calibrated Consensus Weights ($w_T=0.0475, w_D=0.6320, w_I=0.3205$):**
  $$\text{Confidence}(e_i \to e_j) = w_T \cdot S_{\text{temporal}}(\Delta t, \text{window}) + w_D \cdot S_{\text{dependency}}(c_i, c_j) + w_I \cdot S_{\text{intermediate}}$$
  - *Internal Component Progression:* If cause and effect belong to the same component ($c_i = c_j$), $S_D = 1.0$ (`dependency_type="internal_progression"`).
  - *Canonical Delay Windows:* Propagation delays are checked against subsystem template ranges $[\text{min\_seconds}, \text{max\_seconds}]$; delays inside the window achieve $S_T = 1.0$.
  - *Intermediate Corroboration:* $S_I$ requires intermediate path components to have logged verified events within $(t_i, t_j)$.
- **Diagnostic Root Cause for Low $w_T$:** Variance Inflation Factor (VIF) analysis confirms $S_T = 1.0097$ is completely clean of multicollinearity. The low coefficient reflects that because the candidate generator hard-rejects $t_B < t_A$, nearly all topologically connected cascade candidates already satisfy the temporal plausibility window; hence, temporal proximity adds minimal marginal discrimination once dependency path strength ($S_D$) and intermediate event corroboration ($S_I$) are evaluated ($r(S_D, S_I) = 0.9266$).
- **Generates Human-Readable Interaction Proofs for Verified Causal Links.**

### 6.4 Structural Counterfactual Simulation & Uncertainty Reasoning
- **Stage 9 — Structural Counterfactual Simulation (`structural_simulator.py`):**
  - Upgraded from topological graph reachability (`nx.descendants`) to module-level forward simulation ($\Delta t = 1.0\text{s}$) across canonical state equations ($\dot{s} = f(s, u)$).
  - Evaluates Pearl interventions $do(X_t=x^*)$ (e.g. thermal clamping, BMS override, root-cause mitigation).
  - Categorizes downstream events into `PREVENTED` (cascade arrested), `REMAINING` (independent/unrelated), and `SHIFTED` (delayed or accelerated).
  - Quantifies mission-impact difference: battery State-of-Charge preserved (%), power saved (Wh), and rescued critical subsystems.
  - Computes lead-time-aware simulation confidence ($C \ge 0.90$ with $\ge 5\text{s}$ lead time).
  - **Baseline Reachability Retained:** Computes and exposes legacy graph-reachability (`baseline_reachability`) side-by-side for comparative verification.
- **Stage 10 — Uncertainty & Competing Hypotheses (`temporal_event_graph.py`):**
  - Unified 4-tier confidence rating: `HIGH CONFIDENCE`, `MODERATE CONFIDENCE`, `LOW CONFIDENCE`, `INSUFFICIENT EVIDENCE`.
  - Ambiguity margin gating: when candidate root causes differ by $\Delta < 0.12$, sets `is_ambiguous_root = True` and surfaces ranked `competing_hypotheses`.
  - Open-set out-of-distribution detection: flags anomalous telemetry departing from known distributions as `UNKNOWN / OUT-OF-DISTRIBUTION`.

---

## 7. Output Delivery Across the 5 Frontend Pages

1. **Page 1: Home Page** — 3D CubeSat model, orbital marquee ticker, case board overview.
2. **Page 2: Mission Lab** — Interactive telemetry generation, physics fault injection, and Real Incident Replay (CAPSTONE & Dellingr).
3. **Page 3: Causal Reconstruction** — Interactive Causal DAG, stepped temporal playback, streamlined Verified Causal Links (click for interaction evidence), and What-If counterfactual simulator.
4. **Page 4: Signal Interpretation & Anomaly Recognition** — Caelis AI cockpit and SHAP feature bars.
5. **Page 5: Incident Report** — Master complete arranged dossier (AI diagnosis + Causal DAG + Verified links + What-If metrics + Sign-Off).

---

## 8. Automated Test Suite

```bash
python backend/manage.py test tests
```
```text
Ran 92 tests in 36.370s

OK
```
