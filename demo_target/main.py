from datetime import datetime, timezone
import os
from typing import Dict, List
from fastapi import FastAPI, Header, HTTPException, Response, status
from fastapi.responses import HTMLResponse, PlainTextResponse, RedirectResponse
from pydantic import BaseModel, Field

app = FastAPI(title="Sharma Artisan Bakery (CyberGuard Enterprise Demo Target)")

# Scoped authorization token shared only with the site owner for remote remediation
AGENT_KEY = os.getenv("CYBERGUARD_AGENT_KEY", "cg-demo-sharma-2026")

DEFAULT_PATCH_STATE: Dict[str, bool] = {
    "hsts": False,
    "csp": False,
    "security_headers": False,
    "secure_cookies": False,
    "block_dotenv": False,
    "hide_banner": False,
    "fix_html": False,
}

PATCH_STATE: Dict[str, bool] = dict(DEFAULT_PATCH_STATE)
AUDIT_LOG: List[Dict[str, str]] = []


class AgentPatchRequest(BaseModel):
    patches: List[str] = Field(..., min_length=1)
    approved_by: str = Field(default="Enterprise Owner")


def _verify_agent_key(x_cyberguard_agent_key: str | None) -> None:
    if not x_cyberguard_agent_key or x_cyberguard_agent_key != AGENT_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing CyberGuard Agent Key. Remote modification denied.",
        )


def _apply_headers(response: Response) -> None:
    if PATCH_STATE["hsts"]:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if PATCH_STATE["csp"]:
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'self';"
        )
    if PATCH_STATE["security_headers"]:
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    if not PATCH_STATE["hide_banner"]:
        response.headers["X-Powered-By"] = "PHP/7.2.34-legacy"

    if PATCH_STATE["secure_cookies"]:
        response.set_cookie(
            key="bakery_session",
            value="demo_session_token",
            httponly=True,
            secure=True,
            samesite="lax",
        )
    else:
        response.set_cookie(
            key="bakery_session",
            value="demo_session_token",
            httponly=False,
            secure=False,
        )


@app.get("/", response_class=HTMLResponse)
async def homepage():
    active_count = sum(1 for v in PATCH_STATE.values() if v)
    total_count = len(PATCH_STATE)
    all_hardened = active_count == total_count
    status_color = "#15803d" if all_hardened else ("#b45309" if active_count > 0 else "#b91c1c")
    status_label = (
        f"HARDENED ({active_count}/{total_count} Server Controls Active)"
        if all_hardened
        else f"VULNERABLE ({active_count}/{total_count} Server Controls Active)"
    )

    form_action = "/order" if PATCH_STATE["fix_html"] else "http://sharma-bakery.example/order"
    mixed_script = "" if PATCH_STATE["fix_html"] else '<script src="http://cdn.sharma-bakery.example/promo.js"></script>'

    badges = "".join(
        f'<span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;margin:3px;'
        f'background:{"#dcfce7" if enabled else "#fee2e2"};color:{"#166534" if enabled else "#991b1b"};'
        f'font-weight:600;">{name}: {"ON" if enabled else "OFF"}</span>'
        for name, enabled in PATCH_STATE.items()
    )

    log_items = (
        "".join(
            f"<li><code>{entry['timestamp']}</code> — <strong>{entry['action']}</strong> "
            f"({entry['detail']}) by {entry['actor']}</li>"
            for entry in reversed(AUDIT_LOG[-6:])
        )
        if AUDIT_LOG
        else "<li style='color:#64748b;'>No remote patches applied yet.</li>"
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sharma Artisan Bakery — MSME Enterprise Demo Target</title>
  {mixed_script}
</head>
<body style="font-family: system-ui, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 20px; color: #0f172a;">
  <h1>Sharma Artisan Bakery</h1>
  <p>Authorized MSME demo target running the <strong>CyberGuard Remediation Agent</strong>.</p>

  <div style="border: 1px solid #cbd5e1; border-radius: 10px; padding: 18px; margin: 20px 0; background: #f8fafc;">
    <div><strong>Server Posture:</strong> <span style="color: {status_color}; font-weight: 700;">{status_label}</span></div>
    <div style="margin-top: 8px; font-size: 13px; color: #334155;">
      <strong>Owner Agent Key (for CyberGuard Remote Auto-Fix):</strong>
      <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">{AGENT_KEY}</code>
    </div>
    <div style="margin-top: 12px;">{badges}</div>
    <form method="post" action="/reset-demo" style="margin-top: 14px;">
      <button type="submit" style="padding: 7px 14px; background: #475569; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
        Reset All Controls to Vulnerable Mode
      </button>
    </form>
  </div>

  <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0;">
    <h3 style="margin-top:0;">Live CyberGuard Remote Audit Log</h3>
    <ul style="font-size: 13px; line-height: 1.7; padding-left: 18px; margin-bottom: 0;">{log_items}</ul>
  </div>

  <h2>Quick Cake Order Inquiry</h2>
  <form method="post" action="{form_action}" style="display: grid; gap: 10px; max-width: 360px;">
    <input type="text" name="customer" placeholder="Customer Name" />
    <input type="email" name="email" placeholder="Email Address" />
    <button type="button" style="padding: 8px; cursor: pointer;">Submit Inquiry (Demo Only)</button>
  </form>
</body>
</html>"""

    resp = HTMLResponse(content=html)
    _apply_headers(resp)
    return resp


@app.post("/reset-demo")
async def reset_demo_form():
    PATCH_STATE.update(DEFAULT_PATCH_STATE)
    AUDIT_LOG.append({
        "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S UTC"),
        "action": "MANUAL_RESET",
        "detail": "Reset to vulnerable baseline",
        "actor": "Demo Console",
    })
    return RedirectResponse(url="/", status_code=303)


@app.get("/_cyberguard/status")
async def agent_status():
    return {
        "agent": "cyberguard-msme-agent",
        "version": "1.0.0",
        "patches": PATCH_STATE,
        "audit_log": AUDIT_LOG[-10:],
    }


@app.post("/_cyberguard/apply-patch")
async def agent_apply_patch(
    payload: AgentPatchRequest,
    x_cyberguard_agent_key: str | None = Header(default=None),
):
    _verify_agent_key(x_cyberguard_agent_key)
    applied: List[str] = []
    for patch_name in payload.patches:
        if patch_name in PATCH_STATE:
            PATCH_STATE[patch_name] = True
            applied.append(patch_name)

    now_iso = datetime.now(timezone.utc).isoformat()
    AUDIT_LOG.append({
        "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S UTC"),
        "action": "REMOTE_PATCH_APPLIED",
        "detail": ", ".join(applied) if applied else "none",
        "actor": payload.approved_by,
    })
    return {
        "status": "applied",
        "applied_patches": applied,
        "timestamp": now_iso,
        "current_state": PATCH_STATE,
    }


@app.post("/_cyberguard/rollback")
async def agent_rollback(
    x_cyberguard_agent_key: str | None = Header(default=None),
):
    _verify_agent_key(x_cyberguard_agent_key)
    PATCH_STATE.update(DEFAULT_PATCH_STATE)
    now_iso = datetime.now(timezone.utc).isoformat()
    AUDIT_LOG.append({
        "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S UTC"),
        "action": "REMOTE_ROLLBACK",
        "detail": "Restored pre-patch configuration",
        "actor": "CyberGuard Enterprise Console",
    })
    return {
        "status": "rolled_back",
        "timestamp": now_iso,
        "current_state": PATCH_STATE,
    }


@app.get("/.env")
async def simulated_env_leak():
    if PATCH_STATE["block_dotenv"]:
        return PlainTextResponse("404 Not Found", status_code=404)

    dummy_env = (
        "# CYBERGUARD DEMO SIMULATION ONLY - NOT REAL CREDENTIALS\n"
        "APP_ENV=production\n"
        "DB_HOST=db.sharma-bakery.internal\n"
        "DB_USER=bakery_admin\n"
        "DEMO_PLACEHOLDER_KEY=cyberguard_test_token_12345\n"
    )
    return PlainTextResponse(content=dummy_env, media_type="text/plain")
