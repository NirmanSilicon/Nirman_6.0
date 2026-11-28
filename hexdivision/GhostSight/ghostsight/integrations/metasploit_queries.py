"""Three read-only questions to a local Metasploit RPC server.

Each function makes one call through the checked client in
metasploit_rpc.py and checks the shape of the reply. Text from the server
must be printable and short, or the whole reply is refused, so control
characters never reach a report. A search keeps at most MAX_MATCHES
results and says when the list was cut.
"""

from dataclasses import dataclass
from typing import Any

from ghostsight.integrations import metasploit_rpc as rpc

MAX_MATCHES = 100
MAX_TEXT_CHARS = 200

QUERY_MESSAGE = "Refused: the search text must be 1 to 200 printable characters."


@dataclass(frozen=True)
class MsfVersion:
    version: str
    ruby: str
    api: str


@dataclass(frozen=True)
class ModuleMatch:
    module_type: str
    name: str
    fullname: str
    rank: str
    disclosure_date: str | None


@dataclass(frozen=True)
class SearchResult:
    matches: tuple[ModuleMatch, ...]
    total: int
    truncated: bool


def _unusable() -> rpc.RpcError:
    return rpc.RpcError(rpc.UNUSABLE_MESSAGE)


def _is_good_text(value: object) -> bool:
    return (
        isinstance(value, str)
        and 1 <= len(value) <= MAX_TEXT_CHARS
        and value.isprintable()
    )


def _text(value: object) -> str:
    if not isinstance(value, str) or not _is_good_text(value):
        raise _unusable()
    return value


def _count(value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise _unusable()
    return value


def _dict(value: object) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise _unusable()
    return value


def get_version(
    settings: rpc.RpcSettings,
    open_url: rpc.OpenUrl = rpc._open_directly,
) -> MsfVersion:
    """Ask which Metasploit version is running."""
    result = _dict(rpc.call_rpc(settings, "core.version", open_url=open_url))
    return MsfVersion(
        version=_text(result.get("version")),
        ruby=_text(result.get("ruby")),
        api=_text(result.get("api")),
    )


def get_module_stats(
    settings: rpc.RpcSettings,
    open_url: rpc.OpenUrl = rpc._open_directly,
) -> dict[str, int]:
    """Ask how many modules of each type are loaded."""
    result = _dict(rpc.call_rpc(settings, "core.module_stats", open_url=open_url))
    if not result:
        raise _unusable()
    return {_text(key): _count(value) for key, value in result.items()}


def _check_query(query: object) -> str:
    if not isinstance(query, str):
        raise rpc.RpcError(QUERY_MESSAGE)
    cleaned = query.strip()
    if not _is_good_text(cleaned):
        raise rpc.RpcError(QUERY_MESSAGE)
    return cleaned


def _parse_match(item: object) -> ModuleMatch:
    data = _dict(item)
    date = data.get("disclosuredate")
    return ModuleMatch(
        module_type=_text(data.get("type")),
        name=_text(data.get("name")),
        fullname=_text(data.get("fullname")),
        rank=_text(data.get("rank")),
        disclosure_date=None if date in (None, "") else _text(date),
    )


def search_modules(
    settings: rpc.RpcSettings,
    query: str,
    open_url: rpc.OpenUrl = rpc._open_directly,
) -> SearchResult:
    """Search Metasploit's own module list. Nothing is sent to any target."""
    cleaned = _check_query(query)
    result = rpc.call_rpc(settings, "module.search", [cleaned], open_url=open_url)
    if not isinstance(result, list):
        raise _unusable()
    kept = tuple(_parse_match(item) for item in result[:MAX_MATCHES])
    return SearchResult(
        matches=kept,
        total=len(result),
        truncated=len(result) > MAX_MATCHES,
    )
