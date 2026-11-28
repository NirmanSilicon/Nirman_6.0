"""Tests for ghostsight.logging_config."""

import logging

from ghostsight.logging_config import setup_logging
from ghostsight.paths import HOME_ENV_VAR


def test_setup_creates_log_file_in_logs_dir(isolated_home):
    log_path = setup_logging()
    logging.getLogger("ghostsight.test").info("hello from test")

    assert log_path == isolated_home / "logs" / "ghostsight.log"
    assert "hello from test" in log_path.read_text(encoding="utf-8")


def test_debug_messages_hidden_by_default(isolated_home):
    log_path = setup_logging(verbose=False)
    test_logger = logging.getLogger("ghostsight.test")
    test_logger.debug("debug-line")
    test_logger.info("info-line")

    content = log_path.read_text(encoding="utf-8")
    assert "info-line" in content
    assert "debug-line" not in content


def test_verbose_includes_debug_messages(isolated_home):
    log_path = setup_logging(verbose=True)
    logging.getLogger("ghostsight.test").debug("debug-line")

    assert "debug-line" in log_path.read_text(encoding="utf-8")


def test_unwritable_log_location_returns_none(isolated_home, monkeypatch):
    blocker = isolated_home / "not_a_directory"
    blocker.write_text("this is a file, not a folder")
    monkeypatch.setenv(HOME_ENV_VAR, str(blocker))

    assert setup_logging() is None
