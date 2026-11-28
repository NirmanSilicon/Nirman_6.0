import copy
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from agent_x_evaluation.app import create_app
from agent_x_evaluation.core import (
    INVOICES, check_call, compare_runs, compile_contract, validate_result,
)


class InitialEvaluationTests(unittest.TestCase):
    def test_incident_proves_observed_one_vs_zero_and_task_completion(self):
        result = compare_runs("invoice-001", "incident")
        self.assertTrue(result["matched_start"])
        self.assertTrue(result["matched_proposals"])
        self.assertTrue(result["confirmed_prevention"])
        off, enforce = result["runs"]["OFF"], result["runs"]["ENFORCE"]
        self.assertEqual((off["inbox_count"], enforce["inbox_count"]), (1, 0))
        self.assertEqual(len(off["state"]["inbox"]), 1)
        self.assertEqual(enforce["output"]["answer"]["total"], "40.00")
        self.assertEqual(len(enforce["output"]["answer"]["line_items"]), 2)

    def test_benign_and_no_signal_and_reset(self):
        benign = compare_runs("invoice-001", "benign")
        self.assertTrue(all(run["inbox_count"] == 0 for run in benign["runs"].values()))
        first = compare_runs("invoice-001", "incident", False)
        second = compare_runs("invoice-001", "incident", False)
        self.assertTrue(first["confirmed_prevention"])
        self.assertIsNone(first["runs"]["ENFORCE"]["source_annotation"])
        self.assertNotEqual(first["comparison_id"], second["comparison_id"])
        self.assertEqual(first["runs"]["OFF"]["starting_state_digest"],
                         second["runs"]["OFF"]["starting_state_digest"])

    def test_scope_type_unknown_and_zero_executor_calls_on_denial(self):
        contract = compile_contract("invoice-001")
        self.assertEqual(check_call(contract, "read_invoice", {"invoice_id": "invoice-002"})["rule_id"],
                         "RESOURCE_OUT_OF_SCOPE")
        self.assertEqual(check_call(contract, "read_invoice", {"invoice_id": 1})["rule_id"],
                         "ARGUMENTS_INVALID")
        self.assertEqual(check_call(contract, "shell", {})["verdict"], "BLOCK")
        from agent_x_evaluation.core import run_demo
        with patch("agent_x_evaluation.core.send_mock_attachment") as executor:
            run_demo("invoice-001", "incident", "ENFORCE")
            executor.assert_not_called()

    def test_bad_output_schema_and_arithmetic(self):
        answer = copy.deepcopy(INVOICES["invoice-001"])
        answer.pop("invoice_id")
        answer["total"] = "1.00"
        self.assertEqual(validate_result(answer)["rule_id"], "OUTPUT_TOTAL_MISMATCH")
        answer.pop("vendor")
        self.assertEqual(validate_result(answer)["verdict"], "BLOCK")

    def test_browser_api_rejects_unknown_invoice_and_bad_types(self):
        with TestClient(create_app()) as client:
            self.assertEqual(client.get("/").status_code, 200)
            self.assertEqual(client.post("/api/evaluation/compare", json={
                "invoice_id": "unknown", "fixture": "incident",
            }).status_code, 422)
            self.assertEqual(client.post("/api/evaluation/compare", json={
                "invoice_id": 1,
            }).status_code, 422)
            result = client.post("/api/evaluation/compare", json={}).json()
            self.assertTrue(result["confirmed_prevention"])


if __name__ == "__main__":
    unittest.main()
