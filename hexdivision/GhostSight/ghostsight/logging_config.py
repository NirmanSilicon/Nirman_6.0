"""Logging setup for GhostSight.

Log messages go to a rotating file. The terminal is reserved for
user-facing Rich output.
"""

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from ghostsight.paths import get_logs_dir

ROOT_LOGGER_NAME = "ghostsight"
LOG_FILE_NAME = "ghostsight.log"
MAX_LOG_BYTES = 1_000_000
BACKUP_COUNT = 3
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"


def setup_logging(verbose: bool = False) -> Path | None:
    """Configure file logging and return the log file path.

    Returns None if the log file cannot be created, so the caller
    can warn the user without crashing.
    """
    logger = logging.getLogger(ROOT_LOGGER_NAME)
    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    _remove_handlers(logger)

    log_path = get_logs_dir() / LOG_FILE_NAME
    try:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        handler = RotatingFileHandler(
            log_path,
            maxBytes=MAX_LOG_BYTES,
            backupCount=BACKUP_COUNT,
            encoding="utf-8",
        )
    except OSError:
        logger.addHandler(logging.NullHandler())
        return None

    handler.setLevel(logging.DEBUG if verbose else logging.INFO)
    handler.setFormatter(logging.Formatter(LOG_FORMAT))
    logger.addHandler(handler)
    return log_path


def _remove_handlers(logger: logging.Logger) -> None:
    """Detach and close existing handlers so setup can safely run twice."""
    for handler in list(logger.handlers):
        logger.removeHandler(handler)
        handler.close()
