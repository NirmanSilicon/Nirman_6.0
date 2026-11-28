import copy
import os
from typing import Literal
from contextlib import asynccontextmanager
from importlib.resources import files
from threading import RLock
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from pydantic import Field
import httpx

from agent_x_sandbox.client import ProductClient
from agent_x_sandbox.agents import model_settings, run_agent
from agent_x_sandbox.simulator import resume_approval, run_comparison
from agent_x_shared import API_VERSION
from agent_x_shared.catalog import load_catalog
from agent_x_shared.models import StrictModel


class ComparisonRequest(StrictModel):
    fixture_id: str = Field(min_length=1)


class AgentRequest(StrictModel):
    fixture_id: Literal["invoice-transfer", "quotes-benign"] = "invoice-transfer"
    provider: Literal["local", "live"] = "local"
    probe: bool = True


class ReviewRequest(StrictModel):
    decision: Literal["APPROVE", "REJECT"]


def create_app(client=None) -> FastAPI:
    token = os.getenv("AGENT_X_SANDBOX_TOKEN", "")
    if client is None and not token:
        raise ValueError("AGENT_X_SANDBOX_TOKEN is required")
    product = client or ProductClient(os.getenv("AGENT_X_PRODUCT_URL", "http://127.0.0.1:8000"), token)
    dashboard_url = os.getenv("AGENT_X_DASHBOARD_URL", "http://localhost:8000")
    catalog = load_catalog()
    comparisons = {}
    agents = {}
    lock = RLock()

    @asynccontextmanager
    async def lifespan(app):
        yield
        if client is None:
            product.close()

    app = FastAPI(title="AGENT-X Sandbox", version=API_VERSION, lifespan=lifespan)

    def owned_comparison(comparison_id: str, request: Request):
        record = comparisons.get(comparison_id)
        if not record or record["owner"] != request.cookies.get("agent_x_session"):
            raise HTTPException(404, "Comparison unavailable")
        return record

    @app.get("/healthz")
    def health():
        return {"status": "ok", "evidence_type": "deterministic-replay"}

    @app.get("/", response_class=HTMLResponse, include_in_schema=False)
    def index():
        return files("agent_x_sandbox").joinpath("web/index.html").read_text(encoding="utf-8")

    @app.get("/api/fixtures")
    def fixtures():
        return catalog

    @app.get("/api/status")
    def status():
        try:
            product_status = product.get("/healthz")
        except Exception:
            product_status = {"status": "unavailable"}
        settings = model_settings()
        return {"product": product_status, "fixtures": len(catalog["fixtures"]),
                "agent": {"live_configured": bool(settings["key"]), "model": settings["model"],
                          "tools": "guarded local mock tools", "max_model_turns": 8}}

    @app.post("/api/comparisons", status_code=201)
    def compare(payload: ComparisonRequest, request: Request, response: Response):
        if payload.fixture_id not in {fixture["id"] for fixture in catalog["fixtures"]}:
            raise HTTPException(422, "Unknown fixture")
        owner = request.cookies.get("agent_x_session") or uuid4().hex
        response.set_cookie("agent_x_session", owner, httponly=True, samesite="strict")
        result = run_comparison(payload.fixture_id, product, dashboard_url)
        with lock:
            # Local scaffold state is bounded and ephemeral. Export before restarting.
            if len(comparisons) >= 200:
                raise HTTPException(503, "Comparison capacity reached; restart the local sandbox")
            comparisons[result["comparison_id"]] = {"owner": owner, "result": result}
        return result

    @app.get("/api/comparisons/{comparison_id}")
    def get_comparison(comparison_id: str, request: Request):
        with lock:
            return copy.deepcopy(owned_comparison(comparison_id, request)["result"])

    @app.post("/api/comparisons/{comparison_id}/resume")
    def resume(comparison_id: str, request: Request):
        with lock:
            record = owned_comparison(comparison_id, request)
            try:
                resume_approval(record["result"], product)
            except Exception:
                raise HTTPException(503, "Authorization unavailable; pending move not applied") from None
            return copy.deepcopy(record["result"])

    @app.get("/api/comparisons/{comparison_id}/report")
    def export(comparison_id: str, request: Request, response: Response):
        response.headers["Content-Disposition"] = 'attachment; filename="agent-x-evidence.json"'
        with lock:
            return copy.deepcopy(owned_comparison(comparison_id, request)["result"])

    @app.get("/api/comparisons/{comparison_id}/runs/{mode}")
    def run_report(comparison_id: str, mode: Literal["OFF", "MONITOR", "ENFORCE"], request: Request):
        with lock:
            result = owned_comparison(comparison_id, request)["result"]
            run_id = result["modes"][mode]["run_id"]
        if not run_id:
            raise HTTPException(409, "No product run was created")
        try:
            return product.get(f"/v1/runs/{run_id}")
        except Exception:
            raise HTTPException(503, "Product evidence unavailable") from None

    def operator_authorization(request: Request) -> str:
        header = request.headers.get("authorization", "")
        if not header.startswith("Bearer ") or len(header) <= 7:
            raise HTTPException(401, "Reviewer token required")
        return header

    @app.post("/api/comparisons/{comparison_id}/review")
    def review(comparison_id: str, payload: ReviewRequest, request: Request):
        authorization = operator_authorization(request)
        with lock:
            result = owned_comparison(comparison_id, request)["result"]
            enforce = result["modes"]["ENFORCE"]
            if not enforce["pending"]:
                raise HTTPException(409, "No action is awaiting review")
            approval_id = enforce["pending"][0]["decision"]["approval_id"]
            try:
                product.operator_action(
                    f"/v1/runs/{enforce['run_id']}/approvals/{approval_id}",
                    {"decision": payload.decision}, authorization,
                )
                resume_approval(result, product)
            except httpx.HTTPStatusError as error:
                code = error.response.status_code
                raise HTTPException(code if code in (401, 403, 409) else 503,
                                    "Review rejected; check reviewer identity and approval state") from None
            except Exception:
                raise HTTPException(503, "Product review unavailable") from None
            return copy.deepcopy(result)

    @app.post("/api/comparisons/{comparison_id}/stop")
    def stop_comparison(comparison_id: str, request: Request):
        authorization = operator_authorization(request)
        with lock:
            result = owned_comparison(comparison_id, request)["result"]
            run_id = result["modes"]["ENFORCE"]["run_id"]
        try:
            return product.operator_action(f"/v1/runs/{run_id}/stop", {}, authorization)
        except httpx.HTTPStatusError as error:
            code = error.response.status_code
            raise HTTPException(code if code in (401, 403, 409) else 503, "Stop request rejected") from None

    @app.post("/api/agents", status_code=201)
    def start_agent(payload: AgentRequest, request: Request, response: Response):
        if payload.provider == "live" and not model_settings()["key"]:
            raise HTTPException(503, "Live model is not configured on the server")
        with lock:
            if len(agents) >= 100:
                raise HTTPException(503, "Agent session capacity reached")
        owner = request.cookies.get("agent_x_session") or uuid4().hex
        response.set_cookie("agent_x_session", owner, httponly=True, samesite="strict")
        result = run_agent(payload.fixture_id, payload.provider, payload.probe, product)
        with lock:
            agents[result["agent_id"]] = {"owner": owner, "result": result}
        return result

    @app.get("/api/agents/{agent_id}")
    def agent_report(agent_id: str, request: Request):
        with lock:
            record = agents.get(agent_id)
            if not record or record["owner"] != request.cookies.get("agent_x_session"):
                raise HTTPException(404, "Agent session unavailable")
            return copy.deepcopy(record["result"])

    @app.get("/api/agents/{agent_id}/evidence")
    def agent_evidence(agent_id: str, request: Request):
        with lock:
            record = agents.get(agent_id)
            if not record or record["owner"] != request.cookies.get("agent_x_session"):
                raise HTTPException(404, "Agent session unavailable")
            run_id = record["result"]["run_id"]
        try:
            return product.get(f"/v1/runs/{run_id}")
        except Exception:
            raise HTTPException(503, "Product evidence unavailable") from None

    return app
