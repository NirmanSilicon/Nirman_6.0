"""Product API composition root. Domain code remains independent of FastAPI."""

import hmac
import json
from datetime import UTC, datetime, timedelta
from importlib.resources import files
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import ValidationError

from agent_x_product.audit import append_event, redact
from agent_x_product.config import Settings
from agent_x_product.core.contracts import ContractError, compile_contract
from agent_x_product.core.output import validate_output
from agent_x_product.core.policy import evaluate, sandbox_manifests
from agent_x_product.storage.sqlite import Store
from agent_x_shared import API_VERSION, POLICY_VERSION
from agent_x_shared.catalog import digest, load_catalog
from agent_x_shared.models import (
    ApprovalResolution,
    Authorization,
    AuthorizeMock,
    CheckAction,
    CreateRun,
    Decision,
    ErrorResponse,
    ObservedEvent,
    OutputCheck,
    OutputResult,
    RunCreated,
)


def opaque_id() -> str:
    return uuid4().hex


def fail(status: int, code: str, message: str):
    raise HTTPException(status_code=status, detail={"code": code, "message": message})


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    store = Store(settings.database)
    records = load_catalog()["records"] if settings.profile == "sandbox" else {}
    manifests = sandbox_manifests() if settings.profile == "sandbox" else {}
    app = FastAPI(
        title="AGENT-X Product", version=API_VERSION,
        description="Runnable scaffold. Live connectors and production dispatch are not implemented.",
        responses={status: {"model": ErrorResponse} for status in (401, 403, 404, 409, 422, 503)},
    )
    app.state.store = store
    app.state.manifests = manifests
    bearer = HTTPBearer(auto_error=False)

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        detail = exc.detail if isinstance(exc.detail, dict) else {
            "code": "HTTP_ERROR", "message": "Request failed",
        }
        return JSONResponse(status_code=exc.status_code, content=detail)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        return JSONResponse(status_code=422, content={
            "code": "VALIDATION_ERROR", "message": "Request does not match the API schema",
        })

    def identity(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
        if credentials is None:
            fail(401, "UNAUTHENTICATED", "Bearer token required")
        if hmac.compare_digest(credentials.credentials, settings.operator_token):
            return "operator"
        if (settings.profile == "sandbox" and settings.sandbox_token
                and hmac.compare_digest(credentials.credentials, settings.sandbox_token)):
            return "sandbox"
        fail(401, "UNAUTHENTICATED", "Invalid bearer token")

    def get_run(connection, run_id: str, actor: str) -> dict:
        run = store.get(connection, run_id)
        if run is None or (actor != "operator" and run["owner"] != actor):
            fail(404, "RUN_NOT_FOUND", "Run unavailable")
        return run

    def require_sandbox(actor: str):
        if actor != "sandbox":
            fail(403, "SANDBOX_SERVICE_REQUIRED", "Trusted sandbox service required")

    @app.get("/healthz", tags=["operations"])
    def health():
        with store.connect() as connection:
            connection.execute("SELECT 1")
        return {"status": "ok", "profile": settings.profile, "policy_version": POLICY_VERSION}

    @app.get("/", response_class=HTMLResponse, include_in_schema=False)
    def dashboard():
        return files("agent_x_product").joinpath("web/index.html").read_text(encoding="utf-8")

    @app.post("/v1/runs", response_model=RunCreated, status_code=201, tags=["runs"])
    def create_run(payload: CreateRun, actor: str = Depends(identity)):
        sandbox_fields = (payload.comparison_id, payload.fixture_id, payload.fixture_version)
        if actor != "sandbox" and (payload.mode != "ENFORCE" or any(sandbox_fields)):
            fail(403, "SANDBOX_SERVICE_REQUIRED", "Sandbox metadata requires the sandbox identity")
        if settings.profile == "production" and payload.template_id not in {
            "extract_invoice", "compare_quotes",
        }:
            fail(422, "TEMPLATE_UNAVAILABLE", "Template is not enabled in this profile")
        try:
            contract = compile_contract(payload.template_id, payload.parameters, records)
        except ValidationError:
            fail(422, "PARAMETERS_INVALID", "Parameters do not match the task template")
        except ContractError:
            fail(422, "CONTRACT_INVALID", "Template or authorized resources unavailable")
        contract.update({"contract_id": opaque_id(), "policy_version": POLICY_VERSION,
                         "manifest_pins": {tool: item.fingerprint
                                           for tool, item in manifests.items()}})
        run = {
            "run_id": opaque_id(), "owner": actor, "status": "ACTIVE", "contract": contract,
            "mode": payload.mode, "comparison_id": payload.comparison_id,
            "fixture_id": payload.fixture_id, "fixture_version": payload.fixture_version,
            "actions": {}, "approvals": {}, "reservations": {}, "outputs": {},
            "observations": {}, "events": [], "calls_used": 0, "argument_bytes_used": 0,
        }
        append_event(run, "contract.compiled", {"contract_id": contract["contract_id"]})
        with store.transaction() as connection:
            store.save(connection, run)
        return {"run_id": run["run_id"], "contract_id": contract["contract_id"],
                "policy_version": POLICY_VERSION, "contract_summary": contract}

    def current_evaluation(run: dict, tool_id: str, arguments: dict):
        manifest = manifests.get(tool_id)
        if manifest and run["contract"]["manifest_pins"].get(tool_id) != manifest.fingerprint:
            return "BLOCK", "MANIFEST_PIN_CHANGED", None
        return evaluate(run["contract"], tool_id, arguments, manifests, run["status"])

    @app.post("/v1/runs/{run_id}/check", response_model=Decision, tags=["policy"])
    def check(run_id: str, payload: CheckAction, actor: str = Depends(identity)):
        request_digest = digest(payload.model_dump())
        with store.transaction() as connection:
            run = get_run(connection, run_id, actor)
            previous = run["actions"].get(payload.action_id)
            if previous:
                if previous["digest"] != request_digest:
                    fail(409, "ACTION_ID_CONFLICT", "Action ID was used with different inputs")
                return previous["decision"]
            verdict, rule, canonical = current_evaluation(run, payload.tool_id, payload.arguments)
            approval_id = opaque_id() if verdict == "ASK_HUMAN" else None
            decision = Decision(
                decision_id=opaque_id(), verdict=verdict, rule_id=rule,
                canonical_arguments=canonical, approval_id=approval_id,
            ).model_dump()
            run["actions"][payload.action_id] = {
                "digest": request_digest, "tool_id": payload.tool_id, "decision": decision,
                "arguments": canonical if verdict != "BLOCK" else {},
            }
            if approval_id:
                run["approvals"][approval_id] = {
                    "approval_id": approval_id, "status": "PENDING",
                    "action_id": payload.action_id, "argument_digest": digest(canonical),
                    "contract_id": run["contract"]["contract_id"],
                    "tool_id": payload.tool_id,
                    "expires_at": (datetime.now(UTC) + timedelta(minutes=5)).isoformat(),
                    "before": {"queue_id": "drafts"}, "after": canonical,
                }
            append_event(run, "action.evaluated", {"action_id": payload.action_id, **decision})
            store.save(connection, run)
            return decision

    @app.post("/v1/runs/{run_id}/approvals/{approval_id}", tags=["approvals"])
    def resolve_approval(run_id: str, approval_id: str, payload: ApprovalResolution,
                         actor: str = Depends(identity)):
        if actor != "operator":
            fail(403, "REVIEWER_REQUIRED", "Operator identity required for approval")
        with store.transaction() as connection:
            run = get_run(connection, run_id, actor)
            approval = run["approvals"].get(approval_id)
            if approval is None:
                fail(404, "APPROVAL_NOT_FOUND", "Approval unavailable")
            desired = "APPROVED" if payload.decision == "APPROVE" else "REJECTED"
            if approval["status"] == desired:
                return approval
            if approval["status"] != "PENDING":
                fail(409, "APPROVAL_STATE_CONFLICT", "Approval cannot be changed")
            if run["status"] != "ACTIVE":
                fail(409, "RUN_STOPPED", "Run is stopped")
            approval["status"] = (
                "EXPIRED" if datetime.fromisoformat(approval["expires_at"]) <= datetime.now(UTC)
                else desired
            )
            append_event(run, "approval.resolved", approval)
            store.save(connection, run)
            return approval

    @app.post("/v1/runs/{run_id}/output/check", response_model=OutputResult, tags=["output"])
    def output_check(run_id: str, payload: OutputCheck, actor: str = Depends(identity)):
        with store.transaction() as connection:
            run = get_run(connection, run_id, actor)
            previous = run["outputs"].get(payload.output_id)
            if previous:
                if previous["digest"] != digest(payload.model_dump()):
                    fail(409, "OUTPUT_ID_CONFLICT", "Output ID was used with different inputs")
                return previous["result"]
            valid = run["status"] == "ACTIVE" and validate_output(
                run["contract"], payload.answer, payload.source_refs, records,
            )
            result = OutputResult(
                verdict="PASS" if valid else "BLOCK",
                rule_id="OUTPUT_VALIDATED" if valid else "OUTPUT_INTEGRITY_FAILED",
                answer=payload.answer if valid else None,
            ).model_dump()
            run["outputs"][payload.output_id] = {"digest": digest(payload.model_dump()),
                                                   "result": result}
            append_event(run, "output.evaluated", {"verdict": result["verdict"],
                                                    "rule_id": result["rule_id"]})
            store.save(connection, run)
            return result

    @app.get("/v1/runs/{run_id}", tags=["runs"])
    def report(run_id: str, actor: str = Depends(identity)):
        with store.connect() as connection:
            run = get_run(connection, run_id, actor)
        return redact(run)

    @app.post("/v1/runs/{run_id}/stop", tags=["runs"])
    def stop(run_id: str, actor: str = Depends(identity)):
        if actor != "operator":
            fail(403, "OPERATOR_REQUIRED", "Operator identity required")
        with store.transaction() as connection:
            run = get_run(connection, run_id, actor)
            if run["status"] != "STOPPED":
                run["status"] = "STOPPED"
                append_event(run, "run.stopped", {})
                store.save(connection, run)
        return {"run_id": run_id, "status": "STOPPED"}

    if settings.profile == "sandbox":

        @app.post("/v1/runs/{run_id}/events", tags=["sandbox-only"])
        def observe(run_id: str, payload: ObservedEvent, actor: str = Depends(identity)):
            require_sandbox(actor)
            with store.transaction() as connection:
                run = get_run(connection, run_id, actor)
                previous = run["observations"].get(payload.event_id)
                event_digest = digest(payload.model_dump())
                if previous:
                    if previous != event_digest:
                        fail(409, "EVENT_ID_CONFLICT", "Event ID was used with different inputs")
                    return {"status": "RECORDED"}
                run["observations"][payload.event_id] = event_digest
                append_event(run, payload.kind, payload.model_dump(), origin="sandbox")
                store.save(connection, run)
            return {"status": "RECORDED"}

        @app.post("/v1/runs/{run_id}/authorize-mock", response_model=Authorization,
                  tags=["sandbox-only"])
        def authorize_mock(run_id: str, payload: AuthorizeMock, actor: str = Depends(identity)):
            require_sandbox(actor)
            with store.transaction() as connection:
                run = get_run(connection, run_id, actor)
                action = run["actions"].get(payload.action_id)
                if action is None or action["decision"]["decision_id"] != payload.decision_id:
                    fail(409, "DECISION_MISMATCH", "Action and decision do not match")
                # Recheck stop and current policy before even returning an old reservation.
                verdict, rule, canonical = current_evaluation(
                    run, action["tool_id"], action["arguments"],
                )
                if action["decision"]["verdict"] == "BLOCK":
                    return Authorization(status="DENIED", rule_id=action["decision"]["rule_id"])
                if verdict == "BLOCK":
                    return Authorization(status="DENIED", rule_id=rule)
                previous = run["reservations"].get(payload.action_id)
                if previous:
                    if previous["approval_id"] != payload.approval_id:
                        fail(409, "APPROVAL_MISMATCH", "Reservation used a different approval")
                    return previous["result"]
                approval = None
                if verdict == "ASK_HUMAN":
                    approval = run["approvals"].get(payload.approval_id)
                    if (not approval or payload.approval_id != action["decision"]["approval_id"]
                            or approval["action_id"] != payload.action_id
                            or approval["argument_digest"] != digest(canonical)
                            or approval["status"] != "APPROVED"):
                        return Authorization(status="DENIED", rule_id="APPROVAL_REQUIRED")
                    if datetime.fromisoformat(approval["expires_at"]) <= datetime.now(UTC):
                        approval["status"] = "EXPIRED"
                        store.save(connection, run)
                        return Authorization(status="DENIED", rule_id="APPROVAL_EXPIRED")
                argument_bytes = len(json.dumps(canonical, sort_keys=True).encode())
                if (run["calls_used"] >= run["contract"]["max_calls"]
                        or run["argument_bytes_used"] + argument_bytes
                        > run["contract"]["max_argument_bytes"]):
                    return Authorization(status="DENIED", rule_id="BUDGET_EXCEEDED")
                if approval:
                    approval["status"] = "CONSUMED"
                result = Authorization(
                    status="AUTHORIZED", rule_id="DISPATCH_RESERVED", reservation_id=opaque_id(),
                    canonical_arguments=canonical,
                ).model_dump()
                run["reservations"][payload.action_id] = {
                    "approval_id": payload.approval_id, "result": result,
                }
                run["calls_used"] += 1
                run["argument_bytes_used"] += argument_bytes
                append_event(run, "dispatch.reserved", {"action_id": payload.action_id, **result})
                store.save(connection, run)
                return result

    return app
