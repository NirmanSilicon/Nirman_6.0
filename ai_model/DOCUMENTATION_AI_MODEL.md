### 📝 Changelog
- **2026-09-04 (Update 6)**: Implemented **Structural Counterfactual Simulation Engine & Uncertainty Gating** (`structural_simulator.py`). Upgraded counterfactual reasoning from graph reachability (`nx.descendants`) to module-level forward state simulation ($\dot{s} = f(s, u)$) under Pearl interventions $do(X_t=x^*)$, categorizing events into `PREVENTED`, `REMAINING`, and `SHIFTED`. Preserves baseline reachability side-by-side. Formalized 4-tier confidence rating (`HIGH CONFIDENCE`, `MODERATE CONFIDENCE`, `LOW CONFIDENCE`, `INSUFFICIENT EVIDENCE`), ambiguity margin detection ($\Delta < 0.12$), and open-set out-of-distribution isolation.
- **2026-09-04 (Update 5)**: Implemented **Constrained Learned Causal Edge Scorer & Hard Structural Constraint Gating** (`learned_causal_scorer.py`, `causal_features.py`). Evolved from the fixed 3-weight linear formula into a calibrated supervised meta-ensemble predicting $P(\text{candidate edge is a valid causal relationship} \mid \mathbf{x})$. Extracts a 22-dimensional feature vector across 8 domains (temporal, path decay, intermediate corroboration, anomaly confidence, SHAP, physics residuals, severity, context). Enforces hard structural constraints strictly outside the ML model ($T_{\text{cause}} < T_{\text{effect}}$, reachability, delay windows, forbidden couplings). Calibrated meta-ensemble (`CalibratedClassifierCV`) cuts false causal edges by 93.75% (48 down to 3) on 45 held-out scenarios, dropping False Discovery Rate from 1.42% to 0.09% and Brier score from 0.0172 to 0.0007. Preserves legacy 3-weight formula as baseline compatibility mode.
- **2026-09-04 (Update 4)**: Added **Physics-Informed Anomaly Layer & Discrete-Time Predictors** (`backend/app/core/physics_anomaly/`). Augmented the statistical ML ensemble with forward dynamic models: battery thermal dissipation & Joule heating, power bus voltage under load and BMS isolation, and sensor bounds/slew rate checks. Extracted residuals ($r = y_{\text{obs}} - y_{\text{pred}}$) and normalized residual z-scores. Introduced 4-way anomaly classification matrix (`statistically_abnormal`, `physically_inconsistent`, `both`, `neither`). Exposed physical consistency to candidate causal edges in the Temporal Event Graph while retaining pure statistical baseline extraction (`use_physics=False`).
- **2026-09-04 (Update 3)**: Introduced **Temporal Event Graph (TEG)** active incident representation (`temporal_event_graph.py`) enforcing event-to-event arrow of time ($T_{\text{cause}} < T_{\text{effect}}$), plausible delay windows, same-component transitions, and non-causal isolation.
- **2026-09-04 (Update 2)**: Decoupled hardcoded DAG dependencies via **Canonical CubeSat Causal Template Library** (8 subsystem templates) and JSON/YAML mission configs.

---

## CAELIS AI Pattern-Recognition & Causal Calibration Engine — Technical Specification

> **Position in Master Architecture:** The AI layer drives **Signal Interpretation & Hybrid Anomaly Recognition (Caelis AI)** and the **Constrained Learned Causal Edge Scorer**. It feeds candidate detections, physical consistency flags, and learned edge probabilities into downstream Failure Genealogy, Structural Counterfactual Simulation, and Master Flight Dossier views.

---

## 1. Role in the 11-Stage Active Pipeline

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       THE COMPLETE ACTIVE PIPELINE                                     │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│  [1] Mission Configuration             Declarative JSON/YAML schemas (canonical_cubesat.json)          │
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

## 2. Datasets Used (Pipeline v3.0 — 5 Datasets)

All five datasets are harmonized into the same 7-feature schema. Training date: 2026-09-02.

### 2.1 OPSSAT-AD — ESA OPS-SAT CubeSat Anomaly Detection
| Property | Value |
|---|---|
| Source | ESA OPS-SAT real CubeSat mission telemetry |
| Citation | Kotlar et al. (2023). *OPSSAT-AD: A Spacecraft Anomaly Detection Dataset.* arXiv:2312.14581 |
| Original data | 303,493 raw rows across 2,123 labeled telemetry segments |
| Segments in this run | **2,123** |
| Anomaly count | 434 segments (20.4%) |
| Nominal count | 1,689 segments (79.6%) |

### 2.2 CuCD-ID — NASA NOS3/cFS CubeSat Cybersecurity Telemetry
| Property | Value |
|---|---|
| Source | NASA NOS3 simulator with cFS + COSMOS, CCSDS packet format |
| File | `simulation/CubeSat cybersecurity dataset/Data/Raw/consolidated_dataset_raw.csv` |
| Rows | **25,000** |
| Label mapping | 0=command_flooding, 1=data_injection, 2=defence_impairment, **3=normal**, 4=storage_exhaustion |
| Anomaly count | 20,000 rows (80.0%) |
| Nominal count | 5,000 rows (20.0%) |

### 2.3 Micius — Micius Quantum Science Experiment Satellite
| Property | Value |
|---|---|
| Source | Micius satellite telemetry (Quantum Science Experiment Satellite) |
| File | `ai_model/micius_dataset.csv` |
| Rows | **11,250** |
| Anomaly count | 2,250 rows (20.0%) |
| Nominal count | 9,000 rows (80.0%) |

### 2.4 SMAP/MSL — NASA Spacecraft Anomaly Benchmark (Telemanom)
| Property | Value |
|---|---|
| Source | NASA SMAP and Curiosity Rover (MSL) anomaly benchmark |
| File | `ai_model/labeled_anomalies.csv` |
| Records | **82** channel metadata records |
| Note | Features derived from anomaly-ratio (raw .npy absent) |

### 2.5 PCoE-Battery — NASA Prognostics Center of Excellence (NEW v3.0)
| Property | Value |
|---|---|
| Source | NASA PCoE Li-Ion Battery Dataset — real discharge/charge/impedance cycles |
| Cells | B0047, B0048, B0049, B0050 and additional cells |
| Files | **7,565** CSV files in `ai_model/PCoE_dataset/data/` |
| Discharge cycles extracted | **2,767** (charge/impedance cycles skipped) |
| Anomaly labeling | SOH = Capacity / 2.0 Ah; SOH < 80% = degraded/anomalous |
| Anomaly count | 1,829 cycles (66.1%) |
| Nominal count | 938 cycles (33.9%) |
| Features | Extracted from `Voltage_measured` time-series; blended with `Temperature_measured` and `Current_measured` |
| Physics basis | Degraded cells: lower terminal voltage, steeper discharge slope, higher skewness (knee-point asymmetry), higher rate-of-change |

---

## 3. Feature Harmonization Schema (7 Features — unchanged)

All five datasets map into one unified 7-feature schema:

| Feature Name | Description | v3.0 Importance |
|---|---|---|
| `feat_rate_of_change` | Mean absolute difference between consecutive readings | **31.93%** — strongest anomaly signal |
| `feat_mean` | Average level of numeric values in the window | **27.22%** — baseline shift detection |
| `feat_skewness` | Distribution asymmetry (scipy.stats.skew) | **10.01%** — outlier tail asymmetry |
| `feat_std` | Standard deviation of window values | **9.46%** — abnormal signal dispersion |
| `feat_max` | Maximum peak value reached | **8.69%** — threshold exceedance |
| `feat_range` | Maximum minus minimum span | **8.10%** — total amplitude excursion |
| `feat_min` | Minimum value in window | **4.59%** — baseline lower limit |

---

## 4. Model Architecture & Validation Metrics (Pipeline v3.0)

### 4.1 Base Classifiers & Meta-Ensemble (upgraded from 200 → 250 estimators)
- **Random Forest:** 250 estimators, max_depth=10, balanced class weights (Bagging variance reduction).
- **Gradient Boosting:** 250 stages, learning rate 0.05, max_depth=5 (Boosting bias reduction).
- **Extra Trees:** 250 estimators, max_depth=10, extreme threshold randomization (Diversity).
- **Soft Voting Meta-Classifier:** Weighted probability consensus across all three base learners.
- **Preprocessing:** StandardScaler (fitted on train split, applied to both train and test).

### 4.2 Training Dataset Summary (v3.0)
| Dataset | Rows | Anomaly | Nominal | Rate |
|---|---|---|---|---|
| OPSSAT-AD | 2,123 | 434 | 1,689 | 20.4% |
| CuCD-ID | 25,000 | 20,000 | 5,000 | 80.0% |
| Micius | 11,250 | 2,250 | 9,000 | 20.0% |
| SMAP-MSL | 82 | 60 | 22 | 73.2% |
| **PCoE-Battery** | **2,767** | **1,829** | **938** | **66.1%** |
| **TOTAL** | **41,222** | **24,573** | **16,649** | **59.6%** |

### 4.3 Standard Split Performance (80/20 Stratified Split — 32,977 train / 8,245 test)

| Metric | v2.0 Baseline (38,455 rows) | **v3.0 with PCoE (41,222 rows)** |
|---|---|---|
| **Accuracy** | 0.9628 | **0.9630** |
| **Precision** | 0.9981 | **0.9959** |
| **Recall** | 0.9389 | **0.9418** |
| **F1 Score** | 0.9676 | **0.9681** |
| **ROC-AUC** | 0.9971 | **0.9971** |

### 4.4 Confusion Matrix (v3.0)
| | Predicted Nominal | Predicted Anomaly |
|---|---|---|
| **True Nominal** | TN = 3,311 | FP = 19 |
| **True Anomaly** | FN = 286 | TP = 4,629 |

### 4.5 Individual Base Learner Performance
| Learner | Accuracy | F1 | ROC-AUC |
|---|---|---|---|
| Random Forest (250 trees) | 0.9605 | 0.9659 | 0.9962 |
| Gradient Boosting (250 stages) | 0.9757 | 0.9795 | **0.9981** |
| Extra Trees (250 trees) | 0.9466 | 0.9536 | 0.9879 |
| **Ensemble (SoftVoting)** | **0.9630** | **0.9681** | **0.9971** |

---

## 5. SHAP Explainability & Worked Examples

Using `shap.TreeExplainer`, every anomaly prediction is decomposed into additive feature contributions ($\phi_i$):

```
[Example 1: True Positive — Confirmed Telemetry Anomaly]
Test Index: 0 | True Label: Anomaly (1) | Predicted Label: Anomaly (1) | Confidence: 0.9870
SHAP Feature Contributions:
  1. feat_mean           : +0.6349  ████████████████████  (Strongest anomaly trigger)
  2. feat_rate_of_change : +0.6040  ███████████████████   (Severe step transition)
  3. feat_std            : +0.1108  ███                   (Abnormal dispersion)
  4. feat_range          : +0.0729  ██
  5. feat_skewness       : +0.0690  ██
  6. feat_max            : +0.0256  █
  7. feat_min            : -0.0080  
Plain-Language Explanation: Flagged as Anomaly with 98.7% confidence. The elevated mean baseline (+0.6349) and extreme rate-of-change dynamic (+0.6040) dominated the score.
```

```
[Example 2: True Negative — Nominal Spacecraft Telemetry]
Test Index: 1 | True Label: Nominal (0) | Predicted Label: Nominal (0) | Confidence: 0.0373
SHAP Feature Contributions:
  1. feat_mean           : -0.7278  ████████████████████  (Pushes heavily toward nominal)
  2. feat_std            : -0.5960  ████████████████      (Stable variance)
  3. feat_rate_of_change : -0.4746  █████████████         (Normal signal drift)
  4. feat_skewness       : -0.0806  ██
Plain-Language Explanation: Cleared as Nominal with 3.7% anomaly probability. Near-zero mean (-0.7278) and low standard deviation (-0.5960) confirmed quiescent operating state.
```

---

## 6. Constrained Learned Causal Edge Scorer & Legacy Calibration Baseline

### 6.1 Constrained Learned Causal Edge Scorer (Pipeline v4.0)
The production causal scoring engine predicts the calibrated posterior probability $P(\text{candidate edge } (e_i \to e_j) \text{ is valid} \mid \mathbf{x}_{ij})$ using a 22-dimensional feature vector across temporal plausibility, path decay, intermediate corroboration, anomaly confidence, SHAP attribution, physics residual consistency, event severity, and operating context.

**Non-Bypassable Hard Constraints (Strictly Outside ML):**
- Strict temporal arrow: $T_{\text{cause}} < T_{\text{effect}}$
- Reachability in Mission Causal Model $G_{\text{craft}}$
- Propagation delay within subsystem template bounds $[W_{\text{min}}, W_{\text{max}}]$
- Rejection of forbidden structural cross-couplings

**Model Architecture:** `CalibratedClassifierCV(method='sigmoid')` wrapping LogisticRegression + RandomForest + GradientBoosting.
**Markov Causal Parsimony:** Immediate physical parents ($\text{hops}=1$) receive precedence over multi-hop bypasses unless an indirect ancestor exceeds the direct cause by $>0.10$ confidence.

### 6.2 5-Dimensional Benchmark Matrix (45 Held-Out Scenarios, 3,803 Candidate Edges)
| Evaluation Metric | Legacy 3-Weight Scorer | **Learned Causal Scorer** | Net Improvement |
|---|---|---|---|
| **Edge Precision** | 98.58% | **99.91%** | **+1.33%** |
| **Edge Recall** | 100.00% | **100.00%** | Parity (Zero missed edges) |
| **False Causal Edges (FP)** | 48 false edges | **3 false edges** | **-93.75% reduction** |
| **False Discovery Rate (FDR)** | 1.42% | **0.09%** | **15x reduction in false alarms** |
| **Brier Calibration Score** | 0.0172 | **0.0007** | **24x better probability calibration** |
| **Top-1 Root Cause Accuracy** | 43.59% | **46.15%** | **+2.56%** |
| **Top-3 Root Cause Accuracy** | 100.00% | **100.00%** | Perfect root-cause isolation |
| **Missing Telemetry (50% Loss)**| 98.92% F1 | **99.96% F1** | Robust under packet dropouts |
| **Missing Telemetry (100% Loss)**| 98.74% F1 | **99.40% F1** | Robust under silent intermediate hops |

### 6.3 Legacy 3-Weight Consensus Baseline
The historical linear formula ($S = w_T \cdot S_T + w_D \cdot S_D + w_I \cdot S_I$) with calibrated weights ($w_T=0.0475, w_D=0.6320, w_I=0.3205$) is preserved as a baseline mode (`scorer_type="legacy"`) for comparative evaluation.

---

## 7. PCoE Battery Dataset — Physics-Grounded Anomaly Labeling

The PCoE battery dataset introduces physical degradation signatures that complement spacecraft telemetry anomaly patterns:

### State-of-Health (SOH) Labeling
```
SOH = Measured_Capacity (Ah) / Nominal_Capacity (2.0 Ah)
label = 1 (anomaly)  if SOH < 0.80  (battery degraded beyond 80% of original capacity)
label = 0 (nominal)  if SOH >= 0.80 (healthy operating range)
```

### Physical Signature in Feature Space
| SOH State | feat_mean | feat_std | feat_rate_of_change | feat_skewness |
|---|---|---|---|---|
| **Healthy (SOH ≥ 0.80)** | Higher voltage plateau (~3.8–4.2V) | Low (stable discharge) | Low (gradual slope) | Near-zero (symmetric) |
| **Degraded (SOH < 0.80)** | Lower mean voltage | Higher (noisy descent) | High (steep knee) | Negative skew (early drop) |

---

## 8. Integration with the 5 Frontend Pages

1. **Mission Lab (Page 1):** Generates telemetry events evaluated by the inference pipeline (`infer_telemetry.py`). Supports 5 failure mode scenarios: Thermal, Battery, Comms, ADCS, Payload.
2. **Reconstruction (Page 2):** Consumes learned edge probabilities (or legacy consensus weights) to score causal links in the DAG. Battery failure scenarios now draw on PCoE-trained degradation patterns.
3. **CAELIS AI (Page 3):** Displays live Caelis AI classification cockpit, oscillographs, and SHAP bar charts. Confidence values reflect v3.0 ensemble probabilities.
4. **Evidence Trace (Page 4):** Presents timestamped event stream with AI-graded confidence for each component.
5. **Output (Page 5):** Aggregates Caelis AI classification scores, top SHAP features, and verified causal links into the master executive dossier.

---

## 9. File Reference

| File | Purpose |
|---|---|
| `backend/app/core/causal_features.py` | 22-dimensional causal feature vector extraction engine |
| `backend/app/core/mission_model/learned_causal_scorer.py` | `LearnedCausalScorer`, `HardConstraintValidator`, and `LegacyCausalScorer` |
| `ai_model/train_learned_causal_scorer.py` | Supervised training script harvesting 22,924 candidate vectors |
| `ai_model/evaluate_causal_scorers.py` | 5-dimensional evaluation benchmark script |
| `ai_model/causal_scorer_benchmark.json` | Benchmark metrics (Legacy vs Learned) |
| `ai_model/learned_causal_scorer.joblib` | Trained calibrated meta-ensemble artifact (LR + RF + GB) |
| `backend/app/core/physics_anomaly/predictors.py` | Discrete-time physical predictors (`ThermalHeaterPredictor`, `PowerBusVoltagePredictor`, `SensorIntegrityPredictor`) |
| `backend/app/core/physics_anomaly/hybrid_detector.py`| `HybridAnomalyDetector` with 4-way classification matrix & causal coupling tracking |
| `ai_model/build_telemetry_ensemble.py` | Main training pipeline v3.0 (5 datasets) |
| `ai_model/enhance_ensemble.py` | Enhancement pass with hyperopt + calibration |
| `ai_model/infer_telemetry.py` | Runtime inference (`score_window` function with residual metrics) |
| `ai_model/train_causal_weights.py` | Legacy causal weight calibration from scenarios |
| `ai_model/test_and_verify_model.py` | Full verification suite |
| `ai_model/ensemble_model.joblib` | Canonical trained telemetry ensemble artifact (13.5 MB) |
| `ai_model/weights.json` | Calibrated legacy causal weights ($w_T, w_D, w_I$) |
| `ai_model/training_metrics.json` | Full metrics from training run |
| `ai_model/feature_harmonization_log.csv` | 41,222-row harmonized feature table |
| `ai_model/PCoE_dataset/` | NASA PCoE Li-Ion battery dataset (7,565 CSVs) |
| `backend/app/core/causal_engine.py` | Runtime causal inference engine |
| `backend/app/core/mission_model/temporal_event_graph.py`| Temporal Event Graph (TEG) active incident model |
| `backend/app/core/dependency_graph.py` | Dynamic spacecraft dependency DAG |
