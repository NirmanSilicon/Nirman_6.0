"""Tests for reading NVD criteria strings (cpe:2.3 form).

The reader splits and keeps fields as received. It does not judge what a
version means. It returns None when the string is not exactly the shape
of a 13-field cpe:2.3 name.
"""

import dataclasses

import pytest

from ghostsight.intelligence.cpe_criteria import Criteria, read_criteria

STAR6 = ("*", "*", "*", "*", "*", "*")


def test_exact_rule_is_split_into_fields() -> None:
    result = read_criteria("cpe:2.3:a:openbsd:openssh:9.6:p1:*:*:*:*:*:*")
    assert result == Criteria(
        part="a",
        vendor="openbsd",
        product="openssh",
        version="9.6",
        update="p1",
        others=STAR6,
    )


def test_wildcard_version_is_kept_as_star() -> None:
    result = read_criteria("cpe:2.3:a:openbsd:openssh:*:*:*:*:*:*:*:*")
    assert result is not None
    assert (result.version, result.update) == ("*", "*")


def test_dash_update_is_kept_as_dash() -> None:
    result = read_criteria("cpe:2.3:a:openbsd:openssh:9.6:-:*:*:*:*:*:*")
    assert result is not None
    assert (result.version, result.update) == ("9.6", "-")


def test_glued_version_is_kept_as_received() -> None:
    result = read_criteria("cpe:2.3:a:openbsd:openssh:4.3p2:*:*:*:*:*:*:*")
    assert result is not None
    assert (result.version, result.update) == ("4.3p2", "*")


def test_operating_system_part_is_kept() -> None:
    result = read_criteria("cpe:2.3:o:linux:linux_kernel:-:*:*:*:*:*:*:*")
    assert result is not None
    assert result.part == "o"
    assert result.version == "-"


def test_last_six_fields_are_kept() -> None:
    result = read_criteria("cpe:2.3:a:vendor:product:1.0:*:*:*:*:node.js:*:*")
    assert result is not None
    assert result.others == ("*", "*", "*", "node.js", "*", "*")


def test_result_cannot_be_changed() -> None:
    result = read_criteria("cpe:2.3:a:openbsd:openssh:9.6:p1:*:*:*:*:*:*")
    assert result is not None
    with pytest.raises(dataclasses.FrozenInstanceError):
        result.version = "1.0"  # type: ignore[misc]


UNREADABLE = [
    "",
    "hello",
    "cpe:/a:openbsd:openssh:9.6p1",
    " cpe:2.3:a:openbsd:openssh:9.6:p1:*:*:*:*:*:*",
    "cpe:2.3:a:openbsd:openssh:9.6:p1:*:*:*:*:*:*\n",
    "CPE:2.3:a:openbsd:openssh:9.6:p1:*:*:*:*:*:*",
    "cpe:2.2:a:openbsd:openssh:9.6:p1:*:*:*:*:*:*",
    "cpe:2.3:a:openbsd:openssh:9.6:p1:*:*:*:*:*",
    "cpe:2.3:a:openbsd:openssh:9.6:p1:*:*:*:*:*:*:*",
    "cpe:2.3:x:openbsd:openssh:9.6:p1:*:*:*:*:*:*",
    "cpe:2.3:a::openssh:9.6:p1:*:*:*:*:*:*",
    "cpe:2.3:a:openbsd:openssh:9.6::*:*:*:*:*:*",
    "cpe:2.3:a:open\\:bsd:openssh:9.6:p1:*:*:*:*:*:*",
    "cpe:2.3:a:openbsd:openssh:9.6:p 1:*:*:*:*:*:*",
    "cpe:2.3:a:openbsd:openssh:9.6:p1:*:*:*:*:*:\x1b",
    "cpe:2.3:a:openbsd:openssh:9\u0663:p1:*:*:*:*:*:*",
]


@pytest.mark.parametrize("criteria", UNREADABLE)
def test_unreadable_criteria_gives_none(criteria: str) -> None:
    assert read_criteria(criteria) is None
