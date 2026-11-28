"""ParkSMART - Structured JSON Logging Configuration (File 13)."""

from __future__ import annotations

import contextvars
import logging
import sys
from typing import Any

try:
    import structlog
except ImportError:
    structlog = None  # type: ignore

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

SENSITIVE_LOG_KEYS = frozenset({
    "password",
    "password_hash",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "device_secret",
    "device_secret_hash",
    "authorization",
})


def _filter_sensitive_keys(_, __, event_dict: dict[str, Any]) -> dict[str, Any]:
    """Drops sensitive credentials and token values from logs."""
    for key in list(event_dict.keys()):
        if key.lower() in SENSITIVE_LOG_KEYS:
            event_dict[key] = "[REDACTED]"
    return event_dict


def _add_request_id(_, __, event_dict: dict[str, Any]) -> dict[str, Any]:
    """Injects current request ID into log context."""
    req_id = request_id_var.get()
    if req_id and req_id != "-":
        event_dict["request_id"] = req_id
    return event_dict


def setup_logging(level: str = "INFO") -> None:
    """Configures structured JSON logging with context correlation."""
    log_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=log_level)

    # Silence uvicorn access noise
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    if structlog is not None:
        structlog.configure(
            processors=[
                structlog.contextvars.merge_contextvars,
                structlog.stdlib.add_log_level,
                _add_request_id,
                _filter_sensitive_keys,
                structlog.processors.TimeStamper(fmt="iso", utc=True),
                structlog.processors.JSONRenderer(),
            ],
            wrapper_class=structlog.stdlib.BoundLogger,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=True,
        )
