"""Read and compare dotted version numbers such as 9.6 or 3.9.1.

Nothing here uses the network or touches a file.

A number is digits separated by single dots. A part is either 0 or
starts with 1 to 9, so a leading zero such as 1.02 is refused: GhostSight
cannot tell whether that means 1.2 or something else. Anything that is
not a plain number gives None, which later means "cannot tell" and not
"no match" (decision 36 h).

Comparison is numeric (9.10 is above 9.9), and a missing trailing part
counts as zero (9.6 equals 9.6.0).
"""

import re

# The whole text may be at most this long. A cap keeps int() far away
# from Python's own limit on digit strings, which raises an error.
MAX_NUMBER_LENGTH = 40

# [0-9] and not \d, because \d also matches digits from other scripts.
# fullmatch is used so that a trailing newline is refused.
_NUMBER_PATTERN = re.compile(r"(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*))*")


def parse_number(text: str) -> tuple[int, ...] | None:
    """Return the parts of a dotted number, or None if it is not one."""
    if len(text) > MAX_NUMBER_LENGTH:
        return None
    if _NUMBER_PATTERN.fullmatch(text) is None:
        return None
    return tuple(int(part) for part in text.split("."))


def compare_numbers(left: str, right: str) -> int | None:
    """Return -1, 0 or 1 for left below, equal to or above right.

    Returns None if either side is not a plain dotted number.
    """
    left_parts = parse_number(left)
    right_parts = parse_number(right)
    if left_parts is None or right_parts is None:
        return None
    length = max(len(left_parts), len(right_parts))
    left_padded = left_parts + (0,) * (length - len(left_parts))
    right_padded = right_parts + (0,) * (length - len(right_parts))
    if left_padded < right_padded:
        return -1
    if left_padded > right_padded:
        return 1
    return 0
