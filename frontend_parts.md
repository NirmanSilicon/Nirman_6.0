# CubeSat Failure Genealogy Tracer — Frontend Architecture & Build Spec

**File name:** `frontend_parts.md`  
**Purpose:** Single source of truth for the **frontend only**. Defines the component hierarchy, data contracts, styling tokens, 5-page structure, and interaction rules.

---

## 0. Master Frontend Architecture: The 5 Core Pages

The application is structured into **5 dedicated, high-fidelity investigation workspaces**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              5 MASTER FRONTEND PAGES                                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. HOME PAGE (`/` or view="home")                                                      │
│    • Executive Mission Overview & 3D Interactive WebGL CubeSat Viewer                  │
│    • Live Telemetry Marquee Ticker & Orbital Anomaly Case Board Overview               │
│                                                                                        │
│ 2. MISSION LAB (`/mission-lab` or view="mission-lab")                                  │
│    • Synthetic Telemetry Generator (altitude, duration, noise, orbit cadence)          │
│    • Physics Fault Injector (Canonical cascade injection: T+300s Thermal Freeze)      │
│    • Raw CSV/JSON Telemetry Log Importer with Real-Time Channel Oscillographs          │
│                                                                                        │
│ 3. CAUSAL RECONSTRUCTION (`/reconstruction` or view="reconstruction")                 │
│    • Interactive Causal Genealogy DAG (React Flow: Root Glow, Confidence, Playback)    │
│    • Verified Causal Links (Click for Interaction Evidence: delays, physics coupling)  │
│    • Counterfactual "What-If" Simulator (Early-catch slider & cascade rescue anim)     │
│                                                                                        │
│ 4. SIGNAL INTERPRETATION & ANOMALY RECOGNITION (`/caelis` or view="caelis")           │
│    • Caelis AI Pattern Matching & Real-Time Anomaly Classification Cockpit             │
│    • Interactive SHAP Feature Contribution Bars (feat_rate_of_change, feat_mean, etc.)│
│    • Continuous Flight-Recorder Microsecond Event Tape                                │
│                                                                                        │
│ 5. INCIDENT REPORT (`/incident-report` or view="incident-report")                      │
│    • Complete Master Investigation Dossier arranging all outputs:                      │
│      - Executive Anomaly Summary & Primary Root Cause Verdict                          │
│      - Caelis AI Diagnostics & SHAP Feature Attributions                              │
│      - Complete Causal Chain & Verified Causal Interaction Links                       │
│      - Counterfactual What-If Prevention Results (Prevented vs. Unmitigated Failures)  │
│      - First-Principles Telemetry Proofs & ECSS/NASA Cryptographic Sign-Off Block      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Technical Stack (Frontend Slice)

| Concern | Choice | Version | Notes |
|---|---|---|---|
| **Framework** | React | 19.x | Function components + hooks only. |
| **Language** | TypeScript | 5.x | `strict: true` in tsconfig. |
| **Build Tool** | Vite | 6.x | Ultra-fast HMR and optimized bundling. |
| **Graph Visualization** | React Flow (`reactflow`) | 11.x | Causal Genealogy DAG renderer. |
| **Charts / Plots** | Recharts | 3.x | Telemetry oscillographs, timeline scatter plots, and SHAP bars. |
| **3D WebGL** | Three.js + React Three Fiber | 0.185+ / 9.x | Interactive 3U CubeSat hardware viewer and orbital bodies. |
| **Styling** | Tailwind CSS | 4.x | Dark aerospace mission control theme (`#05070A` Void, `#0D1117` Panel). |
| **State Management** | React `useState` / `useContext` | — | Single active incident context + shared synthetic telemetry buffer. |
| **HTTP Client** | Native `fetch` | — | Centralized API client layer in `src/api/client.ts` or `src/services/`. |
| **Icons** | `lucide-react` | Latest | High-precision aerospace avionics and telemetry icons. |

---

## 2. Component Blueprint by Page

### 2.1 Page 1: `HOME PAGE` (`src/pages/Home/` or `App.tsx` Hero Shell)
- **`HeroSection.tsx`**: Executive overview of the active mission anomaly with high-level KPI cards.
- **`CubeSatViewer.tsx`**: Interactive Three.js 3D model of the 3U CubeSat showing real-time subsystem telemetry overlays.
- **`HeroBannerTicker.tsx`**: Continuous horizontal marquee streaming live orbital telemetry (altitude, velocity, voltage, SOC).
- **`IncidentSection.tsx`**: Chronological summary case board displaying initial anomaly triggers with radar visualization.

### 2.2 Page 2: `MISSION LAB` (`src/pages/MissionLab/MissionLabPage.tsx`)
- **`TelemetryGenerator`**: Controls for baseline LEO orbit simulation parameters (sample rates, sensor noise $\sigma$, duration).
- **`FaultInjector`**: Injects deterministic failure cascades (e.g., Thermal Sensor Freeze at $T+300\text{s}$) or spliced CuCD cyber events.
- **`LogImporter`**: Drag-and-drop parser for external CSV/JSON flight logs.
- **`OscillographMonitor`**: Real-time multi-channel waveform viewer with anomaly bounding indicators.

### 2.3 Page 3: `CAUSAL RECONSTRUCTION` (`src/pages/Reconstruction/CausalReconstructionPage.tsx`)
*Combines Causal Genealogy, Streamlined Evidence Links, and What-If Counterfactuals into one unified causal workspace.*

1. **Causal Genealogy DAG (`CausalGenealogyTree.tsx`)**:
   - Interactive React Flow DAG rendering the **Temporal Event Graph (TEG)** active incident cascade.
   - Nodes represent concrete events at specific timestamps, annotated with event roles, telemetry values, and state transitions (`NOMINAL -> FAULT`, `CLOSED -> LATCH_TRIPPED`, etc.).
   - Primary trigger node uniquely highlighted with a vibrant pulse glow (`box-shadow: 0 0 24px -4px var(--role-primary)`) and "ROOT CAUSE" badge.
   - Chronological stepped temporal playback engine (Play, Pause, Step Forward, Reset).
   - Minimum causal filter toggle to isolate the critical path from secondary symptoms.

2. **Streamlined Verified Causal Links (`SelectedLinkInspector.tsx` / `VerifiedCausalLinks.tsx`)**:
   - *Streamlined Rule:* Retains exclusively the **"VERIFIED CAUSAL LINKS (CLICK FOR INTERACTION EVIDENCE):"** matrix.
   - Clicking any link in the matrix or on the DAG reveals:
     - Exact propagation delay ($\Delta t$ in seconds).
     - Plausible propagation delay window queried from canonical subsystem templates ($[\text{min\_seconds}, \text{max\_seconds}]$).
     - Physical coupling mechanism (Thermal conduction, Over-temperature trip, Power rail collapse).
     - Learned causal link probability $P(\text{valid causal edge} \mid \mathbf{x})$, hard structural constraint pass status, and intermediate sensor verification proofs.

3. **Streamlined What-If Structural Counterfactual Simulator (`CounterfactualWorkspace.tsx` / `EvidenceTracePage.tsx`)**:
   - *Architecture:* Powered by `POST /api/query/counterfactual/` running discrete-time ($\Delta t=1.0\text{s}$) forward state simulation across canonical module definitions, comparing simulated vs. observed trajectories.
   - *Operator Controls:* Interactive intervention target picker, intervention action type (`clamp_sensor`, `prevent_protection`, `isolate_component`, `mitigate_root`), and time-to-intervene offset slider ($T-10\text{s}, T-30\text{s}, T-60\text{s}$).
   - *Event Triaging Badges:*
     - **Prevented Events (Green):** Downstream failures completely averted by the structural intervention.
     - **Remaining Events (Gray/Red):** Failures that persist autonomously or via independent paths.
     - **Shifted Events (Amber):** Failures whose timing or severity was modified ($\Delta t_{\text{shift}}$, adjusted severity).
   - *Mission Impact KPIs:* Quantified severity score reduction ($\Delta\text{Severity}$), percentage mitigated, and critical subsystems rescued (`EPS`, `OBC`, `Payload`).
   - *Operational Timing & Confidence:* Lead-time feasibility calculation and 4-tier simulation confidence indicator (`HIGH CONFIDENCE`, `MODERATE CONFIDENCE`, `LOW CONFIDENCE`, `INSUFFICIENT EVIDENCE`).
   - *Baseline Comparison & Assumptions:* Collapsible inspection panel showing side-by-side legacy graph-reachability comparison and explicit physical modeling assumptions.
   - Dynamic cascade rescue animation: prevented nodes turn glowing green / dimmed, displaying the executive summary punchline metric.

4. **Uncertainty Reasoning & Out-of-Distribution Layer UI (`EvidenceTracePage.tsx`)**:
   - **Reasoning Confidence Tier Badge:** Prominently displayed in the top KPI bar using the standardized 4-tier scale (`HIGH CONFIDENCE`, `MODERATE CONFIDENCE`, `LOW CONFIDENCE`, `INSUFFICIENT EVIDENCE`).
   - **Pattern Status Badge:** Flags whether the incident matches known causal structures (`KNOWN PATTERN` in emerald) or represents an anomalous out-of-distribution event (`UNKNOWN / OUT-OF-DISTRIBUTION` in amber with pulse border).
   - **Interactive Competing Hypotheses Card:** Automatically activates when `is_ambiguous_root = true` (candidate score margin $\Delta < 0.12$), surfacing alternative candidate root causes (e.g. `eps_regulator` vs. `battery_protection`) with per-candidate confidence, downstream event count, and operational rationale. Operators can toggle hypotheses to inspect alternative cascade trees.
   - **Missing Evidence & Telemetry Gaps Banner:** Alerts operators when expected intermediate components on multi-hop physical paths logged no events (e.g. thermal propagation without heater controller telemetry), distinguishing genuine sensor gaps from anomalous jumps.
   - **Unseen Out-of-Distribution Demo Scenario:** Includes Scenario 3 (`unseen_plasma_inrush`) showcasing high ensemble disagreement ($\sigma = 0.31$), extreme z-score excursions, ambiguous dual root candidates, and intermediate telemetry gaps.

### 2.4 Page 4: `SIGNAL INTERPRETATION & ANOMALY RECOGNITION` (`src/pages/Caelis/CaelisPage.tsx`)
- **`CaelisHeader.tsx`**: Displays active AI ensemble model metadata (Random Forest + Gradient Boosting + Extra Trees) and calibration datasets (OPSSAT-AD).
- **`TelemetryWindow.tsx`**: High-frequency oscillograph showing raw sensor excursions, predicted physical trajectories, and moving Z-score threshold boundaries.
- **`CaelisResult.tsx`**: AI classification diagnosis, anomaly confidence probability ($94\%$), 4-way anomaly classification badge (`statistically_abnormal`, `physically_inconsistent`, `both`, `neither`), and physical residual metrics ($y_{\text{obs}}, y_{\text{pred}}, r = y_{\text{obs}} - y_{\text{pred}}, z_{\text{res}}$).
- **`FeatureContributions.tsx`**: Interactive SHAP bar chart illustrating the statistical and physical drivers of anomaly detection (`feat_rate_of_change`, `feat_mean`, `feat_skewness`, `feat_residual`, `feat_residual_normalized`).
- **`EventStream.tsx`**: Live microsecond flight-recorder tape with nominal/drift/critical status pills and 4-way physical consistency indicators.

### 2.5 Page 5: `INCIDENT REPORT` (`src/pages/IncidentReport/IncidentReportPage.tsx`)
*The master executive synthesis arranging all findings into a flight-readiness FMEA report compliant with ECSS-Q-ST-30-02C & NASA-STD-8729.1A:*

- **Section 1: Executive Anomaly Summary**: Incident identifier, mission timestamps, root cause subsystem verdict.
- **Section 2: Caelis AI Anomaly Diagnosis**: AI pattern recognition summary, model confidence, and top SHAP feature drivers.
- **Section 3: Causal Genealogy & Verified Interaction Links**: Complete ordered failure cascade with verified physical interaction proofs.
- **Section 4: Counterfactual "What-If" Mitigation Analysis**: Intervention simulation summary, prevented failure count, and rescued subsystems.
- **Section 5: Raw Telemetry Evidence Ledger**: Sensor telemetry frames, nominal thresholds vs. observed values, and physics proofs.
- **Section 6: Corrective Action Plan & Local Cryptographic Sign-Off**: Automated recommendations, investigator sign-off fields, and deterministic SHA-256 validation hash (Tier 1 normal operation, 100% offline).
- **Section 7: Optional Cryptographic Provenance & Advanced Verification**: Opt-in integration points for Tier 2 compact Groth16 zero-knowledge proof verification (proving verdict confidence satisfies policy threshold without revealing private telemetry) and Tier 3 external on-chain anchoring / multi-party sign-off.
- **Export Center**: One-click download as JSON payload, printable PDF dossier, or copy-to-clipboard markdown.

---

## 3. Design System — "Mission Control" Dark Theme

```css
:root {
  /* Base Surfaces */
  --bg-void:       #05070a;   /* Space void background */
  --bg-panel:      #0d1117;   /* Tactical console card */
  --bg-panel-alt:  #11161d;   /* Nested surface / hover */
  --border-subtle: #1f2733;
  --border-strong: #2c3644;

  /* Typography */
  --text-primary:   #e6edf3;
  --text-secondary: #8b98a9;
  --text-muted:     #5b6472;

  /* Mission Accents */
  --accent:        #3ddc97;   /* Mission Green */
  --accent-dim:    #1f7a55;

  /* Causal Node Roles */
  --role-primary:      #ff5d5d;  /* Root trigger — Crimson Alert */
  --role-propagation:  #f5a524;  /* Propagation — Amber */
  --role-secondary:    #3ddc97;  /* Secondary symptom — Green */
  --role-independent:  #6e7681;  /* Independent / Cyber — Steel Grey */

  /* Confidence Levels */
  --conf-high:         #3ddc97;
  --conf-moderate:     #f5a524;
  --conf-low:          #ff8a5d;
  --conf-insufficient: #6e7681;

  /* Physical Coupling Dependencies */
  --dep-thermal: #ff8a5d;
  --dep-power:   #f5d90a;
  --dep-control: #4da3ff;
  --dep-data:    #b46dff;
}
```

---

## 4. Master Data Contracts & Architectural Boundary

### 4.0 Mission Architecture Boundary Contracts (`src/types/missionArchitecture.ts`)

Mirrors backend domain abstractions into strict TypeScript contracts:
- `CausalModuleTemplate`, `VariableDefinition`, `InterfaceDefinition`, `PropagationDelayRange`, `StructuralRule`: Canonical CubeSat subsystem template library for the 8 core subsystems (`EPS`, `Battery`, `Thermal`, `ADCS`, `OBC`, `Communications`, `Payload`, `FlightSoftware`) specifying states, measurable variables, allowed interfaces, propagation delays, failure modes, and structural rules.
- `MissionConfigSchema`, `MissionModuleConfig`, `MissionDependencyConfig`, `MissionRuleConfig`: Declarative mission configuration schema defining spacecraft modules, directed dependencies, parameter thresholds, and operational rules.
- `MissionConfig`: Mission identifiers, craft class, orbit profile, baseline noise levels, and sampling cadences.
- `SubsystemTemplate`, `ComponentDefinition`, `DependencyDefinition`: Spacecraft topology specification with standard profile `STANDARD_CUBESAT_13_NODE_TEMPLATE_ID`.
- `CausalModelSpec`, `CausalScoringWeights`: Parameters for empirical weights ($w_T, w_D, w_I$), confidence thresholds, and hop traversal bounds.
- `EventRecord`: Universal event representation with severity, timing confidence, anomaly telemetry, and physics attributes (`predicted_value`, `residual`, `normalized_residual`, `anomaly_classification`, `is_statistical_anomaly`, `is_physical_anomaly`, `physics_evidence`).
- `MissionCausalGraph`, `MissionCausalNode`, `MissionCausalEdge`: Instantiated mission genealogy, candidate edge physical consistency, and counterfactual simulation results.


### 4.1 Legacy Frontend/Backend DRF Contracts (`src/types/index.ts` & `src/types/missionArchitecture.ts`)

```typescript
export type EventType = "threshold" | "state_change" | "alarm" | "reboot";
export type CausalRole = "primary" | "propagation" | "secondary" | "independent" | "unknown";
export type ConfidenceLabel = "high" | "moderate" | "low" | "insufficient_evidence";
export type DependencyType = "power" | "thermal" | "control" | "data";
export type DependencyStrength = "critical" | "strong" | "moderate" | "weak";
export type AnomalyClassification =
  | "statistically_abnormal"
  | "physically_inconsistent"
  | "both"
  | "neither";

export interface Event {
  id: string;
  timestamp: string;
  component: string;
  event_type: EventType;
  value: number | null;
  description: string;
  predicted_value?: number | null;
  residual?: number | null;
  normalized_residual?: number | null;
  anomaly_classification?: AnomalyClassification;
  is_statistical_anomaly?: boolean;
  is_physical_anomaly?: boolean;
  physics_evidence?: string | null;
}

export interface CausalNode {
  event_id: string;
  component: string;
  role: CausalRole;
  confidence: number;
  confidence_label: ConfidenceLabel;
  upstream_edge_ids: string[];
}

export interface CausalEdge {
  id: string;
  source_event_id: string;
  target_event_id: string;
  dependency_type: DependencyType;
  dependency_strength: DependencyStrength;
  temporal_gap_seconds: number;
  evidence: string;
}

export interface CounterfactualResponse {
  prevented_event_ids: string[];
  remaining_event_ids: string[];
  summary: string;
}

export interface CaelisAiResult {
  diagnosis: string;
  confidence: number;
  subsystem: string;
  shap_features: { name: string; value: number; contribution: number }[];
}

export interface MasterIncidentDossier {
  incident_id: string;
  mission_time: string;
  status: "INVESTIGATING" | "ROOT_CAUSE_ISOLATED" | "RESOLVED";
  primary_root_cause: string;
  caelis_ai: CaelisAiResult;
  genealogy_nodes: CausalNode[];
  genealogy_edges: CausalEdge[];
  what_if_analysis: CounterfactualResponse;
  telemetry_proofs: { channel: string; observed: number; nominal: string; proof: string }[];
  recommendations: string[];
  sha256_signature: string;
}
```

---

## 5. Frontend Demo-Day Checklist

- [ ] **Home Page**: 3D CubeSat loads smoothly with live telemetry marquee and case board.
- [ ] **Mission Lab**: Generates synthetic baseline, injects canonical cascade, or imports logs cleanly.
- [ ] **Signal Interpretation**: Caelis AI accurately classifies anomaly with interactive SHAP contribution bars.
- [ ] **Causal Reconstruction**:
  - Interactive DAG displays glowing root trigger at the top.
  - Stepped playback traces failure cascade chronologically.
  - Clicking "Verified Causal Links" reveals delay ($\Delta t$) and physical interaction proofs.
  - "What-If" slider simulates early intervention, highlighting prevented failures in real-time.
- [ ] **Incident Report**: Assembles the complete end-to-end dossier (AI results, Causal DAG, interaction evidence, What-If prevention metrics, and cryptographic sign-off).
