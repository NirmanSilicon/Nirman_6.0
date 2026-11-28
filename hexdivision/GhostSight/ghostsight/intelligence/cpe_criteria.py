"""Read an NVD criteria string (the ``cpe:2.3`` form).

NVD match rules carry names such as
``cpe:2.3:a:openbsd:openssh:9.6:p1:*:*:*:*:*:*``. This module splits
such a name into fields and keeps every field exactly as received. It
does not decide what a version means: ``*``, ``-``, ``9.6`` and a glued
``4.3p2`` all pass through unchanged. Judging them is the matcher's job
(decision 36 h).

Nothing here uses the network or touches a file.

A field must be non-empty printable ASCII with no space, colon or
backslash. CPE 2.3 escapes special characters with a backslash (from
memory, unverified). Supporting escapes is separate work, so a name that
contains one is refused and the matcher will say "cannot tell".
"""

import re
from dataclasses import dataclass

# Printable ASCII from "!" to "~", without ":" (0x3a) and "\" (0x5c).
_FIELD = r"[\x21-\x39\x3b-\x5b\x5d-\x7e]+"

# After "cpe:2.3:" come 11 fields: part, vendor, product, version,
# update and six more. fullmatch refuses a trailing newline.
_CRITERIA_PATTERN = re.compile(r"cpe:2\.3:[aho](?::" + _FIELD + r"){10}")


@dataclass(frozen=True)
class Criteria:
    """The fields of one criteria string, exactly as received."""

    part: str
    vendor: str
    product: str
    version: str
    update: str
    others: tuple[str, ...]


def read_criteria(text: str) -> Criteria | None:
    """Return the fields of a cpe:2.3 name, or None if the shape is wrong."""
    if _CRITERIA_PATTERN.fullmatch(text) is None:
        return None
    fields = text.split(":")
    return Criteria(
        part=fields[2],
        vendor=fields[3],
        product=fields[4],
        version=fields[5],
        update=fields[6],
        others=tuple(fields[7:]),
    )
