import copy
import os
from contextlib import asynccontextmanager
from importlib.resources import files
from threading import RLock
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from pydantic import Field

from agent_x_sandbox.client import ProductClient
from agent_x_sandbox.simulator import resume_approval, run_comparison
from agent_x_shared import API_VERSION
from agent_x_shared.catalog import load_catalog
from agent_x_shared.models import StrictModel


class ComparisonRequest(StrictModel):
    fixture_id: str = Field(min_length=1)


def create_app(client=None) -> FastAPI:
    token = os.getenv("AGENT_X_SANDBOX_TOKEN", "")
    if client is None and not token:
        raise ValueError("AGENT_X_SANDBOX_TOKEN is required")
    product = client or ProductClient(os.getenv("AGENT_X_PRODUCT_URL", "http://127.0.0.1:8000"), token)
    dashboard_url = os.getenv("AGENT_X_DASHBOARD_URL", "http://localhost:8000")
    catalog = load_catalog()
    comparisons = {}
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

    return app
