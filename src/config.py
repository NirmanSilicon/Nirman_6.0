"""Configuration module for VidyutSync using Pydantic Settings."""

from typing import Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Runtime & API
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ORCHESTRATOR_MODE: Literal["shadow", "live_pilot"] = "shadow"
    TICK_INTERVAL_SECONDS: int = 15

    # TimescaleDB / PostgreSQL
    TIMESCALE_HOST: str = "localhost"
    TIMESCALE_PORT: int = 5432
    TIMESCALE_USER: str = "postgres"
    TIMESCALE_PASSWORD: str = "postgres"
    TIMESCALE_DB: str = "vidyutsync"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/vidyutsync"

    # MQTT (Eclipse Mosquitto)
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 1883
    MQTT_CLIENT_ID: str = "vidyutsync-backend"
    MQTT_USERNAME: str | None = None
    MQTT_PASSWORD: str | None = None
    MQTT_KEEPALIVE: int = 60

    # OPC UA
    OPCUA_SERVER_ENDPOINT: str = "opc.tcp://localhost:4840/freeopcua/server/"
    OPCUA_NAMESPACE: str = "urn:vidyutsync:plant:mfg01"
    OPCUA_SIMULATOR_PORT: int = 4840

    # Kafka (Optional)
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_TOPIC_PREFIX: str = "vidyutsync."

    # LLM Settings
    BASE_MODEL_NAME: str = "Qwen/Qwen2.5-0.5B-Instruct"
    GRID_CARBON_MODEL_PATH: str = "models/weights/grid_carbon_lora"
    MICROGRID_STORAGE_MODEL_PATH: str = "models/weights/microgrid_storage_lora"
    PRODUCTION_SCHEDULING_MODEL_PATH: str = "models/weights/production_scheduling_lora"
    ERGONOMICS_SHIFT_MODEL_PATH: str = "models/weights/ergonomics_shift_lora"
    LLM_DEVICE: str = "cpu"
    USE_MOCK_LLM: bool = True
    LLM_MAX_NEW_TOKENS: int = 256
    LLM_TEMPERATURE: float = 0.2

    # Reward Formulation Weights:
    # R_total = w1*R_carbon + w2*R_cost + w3*R_schedule + w4*R_worker
    REWARD_WEIGHT_CARBON: float = 0.35
    REWARD_WEIGHT_COST: float = 0.30
    REWARD_WEIGHT_SCHEDULE: float = 0.25
    REWARD_WEIGHT_WORKER: float = 0.10

    # Hard Safety Guardrail Thresholds
    BESS_MIN_SOC_FLOOR_PCT: float = 30.0  # Strict 30% reserve floor without grid guarantees
    BESS_MAX_CHARGE_RATE_KW: float = 250.0
    BESS_MAX_DISCHARGE_RATE_KW: float = 250.0
    WORKER_MAX_NOISE_DAY_DB: float = 85.0
    WORKER_MAX_NOISE_NIGHT_DB: float = 70.0
    WORKER_MIN_COMFORT_TEMP_C: float = 18.0
    WORKER_MAX_COMFORT_TEMP_C: float = 26.0
    MAX_GRID_DRAW_KW: float = 1200.0
    MPS_TARDINESS_PENALTY_RATE: float = 50.0  # Heavy penalty per minute of tardiness


settings = Settings()
