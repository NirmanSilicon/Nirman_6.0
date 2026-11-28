"""Run one Metasploit check-only module over the local RPC server.

A check asks a module whether a target looks vulnerable. It does not run an
exploit. This file has its own list of allowed methods, and module.execute is
not on it. It reuses the safety helpers in metasploit_rpc (loopback address
only, no proxies, no redirects, reply size limit, fixed messages).

Only auxiliary modules with plain names are accepted, and the target must be
exactly one plain IP address. A check sends real network traffic to the
target, so the caller must pass the lab gate and write the audit record first.
"""

import ipaddress
import re
import time
from collections.abc import Callable
from typing import Any

from ghostsight.integrations import metasploit_rpc as rpc
from ghostsight.validation.status_rules import CheckOutcome

# module.execute is deliberately on no list.
CHECK_METHODS = frozenset(
    {"module.info", "module.check", "module.running_stats", "module.results"}
)

MODULE_TYPE = "auxiliary"
MODULE_PATTERN = re.compile(r"auxiliary/[a-z0-9_]+(/[a-z0-9_]+)*")
JOB_ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{1,64}")

# Guesses: to be set from real use.
DEFAULT_MAX_POLLS = 5
DEFAULT_POLL_SECONDS = 2.0

MODULE_MESSAGE = (
    "Refused: only auxiliary check modules with plain names can be used."
)
TARGET_MESSAGE = "Refused: a check needs exactly one plain IP address as the target."
TIMEOUT_MESSAGE = (
    "The Metasploit check did not finish in time, so no result was recorded."
)

# Only "unknown" has been seen from a real server. The rest are from memory.
CODE_OUTCOMES = {
    "vulnerable": CheckOutcome.VULNERABLE,
    "appears": CheckOutcome.APPEARS_VULNERABLE,
    "detected": CheckOutcome.DETECTED,
    "safe": CheckOutcome.NOT_VULNERABLE,
    "unknown": CheckOutcome.CANNOT_TELL,
    "unsupported": CheckOutcome.CANNOT_TELL,
}


def call_check_rpc(
    settings: rpc.RpcSettings,
    method: Any,
    params: list[Any] | None = None,
    open_url: rpc.OpenUrl = rpc._open_directly,
    timeout: float = rpc.REQUEST_TIMEOUT_SECONDS,
    max_bytes: int = rpc.MAX_REPLY_BYTES,
) -> Any:
    """Make one call from CHECK_METHODS and return its result."""
    rpc._check_url(settings.url)
    if not isinstance(method, str) or method not in CHECK_METHODS:
        raise rpc.RpcError(rpc.METHOD_MESSAGE)
    request = rpc._build_request(settings, method, params)
    data = rpc._read_body(request, open_url, timeout, max_bytes)
    return rpc._result_of(data)


def _module_path(module: Any) -> str:
    """Return the part after 'auxiliary/', or refuse the name."""
    if not isinstance(module, str) or not MODULE_PATTERN.fullmatch(module):
        raise rpc.RpcError(MODULE_MESSAGE)
    return module[len(MODULE_TYPE) + 1 :]


def _check_target(target: Any) -> None:
    """Accept only one IP address written in its canonical form."""
    if not isinstance(target, str) or "%" in target:
        raise rpc.RpcError(TARGET_MESSAGE)
    try:
        address = ipaddress.ip_address(target)
    except ValueError:
        raise rpc.RpcError(TARGET_MESSAGE) from None
    if str(address) != target:
        raise rpc.RpcError(TARGET_MESSAGE)


def module_supports_check(
    settings: rpc.RpcSettings,
    module: str,
    open_url: rpc.OpenUrl = rpc._open_directly,
) -> bool:
    """Ask the module's own info whether it has a check. True only for True."""
    path = _module_path(module)
    info = call_check_rpc(
        settings, "module.info", [MODULE_TYPE, path], open_url=open_url
    )
    if not isinstance(info, dict):
        raise rpc.RpcError(rpc.UNUSABLE_MESSAGE)
    return info.get("check") is True


def _job_id_of(started: Any) -> str:
    if not isinstance(started, dict):
        raise rpc.RpcError(rpc.UNUSABLE_MESSAGE)
    job_id = started.get("uuid")
    if not isinstance(job_id, str) or not JOB_ID_PATTERN.fullmatch(job_id):
        raise rpc.RpcError(rpc.UNUSABLE_MESSAGE)
    return job_id


def _is_finished(stats: Any, job_id: str) -> bool:
    if not isinstance(stats, dict) or not isinstance(stats.get("results"), list):
        raise rpc.RpcError(rpc.UNUSABLE_MESSAGE)
    return job_id in stats["results"]


def _wait_for_job(
    settings: rpc.RpcSettings,
    job_id: str,
    open_url: rpc.OpenUrl,
    sleep: Callable[[float], None],
    max_polls: int,
    poll_seconds: float,
) -> None:
    for attempt in range(max_polls):
        stats = call_check_rpc(
            settings, "module.running_stats", [], open_url=open_url
        )
        if _is_finished(stats, job_id):
            return
        if attempt < max_polls - 1:
            sleep(poll_seconds)
    raise rpc.RpcError(TIMEOUT_MESSAGE)


def _outcome_of(result: Any) -> CheckOutcome:
    code = result.get("code")
    if not isinstance(code, str):
        return CheckOutcome.CANNOT_TELL
    return CODE_OUTCOMES.get(code, CheckOutcome.CANNOT_TELL)


def run_check(
    settings: rpc.RpcSettings,
    module: str,
    target: str,
    open_url: rpc.OpenUrl = rpc._open_directly,
    sleep: Callable[[float], None] = time.sleep,
    max_polls: int = DEFAULT_MAX_POLLS,
    poll_seconds: float = DEFAULT_POLL_SECONDS,
) -> CheckOutcome:
    """Run one check against one address and return what it found.

    Only RHOSTS is set. Raises RpcError with a fixed message on any refusal,
    failure or timeout. An unrecognised result code means CANNOT_TELL.
    """
    path = _module_path(module)
    _check_target(target)
    started = call_check_rpc(
        settings,
        "module.check",
        [MODULE_TYPE, path, {"RHOSTS": target}],
        open_url=open_url,
    )
    job_id = _job_id_of(started)
    _wait_for_job(settings, job_id, open_url, sleep, max_polls, poll_seconds)
    final = call_check_rpc(settings, "module.results", [job_id], open_url=open_url)
    if not isinstance(final, dict) or final.get("status") != "completed":
        raise rpc.RpcError(rpc.UNUSABLE_MESSAGE)
    if not isinstance(final.get("result"), dict):
        raise rpc.RpcError(rpc.UNUSABLE_MESSAGE)
    return _outcome_of(final["result"])
