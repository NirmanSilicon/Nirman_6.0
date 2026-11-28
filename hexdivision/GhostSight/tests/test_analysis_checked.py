"""Tests for Analysis.services_checked.

A service counts as checked only when stored CVE data for its application
was found and at least one record in it could be read. Anything else must
not let a report say "analysed, 0 findings".
"""

from ghostsight.intelligence.analysis import Analysis, analyse_services
from ghostsight.intelligence.nvd_cache import CacheEntry
from ghostsight.reporting.models import Service

OPENSSH = "cpe:/a:openbsd:openssh:9.6p1"
FETCHED = "2026-01-01T00:00:00Z"


def service(*cpes: str, port: int = 22) -> Service:
    return Service(host="127.0.0.1", port=port, protocol="tcp", cpe=list(cpes))


def loader(*cves: dict):
    entry = CacheEntry(fetched_at=FETCHED, cves=tuple(cves))

    def load(vendor: str, product: str) -> CacheEntry | None:
        return entry if (vendor, product) == ("openbsd", "openssh") else None

    return load


def no_cache(vendor: str, product: str) -> None:
    return None


def test_default_is_zero() -> None:
    assert Analysis(findings=(), notes=()).services_checked == 0


def test_no_services_means_none_checked() -> None:
    assert analyse_services([], no_cache).services_checked == 0


def test_a_service_with_readable_cache_is_checked() -> None:
    load = loader({"id": "CVE-2024-0001"})
    assert analyse_services([service(OPENSSH)], load).services_checked == 1


def test_a_service_without_cpe_is_not_checked() -> None:
    load = loader({"id": "CVE-2024-0001"})
    assert analyse_services([service()], load).services_checked == 0


def test_a_missing_cache_is_not_checked() -> None:
    assert analyse_services([service(OPENSSH)], no_cache).services_checked == 0


def test_an_empty_cache_is_not_checked() -> None:
    assert analyse_services([service(OPENSSH)], loader()).services_checked == 0


def test_only_unreadable_records_is_not_checked() -> None:
    load = loader({"id": "not-an-id"})
    assert analyse_services([service(OPENSSH)], load).services_checked == 0


def test_only_the_checked_services_are_counted() -> None:
    load = loader({"id": "CVE-2024-0001"})
    services = [service(OPENSSH), service(port=80)]
    assert analyse_services(services, load).services_checked == 1
