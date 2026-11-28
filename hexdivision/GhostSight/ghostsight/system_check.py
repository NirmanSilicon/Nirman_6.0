"""System and dependency checks used by the `ghostsight status` command.

This module is plain Python. It returns data and never prints,
so the CLI layer decides how to display it.
"""

import json
import logging
import os
import shutil
import subprocess
import sys
import urllib.request
from dataclasses import dataclass
from enum import Enum

from ghostsight.paths import get_home_dir

logger = logging.getLogger(__name__)

MIN_PYTHON = (3, 12)
COMMAND_TIMEOUT_SECONDS = 5
OLLAMA_TAGS_URL = "http://127.0.0.1:11434/api/tags"
OLLAMA_TIMEOUT_SECONDS = 2


class CheckStatus(str, Enum):
    """Outcome of one check."""

    OK = "ok"
    WARN = "warn"        # found, but something is not right
    MISSING = "missing"  # optional item not installed
    FAIL = "fail"        # a required item is not usable


@dataclass
class CheckResult:
    """The result of checking one dependency."""

    name: str
    status: CheckStatus
    detail: str
    purpose: str = ""


def _first_line(text: str) -> str:
    """Return the first non-empty line of text, or an empty string."""
    for line in text.splitlines():
        if line.strip():
            return line.strip()
    return ""


def check_python() -> CheckResult:
    """Check that the running Python is new enough."""
    version = ".".join(str(part) for part in sys.version_info[:3])
    purpose = "Running GhostSight"
    if sys.version_info[:2] >= MIN_PYTHON:
        return CheckResult("Python", CheckStatus.OK, version, purpose)
    return CheckResult(
        "Python", CheckStatus.FAIL, f"{version} (3.12 or newer required)", purpose
    )


def check_workspace() -> CheckResult:
    """Check that GhostSight's working folder exists and is writable."""
    home = get_home_dir()
    purpose = "Logs and reports"
    if home.is_dir() and os.access(home, os.W_OK):
        return CheckResult("Workspace", CheckStatus.OK, str(home), purpose)
    return CheckResult(
        "Workspace", CheckStatus.FAIL, f"{home} is missing or not writable", purpose
    )


def check_command(
    name: str, version_args: list[str], purpose: str, required: bool = False
) -> CheckResult:
    """Check that a command-line tool is installed and report its version."""
    path = shutil.which(name)
    if path is None:
        status = CheckStatus.FAIL if required else CheckStatus.MISSING
        return CheckResult(name, status, "not installed", purpose)

    try:
        completed = subprocess.run(
            [path, *version_args],
            capture_output=True,
            text=True,
            timeout=COMMAND_TIMEOUT_SECONDS,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        logger.warning("Version check for %s failed: %s", name, error)
        return CheckResult(
            name, CheckStatus.WARN, f"found at {path}, version check failed", purpose
        )

    detail = _first_line(completed.stdout) or _first_line(completed.stderr)
    return CheckResult(name, CheckStatus.OK, detail or f"found at {path}", purpose)


def check_gpu() -> CheckResult:
    """Check for an NVIDIA GPU through nvidia-smi."""
    purpose = "Faster local AI"
    path = shutil.which("nvidia-smi")
    if path is None:
        return CheckResult("NVIDIA GPU", CheckStatus.MISSING, "nvidia-smi not found", purpose)

    query = ["--query-gpu=name,driver_version,memory.total", "--format=csv,noheader"]
    try:
        completed = subprocess.run(
            [path, *query],
            capture_output=True,
            text=True,
            timeout=COMMAND_TIMEOUT_SECONDS,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        logger.warning("GPU check failed: %s", error)
        return CheckResult("NVIDIA GPU", CheckStatus.WARN, "nvidia-smi did not respond", purpose)

    detail = _first_line(completed.stdout)
    if completed.returncode != 0 or not detail:
        return CheckResult("NVIDIA GPU", CheckStatus.WARN, "nvidia-smi reported an error", purpose)
    return CheckResult("NVIDIA GPU", CheckStatus.OK, detail, purpose)


def check_ollama_server() -> CheckResult:
    """Check whether the local Ollama server answers, and list its models."""
    purpose = "Local AI (v0.5.0)"
    try:
        with urllib.request.urlopen(
            OLLAMA_TAGS_URL, timeout=OLLAMA_TIMEOUT_SECONDS
        ) as response:
            data = json.load(response)
    except (OSError, ValueError):
        return CheckResult(
            "ollama server",
            CheckStatus.WARN,
            "not reachable on 127.0.0.1:11434",
            purpose,
        )

    names = [model.get("name", "?") for model in data.get("models", [])]
    if names:
        detail = f"running, {len(names)} model(s): {', '.join(names)}"
    else:
        detail = "running, no models installed (run: ollama pull qwen3:4b)"
        return CheckResult("ollama server", CheckStatus.WARN, detail, purpose)
    return CheckResult("ollama server", CheckStatus.OK, detail, purpose)


METASPLOIT_PROGRAMS = ("msfconsole", "msfrpcd")


def check_metasploit() -> CheckResult:
    """Check that the Metasploit programs exist. They are never started."""
    purpose = "Controlled lab validation"
    missing = [name for name in METASPLOIT_PROGRAMS if shutil.which(name) is None]
    if len(missing) == len(METASPLOIT_PROGRAMS):
        return CheckResult("metasploit", CheckStatus.MISSING, "not installed", purpose)
    if missing:
        detail = f"{', '.join(missing)} not found"
        return CheckResult("metasploit", CheckStatus.WARN, detail, purpose)
    detail = "msfconsole and msfrpcd found (not started)"
    return CheckResult("metasploit", CheckStatus.OK, detail, purpose)


def run_all_checks() -> list[CheckResult]:
    """Run every check and return the results in display order."""
    return [
        check_python(),
        check_workspace(),
        check_command("git", ["--version"], "Version control"),
        check_command("nmap", ["--version"], "Scanning (v0.2.0)"),
        check_command("masscan", ["--version"], "Not used yet (optional)"),
        check_command("ollama", ["--version"], "Local AI (v0.5.0)"),
        check_ollama_server(),
        check_gpu(),
        check_metasploit(),
    ]


def has_failures(results: list[CheckResult]) -> bool:
    """Return True if any required check failed."""
    return any(result.status is CheckStatus.FAIL for result in results)
