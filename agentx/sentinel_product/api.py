"""FastAPI router and app factory for the SENTINEL v1 Product API."""

from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from sentinel_shared import (
    ApprovalDecisionRequest,
    AuthorizeMockRequest,
    CheckActionRequest,
    CreateRunRequest,
    CreateRunResponse,
    Mode,
    OutputCheckRequest,
    SandboxEventRequest,
)
from .policy import ProductEngine

DEFAULT_SANDBOX_SERVICE_SECRET = os.environ.get("SENTINEL_SANDBOX_SECRET", "sentinel-sandbox-service-token")


def _err(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


class ShareLinkRequest(BaseModel):
    ttl_seconds: int = 3600


class ManifestImportRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    tool_id: str
    connector_id: str
    description: str
    tool_schema: dict[str, Any] = Field(alias="schema")
    side_effect: str
    data_labels: list[str] = []
    required_privileges: list[str] = []
    allowed_sinks: list[str] = []
    sandbox_only: bool = False


class MemoryWriteRequest(BaseModel):
    run_id: str
    namespace: str
    content: str
    provenance: str
    source_trust: str = "UNTRUSTED"


def create_product_router(
    engine: ProductEngine,
    *,
    sandbox_secret: str = DEFAULT_SANDBOX_SERVICE_SECRET,
) -> APIRouter:
    """Create the SENTINEL v1 Product API router bound to a ProductEngine instance."""
    router = APIRouter()

    def _require_sandbox_caller(x_sentinel_sandbox_token: str | None) -> None:
        if not engine.sandbox_profile:
            raise _err(403, "SANDBOX_ROUTE_DISABLED", "Sandbox-only route disabled in production profile.")
        if x_sentinel_sandbox_token != sandbox_secret:
            raise _err(401, "INVALID_SANDBOX_CREDENTIAL", "Valid sandbox service credential required.")

    def _resolve_tenant(x_sentinel_tenant: str | None) -> str:
        return (x_sentinel_tenant or "tenant-default").strip() or "tenant-default"

    def _require_role(x_sentinel_role: str | None, allowed: set[str]) -> str:
        role = (x_sentinel_role or "admin").strip().lower()
        if role not in allowed:
            raise _err(403, "FORBIDDEN_ROLE", f"Role {role!r} is not authorized for this action.")
        return role

    @router.post("/v1/runs", response_model=CreateRunResponse)
    def post_create_run(
        payload: CreateRunRequest,
        x_sentinel_tenant: str | None = Header(default=None),
        x_sentinel_sandbox_token: str | None = Header(default=None),
    ) -> CreateRunResponse:
        tenant_id = _resolve_tenant(x_sentinel_tenant)
        is_sandbox_payload = (
            payload.comparison_id is not None
            or payload.fixture_id is not None
            or payload.fixture_version is not None
            or payload.mode != Mode.ENFORCE
        )
        if is_sandbox_payload:
            _require_sandbox_caller(x_sentinel_sandbox_token)

        try:
            created = engine.create_run(
                template_id=payload.template_id,
                parameters=payload.parameters,
                tenant_id=tenant_id,
                mode=payload.mode,
                comparison_id=payload.comparison_id,
                fixture_id=payload.fixture_id,
                fixture_version=payload.fixture_version,
                agent_id=payload.agent_id,
                evidence_source=payload.evidence_source or ("sandbox" if is_sandbox_payload else "product"),
            )
        except PermissionError as exc:
            raise _err(403, "PROFILE_POLICY_REJECTED", str(exc)) from exc
        except ValueError as exc:
            raise _err(400, "INVALID_RUN_PARAMETERS", str(exc)) from exc

        return CreateRunResponse(**created)

    @router.post("/v1/runs/{run_id}/check")
    def post_check_action(
        run_id: str,
        payload: CheckActionRequest,
        x_sentinel_tenant: str | None = Header(default=None),
    ) -> dict[str, Any]:
        tenant_id = _resolve_tenant(x_sentinel_tenant)
        try:
            res = engine.evaluate(
                run_id=run_id,
                action_id=payload.action_id,
                tool_id=payload.tool_id,
                arguments=payload.arguments,
                source_refs=payload.source_refs,
                risk_signal=payload.risk_signal,
                tenant_id=tenant_id,
            )
        except KeyError as exc:
            raise _err(404, "RUN_NOT_FOUND", str(exc)) from exc
        except PermissionError as exc:
            raise _err(403, "CROSS_TENANT_ACCESS_DENIED", str(exc)) from exc
        except ValueError as exc:
            if "CONFLICT_ACTION_ID_REUSE" in str(exc):
                raise _err(409, "CONFLICT_ACTION_ID_REUSE", "action_id already evaluated with different payload.") from exc
            raise _err(400, "CHECK_FAILED", str(exc)) from exc
        return {
            "decision_id": res["decision_id"],
            "verdict": res["verdict"].value,
            "rule_id": res["rule_id"],
            "reason": res["reason"],
            "canonical_arguments": res["canonical_arguments"],
            "approval_id": res["approval_id"],
        }

    @router.post("/v1/runs/{run_id}/approvals/{approval_id}")
    def post_resolve_approval(
        run_id: str,
        approval_id: str,
        payload: ApprovalDecisionRequest,
        x_sentinel_tenant: str | None = Header(default=None),
        x_sentinel_role: str | None = Header(default=None),
        x_sentinel_reviewer: str | None = Header(default=None),
    ) -> dict[str, Any]:
        tenant_id = _resolve_tenant(x_sentinel_tenant)
        _require_role(x_sentinel_role, {"reviewer", "admin"})
        try:
            apr = engine.resolve_approval(
                run_id=run_id,
                approval_id=approval_id,
                decision=payload.decision,
                reviewer_id=x_sentinel_reviewer or "reviewer-1",
                tenant_id=tenant_id,
            )
        except KeyError as exc:
            raise _err(404, "APPROVAL_NOT_FOUND", str(exc)) from exc
        except PermissionError as exc:
            raise _err(403, "CROSS_TENANT_ACCESS_DENIED", str(exc)) from exc
        except ValueError as exc:
            raise _err(409, "APPROVAL_STATE_CONFLICT", str(exc)) from exc
        return {
            "approval_id": apr["approval_id"],
            "run_id": apr["run_id"],
            "tool_id": apr["tool_id"],
            "status": apr["status"].value,
            "argument_digest": apr["argument_digest"],
            "before_state": apr["before_state"],
            "after_state": apr["after_state"],
            "decided_by": apr["decided_by"],
            "decided_at": apr["decided_at"],
        }

    @router.post("/v1/runs/{run_id}/output/check")
    def post_output_check(
        run_id: str,
        payload: OutputCheckRequest,
        x_sentinel_tenant: str | None = Header(default=None),
    ) -> dict[str, Any]:
        tenant_id = _resolve_tenant(x_sentinel_tenant)
        try:
            res = engine.validate_output(
                run_id=run_id,
                output_id=payload.output_id,
                answer=payload.answer,
                source_refs=payload.source_refs,
                tenant_id=tenant_id,
            )
        except KeyError as exc:
            raise _err(404, "RUN_NOT_FOUND", str(exc)) from exc
        except PermissionError as exc:
            raise _err(403, "CROSS_TENANT_ACCESS_DENIED", str(exc)) from exc
        return {
            "verdict": res["verdict"].value,
            "rule_id": res["rule_id"],
            "reason": res["reason"],
            "answer": res["answer"],
        }

    if engine.sandbox_profile:

        @router.post("/v1/runs/{run_id}/events")
        def post_sandbox_event(
            run_id: str,
            payload: SandboxEventRequest,
            x_sentinel_sandbox_token: str | None = Header(default=None),
        ) -> dict[str, Any]:
            _require_sandbox_caller(x_sentinel_sandbox_token)
            try:
                ev = engine.append_event(
                    run_id=run_id,
                    event_id=payload.event_id,
                    action_id=payload.action_id,
                    kind=payload.kind,
                    outcome=payload.outcome,
                    details=payload.details,
                    origin="sandbox",
                )
            except KeyError as exc:
                raise _err(404, "RUN_NOT_FOUND", str(exc)) from exc
            except PermissionError as exc:
                raise _err(403, "SANDBOX_EVENT_FORBIDDEN", str(exc)) from exc
            return {
                "event_id": ev["event_id"],
                "run_id": ev["run_id"],
                "origin": ev["origin"],
                "recorded_at": ev["recorded_at"],
                "event_hash": ev["event_hash"],
            }

        @router.post("/v1/runs/{run_id}/authorize-mock")
        def post_authorize_mock(
            run_id: str,
            payload: AuthorizeMockRequest,
            x_sentinel_sandbox_token: str | None = Header(default=None),
        ) -> dict[str, Any]:
            _require_sandbox_caller(x_sentinel_sandbox_token)
            try:
                res = engine.authorize_mock(
                    run_id=run_id,
                    action_id=payload.action_id,
                    decision_id=payload.decision_id,
                    approval_id=payload.approval_id,
                    arguments=payload.arguments,
                )
            except KeyError as exc:
                raise _err(404, "RUN_NOT_FOUND", str(exc)) from exc
            except PermissionError as exc:
                raise _err(403, "SANDBOX_AUTH_FORBIDDEN", str(exc)) from exc
            return {
                "status": res["status"].value,
                "rule_id": res["rule_id"],
                "reason": res["reason"],
                "reservation_id": res["reservation_id"],
                "canonical_arguments": res["canonical_arguments"],
            }

    @router.get("/v1/runs/{run_id}")
    def get_run(
        run_id: str,
        x_sentinel_tenant: str | None = Header(default=None),
    ) -> dict[str, Any]:
        tenant_id = _resolve_tenant(x_sentinel_tenant)
        try:
            report = engine.get_run_report(run_id, tenant_id=tenant_id)
        except KeyError as exc:
            raise _err(404, "RUN_NOT_FOUND", str(exc)) from exc
        except PermissionError as exc:
            raise _err(403, "CROSS_TENANT_ACCESS_DENIED", str(exc)) from exc
        return report

    @router.post("/v1/runs/{run_id}/stop")
    def post_stop_run(
        run_id: str,
        x_sentinel_tenant: str | None = Header(default=None),
        x_sentinel_role: str | None = Header(default=None),
        x_sentinel_operator: str | None = Header(default=None),
    ) -> dict[str, Any]:
        tenant_id = _resolve_tenant(x_sentinel_tenant)
        _require_role(x_sentinel_role, {"operator", "admin"})
        try:
            return engine.stop_run(run_id, operator_id=x_sentinel_operator or "operator-1", tenant_id=tenant_id)
        except KeyError as exc:
            raise _err(404, "RUN_NOT_FOUND", str(exc)) from exc
        except PermissionError as exc:
            raise _err(403, "CROSS_TENANT_ACCESS_DENIED", str(exc)) from exc

    @router.post("/v1/runs/{run_id}/share")
    def post_share_run(
        run_id: str,
        payload: ShareLinkRequest,
        x_sentinel_tenant: str | None = Header(default=None),
        x_sentinel_role: str | None = Header(default=None),
    ) -> dict[str, Any]:
        tenant_id = _resolve_tenant(x_sentinel_tenant)
        _require_role(x_sentinel_role, {"operator", "admin"})
        try:
            return engine.create_share_link(run_id, tenant_id=tenant_id, ttl_seconds=payload.ttl_seconds)
        except KeyError as exc:
            raise _err(404, "RUN_NOT_FOUND", str(exc)) from exc

    @router.delete("/v1/runs/share/{token_id}")
    def delete_share_link(
        token_id: str,
        x_sentinel_tenant: str | None = Header(default=None),
        x_sentinel_role: str | None = Header(default=None),
    ) -> dict[str, Any]:
        tenant_id = _resolve_tenant(x_sentinel_tenant)
        _require_role(x_sentinel_role, {"operator", "admin"})
        return engine.revoke_share_link(token_id, tenant_id=tenant_id)

    @router.get("/v1/share/{view_token}")
    def get_shared_run(view_token: str) -> dict[str, Any]:
        try:
            return engine.resolve_share_token(view_token)
        except PermissionError as exc:
            raise _err(403, "INVALID_SHARE_TOKEN", str(exc)) from exc

    # Dashboard & Governance APIs
    @router.get("/v1/dashboard/summary")
    def get_dashboard_summary() -> dict[str, Any]:
        return engine.get_dashboard_summary()

    @router.post("/v1/manifests/import")
    def post_import_manifest(
        payload: ManifestImportRequest,
        x_sentinel_role: str | None = Header(default=None),
    ) -> dict[str, Any]:
        _require_role(x_sentinel_role, {"operator", "admin"})
        return engine.import_manifest(payload.model_dump(by_alias=True))

    @router.post("/v1/manifests/{tool_id}/approve")
    def post_approve_manifest(
        tool_id: str,
        x_sentinel_role: str | None = Header(default=None),
        x_sentinel_operator: str | None = Header(default=None),
    ) -> dict[str, Any]:
        _require_role(x_sentinel_role, {"operator", "admin"})
        try:
            return engine.approve_manifest(tool_id, approved_by=x_sentinel_operator or "operator-1")
        except ValueError as exc:
            raise _err(404, "MANIFEST_NOT_FOUND", str(exc)) from exc

    @router.post("/v1/memory")
    def post_write_memory(payload: MemoryWriteRequest) -> dict[str, Any]:
        try:
            return engine.write_memory(
                run_id=payload.run_id,
                namespace=payload.namespace,
                content=payload.content,
                provenance=payload.provenance,
                source_trust=payload.source_trust,
            )
        except KeyError as exc:
            raise _err(404, "RUN_NOT_FOUND", str(exc)) from exc

    return router


def create_product_app(
    engine: ProductEngine | None = None,
    *,
    sandbox_profile: bool = True,
) -> FastAPI:
    """Stand-alone FastAPI application for the Product service."""
    eng = engine or ProductEngine(sandbox_profile=sandbox_profile)
    app = FastAPI(
        title="SENTINEL Product API",
        version="1.0.0",
        description="Deterministic Task Contract policy engine, approvals, and audit API (SENTINEL v1).",
    )

    @app.exception_handler(HTTPException)
    async def _http_err_handler(_req: Request, exc: HTTPException) -> JSONResponse:
        if isinstance(exc.detail, dict) and "code" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": "HTTP_ERROR", "message": str(exc.detail)},
        )

    app.include_router(create_product_router(eng))
    return app
