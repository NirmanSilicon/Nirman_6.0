"""Environment-driven configuration for Node 4."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
MOCKS_DIR = BASE_DIR / "mocks"

LLMProvider = Literal["mock", "ollama"]

_TRUE_VALUES = frozenset({"1", "true", "yes", "on"})
_FALSE_VALUES = frozenset({"0", "false", "no", "off"})


@dataclass(frozen=True, slots=True)
class Settings:
    """Immutable runtime settings."""

    node4_host: str
    node4_port: int
    cors_allow_origins: tuple[str, ...]
    log_level: str
    use_mock_graph_rag: bool
    neo4j_uri: str
    neo4j_user: str
    neo4j_password: str
    neo4j_database: str
    node3_query_timeout_ms: int
    llm_provider: LLMProvider
    ollama_base_url: str
    ollama_model: str
    ollama_timeout_ms: int


def _env_str(name: str, default: str) -> str:
    value = os.getenv(name, "").strip()
    return value or default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    if raw in _TRUE_VALUES:
        return True
    if raw in _FALSE_VALUES:
        return False
    raise ValueError(f"{name} must be true or false, got {raw!r}")


def _env_positive_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer, got {raw!r}") from exc
    if value <= 0:
        raise ValueError(f"{name} must be greater than zero, got {value}")
    return value


def _env_llm_provider() -> LLMProvider:
    raw = _env_str("LLM_PROVIDER", "mock").lower()
    if raw == "mock":
        return "mock"
    if raw == "ollama":
        return "ollama"
    raise ValueError(f"LLM_PROVIDER must be 'mock' or 'ollama', got {raw!r}")


def load_settings() -> Settings:
    """Read settings from the process environment and ``.env``.

    Variables already set in the environment take precedence over ``.env``.
    Invalid values raise ``ValueError`` so misconfiguration fails at startup.
    """
    load_dotenv(BASE_DIR / ".env", override=False)

    origins = tuple(
        origin.strip().rstrip("/")
        for origin in _env_str("CORS_ALLOW_ORIGINS", "*").split(",")
        if origin.strip()
    )

    return Settings(
        node4_host=_env_str("NODE4_HOST", "0.0.0.0"),
        node4_port=_env_positive_int("NODE4_PORT", 8004),
        cors_allow_origins=origins or ("*",),
        log_level=_env_str("LOG_LEVEL", "INFO").upper(),
        use_mock_graph_rag=_env_bool("USE_MOCK_GRAPH_RAG", True),
        neo4j_uri=_env_str("NODE3_NEO4J_URI", "bolt://127.0.0.1:7687"),
        neo4j_user=_env_str("NEO4J_USER", "neo4j"),
        neo4j_password=os.getenv("NEO4J_PASSWORD", ""),
        neo4j_database=_env_str("NEO4J_DATABASE", "neo4j"),
        node3_query_timeout_ms=_env_positive_int("NODE3_QUERY_TIMEOUT_MS", 1500),
        llm_provider=_env_llm_provider(),
        ollama_base_url=_env_str("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
        ollama_model=_env_str("OLLAMA_MODEL", "qwen3:8b"),
        ollama_timeout_ms=_env_positive_int("OLLAMA_TIMEOUT_MS", 15000),
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide cached settings."""
    return load_settings()
