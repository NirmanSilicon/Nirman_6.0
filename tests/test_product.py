import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

from agent_x_product.app import create_app
from agent_x_product.config import Settings
from agent_x_shared.catalog import digest


class ProductTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.settings = Settings("sandbox", str(Path(self.temporary.name) / "test.db"),
                                 "test-operator", "test-sandbox")
        self.app = create_app(self.settings)
        self.client = TestClient(self.app)
        self.headers = {"Authorization": "Bearer test-sandbox"}
        self.operator = {"Authorization": "Bearer test-operator"}

    def tearDown(self):
        self.client.close()
        self.temporary.cleanup()

    def run_id(self, template="extract_invoice", parameters=None):
        response = self.client.post("/v1/runs", headers=self.headers, json={
            "template_id": template, "parameters": parameters or {"file_id": "invoice-001"},
        })
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["run_id"]

    def check(self, run_id, action="read-1", tool="read_file", arguments=None):
        return self.client.post(f"/v1/runs/{run_id}/check", headers=self.headers, json={
            "action_id": action, "tool_id": tool,
            "arguments": arguments if arguments is not None else {"file_id": "invoice-001"},
        })

    def authorize(self, run_id, action, decision):
        return self.client.post(f"/v1/runs/{run_id}/authorize-mock", headers=self.headers, json={
            "action_id": action, "decision_id": decision["decision_id"],
            "approval_id": decision["approval_id"],
        }).json()

    def approval(self):
        run_id = self.run_id("route_review_draft", {
            "draft_id": "draft-001", "queue_id": "review-approved",
        })
        decision = self.check(run_id, "move-1", "move_mock_draft", {
            "draft_id": "draft-001", "queue_id": "review-approved",
        }).json()
        return run_id, decision

    def resolve(self, run_id, decision, resolution):
        return self.client.post(
            f"/v1/runs/{run_id}/approvals/{decision['approval_id']}",
            headers=self.operator, json={"decision": resolution},
        )

    def test_unknown_out_of_scope_and_invalid_calls_never_reserve(self):
        run_id = self.run_id()
        cases = [
            ("unknown", {}, "MANIFEST_UNAPPROVED"),
            ("read_file", {"file_id": "quote-001"}, "RESOURCE_OUT_OF_SCOPE"),
            ("read_file", {"file_id": 5}, "ARGUMENTS_INVALID"),
            ("send_mock_attachment", {"record_id": "invoice-001", "mailbox_id": "mock-inbox"},
             "TOOL_OUT_OF_SCOPE"),
        ]
        for index, (tool, arguments, rule) in enumerate(cases):
            decision = self.check(run_id, f"deny-{index}", tool, arguments).json()
            self.assertEqual((decision["verdict"], decision["rule_id"]), ("BLOCK", rule))
            self.assertEqual(self.authorize(run_id, f"deny-{index}", decision)["status"], "DENIED")
        report = self.client.get(f"/v1/runs/{run_id}", headers=self.headers).json()
        self.assertEqual(report["calls_used"], 0)
        self.assertFalse(report["reservations"])

    def test_check_idempotency_and_conflicting_input(self):
        run_id = self.run_id()
        first = self.check(run_id)
        self.assertEqual(first.json(), self.check(run_id).json())
        conflict = self.check(run_id, arguments={"file_id": "quote-001"})
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(conflict.json()["code"], "ACTION_ID_CONFLICT")

    def test_exact_approval_concurrent_reservation_and_stop(self):
        run_id, decision = self.approval()
        self.assertEqual(decision["verdict"], "ASK_HUMAN")
        self.assertEqual(self.authorize(run_id, "move-1", decision)["status"], "DENIED")
        self.assertEqual(self.resolve(run_id, decision, "APPROVE").status_code, 200)
        with ThreadPoolExecutor(max_workers=4) as executor:
            results = list(executor.map(lambda _: self.authorize(run_id, "move-1", decision), range(4)))
        self.assertTrue(all(result["status"] == "AUTHORIZED" for result in results))
        self.assertEqual(len({result["reservation_id"] for result in results}), 1)
        report = self.client.get(f"/v1/runs/{run_id}", headers=self.headers).json()
        self.assertEqual(report["calls_used"], 1)
        self.assertEqual(report["approvals"][decision["approval_id"]]["status"], "CONSUMED")
        changed = self.check(run_id, "move-1", "move_mock_draft", {
            "draft_id": "draft-001", "queue_id": "other-queue",
        })
        self.assertEqual(changed.status_code, 409)
        self.client.post(f"/v1/runs/{run_id}/stop", headers=self.operator)
        self.assertEqual(self.authorize(run_id, "move-1", decision)["rule_id"], "RUN_STOPPED")

    def test_rejected_and_expired_approval(self):
        run_id, decision = self.approval()
        self.resolve(run_id, decision, "REJECT")
        self.assertEqual(self.authorize(run_id, "move-1", decision)["status"], "DENIED")
        run_id, decision = self.approval()
        self.resolve(run_id, decision, "APPROVE")
        store = self.app.state.store
        with store.transaction() as connection:
            run = store.get(connection, run_id)
            run["approvals"][decision["approval_id"]]["expires_at"] = (
                datetime.now(UTC) - timedelta(seconds=1)
            ).isoformat()
            store.save(connection, run)
        self.assertEqual(self.authorize(run_id, "move-1", decision)["rule_id"], "APPROVAL_EXPIRED")

    def test_manifest_pinning_is_rechecked_at_authorization(self):
        run_id = self.run_id()
        decision = self.check(run_id).json()
        self.app.state.manifests.clear()
        self.assertEqual(self.authorize(run_id, "read-1", decision)["rule_id"], "MANIFEST_UNAPPROVED")

    def test_budget_and_reservation_replay(self):
        run_id = self.run_id()
        for index in range(20):
            action = f"read-{index}"
            decision = self.check(run_id, action=action).json()
            first = self.authorize(run_id, action, decision)
            self.assertEqual(first["status"], "AUTHORIZED")
            self.assertEqual(first, self.authorize(run_id, action, decision))
        decision = self.check(run_id, action="read-over-budget").json()
        self.assertEqual(self.authorize(run_id, "read-over-budget", decision)["rule_id"],
                         "BUDGET_EXCEEDED")

    def test_authentication_role_and_ownership(self):
        self.assertEqual(self.client.post("/v1/runs", json={
            "template_id": "extract_invoice", "parameters": {"file_id": "invoice-001"},
        }).status_code, 401)
        operator_run = self.client.post("/v1/runs", headers=self.operator, json={
            "template_id": "extract_invoice", "parameters": {"file_id": "invoice-001"},
        }).json()["run_id"]
        self.assertEqual(self.client.get(f"/v1/runs/{operator_run}", headers=self.headers).status_code, 404)
        run_id, decision = self.approval()
        response = self.client.post(
            f"/v1/runs/{run_id}/approvals/{decision['approval_id']}",
            headers=self.headers, json={"decision": "APPROVE"},
        )
        self.assertEqual(response.status_code, 403)

    def test_production_excludes_sandbox_routes_and_fails_closed_without_records(self):
        settings = Settings("production", str(Path(self.temporary.name) / "production.db"),
                            "test-operator", "")
        with TestClient(create_app(settings)) as client:
            paths = client.get("/openapi.json").json()["paths"]
            self.assertNotIn("/v1/runs/{run_id}/events", paths)
            self.assertNotIn("/v1/runs/{run_id}/authorize-mock", paths)
            response = client.post("/v1/runs", headers=self.operator, json={
                "template_id": "extract_invoice", "parameters": {"file_id": "invoice-001"},
                "mode": "OFF",
            })
            self.assertEqual(response.status_code, 403)
            response = client.post("/v1/runs", headers=self.operator, json={
                "template_id": "extract_invoice", "parameters": {"file_id": "invoice-001"},
            })
            self.assertEqual(response.status_code, 422)

    def test_audit_chain_and_event_replay(self):
        run_id = self.run_id()
        event = {"event_id": "event-1", "kind": "mock.effect", "outcome": "APPLIED",
                 "details": {"token": "must-not-persist"}}
        for _ in range(2):
            self.assertEqual(self.client.post(f"/v1/runs/{run_id}/events",
                                              headers=self.headers, json=event).status_code, 200)
        report = self.client.get(f"/v1/runs/{run_id}", headers=self.headers).json()
        self.assertEqual(len(report["events"]), 2)
        self.assertNotIn("must-not-persist", str(report))
        previous = "0" * 64
        for original in report["events"]:
            event = dict(original)
            event_hash = event.pop("hash")
            self.assertEqual(event["previous_hash"], previous)
            self.assertEqual(event_hash, digest(event))
            previous = event_hash


if __name__ == "__main__":
    unittest.main()
