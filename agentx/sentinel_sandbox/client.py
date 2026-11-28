"""Typed Product API client used by the SENTINEL Sandbox and Agent Proxy."""

from __future__ import annotations

from typing import Any
import httpx
from starlette.testclient import TestClient

from sentinel_product.api import DEFAULT_SANDBOX_SERVICE_SECRET


class ProductClientError(RuntimeError):
    """Raised when the Product API is unavailable, times out, or returns an invalid payload."""

    def __init__(self, code: str, message: str, status_code: int | None = None) -> None:
        super().__init__(f"[{code}] {message}")
        self.code = code
        self.message = message
        self.status_code = status_code


class ProductClient:
    """HTTP/ASGI client communicating exclusively over the SENTINEL v1 JSON contract."""

    def __init__(
        self,
        *,
        base_url: str = "http://sentinel-product.local",
        app: Any | None = None,
        sandbox_secret: str = DEFAULT_SANDBOX_SERVICE_SECRET,
        tenant_id: str = "tenant-default",
        timeout: float = 5.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.sandbox_secret = sandbox_secret
        self.tenant_id = tenant_id
        self.timeout = timeout
        if app is not None:
            self._client = TestClient(app, base_url=self.base_url)
        else:
            self._client = httpx.Client(base_url=self.base_url, timeout=timeout)

    def _headers(self, *, sandbox: bool = False, extra: dict[str, str] | None = None) -> dict[str, str]:
        h = {"X-Sentinel-Tenant": self.tenant_id}
        if sandbox:
            h["X-Sentinel-Sandbox-Token"] = self.sandbox_secret
        if extra:
            h.update(extra)
        return h

    def _request(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
        sandbox: bool = False,
        extra_headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        try:
            resp = self._client.request(
                method,
                path,
                json=json_body,
                headers=self._headers(sandbox=sandbox, extra=extra_headers),
            )
        except httpx.TimeoutException as exc:
            raise ProductClientError("PRODUCT_TIMEOUT", f"Request to {path} timed out.") from exc
        except httpx.HTTPError as exc:
            raise ProductClientError("PRODUCT_UNAVAILABLE", f"Product API unreachable: {exc}") from exc

        try:
            data = resp.json()
        except ValueError as exc:
            raise ProductClientError("MALFORMED_PRODUCT_RESPONSE", f"Non-JSON response from {path}.", resp.status_code) from exc

        if not isinstance(data, dict):
            raise ProductClientError("MALFORMED_PRODUCT_RESPONSE", f"Expected JSON object from {path}.", resp.status_code)

        if resp.status_code >= 400:
            code = str(data.get("code", "PRODUCT_HTTP_ERROR"))
            msg = str(data.get("message", resp.text))
            raise ProductClientError(code, msg, resp.status_code)

        return data

    def create_run(
        self,
        *,
        template_id: str,
        parameters: dict[str, Any],
        mode: str = "ENFORCE",
        comparison_id: str | None = None,
        fixture_id: str | None = None,
        fixture_version: str | None = None,
        agent_id: str | None = None,
        evidence_source: str | None = None,
        use_sandbox_auth: bool = True,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "template_id": template_id,
            "parameters": parameters,
            "mode": mode,
        }
        if comparison_id is not None:
            payload["comparison_id"] = comparison_id
        if fixture_id is not None:
            payload["fixture_id"] = fixture_id
        if fixture_version is not None:
            payload["fixture_version"] = fixture_version
        if agent_id is not None:
            payload["agent_id"] = agent_id
        if evidence_source is not None:
            payload["evidence_source"] = evidence_source
        return self._request("POST", "/v1/runs", json_body=payload, sandbox=use_sandbox_auth)

    def check_action(
        self,
        run_id: str,
        *,
        action_id: str,
        tool_id: str,
        arguments: dict[str, Any],
        source_refs: list[str] | None = None,
        risk_signal: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "action_id": action_id,
            "tool_id": tool_id,
            "arguments": arguments,
            "source_refs": source_refs or [],
        }
        if risk_signal is not None:
            payload["risk_signal"] = risk_signal
        data = self._request("POST", f"/v1/runs/{run_id}/check", json_body=payload)
        if data.get("verdict") not in {"ALLOW", "BLOCK", "ASK_HUMAN"}:
            raise ProductClientError("UNKNOWN_VERDICT", f"Unrecognized verdict: {data.get('verdict')!r}")
        return data

    def authorize_mock(
        self,
        run_id: str,
        *,
        action_id: str,
        decision_id: str,
        approval_id: str | None = None,
        arguments: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"action_id": action_id, "decision_id": decision_id}
        if approval_id is not None:
            payload["approval_id"] = approval_id
        if arguments is not None:
            payload["arguments"] = arguments
        data = self._request("POST", f"/v1/runs/{run_id}/authorize-mock", json_body=payload, sandbox=True)
        if data.get("status") not in {"AUTHORIZED", "DENIED"}:
            raise ProductClientError("MALFORMED_PRODUCT_RESPONSE", f"Invalid authorize-mock status: {data.get('status')!r}")
        return data

    def resolve_approval(
        self,
        run_id: str,
        approval_id: str,
        *,
        decision: str,
        reviewer_role: str = "reviewer",
        reviewer_id: str = "judge-reviewer",
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/v1/runs/{run_id}/approvals/{approval_id}",
            json_body={"decision": decision},
            extra_headers={"X-Sentinel-Role": reviewer_role, "X-Sentinel-Reviewer": reviewer_id},
        )

    def check_output(
        self,
        run_id: str,
        *,
        output_id: str,
        answer: dict[str, Any],
        source_refs: list[str] | None = None,
    ) -> dict[str, Any]:
        data = self._request(
            "POST",
            f"/v1/runs/{run_id}/output/check",
            json_body={"output_id": output_id, "answer": answer, "source_refs": source_refs or []},
        )
        if data.get("verdict") not in {"PASS", "SANITIZED", "BLOCK"}:
            raise ProductClientError("UNKNOWN_OUTPUT_VERDICT", f"Unknown output verdict: {data.get('verdict')!r}")
        return data

    def post_event(
        self,
        run_id: str,
        *,
        event_id: str,
        action_id: str | None,
        kind: str,
        outcome: str,
        details: dict[str, Any],
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/v1/runs/{run_id}/events",
            json_body={
                "event_id": event_id,
                "action_id": action_id,
                "kind": kind,
                "outcome": outcome,
                "details": details,
            },
            sandbox=True,
        )

    def get_run(self, run_id: str) -> dict[str, Any]:
        return self._request("GET", f"/v1/runs/{run_id}")

    def stop_run(self, run_id: str) -> dict[str, Any]:
        return self._request("POST", f"/v1/runs/{run_id}/stop", extra_headers={"X-Sentinel-Role": "operator"})
