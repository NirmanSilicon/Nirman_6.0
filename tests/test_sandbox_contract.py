"""Consumer tests use the actual product ASGI application, not a policy stub."""

import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from agent_x_product.app import create_app
from agent_x_product.config import Settings
from agent_x_sandbox.app import create_app as create_sandbox
from agent_x_sandbox.client import ProductClient
from agent_x_sandbox.simulator import resume_approval, run_comparison
from agent_x_shared.catalog import load_catalog


class ConsumerContractTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.product = TestClient(create_app(Settings(
            "sandbox", str(Path(self.temporary.name) / "product.db"), "operator", "sandbox",
        )))

        def transport(request):
            return self.product.request(request.method, request.url.path, content=request.content,
                                        headers=dict(request.headers))

        self.client = ProductClient("http://product", "sandbox", httpx.MockTransport(transport))

    def tearDown(self):
        self.client.close()
        self.product.close()
        self.temporary.cleanup()

    def test_all_catalog_scenarios_against_product(self):
        for fixture in load_catalog()["fixtures"]:
            with self.subTest(fixture=fixture["id"]):
                report = run_comparison(fixture["id"], self.client, "http://localhost:8000")
                for result in report["modes"].values():
                    self.assertIsNone(result["error"])
                    self.assertEqual(result["starting_state_digest"], report["starting_state_digest"])
                if fixture["goal"] == "mock-transfer":
                    self.assertEqual(report["score"]["mock_deliveries"], {"OFF": 1, "MONITOR": 1, "ENFORCE": 0})
                    self.assertEqual(report["score"]["confirmed_preventions"], 1)
                if fixture["id"] != "approval-move":
                    self.assertTrue(report["score"]["valid_enforce_output"])

    def test_approved_move_and_duplicate_resume(self):
        report = run_comparison("approval-move", self.client, "http://localhost:8000")
        enforce = report["modes"]["ENFORCE"]
        self.assertEqual(enforce["state"]["draft_queues"]["draft-001"], "drafts")
        approval_id = enforce["pending"][0]["decision"]["approval_id"]
        response = self.product.post(
            f"/v1/runs/{enforce['run_id']}/approvals/{approval_id}",
            headers={"Authorization": "Bearer operator"}, json={"decision": "APPROVE"},
        )
        self.assertEqual(response.status_code, 200)
        resume_approval(report, self.client)
        resume_approval(report, self.client)
        self.assertEqual(enforce["state"]["draft_queues"]["draft-001"], "review-approved")
        self.assertEqual(len(enforce["state"]["applied"]), 1)

    def test_dependency_failure_unknown_verdict_and_malformed_authorization_fail_closed(self):
        for failure in ("timeout", "verdict", "authorization"):
            def transport(request):
                if failure == "timeout" and request.url.path.endswith("/check"):
                    raise httpx.ReadTimeout("unavailable")
                if failure == "verdict" and request.url.path.endswith("/check"):
                    return httpx.Response(200, json={"verdict": "UNRECOGNIZED"})
                if failure == "authorization" and request.url.path.endswith("authorize-mock"):
                    return httpx.Response(200, json={"status": "AUTHORIZED", "rule_id": "x"})
                return self.product.request(request.method, request.url.path,
                                            content=request.content, headers=dict(request.headers))

            with ProductClientContext(httpx.MockTransport(transport)) as client:
                report = run_comparison("invoice-transfer", client, "http://localhost:8000")
            enforce = report["modes"]["ENFORCE"]
            self.assertIsNotNone(enforce["error"])
            self.assertFalse(enforce["state"]["applied"])
            self.assertFalse(enforce["state"]["inbox"])
            self.assertIsNone(enforce["output"])

    def test_browser_session_isolation_and_reset(self):
        app = create_sandbox(self.client)
        with TestClient(app) as first, TestClient(app) as second:
            result = first.post("/api/comparisons", json={"fixture_id": "invoice-transfer"}).json()
            path = f"/api/comparisons/{result['comparison_id']}"
            self.assertEqual(second.get(path).status_code, 404)
            reset = first.post("/api/comparisons", json={"fixture_id": "invoice-transfer"}).json()
            self.assertNotEqual(result["comparison_id"], reset["comparison_id"])
            self.assertNotEqual(result["modes"]["ENFORCE"]["run_id"], reset["modes"]["ENFORCE"]["run_id"])
            self.assertEqual(result["starting_state_digest"], reset["starting_state_digest"])

    def test_invoice_arithmetic_tampering_is_blocked(self):
        run = self.client.create_run({"template_id": "extract_invoice",
                                      "parameters": {"file_id": "invoice-001"}})
        answer = load_catalog()["records"]["invoice-001"]["answer"]
        answer["total"] = "0.01"
        result = self.client.output(run["run_id"], {
            "output_id": "bad-output", "answer": answer, "source_refs": ["invoice-001"],
        })
        self.assertEqual(result["verdict"], "BLOCK")
        self.assertIsNone(result["answer"])

    def test_guarded_task_agents_complete_both_core_tasks(self):
        from agent_x_sandbox.agents import run_agent
        for fixture_id in ("invoice-transfer", "quotes-benign"):
            result = run_agent(fixture_id, "local", True, self.client)
            self.assertEqual(result["status"], "COMPLETED", result["error"])
            self.assertEqual(result["output"]["verdict"], "PASS")
            self.assertFalse(result["state"]["inbox"])
            probe = next(entry for entry in result["trace"] if entry.get("tool_id") == "send_mock_attachment")
            self.assertEqual(probe["decision"]["rule_id"], "TOOL_OUT_OF_SCOPE")
            self.assertFalse(probe["effect_applied"])

    def test_live_agent_cannot_release_answer_without_guarded_reads(self):
        from agent_x_sandbox.agents import run_agent
        with patch("agent_x_sandbox.agents.live_answer", return_value={}):
            result = run_agent("invoice-transfer", "live", False, self.client)
        self.assertEqual(result["status"], "FAILED")
        self.assertEqual(result["error"], "AGENT_REQUIRED_READS_MISSING")
        self.assertIsNone(result["output"])

    def test_review_route_keeps_operator_auth_and_session_ownership(self):
        with TestClient(create_sandbox(self.client)) as browser:
            comparison = browser.post("/api/comparisons", json={"fixture_id": "approval-move"}).json()
            route = f"/api/comparisons/{comparison['comparison_id']}/review"
            self.assertEqual(browser.post(route, json={"decision": "APPROVE"}).status_code, 401)
            approved = browser.post(route, json={"decision": "APPROVE"},
                                    headers={"Authorization": "Bearer operator"})
            self.assertEqual(approved.status_code, 200)
            self.assertEqual(approved.json()["modes"]["ENFORCE"]["diff"]["draft_moves"], 1)
            self.assertEqual(approved.json()["modes"]["ENFORCE"]["execution_status"], "COMPLETED")
            self.assertEqual(approved.json()["modes"]["ENFORCE"]["approval_status"], "CONSUMED")
            browser.post(f"/api/comparisons/{comparison['comparison_id']}/stop", json={},
                         headers={"Authorization": "Bearer operator"})
            resumed = browser.post(f"/api/comparisons/{comparison['comparison_id']}/resume", json={}).json()
            self.assertEqual(resumed["modes"]["ENFORCE"]["execution_status"], "STOPPED")
            self.assertTrue(resumed["modes"]["ENFORCE"]["timeline"][0]["effect_applied"])

    def test_rejected_queue_move_has_explicit_terminal_status(self):
        with TestClient(create_sandbox(self.client)) as browser:
            comparison = browser.post("/api/comparisons", json={"fixture_id": "approval-move"}).json()
            self.assertEqual(comparison["modes"]["ENFORCE"]["execution_status"], "AWAITING_REVIEW")
            self.assertEqual(comparison["modes"]["OFF"]["state"]["draft_queues"]["draft-001"], "review-approved")
            result = browser.post(f"/api/comparisons/{comparison['comparison_id']}/review",
                                  json={"decision": "REJECT"}, headers={"Authorization": "Bearer operator"}).json()
            self.assertEqual(result["modes"]["ENFORCE"]["execution_status"], "REJECTED")
            self.assertEqual(result["modes"]["ENFORCE"]["approval_status"], "REJECTED")
            self.assertEqual(result["modes"]["ENFORCE"]["state"]["draft_queues"]["draft-001"], "drafts")


class ProductClientContext:
    def __init__(self, transport):
        self.client = ProductClient("http://product", "sandbox", transport)

    def __enter__(self):
        return self.client

    def __exit__(self, *args):
        self.client.close()


if __name__ == "__main__":
    unittest.main()
