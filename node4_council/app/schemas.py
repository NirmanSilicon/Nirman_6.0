"""Pydantic v2 wire contracts exchanged with the other NanoShield nodes."""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

NonEmptyStr = Annotated[str, Field(min_length=1)]


class WireModel(BaseModel):
    """Base for wire payloads.

    NaN and infinity are rejected because they would slip through numeric safety
    clamps. Unknown inbound fields are ignored so upstream additions do not break
    this node.
    """

    model_config = ConfigDict(allow_inf_nan=False, str_strip_whitespace=True)


# --- Inbound: drift alert ----------------------------------------------------


class WindowSummary(WireModel):
    window_seconds: int = Field(gt=0)
    sustained_drift_seconds: float = Field(ge=0)
    latest_backing_pressure_mtorr: float = Field(ge=0)
    critical_threshold_mtorr: float = Field(gt=0)


class DriftAlert(WireModel):
    event_type: Literal["DRIFT_ALERT"]
    alert_id: NonEmptyStr
    chamber_id: NonEmptyStr
    suspected_subsystem: NonEmptyStr
    anomaly_signature: NonEmptyStr
    drift_velocity_per_min: float
    time_to_threshold_sec: int = Field(ge=0)
    confidence: float = Field(ge=0.0, le=1.0)
    window_summary: WindowSummary


# --- Context: Graph-RAG (Node 3) ---------------------------------------------


class OemSafetyBounds(WireModel):
    """OEM actuator limits.

    ``max_valve_adjustment_pct`` is signed: the permitted trim lies between zero
    and this value, so ``-5.0`` allows [-5.0, 0.0].
    """

    max_valve_adjustment_pct: float = Field(ge=-100.0, le=100.0)
    purge_flow_range_sccm: tuple[float, float]
    max_purge_duration_sec: int = Field(ge=0)

    @field_validator("purge_flow_range_sccm")
    @classmethod
    def _validate_flow_range(cls, value: tuple[float, float]) -> tuple[float, float]:
        low, high = value
        if low < 0 or high < low:
            raise ValueError("purge_flow_range_sccm must satisfy 0 <= min <= max")
        return value


class GraphRagContext(WireModel):
    chamber_id: NonEmptyStr
    suspected_subsystem: NonEmptyStr
    anomaly_signature: NonEmptyStr
    historical_root_cause: NonEmptyStr
    oem_safety_bounds: OemSafetyBounds
    prior_resolution_summary: NonEmptyStr
    graph_trace: list[NonEmptyStr] = Field(min_length=1)


# --- Outbound: copilot recommendation ----------------------------------------


class ProposedParameters(WireModel):
    """Actuator proposal that has not yet passed the human-approval gate."""

    target_valve_adjustment_pct: float
    purge_flow_sccm: float
    purge_duration_sec: int


class ExecutionParameters(ProposedParameters):
    """Safety-validated parameters. Human approval cannot be switched off."""

    purge_flow_sccm: float = Field(ge=0)
    purge_duration_sec: int = Field(ge=0)
    requires_human_approval: Literal[True] = True


class AgentConsensus(WireModel):
    yield_agent: NonEmptyStr
    throughput_agent: NonEmptyStr
    safety_agent: NonEmptyStr


class CopilotRecommendation(WireModel):
    model_config = ConfigDict(extra="forbid")

    event_type: Literal["COPILOT_RECOMMENDATION"] = "COPILOT_RECOMMENDATION"
    alert_id: NonEmptyStr
    chamber_id: NonEmptyStr
    fault_location: NonEmptyStr
    root_cause: NonEmptyStr
    time_to_threshold_sec: int = Field(ge=0)
    agent_consensus: AgentConsensus
    graph_trace: list[NonEmptyStr] = Field(min_length=1)
    recommended_mitigation: NonEmptyStr
    execution_parameters: ExecutionParameters
