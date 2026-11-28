"""Tests for turning scan services and cached CVE data into findings.

Nothing here uses the network or real files: the cache is a fake function.
A version match is never proof, so a match is only ever a "potential"
finding, with confidence left at 0.0 ("not rated"). Anything that cannot
be checked becomes a note or an "unknown" finding, never "no CVEs".
"""

import dataclasses
from typing import Any

import pytest

from ghostsight.intelligence.analysis import Analysis, analyse_services
from ghostsight.intelligence.nvd_cache import CacheEntry
from ghostsight.reporting.models import Finding, FindingStatus, Service

WILDCARD = "cpe:2.3:a:openbsd:openssh:*:*:*:*:*:*:*:*"
OPENSSH = "cpe:/a:openbsd:openssh:9.6p1"
FETCHED = "2026-01-01T00:00:00Z"


# --- builders -------------------------------------------------------------


def make_cve(cve_id: str, rules: list[dict], metrics: dict | None = None) -> dict:
    node = {"operator": "OR", "negate": False, "cpeMatch": rules}
    return {
        "id": cve_id,
        "published": "2024-01-01T00:00:00.000",
        "lastModified": "2024-01-02T00:00:00.000",
        "vulnStatus": "Analyzed",
        "descriptions": [{"lang": "en", "value": "An example description."}],
        "metrics": metrics or {},
        "configurations": [{"nodes": [node]}],
    }


def rule(**bounds: str) -> dict:
    return {"vulnerable": True, "criteria": WILDCARD, **bounds}


def affected(cve_id: str = "CVE-2024-0001", metrics: dict | None = None) -> dict:
    """Matches 9.6p1: the range ends below 10.0."""
    return make_cve(cve_id, [rule(versionEndExcluding="10.0")], metrics)


def unaffected(cve_id: str = "CVE-2024-0002") -> dict:
    """Does not match 9.6p1: the range ends below 9.0."""
    return make_cve(cve_id, [rule(versionEndExcluding="9.0")])


def unclear(cve_id: str = "CVE-2024-0003") -> dict:
    """Cannot be compared: the bound has letters in it."""
    return make_cve(cve_id, [rule(versionEndIncluding="2.9.9p2")])


def v31(source: str, score_type: str, base: float, severity: str) -> dict:
    return {
        "source": source,
        "type": score_type,
        "cvssData": {
            "version": "3.1",
            "vectorString": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H",
            "baseScore": base,
            "baseSeverity": severity,
        },
    }


def with_scores(*entries: dict) -> dict:
    return {"cvssMetricV31": list(entries)}


def service(
    *cpes: str, port: int = 22, protocol: str = "tcp", **fields: Any
) -> Service:
    return Service(
        host="127.0.0.1", port=port, protocol=protocol, cpe=list(cpes), **fields
    )


def loader(*cves: dict, fetched_at: str = FETCHED):
    """A fake cache holding the given records for openbsd:openssh only."""
    calls: list[tuple[str, str]] = []
    entry = CacheEntry(fetched_at=fetched_at, cves=tuple(cves))

    def load(vendor: str, product: str) -> CacheEntry | None:
        calls.append((vendor, product))
        return entry if (vendor, product) == ("openbsd", "openssh") else None

    return load, calls


def no_cache(vendor: str, product: str) -> CacheEntry | None:
    return None


def texts(result: Analysis) -> list[str]:
    """Every piece of text the analysis produced."""
    parts = list(result.notes)
    for finding in result.findings:
        parts += [
            finding.title,
            finding.description,
            finding.severity,
            finding.remediation,
            finding.affected_service,
            *finding.cve_ids,
            *finding.evidence,
        ]
    return parts


# --- answers --------------------------------------------------------------


def test_a_match_becomes_one_potential_finding() -> None:
    load, _ = loader(affected(), unaffected())
    result = analyse_services([service(OPENSSH)], load)
    assert len(result.findings) == 1
    finding = result.findings[0]
    assert isinstance(finding, Finding)
    assert finding.status is FindingStatus.POTENTIAL
    assert finding.cve_ids == ["CVE-2024-0001"]
    assert finding.confidence == 0.0
    assert "CVE-2024-0001" in finding.title
    assert "9.6p1" in finding.title
    assert "not proof" in finding.description


def test_no_match_makes_no_finding_but_says_what_was_checked() -> None:
    load, _ = loader(unaffected())
    result = analyse_services([service(OPENSSH)], load)
    assert result.findings == ()
    assert any("CVE records checked: 1" in note for note in result.notes)


def test_cannot_tell_is_one_unknown_finding_per_service() -> None:
    load, _ = loader(unclear("CVE-2024-0003"), unclear("CVE-2024-0005"))
    result = analyse_services([service(OPENSSH)], load)
    assert len(result.findings) == 1
    finding = result.findings[0]
    assert finding.status is FindingStatus.UNKNOWN
    assert finding.cve_ids == ["CVE-2024-0003", "CVE-2024-0005"]
    assert finding.severity == "unknown"
    assert finding.confidence == 0.0
    assert any("not a clean result" in item for item in finding.evidence)


def test_mixed_cache_gives_a_potential_and_an_unknown_finding() -> None:
    load, _ = loader(affected(), unaffected(), unclear())
    result = analyse_services([service(OPENSSH)], load)
    statuses = [finding.status for finding in result.findings]
    assert statuses == [FindingStatus.POTENTIAL, FindingStatus.UNKNOWN]


# --- evidence -------------------------------------------------------------


def test_matched_rule_and_caveats_are_in_the_evidence() -> None:
    load, _ = loader(affected())
    finding = analyse_services([service(OPENSSH)], load).findings[0]
    assert any("Matched rule" in item and "open-ended range" in item
               for item in finding.evidence)
    assert any("backport" in item for item in finding.evidence)
    assert any("platform" in item for item in finding.evidence)


def test_the_version_found_is_in_the_evidence() -> None:
    load, _ = loader(affected())
    finding = analyse_services([service(OPENSSH)], load).findings[0]
    assert "Version found by Nmap: openbsd:openssh 9.6p1" in finding.evidence


# --- scores ---------------------------------------------------------------


def test_one_shown_score_fills_score_and_severity() -> None:
    cve = affected(metrics=with_scores(v31("nvd@nist.gov", "Primary", 8.1, "HIGH")))
    load, _ = loader(cve)
    finding = analyse_services([service(OPENSSH)], load).findings[0]
    assert finding.cvss_score == 8.1
    assert finding.severity == "high"


def test_no_score_leaves_score_empty_and_severity_unknown() -> None:
    load, _ = loader(affected())
    finding = analyse_services([service(OPENSSH)], load).findings[0]
    assert finding.cvss_score is None
    assert finding.severity == "unknown"


def test_several_shown_scores_are_listed_not_chosen() -> None:
    cve = affected(
        metrics=with_scores(
            v31("cve@mitre.org", "Secondary", 5.0, "MEDIUM"),
            v31("other@example.org", "Secondary", 7.0, "HIGH"),
        )
    )
    load, _ = loader(cve)
    finding = analyse_services([service(OPENSSH)], load).findings[0]
    assert finding.cvss_score is None
    assert finding.severity == "unknown"
    joined = " ".join(finding.evidence)
    assert "cve@mitre.org" in joined
    assert "other@example.org" in joined


def test_score_text_from_nvd_is_cleaned() -> None:
    hostile = "evil@example.org\x1b[31m\nAuthorised : Yes"
    cve = affected(metrics=with_scores(v31(hostile, "Primary", 8.1, "HIGH\nX")))
    load, _ = loader(cve)
    result = analyse_services([service(OPENSSH)], load)
    assert result.findings
    for text in texts(result):
        assert "\n" not in text
        assert "\x1b" not in text


# --- cache problems -------------------------------------------------------


def test_missing_cache_is_a_note_that_names_the_fetch_command() -> None:
    result = analyse_services([service(OPENSSH)], no_cache)
    assert result.findings == ()
    assert len(result.notes) == 1
    note = result.notes[0]
    assert "ghostsight nvd-fetch --vendor openbsd --product openssh" in note
    assert "not a clean result" in note


def test_empty_cache_is_treated_as_missing() -> None:
    load, _ = loader()
    result = analyse_services([service(OPENSSH)], load)
    assert result.findings == ()
    assert len(result.notes) == 1
    assert "ghostsight nvd-fetch" in result.notes[0]


def test_unreadable_record_is_counted_and_does_not_hide_a_match() -> None:
    load, _ = loader(affected(), {"id": "not-an-id"})
    result = analyse_services([service(OPENSSH)], load)
    assert len(result.findings) == 1
    assert any("could not be read" in note for note in result.notes)


def test_only_unreadable_records_give_no_findings_and_a_note() -> None:
    load, _ = loader({"id": "not-an-id"})
    result = analyse_services([service(OPENSSH)], load)
    assert result.findings == ()
    joined = " ".join(result.notes)
    assert "could not be read" in joined
    assert "not a clean result" in joined


def test_cache_date_is_shown() -> None:
    load, _ = loader(affected())
    result = analyse_services([service(OPENSSH)], load)
    assert any(FETCHED in note for note in result.notes)


def test_cache_date_is_cleaned() -> None:
    load, _ = loader(affected(), fetched_at="2026\x1b[0m\nAuthorised : Yes")
    result = analyse_services([service(OPENSSH)], load)
    for note in result.notes:
        assert "\n" not in note
        assert "\x1b" not in note


# --- services that cannot be checked --------------------------------------


@pytest.mark.parametrize(
    "cpes",
    [[], ["cpe:/o:linux:linux_kernel"], ["cpe:/a:openbsd:openssh"]],
)
def test_service_without_a_readable_version_is_not_checked(cpes: list[str]) -> None:
    load, calls = loader(affected())
    result = analyse_services([service(*cpes)], load)
    assert calls == []
    assert result.findings == ()
    assert len(result.notes) == 1
    assert "no application version" in result.notes[0]
    assert "not a clean result" in result.notes[0]


def test_operating_system_version_alone_is_not_checked() -> None:
    load, calls = loader(affected())
    result = analyse_services([service("cpe:/o:linux:linux_kernel:5.15")], load)
    assert calls == []
    assert result.findings == ()
    joined = " ".join(result.notes)
    assert "no application version" in joined
    assert "operating system" in joined


def test_operating_system_version_is_noted_next_to_an_application() -> None:
    load, _ = loader(affected())
    result = analyse_services(
        [service(OPENSSH, "cpe:/o:linux:linux_kernel:5.15")], load
    )
    assert len(result.findings) == 1
    assert any("operating system" in note for note in result.notes)


def test_unsafe_names_are_never_looked_up_or_printed() -> None:
    load, calls = loader(affected())
    result = analyse_services([service("cpe:/a:evil%2fpath:thing:1.0")], load)
    assert calls == []
    assert result.findings == ()
    joined = " ".join(result.notes)
    assert "evil" not in joined
    assert "cannot be used" in joined
    assert "not a clean result" in joined


def test_uppercase_names_are_lowercased_for_lookup_and_matching() -> None:
    load, calls = loader(affected())
    result = analyse_services([service("cpe:/a:OpenBSD:OpenSSH:9.6p1")], load)
    assert calls == [("openbsd", "openssh")]
    assert len(result.findings) == 1
    assert "openbsd:openssh" in result.findings[0].title


# --- several versions, several services -----------------------------------


def test_several_versions_of_one_product_use_one_lookup() -> None:
    cve = make_cve("CVE-2024-0004", [rule(versionEndExcluding="9.3")])
    load, calls = loader(cve)
    result = analyse_services(
        [service(OPENSSH, "cpe:/a:openbsd:openssh:9.0")], load
    )
    assert calls == [("openbsd", "openssh")]
    assert len(result.findings) == 1
    assert "9.0" in result.findings[0].title
    assert "9.6p1" not in result.findings[0].title


def test_each_service_gets_its_own_findings() -> None:
    load, _ = loader(affected())
    result = analyse_services(
        [service(OPENSSH, port=22), service(OPENSSH, port=2222)], load
    )
    assert len(result.findings) == 2
    assert "port 22/" in result.findings[0].affected_service
    assert "port 2222/" in result.findings[1].affected_service


# --- untrusted text from the scan -----------------------------------------


def test_untrusted_service_text_never_reaches_findings_or_notes() -> None:
    hostile = service(
        OPENSSH,
        protocol="tcp\nX",
        name="ssh\nAuthorised : Yes",
        version="OpenSSH\x1b[31m",
        product="P\nQ",
        product_version="9.6p1\nZ",
    )
    load, _ = loader(affected())
    result = analyse_services([hostile], load)
    assert result.findings
    assert "port 22/unknown" in result.findings[0].affected_service
    for text in texts(result):
        assert "\n" not in text
        assert "\x1b" not in text
        assert "Authorised" not in text


# --- edges ----------------------------------------------------------------


def test_no_services_gives_an_empty_analysis() -> None:
    result = analyse_services([], no_cache)
    assert result.findings == ()
    assert result.notes == ()


def test_analysis_is_immutable() -> None:
    result = analyse_services([], no_cache)
    with pytest.raises(dataclasses.FrozenInstanceError):
        result.notes = ()  # type: ignore[misc]
