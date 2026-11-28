from dataclasses import asdict
from importlib.resources import files
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse

from agent_x_evaluation.core import ANNOTATION, INVOICES, compare_runs, compile_contract
from agent_x_shared.models import StrictModel


class ComparisonRequest(StrictModel):
    invoice_id: str = "invoice-001"
    fixture: Literal["benign", "incident"] = "incident"
    include_annotation: bool = True


def create_app() -> FastAPI:
    app = FastAPI(title="Agent-X Initial Evaluation", version="0.2.0")

    @app.get("/", response_class=HTMLResponse, include_in_schema=False)
    def index():
        return files("agent_x_evaluation").joinpath("web/index.html").read_text(encoding="utf-8")

    @app.get("/healthz")
    def health():
        return {"status": "ok", "profile": "initial-evaluation", "network_tools": False}

    @app.get("/api/evaluation/catalog")
    def catalog():
        return {"invoices": list(INVOICES.values()), "annotation": ANNOTATION,
                "contracts": {key: asdict(compile_contract(key)) for key in INVOICES}}

    @app.post("/api/evaluation/compare")
    def compare(payload: ComparisonRequest):
        try:
            return compare_runs(payload.invoice_id, payload.fixture, payload.include_annotation)
        except ValueError:
            raise HTTPException(422, "Unknown invoice or invalid demo parameters") from None

    return app
