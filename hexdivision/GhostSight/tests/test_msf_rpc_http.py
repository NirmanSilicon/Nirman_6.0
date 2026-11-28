"""Tests for the Metasploit client against a real local HTTP server (loopback only)."""

import json
import threading
import urllib.request
from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from ghostsight.integrations import metasploit_rpc as rpc

ELSEWHERE = "/elsewhere"
REPLY = {"jsonrpc": "2.0", "id": rpc.REQUEST_ID, "result": {"version": "test"}}


class Handler(BaseHTTPRequestHandler):
    """Answers on the RPC path, or redirects it when the server is in redirect mode."""

    def _send(self, status: int, body: bytes = b"", location: str | None = None) -> None:
        self.send_response(status)
        if location is not None:
            self.send_header("Location", location)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _handle(self) -> None:
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
        self.server.hits.append((self.command, self.path))
        if self.path == rpc.RPC_PATH and self.server.mode == "redirect":
            port = self.server.server_address[1]
            self._send(303, location=f"http://127.0.0.1:{port}{ELSEWHERE}")
        else:
            self._send(200, json.dumps(REPLY).encode("utf-8"))

    do_GET = _handle
    do_POST = _handle

    def log_message(self, format: str, *args: object) -> None:
        """Keep the test output quiet."""


class LocalServer(ThreadingHTTPServer):
    def __init__(self) -> None:
        super().__init__(("127.0.0.1", 0), Handler)
        self.mode = "ok"
        self.hits: list[tuple[str, str]] = []


@pytest.fixture
def server() -> Iterator[LocalServer]:
    running = LocalServer()
    thread = threading.Thread(target=running.serve_forever, daemon=True)
    thread.start()
    yield running
    running.shutdown()
    running.server_close()
    thread.join(timeout=5)


def settings_for(running: LocalServer) -> rpc.RpcSettings:
    url = f"http://127.0.0.1:{running.server_address[1]}{rpc.RPC_PATH}"
    return rpc.RpcSettings(user="msf", password="test-password", url=url)


def test_a_normal_reply_works_over_real_http(server: LocalServer) -> None:
    result = rpc.call_rpc(settings_for(server), "core.version", timeout=5.0)
    assert result == {"version": "test"}
    assert server.hits == [("POST", rpc.RPC_PATH)]


def test_a_redirect_is_refused_and_not_followed(server: LocalServer) -> None:
    server.mode = "redirect"
    with pytest.raises(rpc.RpcError) as caught:
        rpc.call_rpc(settings_for(server), "core.version", timeout=5.0)
    assert str(caught.value) == rpc.UNREACHABLE_MESSAGE
    assert server.hits == [("POST", rpc.RPC_PATH)]


def test_a_plain_opener_would_follow_the_same_redirect(server: LocalServer) -> None:
    """Control: the redirect is real and followable, so the refusal above means something."""
    server.mode = "redirect"
    request = urllib.request.Request(settings_for(server).url, data=b"{}", method="POST")
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(request, timeout=5.0) as reply:
        reply.read()
    assert server.hits == [("POST", rpc.RPC_PATH), ("GET", ELSEWHERE)]
