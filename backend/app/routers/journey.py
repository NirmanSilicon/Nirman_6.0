"""Journey endpoints: impact/gamification, drop-off logging, structured scan record (EPR/DPP-ready), model status."""
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models as m
from ..config import Settings, get_settings
from ..db import get_db
from ..deps import current_user
from ..services import gamify, inference

router = APIRouter(prefix="/v1", tags=["journey"])


@router.get("/me/impact")
def my_impact(db: Session = Depends(get_db), user: m.User | None = Depends(current_user)):
    return gamify.impact(db, user)


class DropoffIn(BaseModel):
    scan_id: str
    recycler_id: int


@router.post("/dropoffs")
def create_dropoff(body: DropoffIn, db: Session = Depends(get_db), user: m.User | None = Depends(current_user)):
    """User says they took this scan's board to this recycler. One per scan; points are awarded by the rules in /me/impact."""
    sc, rc = db.get(m.Scan, body.scan_id), db.get(m.Recycler, body.recycler_id)
    if not sc or not rc:
        raise HTTPException(404, "Scan or recycler not found")
    if sc.user_id and (not user or sc.user_id != user.id):
        raise HTTPException(403, "Not your scan")
    if db.scalars(select(m.Dropoff).where(m.Dropoff.scan_id == sc.id)).first():
        raise HTTPException(409, "Already recorded for this scan")
    db.add(m.Dropoff(scan_id=sc.id, recycler_id=rc.id, user_id=user.id if user else None))
    db.commit()
    return {"ok": True, "points_awarded": 50, "recycler": rc.name}


@router.get("/dropoffs")
def my_dropoffs(db: Session = Depends(get_db), user: m.User | None = Depends(current_user)):
    if not user:
        return {"items": []}
    rows = db.execute(select(m.Dropoff, m.Recycler).join(m.Recycler, m.Recycler.id == m.Dropoff.recycler_id)
                      .where(m.Dropoff.user_id == user.id).order_by(m.Dropoff.created_at.desc())).all()
    return {"items": [{"scan_id": d.scan_id, "recycler_id": r.id, "recycler": r.name, "created_at": d.created_at.isoformat()} for d, r in rows]}


@router.get("/scan/{scan_id}/record")
def scan_record(scan_id: str, db: Session = Depends(get_db)):
    """Structured per-board record for EPR / Digital Product Passport pipelines (schema is versioned and provisional)."""
    sc = db.get(m.Scan, scan_id)
    if not sc:
        raise HTTPException(404, "Scan not found")
    d = db.scalars(select(m.Dropoff).where(m.Dropoff.scan_id == scan_id)).first()
    rc = db.get(m.Recycler, d.recycler_id) if d else None
    r = sc.result
    return {
        "schema": "ouroboros.scan-record/v0",
        "scan_id": sc.id, "created_at": sc.created_at.isoformat(),
        "board": r["board"], "components": r["components"],
        "valuation": {"currency": "INR", "range": r["value"], "prices_as_of": r.get("prices_as_of"), "method": "tables+rules; see /v1/prices"},
        "recommended_route": sc.top_route,
        "model": r.get("model"),
        "custody": None if not rc else {
            "recycler": rc.name, "listing": rc.source, "list_date": rc.list_date, "source_url": rc.source_url,
            "reported_by": "user", "reported_at": d.created_at.isoformat(), "independently_verified": False},
        "notes": "User-reported hand-over; not a regulatory certificate. Verify the recycler on the CPCB EPR portal / state board.",
    }


@router.get("/system")
def system(s: Settings = Depends(get_settings)):
    """Shows what is plugged in: lets the UI explain where trained models will connect."""
    info = {"reachable": False}
    try:
        info = {"reachable": True, **httpx.get(f"{s.inference_url}/info", timeout=3).json()}
    except Exception:
        pass
    return {"inference": info, "contract": "POST /predict multipart image -> board + detections (see inference/README.md)"}
