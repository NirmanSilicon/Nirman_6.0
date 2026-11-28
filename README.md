# NIRMAN 6.0 — TEAM AXIOM
## Industrial Semiconductor Wafer Telemetry & Anomaly Detection Pipeline

> **Team**: Axiom  
> **Event**: HACKNATION 2026 (NIRMAN 6.0)  
> **Target Branch**: `Axiom`  

---

## 🏗️ Architecture & Technical Solution

Nirman by Team Axiom is an industrial-grade ML telemetry pipeline designed for high-throughput semiconductor wafer fabrication monitoring. It combines ensemble classification, multivariate drift velocity estimation, remaining useful life (Time-to-Threshold) regression, unsupervised anomaly scoring, and a debounced multi-level alert engine.

### 5 Analytical Engines:

1. **Stacking Ensemble Classifier**:
   - **Base Models**: Random Forest (150 trees, max_depth=16), XGBoost Classifier (100 estimators, lr=0.1), Extra Trees Classifier (150 trees).
   - **Meta-Learner**: L2-regularized Logistic Regression trained on 5-fold cross-validated out-of-fold probability estimates.
   - **Output**: Multi-class process state prediction (`Normal`, `Drift Warning`, `Degraded Fault`, `Critical Excursion`).

2. **Isolation Forest Anomaly Detector**:
   - Tree-based unsupervised isolation scoring across all 44 telemetry sensor channels.
   - Calibrates raw scores into normalized $[0, 1]$ anomaly confidence metrics.

3. **Drift Velocity Engine**:
   - Computes rolling linear regression rate of drift ($d(\text{sensor})/dt$) across consecutive process ticks.
   - Detects active drift acceleration and directional degradation per sensor channel.

4. **Time-to-Threshold (TTT) Forecaster**:
   - Fits Ridge regression ($L_2$ regularization) with degree-2 polynomial expansion to predict Remaining Useful Life (ticks until violation of upper/lower specification limits).

5. **Rule-Based Alert Engine**:
   - Debounces transient spikes using temporal persistence windows.
   - Classifies alert severities (`CRITICAL`, `WARNING`, `INFO`).
   - Identifies primary root-cause sensor channels.

---

## 📊 Benchmark Results

Evaluated on 96 production wafers across 44 sensor channels with stratified wafer-level holdout:

| Metric | Score |
| :--- | :--- |
| **Accuracy** | **96.88%** |
| **Macro F1** | **0.9755** |
| **Weighted F1** | **0.9687** |
| **Anomaly Detection ROC-AUC** | **0.991** |
| **Drift Velocity Latency** | **< 1.8 ms / tick** |

---

## 📁 Repository Structure

```
.
├── .github/
│   └── PULL_REQUEST_TEMPLATE.md
├── CONTRIBUTING.md                  # Hacknation collaboration workflow
├── docs/
│   └── submission-timeline.md       # Milestones & submission deadlines
├── teams/
│   └── README.md                    # List of participating teams
├── data/
│   ├── wafer_sample.csv             # 350-tick benchmark sample wafer
│   ├── wafer_part2.csv              # Continuous process sample
│   ├── sample_inference_output.csv  # Sample inference predictions & probabilities
│   ├── inference_output.csv         # Full test-set predictions (15.6k ticks)
│   └── inference_output.zip         # Compressed inference results archive
├── models/
│   ├── hybrid_wafer_pipeline.joblib # Serialized end-to-end trained pipeline
│   └── evaluation_report.json       # Stratified cross-validation & test metrics
├── nirman/
│   ├── alert_engine.py              # Rule-based debouncing and root-cause engine
│   ├── data_loader.py               # Telemetry ingestion, timestamp parsing & limits
│   ├── drift_analyzer.py            # Linear regression drift velocity ($d/dt$)
│   ├── forecasting.py               # Ridge regression Time-to-Threshold predictor
│   ├── pipeline.py                  # Unified HybridWaferPipeline orchestrator
│   └── models/
│       ├── anomaly_detector.py      # Calibrated Isolation Forest detector
│       └── stacking_ensemble.py     # RF + XGBoost + Extra Trees stacking classifier
├── train.py                         # Stratified training pipeline script
├── infer.py                         # Batch & streaming inference CLI
├── test_scenarios.py                # Synthetic excursion & degradation test suite
├── requirements.txt                 # Python dependencies
└── README.md
```

---

## 🚀 Quickstart & Reproduction

### 1. Installation

```bash
git clone https://github.com/pratikshya4757/Nirman_6.0.git
cd Nirman_6.0
git checkout Axiom
pip install -r requirements.txt
```

### 2. Training the Pipeline

```bash
python train.py
```

### 3. Running Streaming Inference

```bash
python infer.py --input data/wafer_sample.csv --output data/inference_output.csv
```

---

## 📋 Hacknation Monorepo Guidelines & Team Roles

Refer to [`CONTRIBUTING.md`](CONTRIBUTING.md) for full Git branching, collaboration, and pull request procedures.
Milestone timelines are available in [`docs/submission-timeline.md`](docs/submission-timeline.md).
