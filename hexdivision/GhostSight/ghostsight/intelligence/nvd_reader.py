"""Read one NVD CVE record into GhostSight's own immutable structure.

This module uses no network and writes no files. NVD data is third-party
text, so every field is read defensively: a field of the wrong type becomes
an empty value, and a malformed score or match rule is dropped. Only a bad
CVE ID stops the read, because the ID is the key everything else uses.

Text is kept exactly as received (decision 24). Anything that writes it into
a report must neutralise it there (decision 33).
"""

import re
from dataclasses import dataclass

# ASCII digits only: "\d" would also accept digits from other scripts.
CVE_ID_PATTERN = re.compile(r"CVE-[0-9]{4}-[0-9]{4,}")

# Score families GhostSight reads, newest first. The flag says whether
# baseSeverity sits inside cvssData (V3.1) or next to it (V2), as probed.
SCORE_FAMILIES = (
    ("cvssMetricV31", True),
    ("cvssMetricV2", False),
)

# CVSS base scores run from 0 to 10. A number outside that is not a real score.
MIN_BASE_SCORE = 0
MAX_BASE_SCORE = 10


class NvdFormatError(ValueError):
    """The record is too malformed to use safely."""


@dataclass(frozen=True)
class CvssScore:
    """One score from one scorer. GhostSight never picks between scorers."""

    source: str
    score_type: str
    cvss_version: str
    base_score: float
    severity: str
    vector: str


@dataclass(frozen=True)
class MatchRule:
    """One CPE rule. An empty bound means that bound is not set."""

    criteria: str
    vulnerable: bool
    version_start_including: str
    version_start_excluding: str
    version_end_including: str
    version_end_excluding: str


@dataclass(frozen=True)
class MatchNode:
    operator: str
    negate: bool
    rules: tuple[MatchRule, ...]


@dataclass(frozen=True)
class Configuration:
    """Nodes that are combined by the operator ("AND", or "" when absent)."""

    operator: str
    nodes: tuple[MatchNode, ...]


@dataclass(frozen=True)
class CveRecord:
    cve_id: str
    published: str
    last_modified: str
    status: str
    description: str
    scores: tuple[CvssScore, ...]
    configurations: tuple[Configuration, ...]


def _text(value: object) -> str:
    """The value if it is text, otherwise an empty string."""
    return value if isinstance(value, str) else ""


def _dicts(value: object) -> list[dict]:
    """The dictionaries inside a list. Anything else gives an empty list."""
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _english_description(raw: dict) -> str:
    for entry in _dicts(raw.get("descriptions")):
        if entry.get("lang") == "en" and isinstance(entry.get("value"), str):
            return entry["value"]
    return ""


def _is_valid_base_score(value: object) -> bool:
    """True for a real number from 0 to 10. Refuses True, NaN and infinity."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    return MIN_BASE_SCORE <= value <= MAX_BASE_SCORE


def _read_score(entry: dict, severity_inside: bool) -> CvssScore | None:
    cvss_data = entry.get("cvssData")
    if not isinstance(cvss_data, dict):
        return None
    base_score = cvss_data.get("baseScore")
    if not _is_valid_base_score(base_score):
        return None
    severity_holder = cvss_data if severity_inside else entry
    return CvssScore(
        source=_text(entry.get("source")),
        score_type=_text(entry.get("type")),
        cvss_version=_text(cvss_data.get("version")),
        base_score=float(base_score),
        severity=_text(severity_holder.get("baseSeverity")),
        vector=_text(cvss_data.get("vectorString")),
    )


def _read_scores(raw: dict) -> tuple[CvssScore, ...]:
    metrics = raw.get("metrics")
    if not isinstance(metrics, dict):
        return ()
    scores = []
    for family, severity_inside in SCORE_FAMILIES:
        for entry in _dicts(metrics.get(family)):
            score = _read_score(entry, severity_inside)
            if score is not None:
                scores.append(score)
    return tuple(scores)


def _read_rule(raw: dict) -> MatchRule | None:
    criteria = raw.get("criteria")
    if not isinstance(criteria, str):
        return None
    return MatchRule(
        criteria=criteria,
        vulnerable=raw.get("vulnerable") is True,
        version_start_including=_text(raw.get("versionStartIncluding")),
        version_start_excluding=_text(raw.get("versionStartExcluding")),
        version_end_including=_text(raw.get("versionEndIncluding")),
        version_end_excluding=_text(raw.get("versionEndExcluding")),
    )


def _read_node(raw: dict) -> MatchNode:
    rules = []
    for rule_raw in _dicts(raw.get("cpeMatch")):
        rule = _read_rule(rule_raw)
        if rule is not None:
            rules.append(rule)
    return MatchNode(
        operator=_text(raw.get("operator")),
        negate=raw.get("negate") is True,
        rules=tuple(rules),
    )


def _read_configuration(raw: dict) -> Configuration:
    nodes = tuple(_read_node(node) for node in _dicts(raw.get("nodes")))
    return Configuration(operator=_text(raw.get("operator")), nodes=nodes)


def read_cve(raw: dict) -> CveRecord:
    """Read the inner "cve" object of an NVD API 2.0 vulnerability entry."""
    if not isinstance(raw, dict):
        raise NvdFormatError("A CVE record must be a dictionary.")
    cve_id = raw.get("id")
    if not isinstance(cve_id, str) or not CVE_ID_PATTERN.fullmatch(cve_id):
        # The bad ID is not echoed: it is untrusted text.
        raise NvdFormatError("The CVE record has a missing or malformed id.")
    return CveRecord(
        cve_id=cve_id,
        published=_text(raw.get("published")),
        last_modified=_text(raw.get("lastModified")),
        status=_text(raw.get("vulnStatus")),
        description=_english_description(raw),
        scores=_read_scores(raw),
        configurations=tuple(
            _read_configuration(config)
            for config in _dicts(raw.get("configurations"))
        ),
    )
