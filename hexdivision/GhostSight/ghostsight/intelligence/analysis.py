"""Turn services plus the stored NVD data into findings and notes.

This module is pure: it reads no files and makes no network calls. The
caller passes in `load_cache`, so tests can run without a disk.

Rules:
  * Only application versions (CPE part "a") are checked.
  * A match from any version of a service wins, then "cannot tell",
    then "no match".
  * A CVE that matches becomes one POTENTIAL finding. A version match is
    not proof, so confidence stays 0.0 (shown as "not rated").
  * CVEs that cannot be checked become ONE unknown finding per service,
    so they do not bury the real matches.
  * Missing, empty or unreadable data is reported in notes. It is never
    treated as "no CVEs".
  * Every text that comes from outside (NVD, the scan file) goes through
    _plain() first, because the report formatters print findings raw.
"""

from collections.abc import Callable, Iterable
from dataclasses import dataclass, replace

from ghostsight.intelligence.cpe_version import ServiceVersion
from ghostsight.intelligence.cve_match import CveMatch
from ghostsight.intelligence.evidence import Evidence, build_evidence
from ghostsight.intelligence.nvd_cache import CacheEntry, UnsafeNameError, safe_name
from ghostsight.intelligence.nvd_reader import CveRecord, NvdFormatError, read_cve
from ghostsight.intelligence.score_choice import ScoreChoice, choose_scores
from ghostsight.intelligence.service_target import service_versions
from ghostsight.reporting.models import Finding, FindingStatus, Service

MAX_TEXT_LENGTH = 200
KNOWN_PROTOCOLS = ("tcp", "udp", "sctp")

_POTENTIAL_DESCRIPTION = (
    "The version found by Nmap falls inside a version range that NVD lists "
    "for this CVE. A version match is not proof that the service is "
    "vulnerable."
)
_POTENTIAL_REMEDIATION = (
    "Check the installed package against the vendor's security notices. "
    "Update if a fixed version is available."
)
_UNKNOWN_DESCRIPTION = (
    "Part of the CVE data could not be read or compared with the version "
    "found, so GhostSight cannot say whether these CVEs apply. Unknown does "
    "not mean safe."
)
_UNKNOWN_REMEDIATION = (
    "Check these CVEs by hand against the vendor's security notices."
)


@dataclass(frozen=True)
class Analysis:
    """The result of analysing a list of services."""

    findings: tuple[Finding, ...]
    notes: tuple[str, ...]
    services_checked: int = 0


LoadCache = Callable[[str, str], CacheEntry | None]


def _plain(value: object) -> str:
    """Keep printable ASCII only. Anything else becomes '?'."""
    text = "".join(ch if " " <= ch <= "~" else "?" for ch in str(value))
    return text[:MAX_TEXT_LENGTH]


def _where(service: Service) -> str:
    """A short, safe description such as 'port 22/tcp'."""
    protocol = service.protocol if service.protocol in KNOWN_PROTOCOLS else "unknown"
    return f"port {_plain(service.port)}/{protocol}"


def _version_text(target: ServiceVersion) -> str:
    return _plain(f"{target.number}{target.update or ''}")


def _version_line(target: ServiceVersion) -> str:
    return (
        f"Version found by Nmap: {target.vendor}:{target.product} "
        f"{_version_text(target)}"
    )


def _group_targets(
    versions: Iterable[ServiceVersion],
) -> tuple[dict[tuple[str, str], list[ServiceVersion]], int]:
    """Group application versions by (vendor, product), names lowercased.

    A name that is not safe for the cache is counted, never used.
    """
    groups: dict[tuple[str, str], list[ServiceVersion]] = {}
    unusable = 0
    for version in versions:
        try:
            vendor = safe_name(version.vendor)
            product = safe_name(version.product)
        except UnsafeNameError:
            unusable += 1
            continue
        target = replace(version, vendor=vendor, product=product)
        members = groups.setdefault((vendor, product), [])
        if target not in members:
            members.append(target)
    return groups, unusable


def _read_records(entry: CacheEntry) -> tuple[list[CveRecord], int]:
    """Read every stored CVE. Count the ones that cannot be read."""
    records: list[CveRecord] = []
    unreadable = 0
    for raw in entry.cves:
        try:
            records.append(read_cve(raw))
        except NvdFormatError:
            unreadable += 1
    return records, unreadable


def _check_record(
    record: CveRecord, targets: list[ServiceVersion]
) -> tuple[CveMatch, list[tuple[ServiceVersion, Evidence]]]:
    """Check one CVE against every version. Match beats cannot tell."""
    matches: list[tuple[ServiceVersion, Evidence]] = []
    unclear = False
    for target in targets:
        evidence = build_evidence(record, target)
        if evidence.answer == CveMatch.MATCH:
            matches.append((target, evidence))
        elif evidence.answer == CveMatch.CANNOT_TELL:
            unclear = True
    if matches:
        return CveMatch.MATCH, matches
    if unclear:
        return CveMatch.CANNOT_TELL, []
    return CveMatch.NO_MATCH, []


def _single_score(choice: ScoreChoice) -> tuple[float | None, str]:
    """Use a score only when exactly one is shown. Never pick between several."""
    if len(choice.shown) != 1:
        return None, "unknown"
    score = choice.shown[0]
    severity = _plain(score.severity).lower() or "unknown"
    return float(score.base_score), severity


def _score_lines(choice: ScoreChoice) -> list[str]:
    lines = [
        _plain(
            f"CVSS {score.cvss_version} score from {score.source} "
            f"({score.score_type}): {score.base_score}, "
            f"severity {score.severity or 'unknown'}"
        )
        for score in choice.shown
    ]
    lines.append(_plain(f"Score note: {choice.note}"))
    return lines


def _potential_finding(
    record: CveRecord,
    matches: list[tuple[ServiceVersion, Evidence]],
    where: str,
) -> Finding:
    first_target, first_evidence = matches[0]
    choice = choose_scores(record.scores)
    cvss_score, severity = _single_score(choice)

    lines = [_version_line(target) for target, _ in matches]
    lines += [
        _plain(f"Matched rule: {rule.criteria} ({rule.basis.value})")
        for rule in first_evidence.matches
    ]
    lines += _score_lines(choice)
    lines += [_plain(caveat) for caveat in first_evidence.caveats]

    return Finding(
        title=(
            f"{record.cve_id}: {first_target.vendor}:{first_target.product} "
            f"{_version_text(first_target)} may be affected"
        ),
        description=_POTENTIAL_DESCRIPTION,
        severity=severity,
        confidence=0.0,
        status=FindingStatus.POTENTIAL,
        cve_ids=[record.cve_id],
        cvss_score=cvss_score,
        evidence=lines,
        remediation=_POTENTIAL_REMEDIATION,
        affected_service=where,
    )


def _unknown_finding(
    cve_ids: list[str], targets: list[ServiceVersion], where: str
) -> Finding:
    count = len(cve_ids)
    plural = "" if count == 1 else "s"
    lines = [_version_line(target) for target in targets]
    lines.append(
        "These CVEs could not be checked against the version found. "
        "This is not a clean result."
    )
    return Finding(
        title=f"{where}: {count} CVE record{plural} could not be checked",
        description=_UNKNOWN_DESCRIPTION,
        severity="unknown",
        confidence=0.0,
        status=FindingStatus.UNKNOWN,
        cve_ids=list(cve_ids),
        cvss_score=None,
        evidence=lines,
        remediation=_UNKNOWN_REMEDIATION,
        affected_service=where,
    )


def _no_application_note(where: str, other_versions: bool) -> str:
    note = (
        f"{where.capitalize()}: no application version was found for this "
        "service, so no CVE lookup was done. This is not a clean result."
    )
    if other_versions:
        note += (
            " Only an operating system or hardware version was found, and "
            "those are not checked yet."
        )
    return note


def _missing_cache_note(where: str, vendor: str, product: str) -> str:
    return (
        f"{where.capitalize()}: no CVE data is stored for {vendor}:{product}, "
        "so it could not be checked. To download it, run: "
        f"ghostsight nvd-fetch --vendor {vendor} --product {product}. "
        "This is not a clean result."
    )


def _analyse_service(
    service: Service, load_cache: LoadCache
) -> tuple[list[Finding], list[str], bool]:
    where = _where(service)
    versions = service_versions(service)
    applications = [version for version in versions if version.part == "a"]

    if not applications:
        return [], [_no_application_note(where, bool(versions))], False

    notes: list[str] = []
    if len(applications) < len(versions):
        notes.append(
            f"{where.capitalize()}: an operating system or hardware version "
            "was found and was not used. Only application versions are checked."
        )

    groups, unusable = _group_targets(applications)
    if unusable:
        notes.append(
            f"{where.capitalize()}: a vendor or product name in the service's "
            "CPE cannot be used for a cache lookup, so it was not checked. "
            "This is not a clean result."
        )

    potential: list[Finding] = []
    cannot_tell: list[str] = []
    checked = False

    for (vendor, product), targets in groups.items():
        entry = load_cache(vendor, product)
        if entry is None or not entry.cves:
            notes.append(_missing_cache_note(where, vendor, product))
            continue

        records, unreadable = _read_records(entry)
        if records:
            checked = True
        notes.append(
            f"{where.capitalize()}: CVE records checked: {len(records)} for "
            f"{vendor}:{product} (NVD data fetched {_plain(entry.fetched_at) or 'at an unknown time'})."
        )
        if unreadable:
            plural = "" if unreadable == 1 else "s"
            notes.append(
                f"{where.capitalize()}: {unreadable} stored CVE record{plural} "
                "could not be read and was not checked. This is not a clean result."
            )

        for record in records:
            answer, matches = _check_record(record, targets)
            if answer == CveMatch.MATCH:
                potential.append(_potential_finding(record, matches, where))
            elif answer == CveMatch.CANNOT_TELL and record.cve_id not in cannot_tell:
                cannot_tell.append(record.cve_id)

    findings = potential
    if cannot_tell:
        every_target = [target for members in groups.values() for target in members]
        findings = potential + [_unknown_finding(cannot_tell, every_target, where)]
    return findings, notes, checked


def analyse_services(services: Iterable[Service], load_cache: LoadCache) -> Analysis:
    """Analyse every service. `load_cache(vendor, product)` supplies the data."""
    findings: list[Finding] = []
    notes: list[str] = []
    checked = 0
    for service in services:
        service_findings, service_notes, was_checked = _analyse_service(
            service, load_cache
        )
        findings += service_findings
        notes += service_notes
        checked += int(was_checked)
    return Analysis(
        findings=tuple(findings),
        notes=tuple(notes),
        services_checked=checked,
    )
