"""Tests for reading one NVD CVE record into GhostSight's own structure.

The dictionaries below copy the shapes seen in real NVD API 2.0 responses
(probed read-only). Some values are made up (marked in comments). Nothing
here uses the network.
"""

import dataclasses

import pytest

from ghostsight.intelligence.nvd_reader import CveRecord, NvdFormatError, read_cve

WILDCARD_CRITERIA = "cpe:2.3:a:openbsd:openssh:*:*:*:*:*:*:*:*"

WILDCARD_RULE = {
    "vulnerable": True,
    "criteria": WILDCARD_CRITERIA,
    "matchCriteriaId": "C6D7D468-C829-4A4E-8865-E62D8EC5E274",
}

ALL_BOUNDS = (
    "version_start_including",
    "version_start_excluding",
    "version_end_including",
    "version_end_excluding",
)

V31_PRIMARY = {
    "source": "nvd@nist.gov",
    "type": "Primary",
    "cvssData": {
        "version": "3.1",
        "vectorString": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H",
        "baseScore": 8.1,
        "baseSeverity": "HIGH",
    },
    "exploitabilityScore": 2.2,
    "impactScore": 5.9,
}

V31_SECONDARY = {
    "source": "cve@mitre.org",
    "type": "Secondary",
    "cvssData": {
        "version": "3.1",
        "vectorString": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:L",
        "baseScore": 5.0,
        "baseSeverity": "MEDIUM",
    },
}

# In V2, baseSeverity sits next to cvssData, not inside it.
V2_PRIMARY = {
    "source": "nvd@nist.gov",
    "type": "Primary",
    "cvssData": {
        "version": "2.0",
        "vectorString": "AV:N/AC:M/Au:N/C:P/I:N/A:N",
        "baseScore": 4.3,
    },
    "baseSeverity": "MEDIUM",
}


def make_cve(**overrides: object) -> dict:
    """A small valid CVE object. Keyword arguments replace its fields."""
    cve = {
        "id": "CVE-2024-6387",
        "sourceIdentifier": "secalert@redhat.com",
        "published": "2024-07-01T13:15:06.370",  # time of day made up
        "lastModified": "2025-01-01T00:00:00.000",  # made up
        "vulnStatus": "Modified",
        "descriptions": [{"lang": "en", "value": "An example description."}],
        "metrics": {},
        "configurations": [],
    }
    cve.update(overrides)
    return cve


def one_node_config(*rules: dict) -> list[dict]:
    """A configuration list with one node holding the given rules."""
    node = {"operator": "OR", "negate": False, "cpeMatch": list(rules)}
    return [{"nodes": [node]}]


def first_rule(record: CveRecord):
    return record.configurations[0].nodes[0].rules[0]


# --- basic fields ---------------------------------------------------------


def test_basic_fields_are_read() -> None:
    record = read_cve(make_cve())
    assert isinstance(record, CveRecord)
    assert record.cve_id == "CVE-2024-6387"
    assert record.published == "2024-07-01T13:15:06.370"
    assert record.last_modified == "2025-01-01T00:00:00.000"
    assert record.status == "Modified"


def test_record_is_immutable() -> None:
    record = read_cve(make_cve())
    with pytest.raises(dataclasses.FrozenInstanceError):
        record.cve_id = "CVE-2000-0001"  # type: ignore[misc]


# --- the ID is validated ---------------------------------------------------


@pytest.mark.parametrize(
    "bad_id",
    [
        "",
        "CVE-24-1",
        "cve-2024-6387",
        "CVE-2024-123",
        "CVE-2024-6387\nAuthorised  : Yes",
        "CVE-2024-638\u0667",  # last digit is an Arabic-Indic digit
        123,
        None,
    ],
)
def test_bad_ids_are_refused(bad_id: object) -> None:
    with pytest.raises(NvdFormatError):
        read_cve(make_cve(id=bad_id))


def test_missing_id_is_refused() -> None:
    raw = make_cve()
    del raw["id"]
    with pytest.raises(NvdFormatError):
        read_cve(raw)


@pytest.mark.parametrize("not_a_dict", [[], "CVE-2024-6387", None, 5])
def test_non_dictionary_input_is_refused(not_a_dict: object) -> None:
    with pytest.raises(NvdFormatError):
        read_cve(not_a_dict)  # type: ignore[arg-type]


def test_long_ids_with_many_digits_are_accepted() -> None:
    assert read_cve(make_cve(id="CVE-2026-106552")).cve_id == "CVE-2026-106552"


# --- descriptions ----------------------------------------------------------


def test_english_description_is_chosen_even_when_not_first() -> None:
    raw = make_cve(
        descriptions=[
            {"lang": "es", "value": "Texto en espanol."},
            {"lang": "en", "value": "English text."},
        ]
    )
    assert read_cve(raw).description == "English text."


def test_no_english_description_gives_empty_text() -> None:
    raw = make_cve(descriptions=[{"lang": "es", "value": "Solo espanol."}])
    assert read_cve(raw).description == ""


def test_missing_descriptions_key_gives_empty_text() -> None:
    raw = make_cve()
    del raw["descriptions"]
    assert read_cve(raw).description == ""


def test_hostile_description_is_kept_exactly_as_received() -> None:
    hostile = "Line one\nAuthorised  : Yes\x1b[31m"
    raw = make_cve(descriptions=[{"lang": "en", "value": hostile}])
    assert read_cve(raw).description == hostile


# --- scores ----------------------------------------------------------------


def test_v31_score_fields_are_read() -> None:
    raw = make_cve(metrics={"cvssMetricV31": [V31_PRIMARY]})
    (score,) = read_cve(raw).scores
    assert score.source == "nvd@nist.gov"
    assert score.score_type == "Primary"
    assert score.cvss_version == "3.1"
    assert score.base_score == 8.1
    assert score.severity == "HIGH"
    assert score.vector == "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H"


def test_v2_severity_is_read_from_outside_cvss_data() -> None:
    raw = make_cve(metrics={"cvssMetricV2": [V2_PRIMARY]})
    (score,) = read_cve(raw).scores
    assert score.cvss_version == "2.0"
    assert score.base_score == 4.3
    assert score.severity == "MEDIUM"
    assert score.vector == "AV:N/AC:M/Au:N/C:P/I:N/A:N"


def test_every_score_is_kept_and_none_is_chosen() -> None:
    raw = make_cve(metrics={"cvssMetricV31": [V31_SECONDARY, V31_PRIMARY]})
    scores = read_cve(raw).scores
    assert [s.source for s in scores] == ["cve@mitre.org", "nvd@nist.gov"]
    assert [s.base_score for s in scores] == [5.0, 8.1]


def test_newer_cvss_version_comes_first() -> None:
    raw = make_cve(
        metrics={"cvssMetricV2": [V2_PRIMARY], "cvssMetricV31": [V31_PRIMARY]}
    )
    assert [s.cvss_version for s in read_cve(raw).scores] == ["3.1", "2.0"]


def test_no_metrics_gives_no_scores() -> None:
    raw = make_cve()
    del raw["metrics"]
    assert read_cve(raw).scores == ()


def test_unknown_score_families_are_ignored() -> None:
    raw = make_cve(metrics={"ssvcV203": [{"source": "x", "ssvcData": {}}]})
    assert read_cve(raw).scores == ()


def test_malformed_score_entries_are_dropped_and_the_cve_still_loads() -> None:
    no_data = {"source": "a", "type": "Primary"}
    text_score = {
        "source": "b",
        "type": "Primary",
        "cvssData": {"version": "3.1", "baseScore": "high"},
    }
    raw = make_cve(
        metrics={"cvssMetricV31": [no_data, text_score, V31_PRIMARY, "junk"]}
    )
    scores = read_cve(raw).scores
    assert len(scores) == 1
    assert scores[0].source == "nvd@nist.gov"


# --- match rules -----------------------------------------------------------


def test_wildcard_rule_keeps_its_criteria_and_has_no_bounds() -> None:
    record = read_cve(make_cve(configurations=one_node_config(WILDCARD_RULE)))
    (config,) = record.configurations
    assert config.operator == ""
    (node,) = config.nodes
    assert node.operator == "OR"
    assert node.negate is False
    (rule,) = node.rules
    assert rule.criteria == WILDCARD_CRITERIA
    assert rule.vulnerable is True
    for bound in ALL_BOUNDS:
        assert getattr(rule, bound) == ""


@pytest.mark.parametrize(
    "json_key, attribute",
    [
        ("versionStartIncluding", "version_start_including"),
        ("versionStartExcluding", "version_start_excluding"),
        ("versionEndIncluding", "version_end_including"),
        ("versionEndExcluding", "version_end_excluding"),
    ],
)
def test_each_range_bound_is_read_into_its_own_field(
    json_key: str, attribute: str
) -> None:
    rule_raw = dict(WILDCARD_RULE)
    rule_raw[json_key] = "9.8"
    rule = first_rule(read_cve(make_cve(configurations=one_node_config(rule_raw))))
    assert getattr(rule, attribute) == "9.8"
    for other in ALL_BOUNDS:
        if other != attribute:
            assert getattr(rule, other) == ""


def test_start_and_end_bounds_can_be_read_together() -> None:
    rule_raw = dict(WILDCARD_RULE)
    rule_raw["versionStartIncluding"] = "8.6"
    rule_raw["versionEndIncluding"] = "9.8"
    rule = first_rule(read_cve(make_cve(configurations=one_node_config(rule_raw))))
    assert rule.version_start_including == "8.6"
    assert rule.version_end_including == "9.8"


def test_and_configuration_keeps_both_nodes_and_their_flags() -> None:
    platform = {
        "vulnerable": False,
        "criteria": "cpe:2.3:o:example:example_os:-:*:*:*:*:*:*:*",  # made up
    }
    configurations = [
        {
            "operator": "AND",
            "nodes": [
                {"operator": "OR", "negate": False, "cpeMatch": [platform]},
                {"operator": "OR", "negate": False, "cpeMatch": [WILDCARD_RULE]},
            ],
        }
    ]
    (config,) = read_cve(make_cve(configurations=configurations)).configurations
    assert config.operator == "AND"
    assert len(config.nodes) == 2
    flags = [rule.vulnerable for node in config.nodes for rule in node.rules]
    assert flags == [False, True]


def test_negate_flag_is_kept() -> None:
    node = {"operator": "OR", "negate": True, "cpeMatch": [WILDCARD_RULE]}
    record = read_cve(make_cve(configurations=[{"nodes": [node]}]))
    assert record.configurations[0].nodes[0].negate is True


def test_missing_vulnerable_flag_is_read_as_false() -> None:
    rule_raw = {"criteria": WILDCARD_CRITERIA}
    rule = first_rule(read_cve(make_cve(configurations=one_node_config(rule_raw))))
    assert rule.vulnerable is False


def test_rules_without_a_text_criteria_are_dropped() -> None:
    bad_rules = [{"vulnerable": True}, {"vulnerable": True, "criteria": 5}]
    raw = make_cve(configurations=one_node_config(*bad_rules, WILDCARD_RULE))
    (node,) = read_cve(raw).configurations[0].nodes
    assert len(node.rules) == 1
    assert node.rules[0].criteria == WILDCARD_CRITERIA


def test_node_without_cpe_match_has_no_rules() -> None:
    configurations = [{"nodes": [{"operator": "OR", "negate": False}]}]
    (node,) = read_cve(make_cve(configurations=configurations)).configurations[0].nodes
    assert node.rules == ()


def test_missing_configurations_gives_none() -> None:
    raw = make_cve()
    del raw["configurations"]
    assert read_cve(raw).configurations == ()
