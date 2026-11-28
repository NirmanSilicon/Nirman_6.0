"""Read a service version from Nmap's CPE name (decision 36 h).

Nmap writes CPE names in the older URI form, for example
``cpe:/a:openbsd:openssh:9.6p1``. This module splits such a name into
its parts. Nothing here uses the network or touches a file.

The rule is strict on purpose. If the version is not a plain dotted
number, optionally followed by ``p`` and digits, the function returns
None. None later means "cannot tell", which is not the same as
"no match". The ``p`` rule was seen for OpenSSH only (decision 36 h).
"""

import re
from dataclasses import dataclass

# [0-9] is used instead of \d because \d also matches digits from other
# scripts. fullmatch is used so that a trailing newline is refused.
_CPE_PATTERN = re.compile(
    r"cpe:/(?P<part>[aho])"
    r":(?P<vendor>[A-Za-z0-9._~%-]+)"
    r":(?P<product>[A-Za-z0-9._~%-]+)"
    r":(?P<number>[0-9]+(?:\.[0-9]+)*)"
    r"(?P<update>p[0-9]+)?"
)


@dataclass(frozen=True)
class ServiceVersion:
    """A version split into a numeric part and an update.

    For ``9.6p1`` the number is ``9.6`` and the update is ``p1``.
    The update is an empty string when there is none.
    """

    part: str
    vendor: str
    product: str
    number: str
    update: str


def read_cpe_version(cpe: str) -> ServiceVersion | None:
    """Return the version in a Nmap CPE name, or None if it is unclear."""
    match = _CPE_PATTERN.fullmatch(cpe)
    if match is None:
        return None
    return ServiceVersion(
        part=match["part"],
        vendor=match["vendor"],
        product=match["product"],
        number=match["number"],
        update=match["update"] or "",
    )
