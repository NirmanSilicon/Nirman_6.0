import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    profile: str
    database: str
    operator_token: str
    sandbox_token: str

    @classmethod
    def from_env(cls) -> "Settings":
        settings = cls(
            profile=os.getenv("AGENT_X_PROFILE", "production"),
            database=os.getenv("AGENT_X_DATABASE", "data/product.sqlite3"),
            operator_token=os.getenv("AGENT_X_OPERATOR_TOKEN", ""),
            sandbox_token=os.getenv("AGENT_X_SANDBOX_TOKEN", ""),
        )
        if settings.profile not in {"production", "sandbox"}:
            raise ValueError("AGENT_X_PROFILE must be production or sandbox")
        if not settings.operator_token:
            raise ValueError("AGENT_X_OPERATOR_TOKEN is required")
        if settings.profile == "sandbox" and (
            not settings.sandbox_token or settings.operator_token == settings.sandbox_token
        ):
            raise ValueError("Sandbox requires a separate AGENT_X_SANDBOX_TOKEN")
        return settings
