-- TimescaleDB Initialization Script for VidyutSync (EcoSync-Industrial)

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 1. Telemetry Stream Hypertable
CREATE TABLE IF NOT EXISTS telemetry_stream (
    time TIMESTAMPTZ NOT NULL,
    asset_id VARCHAR(64) NOT NULL,
    metric VARCHAR(64) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(32)
);

SELECT create_hypertable('telemetry_stream', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_telemetry_asset_metric ON telemetry_stream (asset_id, metric, time DESC);

-- 2. Carbon & TOU Tariff Forecasts
CREATE TABLE IF NOT EXISTS carbon_tariff_forecast (
    time TIMESTAMPTZ NOT NULL,
    carbon_intensity_gco2_kwh DOUBLE PRECISION NOT NULL,
    tou_tariff_usd_kwh DOUBLE PRECISION NOT NULL,
    demand_charge_usd_kw DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    is_clean_window BOOLEAN DEFAULT FALSE
);

SELECT create_hypertable('carbon_tariff_forecast', 'time', if_not_exists => TRUE);

-- 3. Agent Decisions Log
CREATE TABLE IF NOT EXISTS agent_decisions (
    time TIMESTAMPTZ NOT NULL,
    tick_id VARCHAR(64) NOT NULL,
    agent_name VARCHAR(64) NOT NULL,
    action_payload JSONB NOT NULL,
    passed_guardrails BOOLEAN NOT NULL,
    guardrail_modifications JSONB,
    mode VARCHAR(32) NOT NULL DEFAULT 'shadow'
);

SELECT create_hypertable('agent_decisions', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_decisions_tick ON agent_decisions (tick_id, time DESC);

-- 4. Orchestrator Reward Metrics
CREATE TABLE IF NOT EXISTS orchestrator_rewards (
    time TIMESTAMPTZ NOT NULL,
    tick_id VARCHAR(64) NOT NULL,
    r_carbon DOUBLE PRECISION NOT NULL,
    r_cost DOUBLE PRECISION NOT NULL,
    r_schedule DOUBLE PRECISION NOT NULL,
    r_worker DOUBLE PRECISION NOT NULL,
    r_total DOUBLE PRECISION NOT NULL
);

SELECT create_hypertable('orchestrator_rewards', 'time', if_not_exists => TRUE);

-- 5. ERP Master Production Schedule (MPS) Work Orders
CREATE TABLE IF NOT EXISTS work_orders (
    order_id VARCHAR(64) PRIMARY KEY,
    machine_id VARCHAR(64) NOT NULL,
    part_type VARCHAR(64) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    target_completion_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    power_rating_kw DOUBLE PRECISION NOT NULL,
    preheat_required BOOLEAN DEFAULT FALSE,
    thermal_decay_threshold_c DOUBLE PRECISION DEFAULT 200.0,
    actual_completion_time TIMESTAMPTZ
);

-- 6. Operator Overrides
CREATE TABLE IF NOT EXISTS operator_overrides (
    override_id VARCHAR(64) PRIMARY KEY,
    asset_id VARCHAR(64) NOT NULL,
    override_type VARCHAR(64) NOT NULL,
    setpoints JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    operator_notes TEXT
);
