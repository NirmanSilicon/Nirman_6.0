"""Download every NVD record for one product, or fail. Never a partial set.

This module builds URLs and reads replies. It does not open a network
connection itself: the caller passes in `fetch`, a function that takes a
URL and returns the reply bytes. It never writes a file and never reads
the clock.

The rule that matters: the result is returned only if the number of
distinct CVEs equals the `totalResults` that NVD reported. A missing CVE
would read as "no CVE", so anything short, long, unreadable or changing
raises DownloadError and returns nothing.
"""

import json
from collections.abc import Callable

from ghostsight.intelligence.nvd_cache import safe_name

NVD_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"

# NVD accepted 2000 in the full OpenSSH fetch. Its maximum is not probed,
# so the next page always starts after the records actually received.
PAGE_SIZE = 2000

# From memory, not verified: about 5 requests per 30 seconds without a key.
PAUSE_SECONDS = 6.0

# A guess that stops a misbehaving server from keeping us here forever.
MAX_PAGES = 50


class DownloadError(Exception):
    """The download is incomplete or unreadable. Nothing may be cached."""


def _build_url(vendor: str, product: str, start_index: int) -> str:
    # The names passed safe_name, so they hold only letters, digits and . _ -
    return (
        f"{NVD_URL}?virtualMatchString=cpe:2.3:a:{vendor}:{product}"
        f"&startIndex={start_index}&resultsPerPage={PAGE_SIZE}"
    )


def _read_page(body: bytes) -> tuple[int, list[dict]]:
    """Return NVD's total and the `cve` objects on this page."""
    try:
        data = json.loads(body.decode("utf-8"))
    except (ValueError, RecursionError) as error:
        raise DownloadError("NVD sent a reply that is not valid JSON.") from error
    if not isinstance(data, dict):
        raise DownloadError("NVD sent a reply with an unexpected shape.")

    total = data.get("totalResults")
    # type() rather than isinstance(): True is a bool, not a count.
    if type(total) is not int or total < 0:
        raise DownloadError("NVD sent a total that is not a plain count.")
    if total == 0:
        raise DownloadError(
            "NVD reports no records for this product. That is treated as an "
            "error, because an empty list would read as 'no CVEs'."
        )

    items = data.get("vulnerabilities")
    if not isinstance(items, list):
        raise DownloadError("NVD sent a reply without a list of records.")
    cves: list[dict] = []
    for item in items:
        cve = item.get("cve") if isinstance(item, dict) else None
        if not isinstance(cve, dict) or not isinstance(cve.get("id"), str):
            raise DownloadError("NVD sent a record without a CVE id.")
        cves.append(cve)
    return total, cves


def download_cves(
    vendor: str,
    product: str,
    fetch: Callable[[str], bytes],
    sleep: Callable[[float], None],
    max_pages: int = MAX_PAGES,
) -> tuple[dict, ...]:
    """Fetch all records for one product. Raises UnsafeNameError or DownloadError."""
    vendor_name = safe_name(vendor)
    product_name = safe_name(product)

    collected: list[dict] = []
    seen_ids: set[str] = set()
    expected_total: int | None = None

    for page_number in range(max_pages):
        if page_number > 0:
            sleep(PAUSE_SECONDS)
        url = _build_url(vendor_name, product_name, len(collected))
        try:
            body = fetch(url)
        except OSError as error:
            raise DownloadError(
                f"Could not fetch page {page_number + 1} from NVD "
                f"({type(error).__name__})."
            ) from error

        total, cves = _read_page(body)
        if expected_total is None:
            expected_total = total
        elif total != expected_total:
            raise DownloadError("NVD changed its total between pages.")
        if not cves:
            raise DownloadError("NVD sent an empty page before the total was reached.")

        for cve in cves:
            cve_id = cve["id"]
            if cve_id in seen_ids:
                raise DownloadError("NVD sent the same CVE twice.")
            seen_ids.add(cve_id)
            collected.append(cve)

        if len(collected) > expected_total:
            raise DownloadError("NVD sent more records than its own total.")
        if len(collected) == expected_total:
            return tuple(collected)

    raise DownloadError("NVD needed more pages than the page limit allows.")
