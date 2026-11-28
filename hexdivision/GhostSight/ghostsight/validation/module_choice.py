"""Choose which Metasploit modules might check a finding.

Pure module: no files, no network, no Metasploit calls.

Rules:
- Only an exact CVE id (CVE-YYYY-NNNN, 4 to 7 ASCII digits) becomes a
  search text. Anything else is dropped, so odd text from a finding
  never reaches a search.
- At most MAX_CVE_QUERIES searches are made for one finding.
- Only auxiliary modules can be candidates. Exploit, post, payload and
  every other type are never chosen.
- Better-ranked modules come first. A rank this code does not know
  counts as the worst.
- A candidate is a module that might check the target. It is not proof
  that the module can, and nothing is run here.
"""

import re
from collections.abc import Iterable

from ghostsight.integrations.metasploit_queries import ModuleMatch

MAX_CVE_QUERIES = 5
MAX_CANDIDATES = 3

CANDIDATE_TYPE = "auxiliary"

# Written as [0-9], not \d, so only ASCII digits are accepted.
CVE_ID_PATTERN = re.compile(r"CVE-([0-9]{4})-([0-9]{4,7})")

# Best first. The rank words are from memory and not yet checked
# against a real server, so an unknown word goes last.
RANK_ORDER = ("excellent", "great", "good", "normal", "average", "low", "manual")


def cve_queries(cve_ids: Iterable[str]) -> tuple[str, ...]:
    """Turn CVE ids into Metasploit search texts, dropping bad or repeated ones."""
    queries: list[str] = []
    for cve_id in cve_ids:
        found = CVE_ID_PATTERN.fullmatch(cve_id)
        if found is None:
            continue
        query = f"cve:{found.group(1)}-{found.group(2)}"
        if query in queries:
            continue
        queries.append(query)
        if len(queries) == MAX_CVE_QUERIES:
            break
    return tuple(queries)


def _rank_position(rank: str) -> int:
    word = rank.strip().lower()
    if word in RANK_ORDER:
        return RANK_ORDER.index(word)
    return len(RANK_ORDER)


def choose_candidates(matches: Iterable[ModuleMatch]) -> tuple[ModuleMatch, ...]:
    """Keep auxiliary modules only, best rank first, with no repeats."""
    unique: dict[str, ModuleMatch] = {}
    for item in matches:
        if item.module_type == CANDIDATE_TYPE and item.fullname not in unique:
            unique[item.fullname] = item
    ordered = sorted(
        unique.values(),
        key=lambda item: (_rank_position(item.rank), item.fullname),
    )
    return tuple(ordered[:MAX_CANDIDATES])
