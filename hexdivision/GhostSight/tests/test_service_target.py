"""Tests for picking readable versions out of a Service."""

from ghostsight.intelligence.cpe_version import ServiceVersion, read_cpe_version
from ghostsight.intelligence.service_target import service_versions
from ghostsight.reporting.models import Service

OPENSSH = "cpe:/a:openbsd:openssh:9.6p1"
CUPS = "cpe:/a:apple:cups:2.4"
KERNEL_NO_VERSION = "cpe:/o:linux:linux_kernel"


def _service(cpe: list[str], product_version: str = "") -> Service:
    return Service(
        host="127.0.0.1",
        port=22,
        protocol="tcp",
        cpe=cpe,
        product_version=product_version,
    )


def test_no_cpe_gives_nothing():
    assert service_versions(_service([])) == ()


def test_reads_the_version_from_a_cpe():
    assert service_versions(_service([OPENSSH])) == (
        ServiceVersion(
            part="a", vendor="openbsd", product="openssh", number="9.6", update="p1"
        ),
    )


def test_drops_a_cpe_without_a_version():
    # The real loopback result for port 22: an application and an OS CPE.
    result = service_versions(_service([OPENSSH, KERNEL_NO_VERSION]))
    assert [item.product for item in result] == ["openssh"]


def test_only_versionless_cpes_give_nothing():
    assert service_versions(_service([KERNEL_NO_VERSION])) == ()


def test_keeps_several_versions_in_order():
    first = read_cpe_version(OPENSSH)
    second = read_cpe_version(CUPS)
    assert first is not None and second is not None
    assert service_versions(_service([OPENSSH, CUPS])) == (first, second)


def test_removes_duplicates():
    assert len(service_versions(_service([OPENSSH, OPENSSH]))) == 1


def test_ignores_the_product_version_text():
    # Decision 38(a): the version comes from the CPE only. The Ubuntu
    # suffix text is never parsed.
    service = _service([], product_version="9.6p1 Ubuntu 3ubuntu13.18")
    assert service_versions(service) == ()


def test_unreadable_cpes_are_dropped():
    assert service_versions(_service(["not a cpe", ""])) == ()
