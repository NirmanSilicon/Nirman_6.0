from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    app_env: str = "dev"
    database_url: str = "postgresql+psycopg://ouroboros:ouroboros@db:5432/ouroboros"
    inference_url: str = "http://inference:8001"
    inference_timeout_s: float = 20.0

    s3_endpoint: str = "http://minio:9000"
    s3_access_key: str = "ouroboros"
    s3_secret_key: str = "ouroboros-minio"
    s3_bucket: str = "ouroboros-scans"
    s3_region: str = "us-east-1"

    jwt_secret: str = "dev-secret-change-me"
    jwt_ttl_hours: int = 24 * 30
    cors_origins: str = "http://localhost:8080,http://localhost:5173"

    max_upload_mb: int = 12
    max_image_px: int = 1600
    blur_threshold: float = 50.0       # Laplacian variance on a 640px grey image
    dark_threshold: float = 45.0       # mean luma 0-255
    bright_threshold: float = 235.0

    board_min_conf: float = 0.5        # PRD 8.4: below this -> "not sure"
    det_min_conf: float = 0.35         # detections below this are ignored
    reuse_min_conf: float = 0.6        # PRD 9.2 hard rule

    otp_ttl_s: int = 300
    otp_max_per_hour: int = 5

    @property
    def is_dev(self) -> bool:
        return self.app_env == "dev"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
