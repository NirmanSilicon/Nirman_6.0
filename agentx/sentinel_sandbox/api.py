"""Sandbox BFF API router (browser talks only to this backend; credentials stay server-side)."""

from __future__ import annotations

import copy
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from sentinel_agent import LiveGuardedAgent, SentinelMCPProxy, get_available_llm_providers
from sentinel_product.policy import ProductEngine
from .client import ProductClient, ProductClientError
from .fixtures import FIXTURES, FIXTURE_CATALOG_VERSION, STARTING_STATE_DIGEST
from .simulator import (
    build_report,
    load_fixture,
    reset_session,
    resolve_approval_in_comparison,
    run_comparison,
    verify_approval_edge_cases,
)


class CompareFixtureRequest(BaseModel):
    fixture_id: str = "extract_invoice_incident"


class ApprovalActionRequest(BaseModel):
    decision: str
    comparison_id: str | None = None


class ApprovalVerifyRequest(BaseModel):
    check: str
    comparison_id: str | None = None


class LiveAgentRequest(BaseModel):
    task_id: str = "extract_invoice"
    provider: str = "auto"


def _strip_internal_state(comparison: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(comparison)
    for m in out.get("modes", {}).values():
        m.pop("_session_state", None)
    return out


def create_sandbox_router(
    *,
    product_client: ProductClient,
    product_engine: ProductEngine,
) -> APIRouter:
    """Create the Sandbox BFF routes for the judge-facing UI."""
    router = APIRouter(prefix="/sandbox/api")
    proxy = SentinelMCPProxy(product_client=product_client, product_engine=product_engine)
    live_agent = LiveGuardedAgent(proxy)

    session_store: dict[str, Any] = {
        "selected_fixture_id": "extract_invoice_incident",
        "current_comparison": None,
        "comparisons_by_id": {},
        "live_agent_runs": [],
    }

    @router.get("/catalog")
    def get_catalog() -> dict[str, Any]:
        items = []
        for fx in FIXTURES.values():
            items.append(
                {
                    "fixture_id": fx["fixture_id"],
                    "title": fx["title"],
                    "template_id": fx["template_id"],
                    "carrier": fx["carrier"],
                    "technique": fx["technique"],
                    "goal": fx["goal"],
                    "parameters": fx["parameters"],
                }
            )
        selected_id = session_store["selected_fixture_id"]
        current_cmp = session_store["current_comparison"]
        return {
            "catalog_version": FIXTURE_CATALOG_VERSION,
            "starting_state_digest": STARTING_STATE_DIGEST,
            "fixtures": items,
            "selected_fixture_id": selected_id,
            "fixture_detail": load_fixture(selected_id),
            "comparison": _strip_internal_state(current_cmp) if current_cmp else None,
            "providers": get_available_llm_providers(),
            "live_agent_runs": session_store["live_agent_runs"],
        }

    @router.get("/fixture/{fixture_id}")
    def get_fixture_detail(fixture_id: str) -> dict[str, Any]:
        try:
            detail = load_fixture(fixture_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        session_store["selected_fixture_id"] = fixture_id
        session_store["current_comparison"] = None
        return {
            "fixture_detail": detail,
            "starting_state_digest": STARTING_STATE_DIGEST,
        }

    @router.post("/compare")
    def post_compare(payload: CompareFixtureRequest) -> dict[str, Any]:
        try:
            cmp = run_comparison(payload.fixture_id, product_client)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        session_store["selected_fixture_id"] = payload.fixture_id
        session_store["current_comparison"] = cmp
        session_store["comparisons_by_id"][cmp["comparison_id"]] = cmp
        return _strip_internal_state(cmp)

    @router.post("/reset")
    def post_reset(payload: CompareFixtureRequest | None = None) -> dict[str, Any]:
        fid = payload.fixture_id if payload else session_store["selected_fixture_id"]
        try:
            reset_info = reset_session(fid)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        session_store["selected_fixture_id"] = fid
        session_store["current_comparison"] = None
        return reset_info

    @router.post("/approval")
    def post_approval(payload: ApprovalActionRequest) -> dict[str, Any]:
        cmp = (
            session_store["comparisons_by_id"].get(payload.comparison_id)
            if payload.comparison_id
            else session_store["current_comparison"]
        )
        if cmp is None:
            raise HTTPException(status_code=400, detail="Run comparison first before resolving approval.")
        if payload.decision not in {"APPROVE", "REJECT"}:
            raise HTTPException(status_code=400, detail="decision must be APPROVE or REJECT.")
        try:
            updated = resolve_approval_in_comparison(
                cmp,
                decision=payload.decision,
                product_client=product_client,
            )
        except (ValueError, ProductClientError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        session_store["current_comparison"] = updated
        session_store["comparisons_by_id"][updated["comparison_id"]] = updated
        return _strip_internal_state(updated)

    @router.post("/approval/verify")
    def post_approval_verify(payload: ApprovalVerifyRequest) -> dict[str, Any]:
        cmp = (
            session_store["comparisons_by_id"].get(payload.comparison_id)
            if payload.comparison_id
            else session_store["current_comparison"]
        )
        if cmp is None:
            raise HTTPException(status_code=400, detail="Run comparison first.")
        try:
            return verify_approval_edge_cases(
                cmp,
                mode_check=payload.check,
                product_client=product_client,
            )
        except (ValueError, ProductClientError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @router.get("/report")
    def get_report(comparison_id: str | None = None) -> dict[str, Any]:
        cmp = (
            session_store["comparisons_by_id"].get(comparison_id)
            if comparison_id
            else session_store["current_comparison"]
        )
        if cmp is None:
            raise HTTPException(status_code=400, detail="No active comparison to export.")
        return build_report(cmp, live_agent_runs=session_store["live_agent_runs"])

    @router.post("/live-agent")
    def post_live_agent(payload: LiveAgentRequest) -> dict[str, Any]:
        try:
            result = live_agent.run_task(task_id=payload.task_id, provider=payload.provider)
        except (ValueError, ProductClientError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        session_store["live_agent_runs"].insert(0, result)
        session_store["live_agent_runs"] = session_store["live_agent_runs"][:10]
        return result

    return router
