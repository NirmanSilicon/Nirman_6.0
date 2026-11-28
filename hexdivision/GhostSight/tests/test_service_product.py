"""Tests for the separate product and product_version fields of a Service.

Nmap reports a product name ("OpenSSH") and a version string ("9.6p1 Ubuntu
3ubuntu13.18") as two attributes. Service.version stays the combined text
used in reports. The two new fields hold the raw attributes, as received.
"""

from ghostsight.integrations.nmap_parser import parse_nmap_xml
from ghostsight.reporting.models import Service


def parse_service(service_xml: str) -> Service:
    """Parse one open port holding the given <service> XML."""
    xml = (
        '<nmaprun version="7.94SVN"><host><status state="up"/>'
        '<address addr="192.0.2.1" addrtype="ipv4"/><ports>'
        f'<port protocol="tcp" portid="80"><state state="open"/>{service_xml}</port>'
        "</ports></host></nmaprun>"
    )
    return parse_nmap_xml(xml).services[0]


def test_product_and_version_are_stored_separately() -> None:
    service = parse_service(
        '<service name="ssh" product="OpenSSH" version="9.6p1 Ubuntu 3ubuntu13.18"/>'
    )
    assert service.product == "OpenSSH"
    assert service.product_version == "9.6p1 Ubuntu 3ubuntu13.18"


def test_combined_version_text_is_unchanged() -> None:
    service = parse_service(
        '<service name="ssh" product="OpenSSH" version="9.6p1 Ubuntu 3ubuntu13.18"/>'
    )
    assert service.version == "OpenSSH 9.6p1 Ubuntu 3ubuntu13.18"


def test_product_without_version() -> None:
    service = parse_service('<service name="http" product="Apache"/>')
    assert service.product == "Apache"
    assert service.product_version == ""
    assert service.version == "Apache"


def test_version_without_product() -> None:
    service = parse_service('<service name="http" version="1.2"/>')
    assert service.product == ""
    assert service.product_version == "1.2"
    assert service.version == "1.2"


def test_port_without_service_element_has_empty_fields() -> None:
    service = parse_service("")
    assert service.product == ""
    assert service.product_version == ""


def test_service_element_without_product_or_version_has_empty_fields() -> None:
    service = parse_service('<service name="http" method="table" conf="3"/>')
    assert service.product == ""
    assert service.product_version == ""


def test_hostile_text_is_kept_verbatim() -> None:
    service = parse_service(
        '<service name="http" product="[bold]Evil[/bold] &lt;b&gt;" version="1&#10;2"/>'
    )
    assert service.product == "[bold]Evil[/bold] <b>"
    assert service.product_version == "1\n2"


def test_both_fields_are_written_to_the_dict() -> None:
    service = parse_service('<service name="ssh" product="OpenSSH" version="9.6p1"/>')
    data = service.to_dict()
    assert data["product"] == "OpenSSH"
    assert data["product_version"] == "9.6p1"


def test_hand_built_service_defaults_to_empty_fields() -> None:
    service = Service(host="192.0.2.1", port=22, protocol="tcp", version="OpenSSH 9.6p1")
    assert service.product == ""
    assert service.product_version == ""
