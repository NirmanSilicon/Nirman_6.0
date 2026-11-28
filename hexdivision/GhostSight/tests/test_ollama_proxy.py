"""The Ollama client must not use proxy settings from the environment."""

import urllib.request

import pytest

from ghostsight.intelligence.ollama_client import NoRedirect, _build_opener

PROXY_VARIABLES = (
    "http_proxy",
    "HTTP_PROXY",
    "https_proxy",
    "HTTPS_PROXY",
    "all_proxy",
    "ALL_PROXY",
)


@pytest.fixture(autouse=True)
def proxy_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in PROXY_VARIABLES:
        monkeypatch.setenv(name, "http://proxy.invalid:3128")


def proxy_handlers(opener: urllib.request.OpenerDirector) -> list[object]:
    return [h for h in opener.handlers if isinstance(h, urllib.request.ProxyHandler)]


def test_control_an_ordinary_opener_would_use_the_proxy() -> None:
    opener = urllib.request.build_opener(NoRedirect)
    assert len(proxy_handlers(opener)) == 1


def test_our_opener_has_no_proxy_handler() -> None:
    assert proxy_handlers(_build_opener()) == []


def test_our_opener_refuses_redirects() -> None:
    handlers = _build_opener().handlers
    plain = [
        h
        for h in handlers
        if isinstance(h, urllib.request.HTTPRedirectHandler)
        and not isinstance(h, NoRedirect)
    ]
    assert plain == []
    assert any(isinstance(h, NoRedirect) for h in handlers)
