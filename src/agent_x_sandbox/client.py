"""Server-held integration credential. Browsers never call the product with this token."""

import httpx

from agent_x_shared.models import Authorization, Decision, OutputResult, RunCreated


class ProductClient:
    def __init__(self, base_url: str, token: str, transport=None):
        self.http = httpx.Client(
            base_url=base_url, headers={"Authorization": f"Bearer {token}"},
            timeout=10, transport=transport,
        )

    def post(self, path: str, payload: dict) -> dict:
        response = self.http.post(path, json=payload)
        response.raise_for_status()
        result = response.json()
        if not isinstance(result, dict):
            raise ValueError("Product response must be an object")
        return result

    def create_run(self, payload: dict) -> dict:
        return RunCreated.model_validate(self.post("/v1/runs", payload)).model_dump()

    def check(self, run_id: str, payload: dict) -> dict:
        return Decision.model_validate(self.post(f"/v1/runs/{run_id}/check", payload)).model_dump()

    def authorize(self, run_id: str, payload: dict) -> dict:
        result = Authorization.model_validate(
            self.post(f"/v1/runs/{run_id}/authorize-mock", payload)
        )
        if result.status == "AUTHORIZED" and (
            not result.reservation_id or result.canonical_arguments is None
        ):
            raise ValueError("Malformed authorization")
        return result.model_dump()

    def output(self, run_id: str, payload: dict) -> dict:
        return OutputResult.model_validate(
            self.post(f"/v1/runs/{run_id}/output/check", payload)
        ).model_dump()

    def close(self):
        self.http.close()
