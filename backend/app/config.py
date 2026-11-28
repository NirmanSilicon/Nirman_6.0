"""ParkSMART - Configuration and Settings (File 12)."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

try:
    from pydantic import field_validator
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    class BaseSettings:  # type: ignore
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
    def field_validator(*args, **kwargs):  # type: ignore
        def dec(f):
            return f
        return dec
    def SettingsConfigDict(**kwargs):  # type: ignore
        return kwargs


class Settings(BaseSettings):
    """Typed, validated settings loaded from environment."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["development", "test", "production"] = "development"
    log_level: str = "INFO"

    # Database
    database_url: str = "postgresql+asyncpg://parksmart:CHANGE_ME@db:5432/parksmart"

    # Auth
    jwt_secret: str = "CHANGE_ME_MIN_32_CHARS_LONG_SECRET_KEY"
    jwt_algorithm: str = "HS256"
    access_ttl_min: int = 15
    refresh_ttl_days: int = 14

    # MQTT
    mqtt_enabled: bool = False
    mqtt_host: str = "mosquitto"
    mqtt_port: int = 8883
    mqtt_username: str = "backend"
    mqtt_password: str = "CHANGE_ME"
    mqtt_tls: bool = True
    mqtt_ca_file: str | None = None

    # Data Quality
    stale_after_s: int = 120
    unavailable_after_s: int = 600
    max_future_skew_s: int = 30
    rate_limit_per_min: int = 120
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:8080,http://localhost:19006,*"

    # Forecast & History
    min_history_days: int = 14
    agg_interval_min: int = 15

    # Privacy & Map
    video_retention_days: int = 0
    map_provider: Literal["osm", "google"] = "osm"

    # Zone threshold for UI green indicator
    free_bay_green_threshold: float = 0.30

    @property
    def cors_origins_list(self) -> list[str]:
        if not self.cors_origins:
            return []
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, v: str, info) -> str:
        app_env = info.data.get("app_env", "development")
        if app_env == "production" and ("CHANGE_ME" in v or len(v) < 32):
            raise ValueError("JWT_SECRET must be >=32 chars and not a placeholder in production")
        return v

    @field_validator("database_url")
    @classmethod
    def validate_db_url(cls, v: str, info) -> str:
        app_env = info.data.get("app_env", "development")
        if app_env == "production" and "CHANGE_ME" in v:
            raise ValueError("DATABASE_URL must not contain CHANGE_ME in production")
        return v

    @field_validator("mqtt_password")
    @classmethod
    def validate_mqtt_password(cls, v: str, info) -> str:
        app_env = info.data.get("app_env", "development")
        if app_env == "production" and "CHANGE_ME" in v:
            raise ValueError("MQTT_PASSWORD must not contain CHANGE_ME in production")
        return v

    @field_validator("unavailable_after_s")
    @classmethod
    def validate_unavailable_after_s(cls, v: int, info) -> int:
        stale_s = info.data.get("stale_after_s", 120)
        if v <= stale_s:
            raise ValueError("UNAVAILABLE_AFTER_S must exceed STALE_AFTER_S")
        return v

    @field_validator("agg_interval_min")
    @classmethod
    def validate_agg_interval(cls, v: int) -> int:
        if v not in (5, 15):
            raise ValueError("agg_interval_min must be 5 or 15")
        return v

    @field_validator("access_ttl_min", "refresh_ttl_days")
    @classmethod
    def validate_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Timeouts must be greater than zero")
        return v

    @field_validator("max_future_skew_s")
    @classmethod
    def validate_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("max_future_skew_s must be non-negative")
        return v


@lru_cache
def get_settings() -> Settings:
    """Returns cached application settings."""
    return Settings()
