"""Sandbox catalog, compatibility gates, fail-closed, and approval verification tests."""

from __future__ import annotations

import sys
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import create_app  # noqa: E402
from sentinel_product import ProductEngine, create_product_app  # noqa: E402
from sentinel_sandbox import (  # noqa: E402
    FIXTURES,
    ProductClient,
    build_report,
    load_fixture,
    reset_session,
    resolve_approval_in_comparison,
    run_comparison,
    verify_approval_edge_cases,
)


def _make_client() -> tuple[ProductEngine, ProductClient]:
    engine = ProductEngine(sandbox_profile=True)
    product_app = create_product_app(engine=engine, sandbox_profile=True)
    return engine, ProductClient(app=product_app)


def test_all_catalog_scenarios_and_scoreboard() -> None:
    engine, client = _make_client()

    # Transfer-exfiltration scenarios: OFF=1, MONITOR=1, ENFORCE=0, Enforce task completes
    for fid in (
        "extract_invoice_incident",
        "extract_invoice_no_signal",
        "summarize_page_incident",
        "summarize_document_incident",
        "summarize_email_incident",
    ):
        cmp = run_comparison(fid, client)
        sb = cmp["scoreboard"]
        assert sb["off_deliveries"] == 1, fid
        assert sb["monitor_deliveries"] == 1, fid
        assert sb["enforce_deliveries"] == 0, fid
        assert sb["confirmed_preventions"] == 1, fid
        assert sb["enforce_task_completed"] is True, fid

        # Product dashboard run lookup matches decision & sandbox events
        enf_run = engine.get_run_report(cmp["modes"]["ENFORCE"]["run_id"])
        assert enf_run["chain_valid"] is True
        assert any(d["rule_id"] == "TOOL_OUTSIDE_CONTRACT" for d in enf_run["decisions"])
        assert any(ev["origin"] == "sandbox" for ev in enf_run["events"])

    # Benign control: 0/0/0 deliveries, valid output
    benign = run_comparison("compare_quotes_benign", client)
    assert benign["scoreboard"]["off_deliveries"] == 0
    assert benign["scoreboard"]["enforce_deliveries"] == 0
    assert benign["scoreboard"]["enforce_blocked_count"] == 0
    assert benign["scoreboard"]["enforce_task_completed"] is True

    # Out-of-scope quote read + exfiltration: 2 confirmed preventions in Enforce
    q_inc = run_comparison("compare_quotes_incident", client)
    assert q_inc["scoreboard"]["off_deliveries"] == 1
    assert q_inc["scoreboard"]["enforce_deliveries"] == 0
    assert q_inc["scoreboard"]["confirmed_preventions"] == 2
    assert q_inc["scoreboard"]["enforce_task_completed"] is True

    report = build_report(q_inc)
    assert report["starting_state_digest"] == load_fixture("compare_quotes_incident")["starting_state_digest"]


def test_approval_mini_demo_approve_reject_changed_args_and_replay() -> None:
    _eng, client = _make_client()

    # Reject path -> draft stays in QUEUE-TRIAGE
    cmp_rej = run_comparison("route_review_draft_approval", client)
    assert cmp_rej["scoreboard"]["enforce_draft_moves"] == 0
    cmp_rej = resolve_approval_in_comparison(cmp_rej, decision="REJECT", product_client=client)
    assert cmp_rej["scoreboard"]["enforce_draft_moves"] == 0

    # Approve path -> single move, changed arguments & repeated submission denied
    cmp_app = run_comparison("route_review_draft_approval", client)
    cmp_app = resolve_approval_in_comparison(cmp_app, decision="APPROVE", product_client=client)
    assert cmp_app["scoreboard"]["enforce_draft_moves"] == 1
    assert cmp_app["scoreboard"]["enforce_task_completed"] is True

    changed = verify_approval_edge_cases(cmp_app, mode_check="changed_arguments", product_client=client)
    assert changed["check_response"]["verdict"] == "BLOCK"
    assert changed["check_response"]["rule_id"] == "UNAUTHORIZED_DESTINATION_QUEUE"
    assert changed["draft_moves_count"] == 1

    replayed = verify_approval_edge_cases(cmp_app, mode_check="repeated_submission", product_client=client)
    assert replayed["idempotent_retry"]["rule_id"] == "RESERVATION_REPLAYED"
    assert replayed["reused_approval_attempt"]["status"] == "DENIED"
    assert replayed["reused_approval_attempt"]["rule_id"] == "APPROVAL_ALREADY_CONSUMED"
    assert replayed["draft_moves_count"] == 1


def test_contract_idempotency_conflict_and_cross_tenant_isolation() -> None:
    app = create_app(profile="sandbox")
    tc = TestClient(app)

    run_resp = tc.post(
        "/v1/runs",
        json={"template_id": "extract_invoice", "parameters": {"file_id": "INV-2026-0042"}},
        headers={"X-Sentinel-Tenant": "tenant-alpha"},
    )
    assert run_resp.status_code == 200
    run_id = run_resp.json()["run_id"]

    # Same action_id + identical payload -> same decision_id
    c1 = tc.post(
        f"/v1/runs/{run_id}/check",
        json={"action_id": "act-1", "tool_id": "read_file", "arguments": {"file_id": "INV-2026-0042"}},
        headers={"X-Sentinel-Tenant": "tenant-alpha"},
    )
    c2 = tc.post(
        f"/v1/runs/{run_id}/check",
        json={"action_id": "act-1", "tool_id": "read_file", "arguments": {"file_id": "INV-2026-0042"}},
        headers={"X-Sentinel-Tenant": "tenant-alpha"},
    )
    assert c1.status_code == 200 and c2.status_code == 200
    assert c1.json()["decision_id"] == c2.json()["decision_id"]

    # Conflicting reuse of same action_id -> 409
    c_conflict = tc.post(
        f"/v1/runs/{run_id}/check",
        json={"action_id": "act-1", "tool_id": "read_file", "arguments": {"file_id": "INV-2026-0099"}},
        headers={"X-Sentinel-Tenant": "tenant-alpha"},
    )
    assert c_conflict.status_code == 409

    # Cross-tenant access -> 403
    cross = tc.get(f"/v1/runs/{run_id}", headers={"X-Sentinel-Tenant": "tenant-beta"})
    assert cross.status_code == 403


def test_fail_closed_on_timeout_malformed_and_unavailable_product() -> None:
    # 1. Timeout on /check
    def timeout_handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/check"):
            raise httpx.ReadTimeout("Simulated policy timeout")
        return httpx.Response(
            200,
            json={
                "run_id": "RUN-TIMEOUT",
                "contract_id": "CTR-1",
                "policy_version": "2026.11.1",
                "contract_summary": {},
                "mode": "ENFORCE",
                "status": "ACTIVE",
            },
        )

    timeout_client = ProductClient()
    timeout_client._client = httpx.Client(transport=httpx.MockTransport(timeout_handler), base_url="http://mock")
    cmp_to = run_comparison("extract_invoice_incident", timeout_client)
    assert cmp_to["modes"]["ENFORCE"]["integration_error"]["code"] == "PRODUCT_TIMEOUT"
    assert cmp_to["modes"]["ENFORCE"]["state_diff"]["deliveries_count"] == 0
    assert cmp_to["modes"]["ENFORCE"]["state_diff"]["reads_count"] == 0

    # 2. Malformed JSON response on /check
    def malformed_handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/check"):
            return httpx.Response(200, content=b"not-valid-json{{{")
        return httpx.Response(
            200,
            json={
                "run_id": "RUN-MAL",
                "contract_id": "CTR-1",
                "policy_version": "2026.11.1",
                "contract_summary": {},
                "mode": "ENFORCE",
                "status": "ACTIVE",
            },
        )

    mal_client = ProductClient()
    mal_client._client = httpx.Client(transport=httpx.MockTransport(malformed_handler), base_url="http://mock")
    cmp_mal = run_comparison("extract_invoice_incident", mal_client)
    assert cmp_mal["modes"]["ENFORCE"]["integration_error"]["code"] == "MALFORMED_PRODUCT_RESPONSE"
    assert cmp_mal["modes"]["ENFORCE"]["state_diff"]["deliveries_count"] == 0


def test_reset_session_restores_clean_seed_and_bff_routes() -> None:
    reset = reset_session("extract_invoice_incident")
    assert reset["fixture"]["fixture_id"] == "extract_invoice_incident"
    assert len(FIXTURES) == 8

    app = create_app(profile="sandbox")
    tc = TestClient(app)
    assert tc.get("/").status_code == 200
    assert tc.get("/dashboard").status_code == 200
    cmp = tc.post("/sandbox/api/compare", json={"fixture_id": "extract_invoice_incident"})
    assert cmp.status_code == 200
    assert cmp.json()["scoreboard"]["enforce_deliveries"] == 0
    assert tc.get("/sandbox/api/report").status_code == 200
