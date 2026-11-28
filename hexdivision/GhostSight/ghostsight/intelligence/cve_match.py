"""Combine the results of many rules into one answer per CVE.

Nothing here uses the network or touches a file.

Policy (decision 36 h, plus a working rule that is reasoned and not yet
probed against real data):

* A readable MATCH in an ordinary node wins over everything else.
* Anything unreadable gives CANNOT_TELL, never a clean NO_MATCH. "We
  could not read part of the data" must not look like "clean".
* NO_MATCH is returned only when every rule about this product was
  readable and none matched, or when no rule was about this product.
* Negated nodes and nodes whose operator is not OR were never seen in
  the real data. If such a node has a rule about this product, the
  answer is CANNOT_TELL. Otherwise the node is ignored.
* AND platform conditions are not checked. A MATCH here does not say
  that the platform was confirmed.
"""

from enum import Enum

from ghostsight.intelligence.cpe_version import ServiceVersion
from ghostsight.intelligence.nvd_reader import CveRecord, MatchNode
from ghostsight.intelligence.rule_match import RuleResult, apply_rule

# Operators treated as plain OR. NVD leaves the operator out of some nodes.
_OR_OPERATORS = ("OR", "")

_UNREADABLE = (RuleResult.VERSION_UNREADABLE, RuleResult.NAME_UNREADABLE)


class CveMatch(Enum):
    """What the rules of one CVE say about one target version."""

    MATCH = "match"
    CANNOT_TELL = "cannot tell"
    NO_MATCH = "no match"


def _is_odd(node: MatchNode) -> bool:
    """True for a negated node or one whose operator is not OR."""
    return node.negate or node.operator not in _OR_OPERATORS


def match_cve(record: CveRecord, target: ServiceVersion) -> CveMatch:
    """Say what one CVE record means for one target version."""
    unclear = False
    for configuration in record.configurations:
        for node in configuration.nodes:
            results = [apply_rule(rule, target) for rule in node.rules]
            if _is_odd(node):
                if any(r is not RuleResult.NOT_APPLICABLE for r in results):
                    unclear = True
                continue
            if RuleResult.MATCH in results:
                return CveMatch.MATCH
            if any(r in _UNREADABLE for r in results):
                unclear = True
    if unclear:
        return CveMatch.CANNOT_TELL
    return CveMatch.NO_MATCH
