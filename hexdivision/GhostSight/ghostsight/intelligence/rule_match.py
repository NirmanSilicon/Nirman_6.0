"""Apply one NVD match rule to one target version (decision 36 h).

Nothing here uses the network or touches a file.

The answer is one of five results, kept apart on purpose. The code that
combines the results of many rules decides what an unreadable rule
means for the final answer. This function does not.

An exact rule with update "-" matches only a target with no update.
AND platform conditions are not checked here: a rule that is not
marked vulnerable is a platform condition and says nothing about the
software itself.

A bare wildcard (version "*", update "*", no bounds) on the right
product means every version, which is how NVD reads it, so it is a
match. The evidence step labels it as the weakest kind of match.

A range rule with update "*" ignores the update. A range rule that
names its own update (for example "p2") matches only a target with
that same update. If the number is in range but the update differs, or
the update is "-", the answer is VERSION_UNREADABLE. In the OpenSSH
sample NVD did not list a "*:p2" range for a p1 target, but only 4 such
rules exist, so this is a cautious policy and not a proven NVD rule.
"""

import re
from enum import Enum

from ghostsight.intelligence.cpe_criteria import Criteria, read_criteria
from ghostsight.intelligence.cpe_version import ServiceVersion
from ghostsight.intelligence.nvd_reader import MatchRule
from ghostsight.intelligence.version_compare import compare_numbers, parse_number

# The update forms seen for OpenSSH: "p" and digits (decision 36 h).
_UPDATE_PATTERN = re.compile(r"p[0-9]+")


class RuleResult(Enum):
    """What one rule says about one target version."""

    MATCH = "match"
    NO_MATCH = "no match"
    NOT_APPLICABLE = "not applicable"
    VERSION_UNREADABLE = "version unreadable"
    NAME_UNREADABLE = "name unreadable"


def _is_same_product(criteria: Criteria, target: ServiceVersion) -> bool:
    """Compare part, vendor and product, ignoring case."""
    return (
        criteria.part.lower() == target.part.lower()
        and criteria.vendor.lower() == target.vendor.lower()
        and criteria.product.lower() == target.product.lower()
    )


def _has_bounds(rule: MatchRule) -> bool:
    """True if the rule sets at least one of its four version bounds."""
    return bool(
        rule.version_start_including
        or rule.version_start_excluding
        or rule.version_end_including
        or rule.version_end_excluding
    )


def _apply_exact(criteria: Criteria, target: ServiceVersion) -> RuleResult:
    """Apply a rule that names one exact version."""
    if parse_number(criteria.version) is None:
        return RuleResult.VERSION_UNREADABLE
    update = criteria.update
    if update not in ("*", "-") and _UPDATE_PATTERN.fullmatch(update) is None:
        return RuleResult.VERSION_UNREADABLE
    order = compare_numbers(criteria.version, target.number)
    if order is None:
        return RuleResult.VERSION_UNREADABLE
    if order != 0:
        return RuleResult.NO_MATCH
    if update == "*":
        return RuleResult.MATCH
    if update == "-":
        return RuleResult.MATCH if target.update == "" else RuleResult.NO_MATCH
    return RuleResult.MATCH if update == target.update else RuleResult.NO_MATCH


def _apply_range(rule: MatchRule, target: ServiceVersion) -> RuleResult:
    """Apply a rule that limits the version with bounds.

    Every bound that is set must hold. One readable bound that fails is
    enough for NO_MATCH, even if another bound cannot be read.
    """
    checks = (
        (rule.version_start_including, lambda order: order >= 0),
        (rule.version_start_excluding, lambda order: order > 0),
        (rule.version_end_including, lambda order: order <= 0),
        (rule.version_end_excluding, lambda order: order < 0),
    )
    unreadable = False
    for bound, holds in checks:
        if bound == "":
            continue
        order = compare_numbers(target.number, bound)
        if order is None:
            unreadable = True
        elif not holds(order):
            return RuleResult.NO_MATCH
    if unreadable:
        return RuleResult.VERSION_UNREADABLE
    return RuleResult.MATCH


def _apply_range_update(criteria: Criteria, target: ServiceVersion) -> RuleResult:
    """Check the update of a range rule whose number is already in range.

    Only a wildcard update or exactly the same update is a match.
    Anything else is not guessed.
    """
    if criteria.update == "*":
        return RuleResult.MATCH
    if criteria.update == "-":
        return RuleResult.VERSION_UNREADABLE
    if criteria.update == target.update:
        return RuleResult.MATCH
    return RuleResult.VERSION_UNREADABLE


def apply_rule(rule: MatchRule, target: ServiceVersion) -> RuleResult:
    """Say what one rule means for one target version."""
    if not rule.vulnerable:
        return RuleResult.NOT_APPLICABLE
    criteria = read_criteria(rule.criteria)
    if criteria is None:
        return RuleResult.NAME_UNREADABLE
    if not _is_same_product(criteria, target):
        return RuleResult.NOT_APPLICABLE
    has_bounds = _has_bounds(rule)
    if criteria.version == "*":
        if has_bounds:
            result = _apply_range(rule, target)
            if result is RuleResult.MATCH:
                return _apply_range_update(criteria, target)
            return result
        if criteria.update == "*":
            return RuleResult.MATCH
        # Never seen in real data, so it is not guessed to mean every version.
        return RuleResult.VERSION_UNREADABLE
    if has_bounds:
        return RuleResult.VERSION_UNREADABLE
    return _apply_exact(criteria, target)
