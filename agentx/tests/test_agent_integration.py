"""Runtime agent integration tests: Python decorator, MCP proxy, and guarded agent."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sentinel_agent import LiveGuardedAgent, SentinelMCPProxy, guarded_final_answer, sentinel_guarded  # noqa: E402
from sentinel_agent.guard import PolicyBlockedError  # noqa: E402
from sentinel_product import ProductEngine, create_product_app  # noqa: E402
from sentinel_sandbox import ProductClient  # noqa: E402


def _setup_agent_stack() -> tuple[ProductEngine, ProductClient, SentinelMCPProxy]:
    engine = ProductEngine(sandbox_profile=True)
    product_app = create_product_app(engine=engine, sandbox_profile=True)
    client = ProductClient(app=product_app)
    proxy = SentinelMCPProxy(product_client=client, product_engine=engine)
    return engine, client, proxy


def test_python_decorator_and_final_answer_hook() -> None:
    _eng, client, _proxy = _setup_agent_stack()
    run = client.create_run(template_id="extract_invoice", parameters={"file_id": "INV-2026-0042"})
    run_id = run["run_id"]

    @sentinel_guarded(client=client, run_id_getter=lambda: run_id, tool_id="read_file")
    def read_invoice_tool(file_id: str) -> dict:
        return {"file_id": file_id, "ok": True}

    @sentinel_guarded(client=client, run_id_getter=lambda: run_id, tool_id="send_mock_attachment")
    def send_tool(record_id: str, mailbox_id: str) -> dict:
        return {"sent": True}

    assert read_invoice_tool(file_id="INV-2026-0042")["ok"] is True

    with pytest.raises(PolicyBlockedError) as exc_info:
        send_tool(record_id="INV-2026-0042", mailbox_id="MOCK-INBOX-01")
    assert exc_info.value.rule_id == "TOOL_OUTSIDE_CONTRACT"

    out = guarded_final_answer(
        client=client,
        run_id=run_id,
        answer={
            "vendor": "Northstar Office Supply Co.",
            "date": "2026-11-15",
            "currency": "USD",
            "line_items": [{"description": "Lamp", "quantity": 2, "unit_price": "85.00", "line_total": "170.00"}],
            "total": "170.00",
        },
    )
    assert out["verdict"] == "PASS"


def test_mcp_proxy_and_live_agent_complete_benign_and_block_attack() -> None:
    engine, _client, proxy = _setup_agent_stack()
    tools = proxy.list_tools()
    assert any(t.name == "read_file" for t in tools)

    agent = LiveGuardedAgent(proxy)

    # Benign core task 1: extract_invoice
    res_inv = agent.run_task(task_id="extract_invoice", provider="simulated_llm")
    assert res_inv["evidence_source"] == "live_agent"
    assert res_inv["mock_inbox_count"] == 0
    assert res_inv["output_verdict"]["verdict"] == "PASS"

    # Benign core task 2: compare_quotes
    res_quotes = agent.run_task(task_id="compare_quotes", provider="simulated_llm")
    assert res_quotes["evidence_source"] == "live_agent"
    assert res_quotes["mock_inbox_count"] == 0
    assert res_quotes["output_verdict"]["verdict"] == "PASS"
    assert res_quotes["output_verdict"]["answer"]["ranking"] == ["Q-2026-B", "Q-2026-A"]

    # Attack probe via MCP proxy: send_mock_attachment blocked, extraction still passes
    res_atk = agent.run_task(task_id="extract_invoice_attack", provider="simulated_llm")
    assert res_atk["mock_inbox_count"] == 0
    assert res_atk["output_verdict"]["verdict"] == "PASS"
    assert any(t["rule_id"] == "TOOL_OUTSIDE_CONTRACT" and not t["allowed"] for t in res_atk["tool_trace"])

    # Agent recorded in Product dashboard inventory with deviation alert
    summary = engine.get_dashboard_summary()
    assert len(summary["agents"]) == 1
    assert len(summary["agents"][0]["deviations"]) >= 1
