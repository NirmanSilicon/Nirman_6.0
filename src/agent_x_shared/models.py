"""Canonical wire types. Product OpenAPI is generated from these models."""

from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Mode(StrEnum):
    OFF = "OFF"
    MONITOR = "MONITOR"
    ENFORCE = "ENFORCE"


class CreateRun(StrictModel):
    template_id: str = Field(min_length=1)
    parameters: dict[str, Any]
    comparison_id: str | None = None
    fixture_id: str | None = None
    fixture_version: str | None = None
    mode: Literal["OFF", "MONITOR", "ENFORCE"] = "ENFORCE"


class RunCreated(StrictModel):
    run_id: str
    contract_id: str
    policy_version: str
    contract_summary: dict[str, Any]


class CheckAction(StrictModel):
    action_id: str = Field(min_length=1, max_length=128)
    tool_id: str
    arguments: dict[str, Any]
    source_refs: list[str] = Field(default_factory=list)


class Decision(StrictModel):
    decision_id: str
    verdict: Literal["ALLOW", "BLOCK", "ASK_HUMAN"]
    rule_id: str
    canonical_arguments: dict[str, Any] | None = None
    approval_id: str | None = None


class ApprovalResolution(StrictModel):
    decision: Literal["APPROVE", "REJECT"]


class AuthorizeMock(StrictModel):
    action_id: str
    decision_id: str
    approval_id: str | None = None


class Authorization(StrictModel):
    status: Literal["AUTHORIZED", "DENIED"]
    rule_id: str
    reservation_id: str | None = None
    canonical_arguments: dict[str, Any] | None = None


class OutputCheck(StrictModel):
    output_id: str
    answer: dict[str, Any]
    source_refs: list[str] = Field(default_factory=list)


class OutputResult(StrictModel):
    verdict: Literal["PASS", "SANITIZED", "BLOCK"]
    rule_id: str
    answer: dict[str, Any] | None = None


class ObservedEvent(StrictModel):
    event_id: str
    action_id: str | None = None
    kind: str
    outcome: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(StrictModel):
    code: str
    message: str
