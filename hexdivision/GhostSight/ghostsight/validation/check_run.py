"""Run the planned Metasploit checks for a scan's findings.

For each planned finding this looks up candidate modules, keeps only
auxiliary modules that have a check, and runs the first one. It never
runs an exploit, and it does not save anything. Findings that cannot be
checked are reported in `skipped`, with the reason.
"""

from __future__ import annotations

import ipaddress
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass

from ghostsight.integrations import metasploit_rpc as rpc
from ghostsight.integrations.metasploit_check import (
    TARGET_MESSAGE,
    module_supports_check,
    run_check,
)
from ghostsight.integrations.metasploit_queries import ModuleMatch, search_modules
from ghostsight.validation.check_plan import PlannedCheck
from ghostsight.validation.module_choice import choose_candidates
from ghostsight.validation.validation_apply import CheckResult

NO_CANDIDATE_NOTE = "no auxiliary check module was found for its CVE ids."
NO_CHECK_NOTE = "no candidate module has a check."


@dataclass(frozen=True)
class CheckRun:
    """What the checks produced: results to save and reasons for skips."""

    results: tuple[CheckResult, ...]
    skipped: tuple[str, ...]


def _is_single_address(target: str) -> bool:
    """True only for one plain IP address in its canonical written form."""
    try:
        return str(ipaddress.ip_address(target)) == target
    except ValueError:
        return False


def find_candidates(
    settings: rpc.RpcSettings,
    queries: Sequence[str],
    open_url: rpc.OpenUrl = rpc._open_directly,
) -> tuple[ModuleMatch, ...]:
    """Search Metasploit for every query and keep the usable candidates.

    This only reads from the local Metasploit server. Nothing is sent
    to the target.
    """
    matches: list[ModuleMatch] = []
    for query in queries:
        matches.extend(search_modules(settings, query, open_url=open_url).matches)
    return choose_candidates(matches)


def find_checkable_module(
    settings: rpc.RpcSettings,
    candidates: Sequence[ModuleMatch],
    open_url: rpc.OpenUrl = rpc._open_directly,
) -> str | None:
    """Return the first candidate that says it has a check, else None."""
    for candidate in candidates:
        if module_supports_check(settings, candidate.fullname, open_url=open_url):
            return candidate.fullname
    return None


def _check_one(
    settings: rpc.RpcSettings,
    target: str,
    item: PlannedCheck,
    open_url: rpc.OpenUrl,
    sleep: Callable[[float], None],
) -> CheckResult | str:
    """Check one finding. Return a result, or a note saying why not."""
    number = item.finding_index + 1
    if not _is_single_address(target):
        return f"Finding {number}: {TARGET_MESSAGE}"
    candidates = find_candidates(settings, item.queries, open_url)
    if not candidates:
        return f"Finding {number}: {NO_CANDIDATE_NOTE}"
    module = find_checkable_module(settings, candidates, open_url)
    if module is None:
        return f"Finding {number}: {NO_CHECK_NOTE}"
    outcome = run_check(settings, module, target, open_url=open_url, sleep=sleep)
    return CheckResult(item.finding_index, module, outcome)


def run_planned_checks(
    settings: rpc.RpcSettings,
    target: str,
    plan: Sequence[PlannedCheck],
    open_url: rpc.OpenUrl = rpc._open_directly,
    sleep: Callable[[float], None] = time.sleep,
) -> CheckRun:
    """Run the plan. One failing finding does not stop the others."""
    results: list[CheckResult] = []
    skipped: list[str] = []
    for item in plan:
        try:
            outcome = _check_one(settings, target, item, open_url, sleep)
        except rpc.RpcError as error:
            skipped.append(f"Finding {item.finding_index + 1}: {error}")
            continue
        if isinstance(outcome, CheckResult):
            results.append(outcome)
        else:
            skipped.append(outcome)
    return CheckRun(results=tuple(results), skipped=tuple(skipped))
