"""Refresh the cache for one product, but only after a complete download.

`fetch`, `sleep` and `now` are passed in, so this module uses no network,
no real delay and no real clock of its own. The cache changes only if
download_cves returns a complete set. Any failure raises before the clock
is read or the cache is touched, so the old cache stays exactly as it was.
"""

from collections.abc import Callable

from ghostsight.intelligence.nvd_cache import write_cache
from ghostsight.intelligence.nvd_download import download_cves


def update_cache(
    vendor: str,
    product: str,
    fetch: Callable[[str], bytes],
    sleep: Callable[[float], None],
    now: Callable[[], str],
) -> int:
    """Download and store every CVE for one product. Return how many.

    Raises UnsafeNameError or DownloadError, and writes nothing in that case.
    """
    cves = download_cves(vendor, product, fetch, sleep)
    write_cache(vendor, product, cves, now())
    return len(cves)
