"""Tests for the rules that turn a check outcome into a finding status."""

import pytest

from ghostsight.reporting.models import FindingStatus
from ghostsight.validation.status_rules import CheckOutcome, decide_status

POTENTIAL = FindingStatus.POTENTIAL
LIKELY = FindingStatus.LIKELY
VALIDATED = FindingStatus.VALIDATED
FALSE_POSITIVE = FindingStatus.FALSE_POSITIVE
UNKNOWN = FindingStatus.UNKNOWN

VULNERABLE = CheckOutcome.VULNERABLE
APPEARS = CheckOutcome.APPEARS_VULNERABLE
DETECTED = CheckOutcome.DETECTED
CANNOT_TELL = CheckOutcome.CANNOT_TELL
NOT_VULNERABLE = CheckOutcome.NOT_VULNERABLE

# Written out in full on purpose, so the tests do not copy the code's logic.
# (current status, check outcome, expected status, expected conflict)
TABLE = [
    (POTENTIAL, VULNERABLE, VALIDATED, False),
    (LIKELY, VULNERABLE, VALIDATED, False),
    (VALIDATED, VULNERABLE, VALIDATED, False),
    (FALSE_POSITIVE, VULNERABLE, VALIDATED, False),
    (UNKNOWN, VULNERABLE, VALIDATED, False),
    (POTENTIAL, APPEARS, LIKELY, False),
    (LIKELY, APPEARS, LIKELY, False),
    (VALIDATED, APPEARS, VALIDATED, False),
    (FALSE_POSITIVE, APPEARS, FALSE_POSITIVE, False),
    (UNKNOWN, APPEARS, LIKELY, False),
    (POTENTIAL, DETECTED, POTENTIAL, False),
    (LIKELY, DETECTED, LIKELY, False),
    (VALIDATED, DETECTED, VALIDATED, False),
    (FALSE_POSITIVE, DETECTED, FALSE_POSITIVE, False),
    (UNKNOWN, DETECTED, UNKNOWN, False),
    (POTENTIAL, CANNOT_TELL, POTENTIAL, False),
    (LIKELY, CANNOT_TELL, LIKELY, False),
    (VALIDATED, CANNOT_TELL, VALIDATED, False),
    (FALSE_POSITIVE, CANNOT_TELL, FALSE_POSITIVE, False),
    (UNKNOWN, CANNOT_TELL, UNKNOWN, False),
    (POTENTIAL, NOT_VULNERABLE, FALSE_POSITIVE, False),
    (LIKELY, NOT_VULNERABLE, FALSE_POSITIVE, False),
    (VALIDATED, NOT_VULNERABLE, VALIDATED, True),
    (FALSE_POSITIVE, NOT_VULNERABLE, FALSE_POSITIVE, False),
    (UNKNOWN, NOT_VULNERABLE, FALSE_POSITIVE, False),
]


@pytest.mark.parametrize("current, outcome, expected, conflict", TABLE)
def test_decision_matches_the_table(current, outcome, expected, conflict):
    decision = decide_status(current, outcome)
    assert decision.status is expected
    assert decision.conflict is conflict


def test_table_covers_every_pair():
    pairs = {(row[0], row[1]) for row in TABLE}
    assert len(TABLE) == 25
    assert pairs == {(s, o) for s in FindingStatus for o in CheckOutcome}


def test_validated_is_never_lowered_by_a_check():
    for outcome in CheckOutcome:
        assert decide_status(VALIDATED, outcome).status is VALIDATED


def test_outcome_values_are_plain_text():
    assert CheckOutcome.NOT_VULNERABLE.value == "not_vulnerable"
