"""Parse Nmap XML output into GhostSight data. This module never runs Nmap.

Nmap's XML contains text that comes from the scanned host (service banners),
so it is treated as untrusted:
- Oversized input is refused.
- XML entity definitions are refused.
- Malformed output raises NmapParseError instead of becoming an empty result.
- Text is kept exactly as received. Escaping happens where it is displayed.
- CPE names must match a strict pattern. Anything else is dropped.
"""

import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass

from ghostsight.reporting.models import Service

MAX_XML_BYTES = 10 * 1024 * 1024
UNKNOWN_SERVICE = "unknown"
MAX_CPE_LENGTH = 200
MAX_CPE_PER_SERVICE = 10
CPE_PATTERN = re.compile(r"cpe:/[aho]:[A-Za-z0-9._~%:-]+")


class NmapParseError(Exception):
    """Raised when Nmap output cannot be understood or trusted."""


@dataclass
class ParsedScan:
    """What GhostSight keeps from one Nmap run."""

    services: list[Service]
    hosts_up: int
    hosts_total: int
    elapsed_seconds: float
    nmap_version: str
    completed: bool


def parse_nmap_xml(xml_text: str) -> ParsedScan:
    """Parse Nmap XML text. Raises NmapParseError if it cannot be trusted."""
    if len(xml_text.encode("utf-8")) > MAX_XML_BYTES:
        raise NmapParseError("Nmap output is too large to process safely.")
    if "<!ENTITY" in xml_text:
        raise NmapParseError("Nmap output defines XML entities, which is never expected.")

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as error:
        raise NmapParseError(f"Nmap output is not valid XML: {error}") from error
    if root.tag != "nmaprun":
        raise NmapParseError("Nmap output does not start with <nmaprun>.")

    services: list[Service] = []
    for host in root.findall("host"):
        services.extend(_parse_host(host))

    finished = root.find("runstats/finished")
    hosts = root.find("runstats/hosts")
    return ParsedScan(
        services=services,
        hosts_up=_int_attribute(hosts, "up"),
        hosts_total=_int_attribute(hosts, "total"),
        elapsed_seconds=_float_attribute(finished, "elapsed"),
        nmap_version=root.get("version", "unknown"),
        completed=finished is not None and finished.get("exit") == "success",
    )


def _int_attribute(element: ET.Element | None, name: str) -> int:
    """Read an integer attribute, giving 0 when it is missing or invalid."""
    if element is None:
        return 0
    try:
        return int(element.get(name, "0"))
    except ValueError:
        return 0


def _float_attribute(element: ET.Element | None, name: str) -> float:
    """Read a number attribute, giving 0.0 when it is missing or invalid."""
    if element is None:
        return 0.0
    try:
        return float(element.get(name, "0"))
    except ValueError:
        return 0.0


def _host_address(host: ET.Element) -> str | None:
    """Return the IP address of a host, ignoring MAC addresses."""
    for address in host.findall("address"):
        if address.get("addrtype") in ("ipv4", "ipv6"):
            return address.get("addr")
    return None


def _parse_host(host: ET.Element) -> list[Service]:
    """Return the open services of one host. Hosts that are not up give none."""
    status = host.find("status")
    if status is None or status.get("state") != "up":
        return []

    address = _host_address(host)
    if not address:
        raise NmapParseError("A host in the Nmap output has no IP address.")

    services: list[Service] = []
    for port in host.findall("ports/port"):
        state = port.find("state")
        if state is not None and state.get("state") == "open":
            services.append(_parse_port(address, port))
    return services


def _parse_port(address: str, port: ET.Element) -> Service:
    """Turn one open <port> element into a Service."""
    try:
        number = int(port.get("portid", ""))
    except ValueError as error:
        raise NmapParseError(f"Invalid port number: {port.get('portid')!r}") from error
    if not 1 <= number <= 65535:
        raise NmapParseError(f"Port number out of range: {number}")

    name = UNKNOWN_SERVICE
    product = ""
    product_version = ""
    version = ""
    extra_info = ""
    cpe: list[str] = []
    element = port.find("service")
    if element is not None:
        name = element.get("name") or UNKNOWN_SERVICE
        product = element.get("product", "")
        product_version = element.get("version", "")
        version = " ".join(part for part in (product, product_version) if part)
        extra_info = element.get("extrainfo", "")
        cpe = _parse_cpes(element)

    return Service(
        host=address,
        port=number,
        protocol=port.get("protocol", "tcp"),
        name=name,
        version=version,
        extra_info=extra_info,
        cpe=cpe,
        product=product,
        product_version=product_version,
    )


def _parse_cpes(service: ET.Element) -> list[str]:
    """Return the valid CPE names of a <service> element.

    CPE text comes from the scanned host, so each entry must match a strict
    pattern. Bad, repeated or surplus entries are dropped, not reported as errors.
    """
    cpes: list[str] = []
    for element in service.findall("cpe"):
        text = element.text or ""
        if len(text) > MAX_CPE_LENGTH or not CPE_PATTERN.fullmatch(text):
            continue
        if text not in cpes:
            cpes.append(text)
        if len(cpes) == MAX_CPE_PER_SERVICE:
            break
    return cpes
