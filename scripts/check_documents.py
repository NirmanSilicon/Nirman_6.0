"""Check the complete document workflow through the frontend; optional real OCR/agent calls."""

import argparse
import hashlib
import json
from pathlib import Path

import httpx


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:13080")
    parser.add_argument("--live", action="store_true")
    args = parser.parse_args()
    evidence = []
    with httpx.Client(base_url=args.base_url, timeout=180) as browser:
        for extension in ("pdf", "json", "csv", "txt"):
            sample = browser.get(f"/api/evaluation/samples/invoice-001/{extension}")
            sample.raise_for_status()
            upload = browser.post("/api/evaluation/documents", files={
                "file": (f"uploaded-demo.{extension}", sample.content, sample.headers["content-type"]),
            }).raise_for_status().json()
            assert upload["sha256"] == hashlib.sha256(sample.content).hexdigest()
            assert upload["candidate"]["total"] == "40.00", upload["validation"]
            assert browser.get(upload["original_url"]).content == sample.content
            reviewed = browser.post(f"/api/evaluation/documents/{upload['document_id']}/confirm", json={
                "invoice": upload["candidate"], "revision": upload["revision"],
            }).raise_for_status().json()
            compare = browser.post("/api/evaluation/compare", json={
                "invoice_id": reviewed["invoice"]["invoice_id"],
            }).raise_for_status().json()
            assert compare["confirmed_prevention"]
            assert compare["source"]["sha256"] == upload["sha256"]
            evidence.append({"format": extension, "upload": upload, "review": reviewed, "comparison": compare})
            print(f"PASS {extension.upper()} source hash, original download, review, contract, guard and output", flush=True)
        cases = browser.get("/api/evaluation/negative-cases").raise_for_status().json()["cases"]
        for case in cases:
            agent = browser.post(f"/api/evaluation/documents/{upload['document_id']}/agent", json={
                "record_id": reviewed["invoice"]["invoice_id"], "negative_case": case["id"],
            }).raise_for_status().json()
            assert agent["test_assessment"]["verdict"] == "PASS", agent
            evidence.append(agent)
            print("PASS uploaded-record agent case " + case["id"], flush=True)
        invalid = browser.get("/api/evaluation/negative-samples/invalid-total").raise_for_status()
        bad = browser.post("/api/evaluation/documents", files={"file": ("invalid-total.pdf", invalid.content)}).raise_for_status().json()
        assert bad["validation"]["rule_id"] == "OUTPUT_TOTAL_MISMATCH"
        assert browser.post(f"/api/evaluation/documents/{bad['document_id']}/confirm", json={
            "invoice": bad["candidate"], "revision": bad["revision"],
        }).status_code == 422
        print("PASS invalid source total rejected before contract authorization", flush=True)
        if args.live:
            png = browser.get("/api/evaluation/samples/invoice-001/png").raise_for_status()
            image = browser.post("/api/evaluation/documents", files={"file": ("sample-image.png", png.content)}).raise_for_status().json()
            assert not image["candidate"]
            path = f"/api/evaluation/documents/{image['document_id']}"
            assert browser.post(path + "/extract", json={}).status_code == 400
            image = browser.post(path + "/extract", json={"consent_to_model": True}).raise_for_status().json()
            assert image["candidate"]["total"] == "40.00", image["candidate"]
            assert image["method"] == "model-vision-transcription"
            reviewed_image = browser.post(path + "/confirm", json={"invoice": image["candidate"], "revision": image["revision"]}).raise_for_status().json()
            evidence.append({"model_ocr": image, "review": reviewed_image})
            print("PASS real model image OCR with explicit consent and reviewed source references", flush=True)
            for case in ("transfer", "tampered_total"):
                agent = browser.post(path + "/agent", json={
                    "record_id": reviewed_image["invoice"]["invoice_id"], "provider": "live",
                    "negative_case": case, "consent_to_model": True,
                }).raise_for_status().json()
                assert agent["model_invoked"]
                assert agent["test_assessment"]["verdict"] == "PASS", agent
                evidence.append(agent)
                print(f"PASS real live-model uploaded-record agent: {case} ({agent['duration_ms']} ms)", flush=True)
    directory = Path(__file__).resolve().parents[1] / "reports/presentation"
    directory.mkdir(parents=True, exist_ok=True)
    filename = "upload-live-evidence.json" if args.live else "upload-evidence.json"
    (directory / filename).write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    print("PASS upload evidence saved to reports/presentation/" + filename, flush=True)


if __name__ == "__main__":
    main()
