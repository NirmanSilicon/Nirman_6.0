"""Tests for reading a service version from Nmap's CPE (decision 36 h).

The function must return None whenever it cannot read the version with
certainty. None later means "cannot tell", which is not the same as
"no match".
"""

import dataclasses

import pytest

from ghostsight.intelligence.cpe_version import ServiceVersion, read_cpe_version


def test_openssh_cpe_is_split_into_number_and_update() -> None:
    result = read_cpe_version("cpe:/a:openbsd:openssh:9.6p1")
    assert result == ServiceVersion(
        part="a",
        vendor="openbsd",
        product="openssh",
        number="9.6",
        update="p1",
    )


def test_plain_version_has_no_update() -> None:
    result = read_cpe_version("cpe:/a:apple:cups:2.4")
    assert result is not None
    assert result.number == "2.4"
    assert result.update == ""


def test_three_part_number_keeps_its_update() -> None:
    result = read_cpe_version("cpe:/a:openbsd:openssh:3.9.1p1")
    assert result is not None
    assert (result.number, result.update) == ("3.9.1", "p1")


def test_single_number_is_accepted() -> None:
    result = read_cpe_version("cpe:/a:vendor:product:9")
    assert result is not None
    assert result.number == "9"


def test_operating_system_part_is_kept() -> None:
    result = read_cpe_version("cpe:/o:vendor:product:1.2")
    assert result is not None
    assert result.part == "o"


def test_vendor_and_product_are_kept_as_received() -> None:
    result = read_cpe_version("cpe:/a:OpenBSD:OpenSSH:9.6p1")
    assert result is not None
    assert (result.vendor, result.product) == ("OpenBSD", "OpenSSH")


UNREADABLE = [
    "",
    "hello",
    " cpe:/a:vendor:product:1.0",
    "cpe:/o:linux:linux_kernel",
    "cpe:/a:vendor:product:",
    "cpe:/a:vendor:product:*",
    "cpe:/a:vendor:product:-",
    "cpe:/a:openssl:openssl:1.0.2k",
    "cpe:/a:vendor:product:9.6p",
    "cpe:/a:vendor:product:9.6p1p2",
    "cpe:/a:vendor:product:1.0beta1",
    "cpe:/a:vendor:product:1.0:beta",
    "cpe:/a:vendor:product:.5",
    "cpe:/a:vendor:product:1..2",
    "cpe:/a:vendor:product:1.",
    "cpe:/x:vendor:product:1.0",
    "cpe:/a::product:1.0",
    "cpe:2.3:a:openbsd:openssh:9.6:p1:*:*:*:*:*:*",
    "cpe:/a:openbsd:openssh:9.6p1\n",
    "cpe:/a:vendor:product:\u0663.\u0664",
]


@pytest.mark.parametrize("cpe", UNREADABLE)
def test_unreadable_cpe_gives_none(cpe: str) -> None:
    assert read_cpe_version(cpe) is None


def test_result_cannot_be_changed() -> None:
    result = read_cpe_version("cpe:/a:openbsd:openssh:9.6p1")
    assert result is not None
    with pytest.raises(dataclasses.FrozenInstanceError):
        result.number = "1.0"  # type: ignore[misc]
