"""Product core unit and security control tests."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import create_app  # noqa: E402
from sentinel_product import ProductEngine, ProductStore  # noqa: E402
from sentinel_shared import ApprovalDecision, AuthorizeStatus, Mode, OutputVerdict, Verdict  # noqa: E402


def test_manifest_pinning_blocks_tampered_tool() -> None:
    engine = ProductEngine(sandbox_profile=True)
    run = engine.create_run(template_id="extract_invoice", parameters={"file_id": "INV-2026-0042"})
    run_id = run["run_id"]

    ok_check = engine.evaluate(
        run_id=run_id,
        action_id="a1",
        tool_id="read_file",
        arguments={"file_id": "INV-2026-0042"},
    )
    assert ok_check["verdict"] == Verdict.ALLOW

    # Re-import read_file with altered description without approving -> pin mismatch!
    engine.import_manifest(
        {
            "tool_id": "read_file",
            "connector_id": "local-files-connector",
            "description": "TAMPERED TOOL DESCRIPTION",
            "schema": {"type": "object", "required": ["file_id"], "properties": {"file_id": {"type": "string"}}},
            "side_effect": "READ_ONLY",
        }
    )
    tampered_check = engine.evaluate(
        run_id=run_id,
        action_id="a2",
        tool_id="read_file",
        arguments={"file_id": "INV-2026-0042"},
    )
    assert tampered_check["verdict"] == Verdict.BLOCK
    assert tampered_check["rule_id"] == "MANIFEST_NOT_APPROVED"


def test_scope_unknown_tool_and_budgets() -> None:
    engine = ProductEngine(sandbox_profile=True)
    engine.register_executor("read_file", lambda args: {"visible_text": "invoice", "record_id": args["file_id"]})
    run = engine.create_run(template_id="extract_invoice", parameters={"file_id": "INV-2026-0042"})
    rid = run["run_id"]

    # Out-of-scope file denied
    out_scope = engine.evaluate(run_id=rid, action_id="a-oob", tool_id="read_file", arguments={"file_id": "INV-2026-0099"})
    assert out_scope["verdict"] == Verdict.BLOCK
    assert out_scope["rule_id"] == "SCOPE_MISMATCH_FILE_ID"

    # Unknown tool default-denied
    unk = engine.evaluate(run_id=rid, action_id="a-unk", tool_id="shell_exec", arguments={"cmd": "whoami"})
    assert unk["verdict"] == Verdict.BLOCK
    assert unk["rule_id"] == "MANIFEST_UNKNOWN"

    # Repeat-call budget limit (max_repeats_per_action = 3)
    for idx in range(3):
        res = engine.dispatch_guarded(
            run_id=rid,
            action_id=f"rep-{idx}",
            tool_id="read_file",
            arguments={"file_id": "INV-2026-0042"},
        )
        assert res["dispatched"] is True

    rep4 = engine.evaluate(
        run_id=rid,
        action_id="rep-4",
        tool_id="read_file",
        arguments={"file_id": "INV-2026-0042"},
    )
    assert rep4["verdict"] == Verdict.BLOCK
    assert rep4["rule_id"] == "REPEAT_CALL_LIMIT_EXCEEDED"


def test_output_validation_sanitization_and_ranking() -> None:
    engine = ProductEngine(sandbox_profile=True)
    inv_run = engine.create_run(template_id="extract_invoice", parameters={"file_id": "INV-2026-0042"})["run_id"]

    bad = engine.validate_output(
        run_id=inv_run,
        output_id="o1",
        answer={
            "vendor": "Northstar",
            "date": "2026-11-15",
            "currency": "USD",
            "line_items": [{"description": "Lamp", "quantity": 2, "unit_price": "85.00", "line_total": "170.00"}],
            "total": "999.00",
        },
    )
    assert bad["verdict"] == OutputVerdict.BLOCK
    assert bad["answer"] is None

    # Sanitization strips <script> and redacts secret token then re-verifies
    sanitized = engine.validate_output(
        run_id=inv_run,
        output_id="o2",
        answer={
            "vendor": "Northstar <script>alert(1)</script> sk-1234567890abcdef",
            "date": "2026-11-15",
            "currency": "USD",
            "line_items": [{"description": "Lamp", "quantity": 2, "unit_price": "85.00", "line_total": "170.00"}],
            "total": "170.00",
        },
    )
    assert sanitized["verdict"] == OutputVerdict.SANITIZED
    assert "<script>" not in sanitized["answer"]["vendor"]
    assert "[REDACTED_API_KEY]" in sanitized["answer"]["vendor"]

    # Quote comparison ranking validation
    q_run = engine.create_run(template_id="compare_quotes", parameters={"file_ids": ["Q-2026-A", "Q-2026-B"]})["run_id"]
    wrong_rank = engine.validate_output(
        run_id=q_run,
        output_id="oq1",
        answer={
            "comparison_rule": "lowest_total_usd",
            "quotes": [
                {"file_id": "Q-2026-A", "vendor": "Cascade", "currency": "USD", "total": "1280.00"},
                {"file_id": "Q-2026-B", "vendor": "Harbor", "currency": "USD", "total": "1140.00"},
            ],
            "ranking": ["Q-2026-A", "Q-2026-B"],
            "source_references": ["files:Q-2026-A", "files:Q-2026-B"],
        },
    )
    assert wrong_rank["verdict"] == OutputVerdict.BLOCK
    assert wrong_rank["rule_id"] == "OUTPUT_RANKING_MISMATCH"


def test_tamper_evident_chain_stop_share_and_memory_quarantine() -> None:
    engine = ProductEngine(sandbox_profile=True)
    run_id = engine.create_run(template_id="extract_invoice", parameters={"file_id": "INV-2026-0042"})["run_id"]
    engine.evaluate(run_id=run_id, action_id="a1", tool_id="read_file", arguments={"file_id": "INV-2026-0042"})

    # Hash chain valid
    report = engine.get_run_report(run_id)
    assert report["chain_valid"] is True

    # Memory provenance quarantine
    mem = engine.write_memory(
        run_id=run_id,
        namespace="notes",
        content="Bearer supersecret_token_123456 from OCR",
        provenance="span-ocr-1",
        source_trust="UNTRUSTED",
    )
    assert mem["quarantined"] is True
    assert "[REDACTED_TOKEN]" in mem["content"]

    # Share link create -> resolve -> revoke
    share = engine.create_share_link(run_id)
    resolved = engine.resolve_share_token(share["view_token"])
    assert resolved["view_only"] is True
    engine.revoke_share_link(share["token_id"])
    with pytest.raises(PermissionError):
        engine.resolve_share_token(share["view_token"])

    # Operator stop blocks subsequent calls
    engine.stop_run(run_id)
    stopped_chk = engine.evaluate(run_id=run_id, action_id="a2", tool_id="read_file", arguments={"file_id": "INV-2026-0042"})
    assert stopped_chk["verdict"] == Verdict.BLOCK
    assert stopped_chk["rule_id"] == "RUN_STOPPED"


def test_expired_approval_denied_and_production_profile_hardened() -> None:
    engine = ProductEngine(sandbox_profile=True)
    rid = engine.create_run(
        template_id="route_review_draft",
        parameters={"draft_id": "DRAFT-404", "queue_id": "QUEUE-FINANCE-REVIEW"},
    )["run_id"]
    chk = engine.evaluate(
        run_id=rid,
        action_id="move-1",
        tool_id="move_mock_draft",
        arguments={"draft_id": "DRAFT-404", "queue_id": "QUEUE-FINANCE-REVIEW"},
    )
    assert chk["verdict"] == Verdict.ASK_HUMAN
    apr_id = chk["approval_id"]
    engine.expire_approval_for_test(apr_id)

    auth = engine.authorize_mock(run_id=rid, action_id="move-1", decision_id=chk["decision_id"], approval_id=apr_id)
    assert auth["status"] == AuthorizeStatus.DENIED
    assert auth["rule_id"] == "APPROVAL_EXPIRED"

    # Digest mismatch check when consuming an approved approval with altered arguments
    rid2 = engine.create_run(
        template_id="route_review_draft",
        parameters={"draft_id": "DRAFT-404", "queue_id": "QUEUE-FINANCE-REVIEW"},
    )["run_id"]
    chk2 = engine.evaluate(
        run_id=rid2,
        action_id="move-2",
        tool_id="move_mock_draft",
        arguments={"draft_id": "DRAFT-404", "queue_id": "QUEUE-FINANCE-REVIEW"},
    )
    engine.resolve_approval(run_id=rid2, approval_id=chk2["approval_id"], decision=ApprovalDecision.APPROVE)
    ok_digest, digest_rule = engine.consume_approval(
        run_id=rid2,
        approval_id=chk2["approval_id"],
        tool_id="move_mock_draft",
        canonical_args={"draft_id": "DRAFT-404", "queue_id": "QUEUE-TRIAGE"},
    )
    assert ok_digest is False
    assert digest_rule == "APPROVAL_ARGUMENT_DIGEST_MISMATCH"

    # Production profile blocks OFF mode & sandbox event ingestion
    prod_app = create_app(profile="production")
    client = TestClient(prod_app)
    resp = client.post(
        "/v1/runs",
        json={"template_id": "extract_invoice", "parameters": {"file_id": "INV-2026-0042"}, "mode": "OFF"},
    )
    assert resp.status_code in (401, 403)
    ev_resp = client.post(
        "/v1/runs/RUN-FAKE/events",
        json={"event_id": "e1", "kind": "TEST", "outcome": "OK", "details": {}},
    )
    assert ev_resp.status_code == 404
