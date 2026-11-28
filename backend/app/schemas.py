from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class ScanRequest(BaseModel):
    url: str = Field(..., min_length=3, max_length=2048, examples=["https://example.com"])
    authorized: bool = Field(
        ...,
        description="User explicitly confirms ownership or permission to scan the target domain.",
    )


class RemediationSnippets(BaseModel):
    nginx: Optional[str] = None
    apache: Optional[str] = None
    dns: Optional[str] = None
    general: str


class FindingSchema(BaseModel):
    module: str              # "tls" | "headers" | "dns" | "surface"
    code: str                # Machine-readable ID, e.g. "MISSING_HSTS"
    cwe_id: str              # e.g. "CWE-693"
    owasp_category: str      # e.g. "A05:2021-Security Misconfiguration"
    severity: Severity
    title: str
    technical_detail: str    # Exact observed evidence
    business_impact: str     # Plain-English explanation for MSME owners
    remediation: RemediationSnippets


class ModuleSummary(BaseModel):
    status: str              # "ok" | "warning" | "error"
    checks_passed: int
    checks_failed: int
    error_message: Optional[str] = None


class PatchBundle(BaseModel):
    nginx: str
    apache: str
    dns: str


class ScanResponse(BaseModel):
    scan_id: Optional[int] = None
    domain: str
    normalized_url: str
    resolved_ip: str
    score: int = Field(..., ge=0, le=100)
    grade: str
    duration_ms: int
    scanned_at: datetime
    module_summary: Dict[str, ModuleSummary]
    findings: List[FindingSchema]
    patch_bundle: PatchBundle


class ScanListItem(BaseModel):
    scan_id: int
    domain: str
    score: int
    grade: str
    findings_count: int
    scanned_at: datetime
class LinkCheckRequest(BaseModel):
    url: str = Field(..., min_length=1, max_length=2048, examples=["https://onlinesbl.com"])


class CharacterDiff(BaseModel):
    position: int
    typed_char: str
    expected_char: str
    explanation: str


class LinkSignal(BaseModel):
    code: str
    severity: str
    title: str
    detail: str


class LiveLinkTelemetry(BaseModel):
    dns_resolved: Optional[bool] = None
    domain_age_days: Optional[int] = None
    registered_on: Optional[str] = None
    tls_valid: Optional[bool] = None
    tls_issuer: Optional[str] = None
    redirect_chain: List[str] = Field(default_factory=list)
    final_url: Optional[str] = None


class LinkCheckResponse(BaseModel):
    input_url: str
    normalized_host: str
    decoded_host: str
    verdict: str             # "SAFE" | "SUSPICIOUS" | "DANGEROUS" | "BLOCKED"
    risk_score: int = Field(..., ge=0, le=100)
    summary: str
    matched_brand: Optional[str] = None
    official_domain: Optional[str] = None
    character_diffs: List[CharacterDiff]
    signals: List[LinkSignal]
    live_telemetry: Optional[LiveLinkTelemetry] = None
    recommendations: List[str] = Field(default_factory=list)

class RemediateRequest(BaseModel):
    url: str = Field(..., min_length=3, max_length=2048)
    agent_key: str = Field(..., min_length=4, max_length=256)
    approved: bool = Field(..., description="Explicit enterprise owner permission for remote patching.")
    patches: List[str] = Field(..., min_length=1)
    approved_by: str = Field(default="Enterprise Owner", max_length=120)
    before_score: Optional[int] = Field(default=None, ge=0, le=100)


class RemediateResponse(BaseModel):
    domain: str
    status: str
    applied_patches: List[str]
    manual_only_notes: List[str]
    agent_timestamp: str
    before_score: Optional[int] = None
    after_score: int
    verified_scan: ScanResponse


class RollbackRequest(BaseModel):
    url: str = Field(..., min_length=3, max_length=2048)
    agent_key: str = Field(..., min_length=4, max_length=256)
    approved: bool = Field(...)
class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    full_name: str = Field(..., min_length=2, max_length=120)
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field(default="citizen", pattern="^(citizen|enterprise)$")


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class UserProfile(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class UserActivityItem(BaseModel):
    id: int
    action_type: str
    target: str
    verdict_or_grade: str
    score: Optional[int] = None
    detail: str
    created_at: datetime


class UserActivitySummary(BaseModel):
    user: UserProfile
    total_actions: int
    link_checks_count: int
    enterprise_scans_count: int
    remote_patches_count: int
    recent_activities: List[UserActivityItem]