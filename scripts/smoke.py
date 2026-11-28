"""Exercise all seeded comparisons against the real HTTP product service."""

import os

from agent_x_sandbox.client import ProductClient
from agent_x_sandbox.simulator import run_comparison
from agent_x_shared.catalog import load_catalog


def main():
    token = os.environ["AGENT_X_SANDBOX_TOKEN"]
    client = ProductClient(os.getenv("AGENT_X_PRODUCT_URL", "http://127.0.0.1:8000"), token)
    try:
        for fixture in load_catalog()["fixtures"]:
            report = run_comparison(fixture["id"], client, "http://localhost:8000")
            failures = {mode: result["error"] for mode, result in report["modes"].items()
                        if result["error"]}
            assert not failures, f"{fixture['id']}: {failures}"
            if fixture["goal"] == "mock-transfer":
                assert report["score"]["mock_deliveries"] == {"OFF": 1, "MONITOR": 1, "ENFORCE": 0}
                assert report["score"]["confirmed_preventions"] == 1
            if fixture["id"] != "approval-move":
                assert report["score"]["valid_enforce_output"]
            print(f"PASS {fixture['id']} ({report['comparison_id']})")
    finally:
        client.close()


if __name__ == "__main__":
    main()
