"""Tests that the version number is defined in exactly one place."""

import re
import tomllib
from importlib.metadata import version
from pathlib import Path

import ghostsight

PYPROJECT = Path(__file__).resolve().parents[1] / "pyproject.toml"


def test_installed_version_matches_code() -> None:
    """The version pip recorded must equal the one in the code."""
    assert version("ghostsight") == ghostsight.__version__


def test_pyproject_does_not_hard_code_version() -> None:
    """pyproject.toml must read the version, not repeat it."""
    data = tomllib.loads(PYPROJECT.read_text(encoding="utf-8"))
    project = data["project"]
    assert "version" not in project
    assert "version" in project["dynamic"]


def test_version_has_major_minor_patch_form() -> None:
    """The version should look like 0.1.0."""
    assert re.fullmatch(r"\d+\.\d+\.\d+", ghostsight.__version__)
