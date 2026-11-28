import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "MechGuard"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Storage & DB
    DATABASE_URL: str = "sqlite:///./mechguard.db"
    STATIC_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
    INCIDENTS_DIR: str = os.path.join(STATIC_DIR, "incidents")
    
    # Ingestion Protocols
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 1883
    MQTT_TELEMETRY_TOPIC: str = "mechguard/+/+/telemetry"
    MQTT_HEARTBEAT_TOPIC: str = "mechguard/+/+/heartbeat"
    MQTT_STATUS_TOPIC: str = "mechguard/+/+/status"
    
    OPCUA_SERVER_ENDPOINT: str = "opc.tcp://localhost:4840/mechguard/server/"
    
    # Thresholds & Windows
    FEATURE_WINDOW_SECONDS: int = 3
    VIBRATION_SAMPLE_RATE_HZ: int = 100
    STALE_DATA_TIMEOUT_SECONDS: float = 5.0
    HEARTBEAT_INTERVAL_SECONDS: float = 2.0
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
os.makedirs(settings.INCIDENTS_DIR, exist_ok=True)
