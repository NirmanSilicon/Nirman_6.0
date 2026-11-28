"""LangGraph multi-agent council: Yield, Throughput, Safety and Synthesizer.

The LLM (when enabled) only writes narrative assessments for the Yield and
Throughput agents. Actuator parameters, safety clamping and the final mitigation
are deterministic, so model output can never change a setpoint.
"""

from __future__ import annotations

import asyncio
import logging
import math
import re
from functools import lru_cache
from typing import Any, Required, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_ollama import ChatOllama
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.config import Settings, get_settings
from app.graph_rag import SAFE_FALLBACK_MARKER, get_graph_rag_context
from app.schemas import (
    AgentConsensus,
    CopilotRecommendation,
    DriftAlert,
    ExecutionParameters,
    GraphRagContext,
    OemSafetyBounds,
    ProposedParameters,
)

logger = logging.getLogger(__name__)

MAX_NARRATIVE_CHARS = 700

_NUMBER = r"\d+(?:\.\d+)?"
_FLOW_PATTERN = re.compile(rf"({_NUMBER})\s*sccm\b", re.IGNORECASE)
_DURATION_PATTERN = re.compile(
    rf"\bfor\s+({_NUMBER})\s*(seconds?|secs?|s|minutes?|mins?)\b", re.IGNORECASE
)
_VALVE_PATTERNS = (
    # "-3.5% throttle valve trim"
    re.compile(
        rf"(?<![\w.])([+-]?{_NUMBER})\s*%\s+(?:throttle[\s-]+)?(?:valve[\s-]+)?"
        r"(?:trim|adjustment|offset)\b",
        re.IGNORECASE,
    ),
    # "trimmed the valve by -3.5%"
    re.compile(
        rf"\b(?:valve|trim(?:med)?)\b[^.%\d]{{0,30}}?(?<![\w.])([+-]?{_NUMBER})\s*%",
        re.IGNORECASE,
    ),
)


class CouncilState(TypedDict, total=False):
    """Shared state passed between council nodes."""

    alert: Required[DriftAlert]
    rag_context: GraphRagContext
    yield_assessment: str
    throughput_assessment: str
    safety_assessment: str
    proposed_params: ProposedParameters
    recommendation: CopilotRecommendation
    llm_degraded: bool


# --- LLM access ---------------------------------------------------------------


async def _invoke_ollama(system_prompt: str, user_prompt: str, settings: Settings) -> str:
    timeout_sec = settings.ollama_timeout_ms / 1000
    llm = ChatOllama(
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
        temperature=0.1,
        num_predict=256,
        reasoning=False,
        client_kwargs={"timeout": timeout_sec},
    )
    message = await asyncio.wait_for(
        llm.ainvoke(
            [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
        ),
        timeout=timeout_sec,
    )
    text = re.sub(r"<think>.*?</think>", " ", str(message.text), flags=re.DOTALL)
    text = " ".join(text.split())
    if len(text) > MAX_NARRATIVE_CHARS:
        text = text[:MAX_NARRATIVE_CHARS].rsplit(" ", 1)[0] + "..."
    return text


async def _narrate(
    state: CouncilState, agent: str, system_prompt: str, user_prompt: str
) -> tuple[str | None, bool]:
    """Ask the LLM for a narrative.

    Returns ``(text, degraded)``. ``text`` is ``None`` when deterministic
    reasoning should be used. Once a call fails, ``degraded`` stays true for the
    rest of the run so that timeouts do not accumulate against the alert window.
    """
    settings = get_settings()
    degraded = state.get("llm_degraded", False)
    if settings.llm_provider != "ollama" or degraded:
        return None, degraded
    try:
        text = await _invoke_ollama(system_prompt, user_prompt, settings)
    except Exception as exc:  # Any LLM failure falls back to deterministic text.
        logger.warning(
            "Ollama unavailable for %s agent (%s: %s); using deterministic reasoning",
            agent,
            type(exc).__name__,
            exc,
        )
        return None, True
    if not text:
        logger.warning("Ollama returned no text for %s agent", agent)
        return None, False
    return text, False


def _narrative_system_prompt(role: str, focus: str) -> str:
    return (
        f"You are the {role} on a semiconductor etch contamination-prevention "
        f"council. {focus} Answer in at most three sentences of plain text. Use only "
        "facts and numbers given to you. Do not invent setpoints and do not claim "
        "that any action has been executed."
    )


# --- Deterministic engineering logic -----------------------------------------


def _is_fallback(context: GraphRagContext) -> bool:
    return SAFE_FALLBACK_MARKER in context.graph_trace


def _risk_level(time_to_threshold_sec: int) -> str:
    if time_to_threshold_sec <= 120:
        return "CRITICAL"
    if time_to_threshold_sec <= 300:
        return "HIGH"
    if time_to_threshold_sec <= 900:
        return "ELEVATED"
    return "MODERATE"


def _deterministic_yield_assessment(alert: DriftAlert, context: GraphRagContext) -> str:
    window = alert.window_summary
    headroom = window.critical_threshold_mtorr - window.latest_backing_pressure_mtorr
    position = (
        f"{headroom:.1f} mTorr below the {window.critical_threshold_mtorr:g} mTorr limit"
        if headroom > 0
        else f"at or above the {window.critical_threshold_mtorr:g} mTorr limit"
    )
    return (
        f"Backing pressure is {window.latest_backing_pressure_mtorr:g} mTorr, {position}, "
        f"drifting at {alert.drift_velocity_per_min:g} mTorr/min with "
        f"{alert.time_to_threshold_sec} s to threshold (detection confidence "
        f"{alert.confidence:.0%}). Crossing it puts in-process wafers at risk of "
        f"contamination and batch scrap. Root cause: {context.historical_root_cause}"
    )


def _parse_valve_pct(summary: str, bounds: OemSafetyBounds) -> float | None:
    for pattern in _VALVE_PATTERNS:
        match = pattern.search(summary)
        if match:
            raw = match.group(1)
            value = float(raw)
            # An unsigned magnitude takes the direction permitted by the OEM.
            if raw[0] not in "+-":
                value = math.copysign(value, bounds.max_valve_adjustment_pct)
            return value
    return None


def propose_parameters(context: GraphRagContext) -> tuple[ProposedParameters, list[str]]:
    """Derive an initial proposal from the prior resolution.

    Values the summary does not state default to conservative points inside the
    OEM envelope. Returns the proposal and the names of the defaulted values.
    """
    summary = context.prior_resolution_summary.replace("−", "-").replace("–", "-")
    bounds = context.oem_safety_bounds
    low, high = bounds.purge_flow_range_sccm
    defaulted: list[str] = []

    valve = _parse_valve_pct(summary, bounds)
    if valve is None:
        valve = round(bounds.max_valve_adjustment_pct * 0.5, 2)
        defaulted.append("valve trim")

    flow_match = _FLOW_PATTERN.search(summary)
    if flow_match:
        flow = float(flow_match.group(1))
    else:
        flow = round((low + high) / 2, 1)
        defaulted.append("purge flow")

    duration_match = _DURATION_PATTERN.search(summary)
    if duration_match:
        scale = 60 if duration_match.group(2).lower().startswith("m") else 1
        duration = round(float(duration_match.group(1)) * scale)
    else:
        duration = bounds.max_purge_duration_sec * 2 // 3
        defaulted.append("purge duration")

    proposal = ProposedParameters(
        target_valve_adjustment_pct=valve,
        purge_flow_sccm=flow,
        purge_duration_sec=duration,
    )
    return proposal, defaulted


def _clamp(value: float, low: float, high: float) -> float:
    return min(max(value, low), high)


def clamp_to_oem_bounds(
    proposal: ProposedParameters, bounds: OemSafetyBounds
) -> tuple[ExecutionParameters, list[str]]:
    """Force a proposal inside the OEM envelope and describe every correction."""
    valve_low, valve_high = sorted((0.0, bounds.max_valve_adjustment_pct))
    flow_low, flow_high = bounds.purge_flow_range_sccm

    valve = _clamp(proposal.target_valve_adjustment_pct, valve_low, valve_high)
    flow = _clamp(proposal.purge_flow_sccm, flow_low, flow_high)
    duration = int(_clamp(proposal.purge_duration_sec, 0, bounds.max_purge_duration_sec))

    corrections: list[str] = []
    if valve != proposal.target_valve_adjustment_pct:
        corrections.append(
            f"valve trim {proposal.target_valve_adjustment_pct:g}% -> {valve:g}%"
        )
    if flow != proposal.purge_flow_sccm:
        corrections.append(f"purge flow {proposal.purge_flow_sccm:g} -> {flow:g} sccm")
    if duration != proposal.purge_duration_sec:
        corrections.append(f"purge duration {proposal.purge_duration_sec} -> {duration} s")

    approved = ExecutionParameters(
        target_valve_adjustment_pct=valve,
        purge_flow_sccm=flow,
        purge_duration_sec=duration,
        requires_human_approval=True,
    )
    return approved, corrections


def _describe_parameters(params: ProposedParameters) -> str:
    return (
        f"valve trim {params.target_valve_adjustment_pct:g}%, N2 purge "
        f"{params.purge_flow_sccm:g} sccm for {params.purge_duration_sec} s"
    )


# --- Graph nodes --------------------------------------------------------------


async def fetch_rag_node(state: CouncilState) -> dict[str, Any]:
    return {"rag_context": await get_graph_rag_context(state["alert"])}


async def yield_agent_node(state: CouncilState) -> dict[str, Any]:
    alert, context = state["alert"], state["rag_context"]
    facts = _deterministic_yield_assessment(alert, context)
    narrative, degraded = await _narrate(
        state,
        "yield",
        _narrative_system_prompt(
            "Yield Agent", "Assess wafer quality, contamination and batch-scrap risk."
        ),
        facts,
    )
    assessment = f"{_risk_level(alert.time_to_threshold_sec)} scrap risk. {narrative or facts}"
    return {"yield_assessment": assessment, "llm_degraded": degraded}


async def throughput_agent_node(state: CouncilState) -> dict[str, Any]:
    alert, context = state["alert"], state["rag_context"]
    proposal, defaulted = propose_parameters(context)

    timing = (
        "fits inside"
        if proposal.purge_duration_sec < alert.time_to_threshold_sec
        else "does not fit inside"
    )
    reasoning = (
        "Prefer an in-situ correction over a full chamber abort to protect uptime. "
        f"Prior resolution: {context.prior_resolution_summary} The "
        f"{proposal.purge_duration_sec} s purge {timing} the "
        f"{alert.time_to_threshold_sec} s time-to-threshold window."
    )
    narrative, degraded = await _narrate(
        state,
        "throughput",
        _narrative_system_prompt(
            "Throughput Agent",
            "Argue how to protect tool uptime and avoid a full chamber abort.",
        ),
        f"{reasoning} Proposed: {_describe_parameters(proposal)}.",
    )

    assessment = (
        f"{narrative or reasoning} Proposed for safety review: "
        f"{_describe_parameters(proposal)}."
    )
    if defaulted:
        assessment += f" Conservative defaults used for: {', '.join(defaulted)}."
    return {
        "throughput_assessment": assessment,
        "proposed_params": proposal,
        "llm_degraded": degraded,
    }


async def safety_agent_node(state: CouncilState) -> dict[str, Any]:
    context = state["rag_context"]
    bounds = context.oem_safety_bounds
    approved, corrections = clamp_to_oem_bounds(state["proposed_params"], bounds)

    valve_low, valve_high = sorted((0.0, bounds.max_valve_adjustment_pct))
    flow_low, flow_high = bounds.purge_flow_range_sccm
    envelope = (
        f"valve trim [{valve_low:g}, {valve_high:g}]%, purge flow "
        f"[{flow_low:g}, {flow_high:g}] sccm, purge duration <= "
        f"{bounds.max_purge_duration_sec} s"
    )
    source = "conservative fallback" if _is_fallback(context) else "OEM"
    verdict = (
        f"Clamped to the {source} limits: {'; '.join(corrections)}."
        if corrections
        else f"All proposed values are within the {source} limits."
    )
    assessment = (
        f"{verdict} Envelope: {envelope}. Approved for operator review: "
        f"{_describe_parameters(approved)}. Human approval is mandatory before execution."
    )
    return {"safety_assessment": assessment, "proposed_params": approved}


async def synthesizer_node(state: CouncilState) -> dict[str, Any]:
    alert, context = state["alert"], state["rag_context"]
    # Re-validate so the output is bounded regardless of how state was produced.
    params, _ = clamp_to_oem_bounds(state["proposed_params"], context.oem_safety_bounds)

    mitigation = (
        f"Pending human operator approval: on {alert.chamber_id} / "
        f"{alert.suspected_subsystem}, apply a {params.target_valve_adjustment_pct:g}% "
        f"throttle valve trim with a dynamic N2 purge at {params.purge_flow_sccm:g} sccm "
        f"for {params.purge_duration_sec} s, and monitor backing pressure against the "
        f"{alert.window_summary.critical_threshold_mtorr:g} mTorr limit."
    )
    if params.purge_duration_sec >= alert.time_to_threshold_sec:
        mitigation += (
            f" WARNING: only {alert.time_to_threshold_sec} s remain before threshold, "
            "less than the purge needs; prepare a controlled chamber abort."
        )
    else:
        mitigation += " Escalate to a controlled chamber abort if pressure keeps rising."
    if _is_fallback(context):
        mitigation = (
            "CAUTION: Graph-RAG context unavailable, conservative fallback limits in "
            f"use; verify the root cause manually. {mitigation}"
        )

    recommendation = CopilotRecommendation(
        alert_id=alert.alert_id,
        chamber_id=alert.chamber_id,
        fault_location=alert.suspected_subsystem,
        root_cause=context.historical_root_cause,
        time_to_threshold_sec=alert.time_to_threshold_sec,
        agent_consensus=AgentConsensus(
            yield_agent=state["yield_assessment"],
            throughput_agent=state["throughput_assessment"],
            safety_agent=state["safety_assessment"],
        ),
        graph_trace=list(context.graph_trace),
        recommended_mitigation=mitigation,
        execution_parameters=params,
    )
    return {"recommendation": recommendation}


# --- Workflow -----------------------------------------------------------------


def build_council_graph() -> CompiledStateGraph:
    """Compile the linear council workflow."""
    nodes = (
        fetch_rag_node,
        yield_agent_node,
        throughput_agent_node,
        safety_agent_node,
        synthesizer_node,
    )
    graph = StateGraph(CouncilState)
    for node in nodes:
        graph.add_node(node.__name__, node)

    previous = START
    for node in nodes:
        graph.add_edge(previous, node.__name__)
        previous = node.__name__
    graph.add_edge(previous, END)
    return graph.compile()


@lru_cache(maxsize=1)
def get_council_graph() -> CompiledStateGraph:
    return build_council_graph()


async def run_council(alert: DriftAlert) -> CopilotRecommendation:
    """Run the full council for one drift alert."""
    final_state = await get_council_graph().ainvoke({"alert": alert})
    return final_state["recommendation"]
