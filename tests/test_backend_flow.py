"""Real model + isolated parser + HTTP + durable worker integration."""

from pathlib import Path

from fastapi.testclient import TestClient

from uqual.api import create_app
from uqual.jobs import Runner


def test_personal_queued_upload_result_isolation_cancel_and_download(monkeypatch, tmp_path):
    monkeypatch.setenv("UQUAL_ACCOUNT_DIR", str(tmp_path / "vault"))
    monkeypatch.setenv("UQUAL_WORKER_ENABLED", "false")
    with TestClient(create_app(api_key="a" * 32)) as client:

        def register(email):
            response = client.post(
                "/v1/auth/register",
                json={
                    "name": "Integration",
                    "email": email,
                    "password": "test-passphrase-2026",
                    "accept_storage_policy": True,
                },
            )
            assert response.status_code == 201
            return {"Authorization": "Bearer " + response.json()["token"]}

        owner = register("one@example.test")
        stranger = register("two@example.test")
        source = Path("mobile/demo/sample-statement.csv").read_bytes()
        files = {"file": ("statement.csv", source, "text/csv")}
        options = {"consent": "true", "statement_end": "2022-03-31"}
        assert client.post("/v1/statement-jobs", headers=owner, files=files).status_code == 422
        submitted = client.post("/v1/statement-jobs", headers=owner, files=files, data=options)
        assert submitted.status_code == 202, submitted.text
        identifier = submitted.json()["id"]
        path = "/v1/statement-jobs/" + identifier
        assert client.get(path, headers=stranger).status_code == 404
        assert (
            client.post("/v1/statement-jobs", headers=owner, files=files, data=options).json()["id"]
            == identifier
        )
        assert Runner(client.app.state.jobs, client.app.state.synthetic_bundle).run_once()
        job = client.get(path, headers=owner).json()
        assert job["status"] == "completed", job
        saved = job["result"]
        assert saved["analysis"]["approved_for_lending"] is False
        assert saved["analysis"]["status"] == "synthetic_demo_only"
        assert saved["analysis"]["synthetic_risk_index"] is not None
        document = "/v1/statements/" + saved["id"]
        assert client.get(document + "/document", headers=owner).content == source
        assert client.get(document + "/normalized.csv", headers=owner).status_code == 200
        page = client.get(document + "/transactions?limit=2&offset=1", headers=owner).json()
        assert page["total"] == 271 and len(page["transactions"]) == 2
        assert client.get(document + "/normalized.csv", headers=stranger).status_code == 404
        assert client.get(document + "/transactions?limit=501", headers=owner).status_code == 422
        assert client.delete(document, headers=owner).status_code == 200
        queued = client.post("/v1/statement-jobs", headers=owner, files=files, data=options).json()
        assert queued["id"] != identifier
        assert (
            client.delete("/v1/statement-jobs/" + queued["id"], headers=owner).json()["status"] == "cancelled"
        )
        assert not Runner(client.app.state.jobs, client.app.state.synthetic_bundle).run_once()
