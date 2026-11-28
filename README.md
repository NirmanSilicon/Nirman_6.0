# VidyutSync (EcoSync-Industrial)

> **Regenerative Micro-Grid & Renewable Load-Shifting Orchestrator for Small and Medium-Sized Manufacturing**  
> (CNC Machining, Thermal Treatments, Automated Assembly)

---

## 1. System Architecture & Overview

VidyutSync coordinates multi-objective industrial energy management using a **Decentralized Partially Observable Markov Decision Process (Dec-POMDP)** architecture. Four cooperative LLM agents collaborate to balance real-time grid carbon emissions, utility Time-of-Use (TOU) tariffs, industrial production deadlines (MPS), equipment thermal inertia, and worker health (OSHA ergonomics).

```
                      +---------------------------------------+
                      |   Industrial Telemetry & Edge IoT     |
                      |   - Real-time Carbon & TOU Tariffs   |
                      |   - Solar GHI & Weather Ensembles     |
                      |   - BESS SoC & Inverter Telemetry     |
                      |   - 5-Axis CNCs & Vacuum Ovens        |
                      +-------------------+-------------------+
                                          |
                        [MQTT Mosquitto / OPC UA Push]
                                          |
                                          v
                      +---------------------------------------+
                      |  Dec-POMDP 4-Agent Negotiation Loop  |
                      |                                       |
                      | 1. Grid & Carbon Agent                |
                      |    (Draw limits, dynamic tariffs)     |
                      | 2. Microgrid & Storage Agent          |
                      |    (BESS >=30% floor, solar/regen)    |
                      | 3. Production Scheduling Agent        |
                      |    (Spindle throttle, pre-heating)    |
                      | 4. Ergonomics & Shift Agent           |
                      |    (OSHA 85/70 dB, 18-26C comfort)    |
                      +-------------------+-------------------+
                                          |
                                          v
                      +---------------------------------------+
                      | Deterministic Hard Safety Guardrails  |
                      | - Clamped BESS 30% Reserve Floor      |
                      | - Thermal Oven Cooling Decay Protect  |
                      | - Anti-Reward-Hacking Tardiness Rules |
                      | - Safe Baseline Fallback Setpoints    |
                      +-------------------+-------------------+
                                          |
                 +------------------------+------------------------+
                 |                                                 |
                 v                                                 v
    [TimescaleDB Persistence]                         [Actuation / Controls]
    - Telemetry Stream Hypertable                      - Shadow Mode: Diagnostics log
    - Agent Decisions & Plans                          - Live Pilot Mode: MQTT/OPC UA
    - Composite Reward Trajectory                      - WebSockets: /ws/live
```

---

## 2. The 4 Specialized LLM Models

Each agent operates on structured Pydantic inputs and emits strictly validated JSON action plans:

| Agent | Specialized Model | Inputs | Actions / Outputs |
| :--- | :--- | :--- | :--- |
| **1. Grid & Carbon** | `grid_carbon_model` | Real-time CI ($gCO_2/kWh$), TOU tariff ($\$/kWh$), demand charge, weather outlook | Dynamic pricing thresholds, grid draw ceilings ($kW$), curtailment flags, look-ahead clean windows |
| **2. Microgrid & Storage** | `microgrid_storage_model` | Solar GHI, wind speed, PV generation, BESS SoC ($\%$) & SoH, regenerative braking ($kW$) | Charge/discharge setpoints ($kW$), target SoC, buffer discharge rates, island commands (**Strict 30% BESS reserve floor**) |
| **3. Production Scheduling** | `production_scheduling_model` | Active ERP orders, MPS deadlines, nominal power curves, thermal decay rates ($^\circ C/hr$) | Job start/pause, spindle speed throttling ($50-100\%$), look-ahead pre-heating windows, ramp limits |
| **4. Ergonomics & Shift** | `ergonomics_shift_model` | Shift rosters (Day, Swing, Night, Handover), ambient sound ($dB$), factory temperature | Ventilation fan speed ($\%$) target workstation temp ($18-26^\circ C$), handover buffers, quiet mode ($<70dB$) |

---

## 3. Mathematical Reward Formulation & Anti-Reward-Hacking

### 3.1. Composite Reward

$$R_{\text{total}} = w_1 R_{\text{carbon}} + w_2 R_{\text{cost}} + w_3 R_{\text{schedule}} + w_4 R_{\text{worker}}$$

Default weights: $w_1 = 0.35$, $w_2 = 0.30$, $w_3 = 0.25$, $w_4 = 0.10$.

- **$R_{\text{carbon}}$**: Penalizes grid power draw weighted by real-time carbon intensity:
  $$R_{\text{carbon}} = \frac{P_{\text{baseline}} \cdot \text{CI}_{\text{baseline}} - P_{\text{grid}}(t) \cdot \text{CI}(t)}{P_{\text{baseline}} \cdot \text{CI}_{\text{baseline}}}$$
- **$R_{\text{cost}}$**: Captures TOU tariffs and demand-charge penalties:
  $$R_{\text{cost}} = \frac{\text{Cost}_{\text{ref}} - \left(P_{\text{grid}}(t) \cdot \text{TOU}(t) + \text{DemandPenalty}\right)}{\text{Cost}_{\text{ref}}}$$
- **$R_{\text{schedule}}$ (Anti-Reward Hacking)**: Prevents agents from achieving low carbon emissions by simply shutting down machines and missing deadlines. Any missed MPS milestone incurs an exponential/heavy linear tardiness penalty:
  $$R_{\text{schedule}} = - \min\left(20.0, \frac{\sum \text{Tardiness} \times \lambda_{\text{tardiness}}}{100}\right)$$
- **$R_{\text{worker}}$**: Penalizes noise violations ($>85\text{ dB}$ daytime, $>70\text{ dB}$ night/handover) and temperature deviations outside $[18^\circ C, 26^\circ C]$.

### 3.2. Deterministic Hard Safety Guardrails

Before any proposal reaches actuators:
1. **BESS 30% Reserve Floor**: If $\text{SoC} \le 30.0\%$, discharge setpoints are strictly clamped to $0\text{ kW}$ unless backed by an explicit utility grid guarantee. If discharging would breach $30\%$ during the tick, discharge power is automatically clamped:
   $$P_{\text{max\_discharge}} = \frac{(\text{SoC} - 30.0) \times \text{Capacity}_{\text{bess}}}{0.25 \times 100}$$
2. **Thermal Oven Decay Guardrail**: Pausing vacuum carburizing/annealing furnaces during active batches is prohibited to eliminate cooling decay scrap.
3. **MPS Deadline Guardrail**: Machines running orders with slack $<45\text{ mins}$ cannot be paused; they are forced to run at $\ge 75\%$ speed.
4. **OSHA Decibel Guardrail**: Enforces sound level $<70\text{ dB}$ during night shifts and handover intervals by throttling CNC spindle speeds.
5. **Safe Baseline Fallback**: Any malformed LLM outputs or unrecoverable constraint violations trigger automatic fallback to pre-verified safe baseline setpoints.

---

## 4. Repository Structure

```
VidyutSync/
├── pyproject.toml              # Build & package dependencies (Python 3.11+)
├── requirements.txt            # Pip requirements
├── Dockerfile                  # Container build for API and OPC UA simulation
├── docker-compose.yml          # TimescaleDB, Mosquitto, Backend, OPC UA simulator
├── .env.example                # Configuration parameters & defaults
├── k3s/                        # Kubernetes / K3s production deployment manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── timescaledb.yaml
│   ├── mosquitto.yaml
│   ├── backend-api.yaml
│   └── opcua-sim.yaml
├── timescaledb/
│   └── init.sql                # Hypertables DDL for telemetry, decisions, rewards
├── mosquitto/
│   └── mosquitto.conf          # MQTT broker configuration
├── src/
│   ├── config.py               # Pydantic BaseSettings
│   ├── models/                 # 4-Model LLM training & inference subsystem
│   │   ├── schemas.py          # Structured Pydantic action schemas
│   │   ├── templates.py        # Dec-POMDP prompts & system instructions
│   │   ├── reward_scorer.py    # Multi-objective mathematical reward scoring
│   │   ├── dataset_generator.py# Synthetic dataset generator
│   │   ├── training_pipeline.py# PEFT / LoRA fine-tuning script
│   │   └── inference.py        # HuggingFace & deterministic mock inference
│   ├── orchestrator/           # Dec-POMDP multi-agent runtime
│   │   ├── state.py            # Plant observation state
│   │   ├── guardrails.py       # Deterministic hard safety guardrails & fallbacks
│   │   ├── reward_engine.py    # Rolling reward evaluation & KPI tracking
│   │   ├── negotiator.py       # 4-agent cooperative consensus loop
│   │   └── engine.py           # High-level orchestrator (shadow vs live_pilot)
│   ├── connectors/             # Industrial messaging & database stack
│   │   ├── database.py         # TimescaleDB asyncpg repository with in-memory buffer
│   │   ├── mqtt_bus.py         # Eclipse Mosquitto MQTT client
│   │   ├── kafka_bus.py        # Optional Kafka producer/consumer with fallback
│   │   └── opcua_bridge.py     # Event-driven OPC UA PLC simulator & subscriber
│   └── api/                    # FastAPI REST & WebSocket server
│       ├── schemas.py          # API DTO schemas
│       ├── routes.py           # REST endpoints
│       ├── websockets.py       # Live dashboard streaming manager
│       └── main.py             # Server factory & periodic ticker loop
└── tests/                      # Automated unit and integration tests (23 tests)
    ├── conftest.py
    ├── test_schemas_and_guardrails.py
    ├── test_reward_engine.py
    ├── test_dataset_generator.py
    ├── test_orchestrator.py
    ├── test_connectors.py
    └── test_api.py
```

---

## 5. Quickstart Guide

### 5.1. Prerequisites & Environment Setup
Ensure Python 3.11+ is installed.

```bash
# Clone the repository
git clone https://github.com/your-org/VidyutSync.git
cd VidyutSync

# Install dependencies
pip install -r requirements.txt
```

### 5.2. Running the Infrastructure via Docker Compose
Start TimescaleDB, Eclipse Mosquitto MQTT, the VidyutSync Backend, and the OPC UA Industrial Simulator:

```bash
docker compose up -d
```

Verify services:
- **FastAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **OPC UA Server**: `opc.tcp://localhost:4840/freeopcua/server/`
- **MQTT Broker**: `localhost:1883`
- **TimescaleDB**: `localhost:5432`

---

## 6. Training the 4 LLM Models

### 6.1. Generate Synthetic & Aligned Training Datasets
Generate aligned datasets matching Electricity Maps, NREL NSRDB weather, and CNC/oven machine curves:

```bash
python -m src.models.dataset_generator --samples 500 --output_dir data/synthetic
```

Generated files:
- `data/synthetic/grid_carbon_train.jsonl`
- `data/synthetic/microgrid_storage_train.jsonl`
- `data/synthetic/production_scheduling_train.jsonl`
- `data/synthetic/ergonomics_shift_train.jsonl`
- `data/synthetic/joint_trajectories.jsonl`

### 6.2. Fine-Tune Specialized Agent Models (LoRA)
Fine-tune any individual agent or all 4 cooperative models:

```bash
# Train all 4 models
python -m src.models.training_pipeline --agent all --epochs 2 --batch_size 4 --lr 2e-4

# Or train a single model:
python -m src.models.training_pipeline --agent grid_carbon
python -m src.models.training_pipeline --agent microgrid_storage
python -m src.models.training_pipeline --agent production_scheduling
python -m src.models.training_pipeline --agent ergonomics_shift
```

Trained PEFT/LoRA adapter weights are exported to `models/weights/{agent_name}_lora`.

---

## 7. Running Tests

Run the complete test suite (23 unit & integration tests covering guardrails, anti-reward hacking, dataset generators, and API routes):

```bash
pytest -v
```

All tests pass cleanly:
```
tests/test_api.py::test_health_endpoint PASSED                           [  4%]
tests/test_api.py::test_telemetry_ingest_endpoint PASSED                 [  8%]
tests/test_api.py::test_workorder_creation_endpoint PASSED               [ 13%]
tests/test_api.py::test_orchestrator_tick_and_status_endpoints PASSED    [ 17%]
tests/test_api.py::test_mode_switch_and_overrides_endpoints PASSED       [ 21%]
tests/test_connectors.py::test_timescale_in_memory_fallback PASSED       [ 26%]
tests/test_connectors.py::test_mqtt_connector_offline_buffer PASSED      [ 30%]
tests/test_connectors.py::test_opcua_simulator_nodes_initialization PASSED [ 34%]
tests/test_dataset_generator.py::test_generator_weather_and_grid_profiles PASSED [ 39%]
tests/test_dataset_generator.py::test_generator_creates_aligned_schemas PASSED [ 43%]
tests/test_orchestrator.py::test_orchestrator_tick_execution PASSED      [ 47%]
tests/test_orchestrator.py::test_orchestrator_mode_switching PASSED      [ 52%]
tests/test_orchestrator.py::test_operator_override_application PASSED    [ 56%]
tests/test_reward_engine.py::test_reward_scorer_anti_reward_hacking PASSED [ 60%]
tests/test_reward_engine.py::test_composite_reward_weighting PASSED      [ 65%]
tests/test_reward_engine.py::test_reward_engine_rolling_kpis PASSED      [ 69%]
tests/test_schemas_and_guardrails.py::test_grid_carbon_action_schema_validation PASSED [ 73%]
tests/test_schemas_and_guardrails.py::test_bess_reserve_floor_guardrail_at_30_pct PASSED [ 78%]
tests/test_schemas_and_guardrails.py::test_bess_reserve_floor_clamping_projected_soc PASSED [ 82%]
tests/test_schemas_and_guardrails.py::test_bess_reserve_with_grid_guarantee PASSED [ 86%]
tests/test_mps_anti_tardiness_guardrail PASSED                            [ 91%]
tests/test_thermal_oven_decay_guardrail PASSED                            [ 95%]
tests/test_ergonomics_temperature_and_night_noise_guardrail PASSED       [100%]
============================= 23 passed in 12.18s =============================
```

---

## 8. API Reference & Operator Overrides

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Health & connector status check |
| `POST` | `/api/v1/telemetry` | Ingest external sensor telemetry packet |
| `POST` | `/api/v1/workorders` | Dispatch new ERP work order into queue |
| `POST` | `/api/v1/orchestrator/tick` | Trigger an on-demand Dec-POMDP negotiation tick |
| `GET` | `/api/v1/orchestrator/status` | Read current telemetry, active orders, and KPIs |
| `POST` | `/api/v1/orchestrator/mode` | Switch execution mode between `shadow` and `live_pilot` |
| `POST` | `/api/v1/orchestrator/override` | Set manual operator setpoint override |
| `DELETE` | `/api/v1/orchestrator/override/{asset_id}` | Clear operator override |
| `GET` | `/api/v1/metrics/rewards` | Query reward trajectory for Grafana dashboards |
| `GET` | `/api/v1/metrics/summary` | Aggregated operational KPI summary |
| `WS` | `/ws/live` | Real-time WebSocket event stream |

### Example: Operator Override on BESS
```bash
curl -X POST http://localhost:8000/api/v1/orchestrator/override \
  -H "Content-Type: application/json" \
  -d '{
    "asset_id": "bess",
    "setpoints": {
      "bess_charge_discharge_kw": 100.0
    },
    "notes": "Emergency solar absorption command"
  }'
```

---

## 9. Kubernetes / K3s Deployment

Deploy to edge Kubernetes / K3s clusters:

```bash
kubectl apply -f k3s/namespace.yaml
kubectl apply -f k3s/configmap.yaml
kubectl apply -f k3s/timescaledb.yaml
kubectl apply -f k3s/mosquitto.yaml
kubectl apply -f k3s/backend-api.yaml
kubectl apply -f k3s/opcua-sim.yaml
```

---

## 10. License

Apache 2.0. Copyright (c) 2026 VidyutSync Team.
