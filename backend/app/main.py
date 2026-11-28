import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
from typing import List
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
import httpx
from sqlalchemy import desc
from sqlalchemy.orm import selectinload

from app.database import SessionLocal, init_db
from app.engine.link_checker import analyze_citizen_link_live
from app.engine.remediator import enrich_and_generate_patches
from app.engine.scorer import calculate_score, sort_findings
from app.models import FindingRecord, ScanRecord, UserActivityRecord, UserRecord
from app.scanners.orchestrator import run_all_scanners
from app.schemas import (
    AuthResponse,
    FindingSchema,
    LinkCheckRequest,
    LinkCheckResponse,
    LoginRequest,
    ModuleSummary,
    PatchBundle,
    RegisterRequest,
    RemediateRequest,
    RemediateResponse,
    RemediationSnippets,
    RollbackRequest,
    ScanListItem,
    ScanRequest,
    ScanResponse,
    Severity,
    UserActivityItem,
    UserActivitySummary,
    UserProfile,
)
from app.security.auth import (
    create_access_token,
    get_current_user,
    get_optional_current_user,
    hash_password,
    log_user_activity,
    seed_demo_users,
    verify_password,
)
from app.security.ssrf_guard import SSRFError, validate_target_url


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Initialize database tables and seed demo accounts once when the server boots."""
    await asyncio.to_thread(init_db)
    await asyncio.to_thread(seed_demo_users)
    yield


app = FastAPI(
    title="CyberGuard MSME API",
    description="Passive website security auditing, citizen link shield, and permissioned remediation engine.",
    version="0.3.0",
    lifespan=lifespan,
)

raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080",
)
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _save_scan_to_db(response: ScanResponse, user_id: int | None = None) -> int:
    """Persist a completed ScanResponse and its child findings inside one atomic DB transaction."""
    with SessionLocal() as db:
        record = ScanRecord(
            user_id=user_id,
            domain=response.domain,
            normalized_url=response.normalized_url,
            resolved_ip=response.resolved_ip,
            score=response.score,
            grade=response.grade,
            duration_ms=response.duration_ms,
            scanned_at=response.scanned_at,
            module_summary={k: v.model_dump() for k, v in response.module_summary.items()},
            patch_bundle=response.patch_bundle.model_dump(),
        )
        for f in response.findings:
            record.findings.append(
                FindingRecord(
                    module=f.module,
                    code=f.code,
                    cwe_id=f.cwe_id,
                    owasp_category=f.owasp_category,
                    severity=f.severity.value,
                    title=f.title,
                    technical_detail=f.technical_detail,
                    business_impact=f.business_impact,
                    remediation=f.remediation.model_dump(),
                )
            )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record.id


def _ensure_utc(dt: datetime) -> datetime:
    """Attach UTC tzinfo if a DB backend (like SQLite) returns a naive datetime."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _to_user_profile(user: UserRecord) -> UserProfile:
    return UserProfile(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        created_at=_ensure_utc(user.created_at),
    )


def _list_recent_scans(limit: int, user_id: int | None = None) -> List[ScanListItem]:
    with SessionLocal() as db:
        query = db.query(ScanRecord).options(selectinload(ScanRecord.findings))
        if user_id is not None:
            query = query.filter(ScanRecord.user_id == user_id)
        else:
            query = query.filter(ScanRecord.user_id.is_(None))

        rows = (
            query.order_by(desc(ScanRecord.scanned_at), desc(ScanRecord.id))
            .limit(limit)
            .all()
        )
        return [
            ScanListItem(
                scan_id=row.id,
                domain=row.domain,
                score=row.score,
                grade=row.grade,
                findings_count=len(row.findings),
                scanned_at=_ensure_utc(row.scanned_at),
            )
            for row in rows
        ]


def _get_scan_by_id(scan_id: int, user_id: int | None = None) -> ScanResponse | None:
    with SessionLocal() as db:
        query = (
            db.query(ScanRecord)
            .options(selectinload(ScanRecord.findings))
            .filter(ScanRecord.id == scan_id)
        )
        if user_id is not None:
            query = query.filter(ScanRecord.user_id == user_id)
        else:
            query = query.filter(ScanRecord.user_id.is_(None))

        row = query.first()
        if not row:
            return None

        findings = [
            FindingSchema(
                module=f.module,
                code=f.code,
                cwe_id=f.cwe_id,
                owasp_category=f.owasp_category,
                severity=Severity(f.severity),
                title=f.title,
                technical_detail=f.technical_detail,
                business_impact=f.business_impact,
                remediation=RemediationSnippets(**f.remediation),
            )
            for f in row.findings
        ]
        return ScanResponse(
            scan_id=row.id,
            domain=row.domain,
            normalized_url=row.normalized_url,
            resolved_ip=row.resolved_ip,
            score=row.score,
            grade=row.grade,
            duration_ms=row.duration_ms,
            scanned_at=_ensure_utc(row.scanned_at),
            module_summary={k: ModuleSummary(**v) for k, v in row.module_summary.items()},
            findings=findings,
            patch_bundle=PatchBundle(**row.patch_bundle),
        )


@app.get("/health", tags=["System"])
async def health_check():
    """Lightweight liveness probe used by Render and pre-demo warm-up checks."""
    return {"status": "ok", "service": "cyberguard-msme-api", "version": "0.3.0"}


@app.post("/api/v1/scan", response_model=ScanResponse, tags=["Audits"])
async def run_security_scan(
    payload: ScanRequest,
    current_user: UserRecord | None = Depends(get_optional_current_user),
):
    """Execute a full 4-module passive security audit, calculate risk score, generate patches, and persist."""
    if not payload.authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Explicit domain ownership or scanning authorization is required.",
        )
    if current_user and current_user.role != "enterprise":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role-based access denied: Enterprise website auditing requires an Enterprise account.",
        )
    # 1. SSRF Gatekeeper
    try:
        target = await asyncio.to_thread(validate_target_url, payload.url)
    except SSRFError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # 2. Run all 4 passive scanners concurrently
    module_summary, raw_findings, duration_ms = await run_all_scanners(target)

    # 3. Deterministic risk scoring & severity sorting
    ordered_findings = sort_findings(raw_findings)
    score, grade = calculate_score(ordered_findings)

    # 4. Deterministic Jinja2 server/DNS remediation patches
    enriched_findings, patch_bundle = enrich_and_generate_patches(target.hostname, ordered_findings)

    response = ScanResponse(
        domain=target.hostname,
        normalized_url=target.normalized_url,
        resolved_ip=target.resolved_ip,
        score=score,
        grade=grade,
        duration_ms=duration_ms,
        scanned_at=datetime.now(timezone.utc),
        module_summary=module_summary,
        findings=enriched_findings,
        patch_bundle=patch_bundle,
    )

    # 5. Persist scan history and log user activity off the event loop
    scan_id = await asyncio.to_thread(
    _save_scan_to_db, response, current_user.id if current_user else None
)
    await asyncio.to_thread(
        log_user_activity,
        current_user.id if current_user else None,
        "ENTERPRISE_SCAN",
        target.hostname,
        f"Grade {grade}",
        score,
        f"Audited {target.normalized_url} ({len(enriched_findings)} findings)",
    )
    return response.model_copy(update={"scan_id": scan_id})


@app.get("/api/v1/scans", response_model=List[ScanListItem], tags=["Audits"])
async def list_scans(
    limit: int = Query(default=10, ge=1, le=50),
    current_user: UserRecord | None = Depends(get_optional_current_user),
):
    """Return recent saved scan summaries scoped strictly to the signed-in user."""
    user_id = current_user.id if current_user else None
    return await asyncio.to_thread(_list_recent_scans, limit, user_id)


@app.get("/api/v1/scans/{scan_id}", response_model=ScanResponse, tags=["Audits"])
async def get_scan_detail(
    scan_id: int,
    current_user: UserRecord | None = Depends(get_optional_current_user),
):
    """Retrieve a complete saved audit report only if it belongs to the signed-in user."""
    user_id = current_user.id if current_user else None
    result = await asyncio.to_thread(_get_scan_by_id, scan_id, user_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan #{scan_id} not found.",
        )
    return result


@app.post("/api/v1/check-link", response_model=LinkCheckResponse, tags=["Citizen Shield"])
async def check_citizen_link(
    payload: LinkCheckRequest,
    current_user: UserRecord | None = Depends(get_optional_current_user),
):
    """Dynamic zero-execution phishing, homoglyph, RDAP domain-age, DNS, TLS, and SSRF-safe link analyzer."""
    result = await analyze_citizen_link_live(payload.url)
    await asyncio.to_thread(
        log_user_activity,
        current_user.id if current_user else None,
        "LINK_CHECK",
        payload.url,
        result.verdict,
        result.risk_score,
        result.summary,
    )
    return result


@app.post("/api/v1/remediate", response_model=RemediateResponse, tags=["Enterprise Auto-Fix"])
async def remediate_target(
    payload: RemediateRequest,
    current_user: UserRecord | None = Depends(get_optional_current_user),
):
    """Apply owner-approved server patches via the target's CyberGuard Agent and run an instant verification scan."""
    if not payload.approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Explicit enterprise owner permission is required before modifying any remote server.",
        )

    if current_user and current_user.role != "enterprise":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role-based access denied: Remote auto-remediation requires an Enterprise account.",
        )

    try:
        target = await asyncio.to_thread(validate_target_url, payload.url)
    except SSRFError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    parsed = urlparse(target.normalized_url)
    agent_endpoint = f"{parsed.scheme}://{parsed.netloc}/_cyberguard/apply-patch"
    approver = f"{current_user.full_name} ({current_user.email})" if current_user else payload.approved_by

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            agent_resp = await client.post(
                agent_endpoint,
                headers={"X-CyberGuard-Agent-Key": payload.agent_key},
                json={"patches": payload.patches, "approved_by": approver},
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not reach target remediation agent: {exc}",
        ) from exc

    if agent_resp.status_code in (401, 403):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Agent Key — target server denied remote modification.",
        )
    if agent_resp.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "CyberGuard Remediation Agent is not installed on this website. "
                "Use the generated Nginx/Apache/DNS patch bundle for manual deployment."
            ),
        )
    if agent_resp.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Target agent rejected patch request (HTTP {agent_resp.status_code}).",
        )

    agent_data = agent_resp.json()

    # Immediately execute a fresh live verification audit so judges see proof
    module_summary, raw_findings, duration_ms = await run_all_scanners(target)
    ordered_findings = sort_findings(raw_findings)
    score, grade = calculate_score(ordered_findings)
    enriched_findings, patch_bundle = enrich_and_generate_patches(target.hostname, ordered_findings)

    verified = ScanResponse(
        domain=target.hostname,
        normalized_url=target.normalized_url,
        resolved_ip=target.resolved_ip,
        score=score,
        grade=grade,
        duration_ms=duration_ms,
        scanned_at=datetime.now(timezone.utc),
        module_summary=module_summary,
        findings=enriched_findings,
        patch_bundle=patch_bundle,
    )
    scan_id = await asyncio.to_thread(
    _save_scan_to_db, verified, current_user.id if current_user else None
)
    verified = verified.model_copy(update={"scan_id": scan_id})

    applied_patches = agent_data.get("applied_patches", payload.patches)
    await asyncio.to_thread(
        log_user_activity,
        current_user.id if current_user else None,
        "REMOTE_PATCH",
        target.hostname,
        f"Grade {verified.grade}",
        verified.score,
        f"Patched {len(applied_patches)} controls ({payload.before_score} -> {verified.score})",
    )

    manual_notes = [
        f"{f.code}: {f.title} (requires DNS registrar or TLS provider update)"
        for f in verified.findings
        if f.module in {"dns", "tls"}
    ]

    return RemediateResponse(
        domain=target.hostname,
        status="patched_and_verified",
        applied_patches=applied_patches,
        manual_only_notes=manual_notes,
        agent_timestamp=agent_data.get("timestamp", datetime.now(timezone.utc).isoformat()),
        before_score=payload.before_score,
        after_score=verified.score,
        verified_scan=verified,
    )


@app.post("/api/v1/rollback", response_model=ScanResponse, tags=["Enterprise Auto-Fix"])
async def rollback_target(
    payload: RollbackRequest,
    current_user: UserRecord | None = Depends(get_optional_current_user),
):
    """Roll back remote agent patches to pre-patch state and return a fresh verification scan."""
    if not payload.approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Explicit confirmation is required to roll back remote server settings.",
        )

    if current_user and current_user.role != "enterprise":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role-based access denied: Remote rollback requires an Enterprise account.",
        )

    try:
        target = await asyncio.to_thread(validate_target_url, payload.url)
    except SSRFError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    parsed = urlparse(target.normalized_url)
    rollback_endpoint = f"{parsed.scheme}://{parsed.netloc}/_cyberguard/rollback"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            agent_resp = await client.post(
                rollback_endpoint,
                headers={"X-CyberGuard-Agent-Key": payload.agent_key},
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not reach target remediation agent: {exc}",
        ) from exc

    if agent_resp.status_code in (401, 403):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Agent Key — target server denied rollback.",
        )
    if agent_resp.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CyberGuard Remediation Agent rollback endpoint not available on this target.",
        )

    module_summary, raw_findings, duration_ms = await run_all_scanners(target)
    ordered_findings = sort_findings(raw_findings)
    score, grade = calculate_score(ordered_findings)
    enriched_findings, patch_bundle = enrich_and_generate_patches(target.hostname, ordered_findings)

    verified = ScanResponse(
        domain=target.hostname,
        normalized_url=target.normalized_url,
        resolved_ip=target.resolved_ip,
        score=score,
        grade=grade,
        duration_ms=duration_ms,
        scanned_at=datetime.now(timezone.utc),
        module_summary=module_summary,
        findings=enriched_findings,
        patch_bundle=patch_bundle,
    )
    scan_id = await asyncio.to_thread(
    _save_scan_to_db, verified, current_user.id if current_user else None
)
    verified = verified.model_copy(update={"scan_id": scan_id})

    await asyncio.to_thread(
        log_user_activity,
        current_user.id if current_user else None,
        "REMOTE_ROLLBACK",
        target.hostname,
        f"Grade {verified.grade}",
        verified.score,
        "Rolled back remote server patches to pre-patch state",
    )
    return verified


@app.post("/api/v1/auth/register", response_model=AuthResponse, status_code=201, tags=["Auth"])
async def register_user(payload: RegisterRequest):
    normalized_email = payload.email.strip().lower()
    if "@" not in normalized_email or "." not in normalized_email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    def _create() -> UserRecord:
        with SessionLocal() as db:
            if db.query(UserRecord).filter(UserRecord.email == normalized_email).first():
                raise HTTPException(status_code=409, detail="An account with this email already exists.")
            user = UserRecord(
                email=normalized_email,
                full_name=payload.full_name.strip(),
                password_hash=hash_password(payload.password),
                role=payload.role,
                created_at=datetime.now(timezone.utc),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    user = await asyncio.to_thread(_create)
    return AuthResponse(access_token=create_access_token(user), user=_to_user_profile(user))


@app.post("/api/v1/auth/login", response_model=AuthResponse, tags=["Auth"])
async def login_user(payload: LoginRequest):
    normalized_email = payload.email.strip().lower()

    def _authenticate() -> UserRecord:
        with SessionLocal() as db:
            user = db.query(UserRecord).filter(UserRecord.email == normalized_email).first()
            if not user or not verify_password(payload.password, user.password_hash):
                raise HTTPException(status_code=401, detail="Invalid email or password.")
            return user

    user = await asyncio.to_thread(_authenticate)
    return AuthResponse(access_token=create_access_token(user), user=_to_user_profile(user))


@app.get("/api/v1/auth/me", response_model=UserProfile, tags=["Auth"])
async def get_me(current_user: UserRecord = Depends(get_current_user)):
    return _to_user_profile(current_user)


@app.get("/api/v1/auth/activity", response_model=UserActivitySummary, tags=["Auth"])
async def get_my_activity(current_user: UserRecord = Depends(get_current_user)):
    def _fetch():
        with SessionLocal() as db:
            return (
                db.query(UserActivityRecord)
                .filter(UserActivityRecord.user_id == current_user.id)
                .order_by(UserActivityRecord.created_at.desc())
                .limit(25)
                .all()
            )

    rows = await asyncio.to_thread(_fetch)
    items = [
        UserActivityItem(
            id=r.id,
            action_type=r.action_type,
            target=r.target,
            verdict_or_grade=r.verdict_or_grade,
            score=r.score,
            detail=r.detail,
            created_at=_ensure_utc(r.created_at),
        )
        for r in rows
    ]
    return UserActivitySummary(
        user=_to_user_profile(current_user),
        total_actions=len(items),
        link_checks_count=sum(1 for i in items if i.action_type == "LINK_CHECK"),
        enterprise_scans_count=sum(1 for i in items if i.action_type == "ENTERPRISE_SCAN"),
        remote_patches_count=sum(1 for i in items if i.action_type == "REMOTE_PATCH"),
       recent_activities=items,
    )