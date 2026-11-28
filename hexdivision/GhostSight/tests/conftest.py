"""Shared pytest fixtures."""

import logging

import pytest

from ghostsight.paths import HOME_ENV_VAR


@pytest.fixture(autouse=True)
def isolated_home(tmp_path, monkeypatch):
    """Point GhostSight at a temporary folder for every test.

    This guarantees tests never write to the real logs or output folders.
    """
    monkeypatch.setenv(HOME_ENV_VAR, str(tmp_path))
    yield tmp_path
    logger = logging.getLogger("ghostsight")
    for handler in list(logger.handlers):
        logger.removeHandler(handler)
        handler.close()
