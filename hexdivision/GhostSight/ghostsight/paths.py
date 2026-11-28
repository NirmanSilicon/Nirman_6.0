"""Locations of GhostSight's working files."""

import os
from pathlib import Path

HOME_ENV_VAR = "GHOSTSIGHT_HOME"


def get_home_dir() -> Path:
    """Return GhostSight's base directory.

    Uses the GHOSTSIGHT_HOME environment variable if it is set.
    Otherwise uses the project folder (the parent of this package).
    """
    custom_home = os.environ.get(HOME_ENV_VAR)
    if custom_home:
        return Path(custom_home).expanduser().resolve()
    return Path(__file__).resolve().parent.parent


def get_logs_dir() -> Path:
    """Return the directory where log files are stored."""
    return get_home_dir() / "logs"
