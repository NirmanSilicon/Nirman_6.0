"""Rules that turn the outcome of a check into a finding status.

Pure module: no files, no network, no Metasploit.

Rules:
- A check that says "vulnerable" makes a finding validated.
- A check that says "appears vulnerable" lifts a potential or unknown
  finding to likely. It never lowers or changes any other status.
- A check that only detected the service, or could not tell, changes
  nothing.
- A check that says "not vulnerable" makes a finding a false positive,
  except that a validated finding stays validated. That is a conflict,
  and the caller must record it so a person can look at it.
- A weaker result never lowers a stronger status.
"""

from dataclasses import dataclass
from enum import Enum

from ghostsight.reporting.models import FindingStatus


class CheckOutcome(str, Enum):
    """What a check-only module told us, in GhostSight's own words."""

    VULNERABLE = "vulnerable"
    APPEARS_VULNERABLE = "appears_vulnerable"
    DETECTED = "detected"
    CANNOT_TELL = "cannot_tell"
    NOT_VULNERABLE = "not_vulnerable"


@dataclass(frozen=True)
class StatusDecision:
    """The status a finding should have after a check."""

    status: FindingStatus
    conflict: bool = False


def decide_status(
    current: FindingStatus, outcome: CheckOutcome
) -> StatusDecision:
    """Return the status a finding gets after a check with this outcome."""
    if outcome is CheckOutcome.VULNERABLE:
        return StatusDecision(FindingStatus.VALIDATED)

    if outcome is CheckOutcome.APPEARS_VULNERABLE:
        if current in (FindingStatus.POTENTIAL, FindingStatus.UNKNOWN):
            return StatusDecision(FindingStatus.LIKELY)
        return StatusDecision(current)

    if outcome is CheckOutcome.NOT_VULNERABLE:
        if current is FindingStatus.VALIDATED:
            return StatusDecision(current, conflict=True)
        return StatusDecision(FindingStatus.FALSE_POSITIVE)

    return StatusDecision(current)
