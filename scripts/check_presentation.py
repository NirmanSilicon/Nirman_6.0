"""End-to-end checks through the same-origin frontend, with optional real model calls."""

import argparse
import json
import os
from pathlib import Path

import httpx

from service import configure


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--base-url", default="http://127.0.0.1:13080")
    args = parser.parse_args()
    configure()
    reports = []
    with httpx.Client(base_url=args.base_url, timeout=180) as browser:
        for path in ("/", "/evaluation", "/lab", "/api/evaluation/view"):
            response = browser.get(path)
            response.raise_for_status()
        print("PASS frontend pages and evaluation view", flush=True)
        for scenario, annotation in (("benign", True), ("incident", True), ("incident", False)):
            response = browser.post("/api/evaluation/compare", json={
                "invoice_id": "invoice-001", "fixture": scenario, "include_annotation": annotation,
            })
            response.raise_for_status()
            report = response.json()
            assert report["matched_start"] and report["matched_proposals"]
            assert report["runs"]["OFF"]["inbox_count"] == (1 if scenario == "incident" else 0)
            assert report["runs"]["ENFORCE"]["inbox_count"] == 0
            assert report["runs"]["ENFORCE"]["output"]["answer"]["total"] == "40.00"
            reports.append(report)
            print(f"PASS evaluation {scenario}, annotation={annotation}", flush=True)
        catalog = browser.get("/api/lab/fixtures").raise_for_status().json()
        for fixture in catalog["fixtures"]:
            response = browser.post("/api/lab/comparisons", json={"fixture_id": fixture["id"]})
            response.raise_for_status()
            report = response.json()
            assert not any(mode["error"] for mode in report["modes"].values()), fixture["id"]
            if fixture["goal"] == "mock-transfer":
                assert report["score"]["mock_deliveries"] == {"OFF": 1, "MONITOR": 1, "ENFORCE": 0}
            if fixture["id"] != "approval-move":
                assert report["score"]["valid_enforce_output"]
            assert browser.get(f"/api/lab/comparisons/{report['comparison_id']}/runs/ENFORCE").status_code == 200
            assert browser.get(f"/api/lab/comparisons/{report['comparison_id']}/report").status_code == 200
            print(f"PASS sandbox {fixture['id']}", flush=True)
        for resolution in ("APPROVE", "REJECT"):
            report = browser.post("/api/lab/comparisons", json={"fixture_id": "approval-move"}).raise_for_status().json()
            path = f"/api/lab/comparisons/{report['comparison_id']}"
            assert browser.post(path + "/review", json={"decision": resolution}).status_code == 401
            reviewed = browser.post(path + "/review", json={"decision": resolution}, headers={
                "Authorization": "Bearer " + os.environ["AGENT_X_OPERATOR_TOKEN"],
            }).raise_for_status().json()
            assert reviewed["modes"]["ENFORCE"]["diff"]["draft_moves"] == (1 if resolution == "APPROVE" else 0)
            resumed = browser.post(path + "/resume", json={}).raise_for_status().json()
            assert resumed["modes"]["ENFORCE"]["diff"]["draft_moves"] == (1 if resolution == "APPROVE" else 0)
            print(f"PASS reviewer authentication, {resolution.lower()}, and repeat resume", flush=True)
        for provider in (["local", "live"] if args.live else ["local"]):
            for fixture_id in ("invoice-transfer", "quotes-benign"):
                response = browser.post("/api/lab/agents", json={
                    "fixture_id": fixture_id, "provider": provider, "probe": True,
                })
                response.raise_for_status()
                agent = response.json()
                assert agent["status"] == "COMPLETED", f"{provider} {fixture_id}: {agent['error']}"
                assert agent["output"]["verdict"] == "PASS"
                assert not agent["state"]["inbox"]
                assert browser.get(f"/api/lab/agents/{agent['agent_id']}/evidence").status_code == 200
                reports.append(agent)
                print(f"PASS {provider} guarded agent {fixture_id} ({agent['duration_ms']} ms)", flush=True)
    directory = Path(__file__).resolve().parents[1] / "reports" / "presentation"
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "evidence.json").write_text(json.dumps(reports, indent=2), encoding="utf-8")
    print("PASS evidence saved to reports/presentation/evidence.json", flush=True)


if __name__ == "__main__":
    main()
