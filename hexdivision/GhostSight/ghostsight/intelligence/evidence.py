"""Explain a CVE answer: which rules matched, on what basis, and what
was not checked (decision 38 e, decision 36 c).

Nothing here uses the network or touches a file.

A version match is at most "potential". A distributor may have patched
the flaw without changing the version number, and the platform named in
the CVE is not checked.
"""

from dataclasses import dataclass
from enum import Enum

from ghostsight.intelligence.cpe_criteria import read_criteria
from ghostsight.intelligence.cpe_version import ServiceVersion
from ghostsight.intelligence.cve_match import CveMatch, _is_odd, match_cve
from ghostsight.intelligence.nvd_reader import CveRecord, MatchRule
from ghostsight.intelligence.rule_match import RuleResult, apply_rule
from ghostsight.intelligence.score_choice import ScoreChoice, choose_scores

_PLATFORM_CAVEAT = (
    "The platform (operating system or hardware) named in the CVE "
    "was not checked."
)
_BACKPORT_CAVEAT = (
    "A distributor may have backported a fix without changing the "
    "version number, so this version may already be patched."
)
_UNREADABLE_CAVEAT = (
    "Part of the CVE data could not be read or compared. "
    "This is not a clean result."
)
_NO_VERSION_CAVEAT = (
    "No version could be read for this service, so this CVE could not "
    "be checked. This is not a clean result."
)


class Basis(Enum):
    """What kind of rule produced a match."""

    EXACT = "exact version"
    BOUNDED_RANGE = "bounded range"
    OPEN_RANGE = "open-ended range"
    ANY_VERSION = "any version (no version limit)"


@dataclass(frozen=True)
class RuleEvidence:
    """One rule that matched, and its basis."""

    criteria: str
    basis: Basis


@dataclass(frozen=True)
class Evidence:
    """Everything a finding needs to say about one CVE and one service."""

    cve_id: str
    answer: CveMatch
    matches: tuple[RuleEvidence, ...]
    caveats: tuple[str, ...]
    scores: ScoreChoice


def _basis(rule: MatchRule) -> Basis:
    """Classify a rule that matched. Its name is readable, or it could not match."""
    criteria = read_criteria(rule.criteria)
    if criteria is not None and criteria.version != "*":
        return Basis.EXACT
    has_start = bool(rule.version_start_including or rule.version_start_excluding)
    has_end = bool(rule.version_end_including or rule.version_end_excluding)
    if not has_start and not has_end:
        return Basis.ANY_VERSION
    return Basis.BOUNDED_RANGE if has_start and has_end else Basis.OPEN_RANGE


def _matching_rules(
    record: CveRecord, target: ServiceVersion
) -> tuple[RuleEvidence, ...]:
    """Rules that matched, in order. Rules in odd nodes are never listed."""
    found = []
    for configuration in record.configurations:
        for node in configuration.nodes:
            if _is_odd(node):
                continue
            for rule in node.rules:
                if apply_rule(rule, target) is RuleResult.MATCH:
                    found.append(RuleEvidence(rule.criteria, _basis(rule)))
    return tuple(found)


def _caveats(answer: CveMatch) -> tuple[str, ...]:
    if answer is CveMatch.MATCH:
        return (_PLATFORM_CAVEAT, _BACKPORT_CAVEAT)
    if answer is CveMatch.CANNOT_TELL:
        return (_UNREADABLE_CAVEAT, _PLATFORM_CAVEAT, _BACKPORT_CAVEAT)
    return ()


def build_evidence(
    record: CveRecord, target: ServiceVersion | None
) -> Evidence:
    """Build the evidence for one CVE. A target of None means no readable version."""
    scores = choose_scores(record.scores)
    if target is None:
        return Evidence(
            cve_id=record.cve_id,
            answer=CveMatch.CANNOT_TELL,
            matches=(),
            caveats=(_NO_VERSION_CAVEAT,),
            scores=scores,
        )
    answer = match_cve(record, target)
    matches = _matching_rules(record, target) if answer is CveMatch.MATCH else ()
    return Evidence(
        cve_id=record.cve_id,
        answer=answer,
        matches=matches,
        caveats=_caveats(answer),
        scores=scores,
    )
