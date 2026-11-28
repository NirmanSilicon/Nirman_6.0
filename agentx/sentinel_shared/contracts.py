"""Canonical SENTINEL v1 shared contract schemas, enums, and catalog identifiers."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

API_CONTRACT_VERSION = "sentinel-v1"
POLICY_VERSION = "2026.11.1"

TEMPLATE_IDS = (
    "extract_invoice",
    "compare_quotes",
    "summarize_page",
    "summarize_document",
    "summarize_email",
    "route_review_draft",
)

TOOL_IDS = (
    "read_file",
    "read_page",
    "read_document",
    "read_email",
    "move_mock_draft",
    "send_mock_attachment",
)


class Mode(str, Enum):
    OFF = "OFF"
    MONITOR = "MONITOR"
    ENFORCE = "ENFORCE"


class Verdict(str, Enum):
    ALLOW = "ALLOW"
    BLOCK = "BLOCK"
    ASK_HUMAN = "ASK_HUMAN"


class ApprovalDecision(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"


class ApprovalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    CONSUMED = "CONSUMED"


class OutputVerdict(str, Enum):
    PASS = "PASS"
    SANITIZED = "SANITIZED"
    BLOCK = "BLOCK"


class AuthorizeStatus(str, Enum):
    AUTHORIZED = "AUTHORIZED"
    DENIED = "DENIED"


class RunStatus(str, Enum):
    ACTIVE = "ACTIVE"
    STOPPED = "STOPPED"
    COMPLETED = "COMPLETED"


class ErrorDetail(BaseModel):
    code: str
    message: str


class CreateRunRequest(BaseModel):
    template_id: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    # Sandbox-only fields (only accepted by trusted sandbox integration in sandbox profile)
    comparison_id: str | None = None
    fixture_id: str | None = None
    fixture_version: str | None = None
    mode: Mode = Mode.ENFORCE
    agent_id: str | None = None
    evidence_source: str | None = None


class CreateRunResponse(BaseModel):
    run_id: str
    contract_id: str
    policy_version: str
    contract_summary: dict[str, Any]
    mode: Mode
    status: RunStatus


class CheckActionRequest(BaseModel):
    action_id: str
    tool_id: str
    arguments: dict[str, Any] = Field(default_factory=dict)
    source_refs: list[str] = Field(default_factory=list)
    risk_signal: dict[str, Any] | None = None


class CheckActionResponse(BaseModel):
    decision_id: str
    verdict: Verdict
    rule_id: str
    reason: str
    canonical_arguments: dict[str, Any] | None = None
    approval_id: str | None = None


class ApprovalDecisionRequest(BaseModel):
    decision: ApprovalDecision


class ApprovalResponse(BaseModel):
    approval_id: str
    run_id: str
    tool_id: str
    status: ApprovalStatus
    argument_digest: str
    before_state: dict[str, Any] | None = None
    after_state: dict[str, Any] | None = None
    decided_by: str | None = None
    decided_at: str | None = None


class OutputCheckRequest(BaseModel):
    output_id: str
    answer: dict[str, Any]
    source_refs: list[str] = Field(default_factory=list)


class OutputCheckResponse(BaseModel):
    verdict: OutputVerdict
    rule_id: str
    reason: str
    answer: dict[str, Any] | None = None


class SandboxEventRequest(BaseModel):
    event_id: str
    action_id: str | None = None
    kind: str
    outcome: str
    details: dict[str, Any] = Field(default_factory=dict)


class SandboxEventResponse(BaseModel):
    event_id: str
    run_id: str
    origin: str = "sandbox"
    recorded_at: str
    event_hash: str


class AuthorizeMockRequest(BaseModel):
    action_id: str
    decision_id: str
    approval_id: str | None = None
    arguments: dict[str, Any] | None = None


class AuthorizeMockResponse(BaseModel):
    status: AuthorizeStatus
    rule_id: str
    reason: str
    reservation_id: str | None = None
    canonical_arguments: dict[str, Any] | None = None


class RunStatusResponse(BaseModel):
    run_id: str
    tenant_id: str
    template_id: str
    contract_id: str
    policy_version: str
    mode: Mode
    status: RunStatus
    comparison_id: str | None = None
    fixture_id: str | None = None
    fixture_version: str | None = None
    evidence_source: str = "product"
    created_at: str
    contract_summary: dict[str, Any]
    decisions: list[dict[str, Any]]
    approvals: list[dict[str, Any]]
    events: list[dict[str, Any]]
    output_verdict: dict[str, Any] | None = None
    chain_valid: bool = True
