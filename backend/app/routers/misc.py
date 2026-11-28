import re

from fastapi import APIRouter, Depends, HTTPException, Query
from geoalchemy2 import Geography
from sqlalchemy import cast, func, select, update
from sqlalchemy.orm import Session

from .. import models as m
from ..config import Settings, get_settings
from ..db import get_db
from ..deps import current_user
from ..services import inference, otp, storage, tables

router = APIRouter(prefix="/v1")


@router.get("/recyclers", tags=["recyclers"])
def recyclers(
    lat: float = Query(..., ge=-90, le=90), lng: float = Query(..., ge=-180, le=180),
    radius: float = Query(100, gt=0, le=2000, description="km"),
    accepts: str | None = Query(None, description="e.g. RAM, PCB, motherboard"),
    limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db),
):
    """Nearest authorised recyclers (PostGIS). If none inside `radius`, returns the nearest few with `expanded=true`."""
    here = cast(func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326), Geography)
    dist = (func.ST_Distance(m.Recycler.geom, here) / 1000).label("distance_km")
    base = select(m.Recycler, dist)
    if accepts:
        base = base.where(m.Recycler.accepts.any(accepts))
    rows = db.execute(base.where(func.ST_DWithin(m.Recycler.geom, here, radius * 1000)).order_by(dist).limit(limit)).all()
    expanded = False
    if not rows:
        rows = db.execute(base.order_by(dist).limit(min(limit, 5))).all()
        expanded = bool(rows)
    return {"radius_km": radius, "expanded": expanded, "items": [
        {"id": r.id, "name": r.name, "cpcb_reg_no": r.cpcb_reg_no, "address": r.address, "city": r.city,
         "state": r.state, "lat": r.lat, "lng": r.lng, "phone": r.phone, "accepts": r.accepts,
         "verified": r.verified, "distance_km": round(d, 1)} for r, d in rows]}


@router.get("/prices", tags=["transparency"])
def prices(db: Session = Depends(get_db)):
    """All tables behind every ₹ figure (PRD s6.3 Explainability)."""
    t = tables.load(db)
    return {
        "as_of": t["as_of"].isoformat() if t["as_of"] else None,
        "prices": [{"item": k, **{kk: (vv.isoformat() if hasattr(vv, "isoformat") else vv) for kk, vv in v.items()}}
                   for k, v in t["prices"].items()],
        "materials": [{"board_type": b, **row} for b, rows in t["materials"].items() for row in rows],
        "route_params": [{"route": k, **v} for k, v in t["route_params"].items()],
        "route_ratings": t["ratings"], "weights": t["presets"],
    }


PHONE = re.compile(r"^\+?\d{10,15}$")


def _phone(raw: str) -> str:
    p = re.sub(r"[\s-]", "", raw)
    if not PHONE.match(p):
        raise HTTPException(422, "Invalid phone number")
    return p if p.startswith("+") else (f"+91{p}" if len(p) == 10 else f"+{p}")


@router.post("/auth/otp/request", tags=["auth"])
def otp_request(body: dict, db: Session = Depends(get_db), s: Settings = Depends(get_settings)):
    phone = _phone(str(body.get("phone", "")))
    code = otp.request_code(db, phone, s)
    return {"sent": True, **({"dev_code": code} if s.is_dev else {})}


@router.post("/auth/otp/verify", tags=["auth"])
def otp_verify(body: dict, db: Session = Depends(get_db), s: Settings = Depends(get_settings),
               device: m.User | None = Depends(current_user)):
    phone, code = _phone(str(body.get("phone", ""))), str(body.get("code", ""))
    otp.verify_code(db, phone, code, s)
    user = db.scalars(select(m.User).where(m.User.phone == phone)).first()
    if not user:
        user = m.User(phone=phone, language=(device.language if device else "en"))
        db.add(user)
        db.flush()
    if device and device.phone is None and device.id != user.id:  # adopt anonymous history
        db.execute(update(m.Scan).where(m.Scan.user_id == device.id).values(user_id=user.id))
    db.commit()
    return {"token": otp.make_token(user.id, s), "user": {"id": user.id, "phone": user.phone, "role": user.role, "language": user.language}}


@router.get("/me", tags=["auth"])
def me(user: m.User | None = Depends(current_user)):
    if not user:
        return {"user": None}
    return {"user": {"id": user.id, "phone": user.phone, "role": user.role, "language": user.language, "anonymous": user.phone is None}}


@router.patch("/me", tags=["auth"])
def update_me(body: dict, db: Session = Depends(get_db), user: m.User | None = Depends(current_user)):
    if not user:
        raise HTTPException(401, "Send X-Device-Id or log in")
    if body.get("language") in ("en", "hi"):
        user.language = body["language"]
    if body.get("role") in ("aggregator", "recycler", "refurbisher"):
        user.role = body["role"]
    db.commit()
    return me(user)


@router.get("/status", tags=["meta"])
def status(s: Settings = Depends(get_settings)):
    return {"inference": inference.healthy(s), "storage": storage.healthy()}
