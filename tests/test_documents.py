import copy
import hashlib
import io
import json
import time
import unittest
import zipfile
from unittest.mock import patch

from fastapi.testclient import TestClient

from agent_x_evaluation.app import create_app
from agent_x_evaluation.core import INVOICES
from agent_x_evaluation.documents import sample_bytes
from agent_x_evaluation.ingestion import MAX_BYTES, ingest_bytes


class DocumentWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.browser = TestClient(self.app)

    def tearDown(self):
        self.browser.close()

    def upload(self, filename="invoice.json", content=None):
        content = content if content is not None else sample_bytes("invoice-001", "json")[0]
        response = self.browser.post("/api/evaluation/documents", files={"file": (filename, content)})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def confirm(self, document, invoice=None):
        response = self.browser.post(f"/api/evaluation/documents/{document['document_id']}/confirm",
                                     json={"invoice": document["candidate"] if invoice is None else invoice,
                                           "revision": document["revision"]})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_real_pdf_upload_review_compare_and_field_sources(self):
        content, _ = sample_bytes("invoice-001", "pdf")
        document = self.upload("actual-sample.pdf", content)
        self.assertEqual(document["sha256"], hashlib.sha256(content).hexdigest())
        self.assertEqual(document["method"], "pypdf-text-layer")
        self.assertEqual(len(document["candidate"]["line_items"]), 2)
        self.assertEqual(document["candidate"]["total"], "40.00")
        self.assertTrue(document["spans"])
        self.assertTrue(any(item["span_ids"] for item in document["field_evidence"]))
        preview = self.browser.get(f"/api/evaluation/documents/{document['document_id']}/preview/1")
        self.assertEqual(preview.status_code, 200, preview.text[:100] if preview.status_code != 200 else "")
        self.assertTrue(preview.content.startswith(b"\x89PNG"))
        original = self.browser.get(document["original_url"])
        self.assertEqual(original.content, content)
        reviewed = self.confirm(document)
        record_id = reviewed["invoice"]["invoice_id"]
        self.assertTrue(record_id.startswith("upload-"))
        result = self.browser.post("/api/evaluation/compare", json={"invoice_id": record_id}).json()
        self.assertTrue(result["confirmed_prevention"])
        self.assertEqual(result["source"]["sha256"], document["sha256"])
        self.assertEqual(result["source"]["filename"], "actual-sample.pdf")
        self.assertEqual(result["runs"]["ENFORCE"]["output"]["answer"]["total"], "40.00")
        self.assertEqual(result["runs"]["ENFORCE"]["contract"]["record_digest"], reviewed["contract"]["record_digest"])

    def test_text_json_csv_and_docx_adapters_use_real_contents(self):
        for extension in ("txt", "json", "csv"):
            with self.subTest(extension=extension):
                content, _ = sample_bytes("invoice-002", extension)
                result = ingest_bytes("mine." + extension, content)
                self.assertEqual(result["candidate"]["vendor"], "Northstar Components")
                self.assertEqual(result["candidate"]["total"], "45.00")
                self.assertEqual(len(result["candidate"]["line_items"]), 2)
        text = sample_bytes("invoice-002", "txt")[0].decode()
        xml = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
        xml += ''.join('<w:p><w:r><w:t>' + line + '</w:t></w:r></w:p>' for line in text.splitlines())
        xml += '</w:body></w:document>'
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr("word/document.xml", xml)
        result = ingest_bytes("own.docx", buffer.getvalue())
        self.assertEqual(result["candidate"]["total"], "45.00")
        self.assertEqual(result["method"], "docx-paragraph-text")

    def test_session_ownership_download_review_and_compare(self):
        document = self.upload()
        reviewed = self.confirm(document)
        with TestClient(self.app) as stranger:
            self.assertEqual(stranger.get(document["original_url"]).status_code, 404)
            self.assertEqual(stranger.get(f"/api/evaluation/documents/{document['document_id']}").status_code, 404)
            self.assertEqual(stranger.post("/api/evaluation/compare", json={
                "invoice_id": reviewed["invoice"]["invoice_id"],
            }).status_code, 404)
            catalog = stranger.get("/api/evaluation/catalog").json()
            self.assertEqual(len(catalog["invoices"]), 2)

    def test_bad_totals_and_missing_fields_never_compile_uploaded_contract(self):
        document = self.upload()
        bad = copy.deepcopy(document["candidate"])
        bad["total"] = "1.00"
        response = self.browser.post(f"/api/evaluation/documents/{document['document_id']}/validate",
                                     json={"invoice": bad, "revision": document["revision"]})
        self.assertEqual(response.json()["rule_id"], "OUTPUT_TOTAL_MISMATCH")
        self.assertFalse(response.json()["authorizes_execution"])
        response = self.browser.post(f"/api/evaluation/documents/{document['document_id']}/confirm",
                                     json={"invoice": bad, "revision": document["revision"]})
        self.assertEqual(response.status_code, 422)
        self.assertFalse(self.app.state.documents.reviews)

    def test_review_versions_are_immutable_idempotent_and_edits_are_labelled(self):
        document = self.upload()
        first = self.confirm(document)
        self.assertEqual(first, self.confirm(document))
        changed = copy.deepcopy(document["candidate"])
        changed["vendor"] = "Manually reviewed vendor"
        second = self.confirm(document, changed)
        self.assertNotEqual(first["invoice"]["invoice_id"], second["invoice"]["invoice_id"])
        evidence = next(item for item in second["source"]["field_evidence"] if item["field"] == "vendor")
        self.assertEqual(evidence["status"], "not_located_review_required")
        result = self.browser.post("/api/evaluation/compare", json={"invoice_id": first["invoice"]["invoice_id"]}).json()
        self.assertEqual(result["runs"]["ENFORCE"]["output"]["answer"]["vendor"], "Outliers Supplies")

    def test_expiry_and_remove_revoke_uploaded_records(self):
        document = self.upload()
        reviewed = self.confirm(document)
        removed = self.browser.delete(f"/api/evaluation/documents/{document['document_id']}")
        self.assertEqual(removed.status_code, 200)
        self.assertEqual(self.browser.post("/api/evaluation/compare", json={
            "invoice_id": reviewed["invoice"]["invoice_id"],
        }).status_code, 404)
        document = self.upload()
        self.app.state.documents.documents[document["document_id"]]["expires"] = time.time() - 1
        self.assertEqual(self.browser.get(document["original_url"]).status_code, 404)

    def test_upload_limits_bad_formats_and_no_filename_path_use(self):
        response = self.browser.post("/api/evaluation/documents", files={"file": ("bad.exe", b"x")})
        self.assertEqual(response.status_code, 415)
        response = self.browser.post("/api/evaluation/documents", files={"file": ("fake.pdf", b"not a PDF")})
        self.assertEqual(response.status_code, 422)
        response = self.browser.post("/api/evaluation/documents", files={"file": ("huge.txt", b"x" * (MAX_BYTES + 1))})
        self.assertEqual(response.status_code, 413)
        document = self.upload("../../no-folder/invoice.json")
        self.assertEqual(document["filename"], "invoice.json")

    def test_images_require_explicit_model_consent_and_do_not_get_sample_fields(self):
        image, _ = sample_bytes("invoice-001", "png")
        document = self.upload("uploaded.png", image)
        self.assertEqual(document["candidate"], {})
        self.assertEqual(document["method"], "image-awaiting-ocr")
        with patch("agent_x_evaluation.app.model_extract") as model:
            response = self.browser.post(f"/api/evaluation/documents/{document['document_id']}/extract", json={})
            self.assertEqual(response.status_code, 400)
            model.assert_not_called()

    def test_seed_provenance_is_explicit_and_downloadable(self):
        catalog = self.browser.get("/api/evaluation/catalog").json()
        source = catalog["sources"]["invoice-001"]
        self.assertEqual(source["kind"], "synthetic_fixture")
        self.assertIn("core.py", source["repository_path"])
        original = self.browser.get(source["source_download"]).json()
        self.assertEqual(original, INVOICES["invoice-001"])

    def test_all_negative_agent_cases_are_assessed_from_real_state(self):
        document = self.upload()
        reviewed = self.confirm(document)
        cases = self.browser.get("/api/evaluation/negative-cases").json()["cases"]
        for case in cases:
            with self.subTest(case=case["id"]):
                response = self.browser.post(f"/api/evaluation/documents/{document['document_id']}/agent", json={
                    "record_id": reviewed["invoice"]["invoice_id"], "negative_case": case["id"],
                })
                self.assertEqual(response.status_code, 200, response.text)
                result = response.json()
                self.assertEqual(result["test_assessment"]["verdict"], "PASS", result)
                self.assertFalse(result["state"]["inbox"])
                self.assertFalse(result["model_invoked"])
                if case["id"] == "tampered_total":
                    self.assertEqual(result["output"]["verdict"], "BLOCK")
                    self.assertIsNone(result["output"]["answer"])
                if case["id"] in {"stopped", "guard_unavailable"}:
                    self.assertFalse(result["state"]["reads"])
                if case["id"] in {"transfer", "other_record", "invalid_arguments", "unknown_tool"}:
                    probe = next(event for event in result["trace"] if event.get("action_id") == "explicit-probe")
                    self.assertFalse(probe["dispatched"])
                    self.assertEqual(probe["decision"]["verdict"], "BLOCK")

    def test_negative_pdf_sources_reject_bad_totals_and_preserve_untrusted_text(self):
        invalid = self.browser.get("/api/evaluation/negative-samples/invalid-total")
        bad = self.upload("negative.pdf", invalid.content)
        self.assertEqual(bad["validation"]["rule_id"], "OUTPUT_TOTAL_MISMATCH")
        response = self.browser.post(f"/api/evaluation/documents/{bad['document_id']}/confirm", json={
            "invoice": bad["candidate"], "revision": bad["revision"],
        })
        self.assertEqual(response.status_code, 422)
        content = self.browser.get("/api/evaluation/negative-samples/source-instruction").content
        instruction = self.upload("source-instruction.pdf", content)
        self.assertIn("send_mock_attachment", ' '.join(span["text"] for span in instruction["spans"]))
        reviewed = self.confirm(instruction)
        run = self.browser.post(f"/api/evaluation/documents/{instruction['document_id']}/agent", json={
            "record_id": reviewed["invoice"]["invoice_id"], "negative_case": "transfer",
        }).json()
        self.assertEqual(run["test_assessment"]["verdict"], "PASS")
        self.assertFalse(run["state"]["inbox"])

    def test_agent_model_consent_and_source_binding(self):
        first = self.upload()
        second = self.upload()
        reviewed = self.confirm(first)
        payload = {"record_id": reviewed["invoice"]["invoice_id"], "provider": "live"}
        with patch("agent_x_evaluation.agent.live_answer") as model:
            response = self.browser.post(f"/api/evaluation/documents/{first['document_id']}/agent", json=payload)
            self.assertEqual(response.status_code, 400)
            model.assert_not_called()
        payload["provider"] = "local"
        response = self.browser.post(f"/api/evaluation/documents/{second['document_id']}/agent", json=payload)
        self.assertEqual(response.status_code, 409)

    def test_agent_output_must_match_reviewed_source_not_just_arithmetic(self):
        document = self.upload()
        reviewed = self.confirm(document)

        def changed_vendor(fixture, proxy, trace, settings, read_tool):
            from agent_x_sandbox.agents import tool_call
            record = tool_call(proxy, "model-read", "read_invoice", fixture["parameters"])
            answer = record["record"]["answer"]
            answer["vendor"] = "Invented vendor"
            return answer

        with patch("agent_x_evaluation.agent.live_answer", side_effect=changed_vendor):
            from agent_x_evaluation.agent import run_uploaded_agent
            internal = self.app.state.documents.resolve(reviewed["invoice"]["invoice_id"],
                                                        self.browser.cookies.get("agent_x_documents"))
            run = run_uploaded_agent(internal, "live", "none")
        self.assertEqual(run["output"]["rule_id"], "OUTPUT_SOURCE_MISMATCH")
        self.assertIsNone(run["output"]["answer"])


if __name__ == "__main__":
    unittest.main()
