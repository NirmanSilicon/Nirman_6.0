"""Tests for reading and comparing dotted version numbers.

A number is digits separated by single dots, such as 9.6 or 3.9.1.
Anything else gives None, which later means "cannot tell". Comparison is
numeric, and a missing trailing part counts as zero (9.6 equals 9.6.0).
"""

import pytest

from ghostsight.intelligence.version_compare import compare_numbers, parse_number


def test_two_part_number_is_read() -> None:
    assert parse_number("9.6") == (9, 6)


def test_single_number_is_read() -> None:
    assert parse_number("9") == (9,)


def test_three_part_number_is_read() -> None:
    assert parse_number("3.9.1") == (3, 9, 1)


def test_zero_parts_are_allowed() -> None:
    assert parse_number("0.0") == (0, 0)
    assert parse_number("10.0") == (10, 0)


def test_longest_allowed_length_is_read() -> None:
    assert parse_number("1" * 40) == (int("1" * 40),)


UNREADABLE = [
    "",
    "9.6p1",
    ".5",
    "1.",
    "1..2",
    " 1.0",
    "1.0\n",
    "*",
    "-",
    "1.0-beta",
    "\u0663",
    "01.2",
    "1.02",
    "00",
    "1.0\x1b",
    "1" * 41,
]


@pytest.mark.parametrize("text", UNREADABLE)
def test_unreadable_number_gives_none(text: str) -> None:
    assert parse_number(text) is None


ORDER = [
    ("9.6", "9.6", 0),
    ("9.5", "9.6", -1),
    ("9.6", "9.5", 1),
    ("9.10", "9.9", 1),
    ("9.6", "9.6.0", 0),
    ("9.6", "9.6.1", -1),
    ("9.6.1", "9.6", 1),
    ("8.6", "9.8", -1),
    ("10", "9", 1),
    ("4.4", "4.3", 1),
    ("3.9.1", "4.4", -1),
]


@pytest.mark.parametrize(("left", "right", "expected"), ORDER)
def test_numbers_are_compared_numerically(
    left: str, right: str, expected: int
) -> None:
    assert compare_numbers(left, right) == expected


CANNOT_COMPARE = [
    ("9.6p1", "9.6"),
    ("9.6", "9.6p1"),
    ("", "9.6"),
    ("*", "*"),
]


@pytest.mark.parametrize(("left", "right"), CANNOT_COMPARE)
def test_unreadable_side_gives_none(left: str, right: str) -> None:
    assert compare_numbers(left, right) is None
