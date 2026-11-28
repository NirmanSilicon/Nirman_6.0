"""Module search shapes seen from a real server (found in a live run)."""

import json
import urllib.request
from typing import Any

import pytest

from ghostsight.integrations import metasploit_queries as queries
from ghostsight.integrations import metasploit_rpc as rpc

MATCH = {
    "type": "exploit",
    "name": "MS17-010 EternalBlue SMB Remote Windows Kernel Pool Corruption",
    "fullname": "exploit/windows/smb/ms17_010_eternalblue",
    "rank": "average",
    "disclosuredate": "2017-03-14",
}


class FakeReply:
    status = 200

    def __init__(self, body: bytes) -> None:
        self._body = body

    def __enter__(self) -> "FakeReply":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self, limit: int = -1) -> bytes:
        return self._body if limit < 0 else self._body[:limit]


def search(result: Any) -> queries.SearchResult:
    body = json.dumps({"jsonrpc": "2.0", "result": result, "id": 1}).encode()

    def open_url(request: urllib.request.Request, timeout: float) -> Any:
        return FakeReply(body)

    settings = rpc.RpcSettings(user="msf", password="pw-secret-123")
    return queries.search_modules(settings, "smb", open_url=open_url)


def test_an_empty_disclosure_date_means_no_date() -> None:
    result = search([{**MATCH, "disclosuredate": ""}])
    assert result.matches[0].disclosure_date is None


def test_dates_can_be_mixed_in_one_list() -> None:
    no_key = {key: value for key, value in MATCH.items() if key != "disclosuredate"}
    result = search([MATCH, {**MATCH, "disclosuredate": ""}, no_key])
    dates = tuple(match.disclosure_date for match in result.matches)
    assert dates == ("2017-03-14", None, None)


@pytest.mark.parametrize("date", ["x\x1b", 5, "d" * 201, ["2017"]])
def test_a_bad_date_is_still_refused(date: Any) -> None:
    with pytest.raises(rpc.RpcError) as caught:
        search([{**MATCH, "disclosuredate": date}])
    assert str(caught.value) == rpc.UNUSABLE_MESSAGE


def test_a_normal_date_is_kept() -> None:
    assert search([MATCH]).matches[0].disclosure_date == "2017-03-14"
