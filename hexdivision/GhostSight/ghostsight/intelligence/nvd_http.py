"""The only code that talks to NVD: one host, HTTPS, no redirects.

The caller can pass in `open_url`, so tests never use the network. Every
failure becomes FetchError, which is an OSError, so the downloader turns
it into DownloadError and refuses to return a partial set.

The timeout applies to each wait on the socket, not to the whole reply.
The size limit is what stops an endless reply.
"""

import http.client
import urllib.error
import urllib.request
from collections.abc import Callable
from urllib.parse import urlsplit

ALLOWED_HOST = "services.nvd.nist.gov"

FETCH_TIMEOUT_SECONDS = 30.0

# A guess, not measured. A full OpenSSH reply was about 1.2 MB.
MAX_REPLY_BYTES = 64 * 1024 * 1024


class FetchError(OSError):
    """NVD could not be reached, or the reply is not acceptable."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """Refuse every redirect, so a reply cannot send us to another host."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, msg, headers, fp)


def _open_without_redirects(request: urllib.request.Request, timeout: float):
    opener = urllib.request.build_opener(NoRedirect)
    return opener.open(request, timeout=timeout)


def _check_url(url: str) -> None:
    try:
        parts = urlsplit(url)
    except ValueError as error:
        raise FetchError("Refusing a URL that cannot be read.") from error
    # netloc must match exactly: that rejects look-alike hosts, user-info
    # tricks and custom ports.
    if parts.scheme != "https" or parts.netloc != ALLOWED_HOST:
        raise FetchError(f"Refusing to contact anything but https://{ALLOWED_HOST}.")


def fetch_nvd(
    url: str,
    open_url: Callable = _open_without_redirects,
    max_bytes: int = MAX_REPLY_BYTES,
) -> bytes:
    """Return the reply body for one NVD URL, or raise FetchError."""
    _check_url(url)
    request = urllib.request.Request(
        url, method="GET", headers={"User-Agent": "GhostSight"}
    )
    try:
        with open_url(request, timeout=FETCH_TIMEOUT_SECONDS) as response:
            if response.status != 200:
                raise FetchError(f"NVD answered with status {response.status}.")
            body = response.read(max_bytes + 1)
    except FetchError:
        raise
    except (OSError, http.client.HTTPException, ValueError) as error:
        raise FetchError(f"Could not read from NVD ({type(error).__name__}).") from error
    if len(body) > max_bytes:
        raise FetchError("NVD sent more data than the size limit allows.")
    return body
