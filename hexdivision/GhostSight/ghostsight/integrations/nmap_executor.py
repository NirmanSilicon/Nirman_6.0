"""Run Nmap and return parsed results.

This is the only module that starts the Nmap process. It never builds a
shell command: the command is a list of arguments, and the target must
already be a normalised address that the scope manager approved.
"""

import logging
import shlex
import shutil
import subprocess

from ghostsight.integrations.nmap_parser import (
    NmapParseError,
    ParsedScan,
    parse_nmap_xml,
)
from ghostsight.integrations.nmap_runner import (
    DEFAULT_PROFILE,
    ScanProfile,
    build_nmap_command,
)

logger = logging.getLogger(__name__)

# Each limit is longer than that profile's --host-timeout, so Nmap's own
# limit normally fires first. This one is the safety net if Nmap hangs.
PROFILE_TIMEOUT_SECONDS: dict[ScanProfile, int] = {
    ScanProfile.LOW_NOISE: 15 * 60,
    ScanProfile.NORMAL: 40 * 60,
    ScanProfile.DEEP: 70 * 60,
}


class NmapRunError(Exception):
    """Nmap could not be started, did not finish, or gave unusable output."""


def run_nmap(
    target: str,
    profile: ScanProfile = DEFAULT_PROFILE,
    skip_discovery: bool = False,
) -> ParsedScan:
    """Scan one normalised, scope-approved target and return parsed results."""
    executable = shutil.which("nmap")
    if executable is None:
        raise NmapRunError(
            "Nmap was not found. Install it with: sudo apt install nmap"
        )

    try:
        command = build_nmap_command(
            target,
            profile,
            executable=executable,
            skip_discovery=skip_discovery,
        )
    except ValueError as error:
        raise NmapRunError(f"Refusing to scan: {error}") from error

    timeout = PROFILE_TIMEOUT_SECONDS[profile]
    logger.info("Running Nmap: %s", shlex.join(command))

    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            stdin=subprocess.DEVNULL,
            check=False,
        )
    except subprocess.TimeoutExpired as error:
        raise NmapRunError(
            f"Nmap did not finish within {timeout} seconds and was stopped."
        ) from error
    except OSError as error:
        raise NmapRunError(f"Could not start Nmap: {error}") from error

    if completed.returncode != 0:
        detail = completed.stderr.strip()[:300] or "no error message"
        raise NmapRunError(f"Nmap exited with code {completed.returncode}: {detail}")

    try:
        return parse_nmap_xml(completed.stdout)
    except NmapParseError as error:
        raise NmapRunError(
            f"Nmap output could not be read safely: {error}"
        ) from error
