"""Authenticated local research API. Not an institutional data-sharing backend."""

from __future__ import annotations

import os
import secrets
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import Annotated, Literal

import pandas as pd
from fastapi import Depends, FastAPI, Header, HTTPException, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, PositiveFloat
from starlette.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from .accounts import Accounts, AccountError
from .personal_api import router as personal_router
from .jobs import Jobs, Runner

from .scoring import load_bundle, score_statement, simulate
from .mobile import MAX_UPLOAD_BYTES, analyze_csv, analyze_sample


class Transaction(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    transaction_id: str = Field(min_length=1, max_length=200)
    account_id: str = Field(min_length=1, max_length=200)
    customer_id: str = Field(min_length=1, max_length=200)
    date: date
    amount: float = Field(ge=0)
    direction: Literal["credit", "debit"]
    balance: float
    category: str = Field(default="unknown", max_length=100)
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    country: str = Field(pattern=r"^[A-Z]{2}$")
    description: str = Field(default="", max_length=1000)
    counterparty: str = Field(default="", max_length=200)


class Assessment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    assessment_id: str = Field(min_length=1, max_length=200)
    customer_id: str = Field(min_length=1, max_length=200)
    account_id: str = Field(min_length=1, max_length=200)
    as_of: date
    country: str = Field(pattern=r"^[A-Z]{2}$")
    currency: str = Field(pattern=r"^[A-Z]{3}$")


class ScoreRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    assessment: Assessment
    transactions: list[Transaction] = Field(min_length=1, max_length=50_000)
    allow_out_of_domain_research: bool = False


class SimulationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    amount: PositiveFloat
    annual_rate: float = Field(ge=0, le=1000)
    months: int = Field(ge=1, le=600)
    monthly_income: float = Field(ge=0)
    monthly_expenses: float = Field(ge=0)
    existing_emi: float = Field(default=0, ge=0)


class PersonalRequestBudget:
    """Bound received bytes before multipart/JSON parsing, including chunked bodies."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        path = scope.get("path", "")
        limited = scope["type"] == "http" and scope.get("method") in {"POST", "DELETE"}
        upload = path in {"/v1/statements", "/v1/statement-jobs", "/statements/analyze"}
        if not limited or not (upload or path.startswith("/v1/")):
            return await self.app(scope, receive, send)
        budget = MAX_UPLOAD_BYTES + 65536 if upload else 65536
        headers = dict(scope.get("headers", []))
        try:
            declared = int(headers.get(b"content-length", b"0"))
        except ValueError:
            declared = budget + 1
        if declared > budget:
            return await JSONResponse({"detail": "Request exceeds the permitted size"}, status_code=413)(scope, receive, send)
        total = 0

        async def bounded_receive():
            nonlocal total
            message = await receive()
            total += len(message.get("body", b""))
            if total > budget:
                raise HTTPException(413, "Request exceeds the permitted size")
            return message

        return await self.app(scope, bounded_receive, send)


def create_app(model_path: Path | None = None, api_key: str | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app):
        key = api_key or os.environ.get("UQUAL_API_KEY", "")
        if len(key) < 32:
            raise RuntimeError("Set UQUAL_API_KEY to a random secret of at least 32 characters")
        path = model_path or Path(os.environ.get("UQUAL_MODEL_PATH", "artifacts/berka-robust-v1/model.joblib"))
        app.state.bundle = load_bundle(path)
        if app.state.bundle.get("dataset") == "synthetic_india":
            raise RuntimeError("Keep the synthetic demo model separate: use UQUAL_SYNTHETIC_MODEL_PATH")
        demo_path = Path(os.environ.get("UQUAL_SYNTHETIC_MODEL_PATH", "artifacts/synthetic-india-v2/model.joblib"))
        app.state.synthetic_bundle = load_bundle(demo_path) if demo_path.exists() else None
        if app.state.synthetic_bundle is not None and app.state.synthetic_bundle.get("dataset") != "synthetic_india":
            raise RuntimeError("Synthetic endpoint requires a synthetic_india artifact")
        app.state.api_key = key
        account_dir = os.environ.get("UQUAL_ACCOUNT_DIR")
        app.state.accounts = Accounts(Path(account_dir)) if account_dir else None
        app.state.jobs = Jobs(app.state.accounts) if app.state.accounts else None
        app.state.runner = None
        if app.state.jobs and app.state.synthetic_bundle and os.environ.get("UQUAL_WORKER_ENABLED", "true").lower() == "true":
            app.state.runner = Runner(app.state.jobs, app.state.synthetic_bundle)
            app.state.runner.start()
        try:
            yield
        finally:
            if app.state.runner:
                await run_in_threadpool(app.state.runner.stop)

    application = FastAPI(title="UQUAL Personal and ML API", version="0.3.0", lifespan=lifespan)
    application.add_middleware(CORSMiddleware,
        allow_origins=[origin.strip() for origin in os.environ.get("UQUAL_CORS_ORIGINS", "http://localhost:8081,http://127.0.0.1:8081").split(',') if origin.strip()],
        allow_methods=["GET", "POST", "DELETE"], allow_headers=["Authorization", "Content-Type"])
    application.include_router(personal_router)
    application.add_middleware(PersonalRequestBudget)

    @application.exception_handler(AccountError)
    async def account_error(request, exc):
        return JSONResponse({"detail": exc.message}, status_code=exc.status)

    @application.middleware("http")
    async def private_responses(request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/v1/"):
            response.headers["Cache-Control"] = "no-store"
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'no-referrer'
        response.headers['X-Frame-Options'] = 'DENY'
        return response

    def authenticate(authorization: Annotated[str | None, Header()] = None):
        supplied = authorization.removeprefix("Bearer ") if authorization else ""
        if not secrets.compare_digest(supplied, application.state.api_key):
            raise HTTPException(401, "Valid bearer token required", headers={"WWW-Authenticate": "Bearer"})

    @application.get("/health")
    def health():
        return {"status": "ready", "research_only": True, "model": application.state.bundle["model_name"],
                "synthetic_demo_available": application.state.synthetic_bundle is not None}

    @application.get("/health/launch")
    def launch_readiness():
        return {"public_financial_launch_ready": False,
                "real_money_enabled": False,
                "blocking_items": ["No verified-email or password recovery service",
                    "No evidence malware scanner",
                    "No Indian repayment-outcome validation for individual ML",
                    "Independent security/privacy assessment, load capacity and backup restoration not signed off"]}

    @application.get("/health/ready")
    def ready():
        checks = {"model_available": application.state.synthetic_bundle is not None,
                  "accounts_available": application.state.accounts is not None,
                  "worker_available": application.state.jobs.ready() if application.state.jobs else False}
        return JSONResponse({"ready": all(checks.values()), **checks}, status_code=200 if all(checks.values()) else 503)

    @application.get("/connection", dependencies=[Depends(authenticate)])
    def connection():
        demo = application.state.synthetic_bundle
        return {"connected": True, "synthetic_demo_available": demo is not None,
                "feature_version": demo.get("feature_version") if demo else None}

    @application.post("/score", dependencies=[Depends(authenticate)])
    async def score(request: ScoreRequest):
        assessment = request.assessment.model_dump()
        if any(t.customer_id != assessment["customer_id"] or t.account_id != assessment["account_id"]
               for t in request.transactions):
            raise HTTPException(422, "All transactions must belong to the assessed customer and account")
        try:
            return await run_in_threadpool(score_statement, application.state.bundle,
                                           pd.DataFrame([t.model_dump() for t in request.transactions]),
                                           assessment, request.allow_out_of_domain_research)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc

    @application.post("/simulate", dependencies=[Depends(authenticate)])
    def simulation(request: SimulationRequest):
        return simulate(**request.model_dump())

    @application.post("/score-synthetic", dependencies=[Depends(authenticate)])
    async def synthetic_score(request: ScoreRequest):
        if application.state.synthetic_bundle is None:
            raise HTTPException(503, "Train the separate synthetic demo artifact and restart the API")
        assessment = request.assessment.model_dump()
        if any(t.customer_id != assessment["customer_id"] or t.account_id != assessment["account_id"]
               for t in request.transactions):
            raise HTTPException(422, "All transactions must belong to the assessed customer and account")
        try:
            return await run_in_threadpool(score_statement, application.state.synthetic_bundle,
                                           pd.DataFrame([t.model_dump() for t in request.transactions]),
                                           assessment, False, True)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc

    @application.post("/statements/analyze", dependencies=[Depends(authenticate)])
    async def analyze_statement(file: UploadFile = File(...), consent: bool = Form(False),
                                date_format: str = Form("%Y-%m-%d"), statement_end: date | None = Form(None)):
        try:
            if not consent:
                raise HTTPException(422, "Consent is required before processing your statement")
            if statement_end is None:
                raise HTTPException(422, "Enter the statement's actual end date, including days without transactions")
            if application.state.synthetic_bundle is None:
                raise HTTPException(503, "The demo model is unavailable")
            if not (file.filename or "").lower().endswith(".csv"):
                raise HTTPException(422, "This version supports CSV statements; PDF and Excel are not yet supported")
            payload = await file.read(MAX_UPLOAD_BYTES + 1)
            if len(payload) > MAX_UPLOAD_BYTES:
                raise HTTPException(413, "Statement exceeds the 10 MB limit")
            return await run_in_threadpool(analyze_csv, application.state.synthetic_bundle, payload, date_format,
                                           statement_end)
        except (ValueError, KeyError, TypeError) as exc:
            raise HTTPException(422, "Cannot analyze this CSV: " + str(exc)) from exc
        finally:
            await file.close()

    @application.post("/statements/sample-analysis", dependencies=[Depends(authenticate)])
    async def sample_analysis():
        if application.state.synthetic_bundle is None:
            raise HTTPException(503, "The demo model is unavailable")
        return await run_in_threadpool(analyze_sample, application.state.synthetic_bundle)

    return application


app = create_app()
