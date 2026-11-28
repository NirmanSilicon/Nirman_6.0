"""Pick the readable software versions out of a detected service.

Decision 38(a): the version comes from Nmap's CPE names only. The free text
in product_version (for example "9.6p1 Ubuntu 3ubuntu13.18") is never parsed.

An empty result means "cannot tell". It never means "clean".
"""

from ghostsight.intelligence.cpe_version import ServiceVersion, read_cpe_version
from ghostsight.reporting.models import Service


def service_versions(service: Service) -> tuple[ServiceVersion, ...]:
    """Return every distinct version found in the service's CPE names."""
    found: list[ServiceVersion] = []
    for cpe in service.cpe:
        version = read_cpe_version(cpe)
        if version is not None and version not in found:
            found.append(version)
    return tuple(found)
