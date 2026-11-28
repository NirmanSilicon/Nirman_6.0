"""Tests for the Nmap XML parser. Nothing here runs Nmap."""

import pytest

from ghostsight.integrations.nmap_parser import (
    MAX_CPE_LENGTH,
    MAX_CPE_PER_SERVICE,
    MAX_XML_BYTES,
    NmapParseError,
    parse_nmap_xml,
)

FINISHED_OK = (
    '<runstats><finished time="1700000010" elapsed="10.25" exit="success"/>'
    '<hosts up="1" down="0" total="1"/></runstats>'
)

SSH = (
    '<service name="ssh" product="OpenSSH" version="8.9p1 Ubuntu 3ubuntu0.6" '
    'extrainfo="Ubuntu Linux; protocol 2.0" method="probed" conf="10"/>'
)
HTTP_NO_VERSION = '<service name="http" method="table" conf="3"/>'
GOOD_CPE = "cpe:/a:openbsd:openssh:9.6p1"


def wrap(body: str, runstats: str = FINISHED_OK) -> str:
    """Wrap host XML in the document structure Nmap produces."""
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        "<!DOCTYPE nmaprun>\n"
        '<nmaprun scanner="nmap" args="nmap -sT" start="1700000000" version="7.94SVN">\n'
        f"{body}\n{runstats}\n</nmaprun>\n"
    )


def host(
    ports: str = "",
    address: str = "127.0.0.1",
    addrtype: str = "ipv4",
    state: str = "up",
) -> str:
    """Build one <host> element."""
    return (
        f'<host><status state="{state}" reason="syn-ack"/>'
        f'<address addr="{address}" addrtype="{addrtype}"/>'
        f"<ports>{ports}</ports></host>"
    )


def port(number: int | str, state: str = "open", service: str = "") -> str:
    """Build one <port> element."""
    return (
        f'<port protocol="tcp" portid="{number}">'
        f'<state state="{state}" reason="syn-ack"/>{service}</port>'
    )


def service_with_cpes(*names: str) -> str:
    """Build a <service> element whose <cpe> children carry the given text.

    The text goes into the XML as given, so callers must escape < and &.
    """
    children = "".join(f"<cpe>{name}</cpe>" for name in names)
    return (
        '<service name="ssh" product="OpenSSH" version="9.6p1" '
        f'method="probed" conf="10">{children}</service>'
    )


def test_open_ports_become_services_with_product_and_version() -> None:
    xml = wrap(host(port(22, service=SSH) + port(80, service=HTTP_NO_VERSION)))
    result = parse_nmap_xml(xml)
    assert len(result.services) == 2
    ssh = result.services[0]
    assert (ssh.host, ssh.port, ssh.protocol, ssh.name) == ("127.0.0.1", 22, "tcp", "ssh")
    assert ssh.version == "OpenSSH 8.9p1 Ubuntu 3ubuntu0.6"
    assert ssh.extra_info == "Ubuntu Linux; protocol 2.0"


def test_closed_and_filtered_ports_are_ignored() -> None:
    ports = port(22, state="closed") + port(23, state="filtered") + port(80, service=SSH)
    result = parse_nmap_xml(wrap(host(ports)))
    assert [service.port for service in result.services] == [80]


def test_service_without_version_has_empty_version() -> None:
    result = parse_nmap_xml(wrap(host(port(80, service=HTTP_NO_VERSION))))
    assert result.services[0].name == "http"
    assert result.services[0].version == ""


def test_port_without_service_element_is_named_unknown() -> None:
    result = parse_nmap_xml(wrap(host(port(9999))))
    assert result.services[0].name == "unknown"


def test_host_that_is_down_gives_no_services() -> None:
    result = parse_nmap_xml(wrap(host(port(22, service=SSH), state="down")))
    assert result.services == []


def test_mac_address_is_ignored_in_favour_of_ip_address() -> None:
    body = (
        '<host><status state="up" reason="arp-response"/>'
        '<address addr="AA:BB:CC:DD:EE:FF" addrtype="mac"/>'
        '<address addr="192.168.56.10" addrtype="ipv4"/>'
        f"<ports>{port(22, service=SSH)}</ports></host>"
    )
    result = parse_nmap_xml(wrap(body))
    assert result.services[0].host == "192.168.56.10"


def test_ipv6_address_is_used() -> None:
    result = parse_nmap_xml(wrap(host(port(22, service=SSH), address="::1", addrtype="ipv6")))
    assert result.services[0].host == "::1"


def test_finished_scan_is_marked_completed() -> None:
    assert parse_nmap_xml(wrap(host())).completed is True


def test_scan_without_run_statistics_is_not_completed() -> None:
    assert parse_nmap_xml(wrap(host(port(22, service=SSH)), runstats="")).completed is False


def test_scan_that_finished_with_error_is_not_completed() -> None:
    runstats = '<runstats><finished time="1" elapsed="1.0" exit="error"/></runstats>'
    assert parse_nmap_xml(wrap(host(), runstats=runstats)).completed is False


def test_statistics_and_version_are_read() -> None:
    result = parse_nmap_xml(wrap(host()))
    assert result.elapsed_seconds == 10.25
    assert result.hosts_up == 1
    assert result.hosts_total == 1
    assert result.nmap_version == "7.94SVN"


def test_invalid_xml_raises_parse_error() -> None:
    with pytest.raises(NmapParseError):
        parse_nmap_xml("<nmaprun><host>")


def test_wrong_root_element_raises_parse_error() -> None:
    with pytest.raises(NmapParseError):
        parse_nmap_xml("<html></html>")


def test_entity_definitions_are_refused() -> None:
    xml = '<?xml version="1.0"?>\n<!DOCTYPE nmaprun [<!ENTITY a "aaaa">]>\n<nmaprun>&a;</nmaprun>'
    with pytest.raises(NmapParseError):
        parse_nmap_xml(xml)


def test_oversized_output_is_refused() -> None:
    with pytest.raises(NmapParseError):
        parse_nmap_xml(wrap("") + " " * MAX_XML_BYTES)


@pytest.mark.parametrize("bad_port", ["abc", "0", "70000"])
def test_invalid_port_number_raises_parse_error(bad_port: str) -> None:
    with pytest.raises(NmapParseError):
        parse_nmap_xml(wrap(host(port(bad_port, service=SSH))))


def test_host_without_ip_address_raises_parse_error() -> None:
    body = '<host><status state="up" reason="syn-ack"/><ports></ports></host>'
    with pytest.raises(NmapParseError):
        parse_nmap_xml(wrap(body))


def test_banner_text_is_kept_verbatim() -> None:
    service = '<service name="http" product="[bold]Evil[/bold] &lt;b&gt;" version="1"/>'
    result = parse_nmap_xml(wrap(host(port(80, service=service))))
    assert result.services[0].version == "[bold]Evil[/bold] <b> 1"


def test_scan_with_no_hosts_gives_empty_completed_result() -> None:
    result = parse_nmap_xml(wrap(""))
    assert result.services == []
    assert result.completed is True


def test_cpe_names_are_read_from_the_service() -> None:
    names = (GOOD_CPE, "cpe:/o:linux:linux_kernel")
    result = parse_nmap_xml(wrap(host(port(22, service=service_with_cpes(*names)))))
    assert result.services[0].cpe == list(names)


def test_service_without_cpe_has_empty_list() -> None:
    result = parse_nmap_xml(wrap(host(port(22, service=SSH))))
    assert result.services[0].cpe == []


@pytest.mark.parametrize(
    "bad",
    [
        "not-a-cpe",
        "cpe:2.3:a:openbsd:openssh:9.6",
        "cpe:/x:vendor:product",
        "cpe:/a:",
        "cpe:/a:has space",
        "cpe:/a:&lt;b&gt;",
        "cpe:/a:[bold]x[/bold]",
        "CPE:/a:x",
        "cpe:/a:x&#10;y",
    ],
)
def test_malformed_cpe_entries_are_dropped(bad: str) -> None:
    service = service_with_cpes(bad, GOOD_CPE)
    result = parse_nmap_xml(wrap(host(port(22, service=service))))
    assert result.services[0].cpe == [GOOD_CPE]


def test_overlong_cpe_is_dropped() -> None:
    too_long = "cpe:/a:" + "x" * MAX_CPE_LENGTH
    service = service_with_cpes(too_long, GOOD_CPE)
    result = parse_nmap_xml(wrap(host(port(22, service=service))))
    assert result.services[0].cpe == [GOOD_CPE]


def test_cpe_at_the_length_limit_is_kept() -> None:
    at_limit = "cpe:/a:" + "x" * (MAX_CPE_LENGTH - len("cpe:/a:"))
    assert len(at_limit) == MAX_CPE_LENGTH
    result = parse_nmap_xml(wrap(host(port(22, service=service_with_cpes(at_limit)))))
    assert result.services[0].cpe == [at_limit]


def test_empty_cpe_elements_are_dropped() -> None:
    service = '<service name="ssh"><cpe/><cpe></cpe></service>'
    result = parse_nmap_xml(wrap(host(port(22, service=service))))
    assert result.services[0].cpe == []


def test_duplicate_cpe_names_are_removed_keeping_order() -> None:
    other = "cpe:/o:linux:linux_kernel"
    service = service_with_cpes(GOOD_CPE, other, GOOD_CPE)
    result = parse_nmap_xml(wrap(host(port(22, service=service))))
    assert result.services[0].cpe == [GOOD_CPE, other]


def test_cpe_count_is_capped_per_service() -> None:
    names = [f"cpe:/a:vendor:product:{n}" for n in range(MAX_CPE_PER_SERVICE + 5)]
    result = parse_nmap_xml(wrap(host(port(22, service=service_with_cpes(*names)))))
    assert result.services[0].cpe == names[:MAX_CPE_PER_SERVICE]


def test_bad_cpe_does_not_stop_the_rest_of_the_scan() -> None:
    ports = port(22, service=service_with_cpes("garbage")) + port(
        80, service=service_with_cpes(GOOD_CPE)
    )
    result = parse_nmap_xml(wrap(host(ports)))
    assert [service.port for service in result.services] == [22, 80]
    assert result.services[0].cpe == []
    assert result.services[1].cpe == [GOOD_CPE]


def test_cpe_is_included_in_service_dict() -> None:
    result = parse_nmap_xml(wrap(host(port(22, service=service_with_cpes(GOOD_CPE)))))
    assert result.services[0].to_dict()["cpe"] == [GOOD_CPE]
