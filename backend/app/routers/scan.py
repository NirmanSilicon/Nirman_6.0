import io
import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models as m
from ..config import Settings, get_settings
from ..db import get_db
from ..deps import current_user
from ..services import engine, inference, quality, report, storage, tables

router = APIRouter(prefix="/v1", tags=["scan"])

NOT_SURE = {
    "en": "We're not sure what this board is. Retake the photo, or treat it as generic scrap and take it to an authorised recycler.",
    "hi": "हमें यकीन नहीं कि यह कौन सा बोर्ड है। फोटो दोबारा लें, या इसे सामान्य कबाड़ मानकर अधिकृत रिसाइक्लर के पास ले जाएँ।",
}
DISCLAIMER = ("Value is an estimated range from placeholder tables, not a guarantee. "
              "Hazardous recovery steps must only be done by authorised recyclers.")


def _normalise(raw: bytes, s: Settings) -> tuple[Image.Image, bytes]:
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(400, "Not a valid image")
    img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((s.max_image_px, s.max_image_px))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=88)  # EXIF/GPS metadata is dropped here (privacy)
    return img, buf.getvalue()


@router.post("/scan")
def create_scan(
    image: Annotated[UploadFile, File()],
    consent: Annotated[bool, Form()] = False,
    lat: Annotated[float | None, Form(ge=-90, le=90)] = None,
    lng: Annotated[float | None, Form(ge=-180, le=180)] = None,
    preset: Annotated[str, Form()] = "default",
    force: Annotated[bool, Form()] = False,
    db: Session = Depends(get_db),
    user: m.User | None = Depends(current_user),
    s: Settings = Depends(get_settings),
):
    """Photo in -> detections, ₹ range, route scores out. Image kept only if `consent=true`."""
    raw = image.file.read(s.max_upload_mb * 1024 * 1024 + 1)
    if len(raw) > s.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"Image larger than {s.max_upload_mb} MB")
    img, jpeg = _normalise(raw, s)

    q = quality.check(img, s)
    if not q["ok"] and not force:
        return JSONResponse(status_code=422, content={"code": "poor_quality", "issues": q["issues"], "quality": q})

    try:
        inf = inference.predict(jpeg, s)
    except inference.InferenceError as e:
        raise HTTPException(503, f"Inference service unavailable: {e}")

    tb = tables.load(db)
    board = {"type": inf["board"].get("type"), "confidence": float(inf["board"].get("confidence", 0.0))}
    known = board["type"] in tb["materials"]
    unseen = (not known) or board["confidence"] < s.board_min_conf

    if unseen:
        ev = {"components": [], "routes_by_preset": {}, "top_route": None, "value": None,
              "recommendation": NOT_SURE["en"], "recommendation_i18n": NOT_SURE, "trace": None}
        routes, warning = [], "unseen_board"
    else:
        ev = engine.evaluate(inf["detections"], board["type"], tb, s.det_min_conf, s.reuse_min_conf)
        if preset not in ev["routes_by_preset"]:
            raise HTTPException(400, f"preset must be one of {list(ev['routes_by_preset'])}")
        routes, warning = ev["routes_by_preset"][preset], None
        top = routes[0]
        ev["top_route"] = top["route"]
        ev["value"] = {"currency": "INR", "low": top["value_range"]["low"], "high": top["value_range"]["high"],
                       "breakdown": top["breakdown"], "route": top["route"]}
        ev["recommendation"], ev["recommendation_i18n"] = top["reason"]["en"], top["reason"]

    scan_id = "scn_" + secrets.token_hex(5)
    created = m.now()
    stored = bool(consent)
    result = {
        "scan_id": scan_id, "created_at": created.isoformat(), "board": board, "warning": warning,
        "image": {"width": img.width, "height": img.height, "stored": stored},
        "quality": q, "model": inf["model"],
        "components": ev["components"],
        "detections": [{"class": d["class"], "confidence": round(d["confidence"], 3), "bbox": d["bbox"],
                        "ocr_text": d["ocr_text"]} for d in inf["detections"] if d["confidence"] >= s.det_min_conf],
        "value": ev["value"], "preset": preset, "routes": routes, "routes_by_preset": ev["routes_by_preset"],
        "recommendation": ev["recommendation"], "recommendation_i18n": ev["recommendation_i18n"],
        "trace": ev["trace"], "prices_as_of": tb["as_of"].isoformat() if tb["as_of"] else None,
        "disclaimer": DISCLAIMER,
    }

    key = f"scans/{scan_id}.jpg" if stored else None
    if stored:
        try:
            storage.put(key, jpeg)
        except Exception:
            key, result["image"]["stored"] = None, False
    comp_by_cls = {c["class"]: c["reusable"] for c in ev["components"]}
    db.add(m.Scan(
        id=scan_id, user_id=user.id if user else None, image_url=key,
        board_type=board["type"] if known else None, board_confidence=board["confidence"],
        value_low=ev["value"]["low"] if ev["value"] else None, value_high=ev["value"]["high"] if ev["value"] else None,
        top_route=ev["top_route"], lat=lat, lng=lng, consent_image=stored, result=result, created_at=created,
        detections=[m.Detection(cls=d["class"], confidence=d["confidence"], bbox=d["bbox"], ocr_text=d["ocr_text"],
                                reusable_flag=comp_by_cls.get(d["class"], False))
                    for d in inf["detections"] if d["confidence"] >= s.det_min_conf],
    ))
    db.commit()
    return result


def _get(db: Session, scan_id: str) -> m.Scan:
    sc = db.get(m.Scan, scan_id)
    if not sc:
        raise HTTPException(404, "Scan not found")
    return sc


@router.get("/scan/{scan_id}")
def get_scan(scan_id: str, db: Session = Depends(get_db)):
    return _get(db, scan_id).result


@router.delete("/scan/{scan_id}", status_code=204)
def delete_scan(scan_id: str, db: Session = Depends(get_db), user: m.User | None = Depends(current_user)):
    """DPDP right to delete: removes the record, detections and stored image."""
    sc = _get(db, scan_id)
    if sc.user_id and (not user or user.id != sc.user_id):
        raise HTTPException(403, "Not your scan")
    if sc.image_url:
        storage.delete(sc.image_url)
    db.delete(sc)
    db.commit()
    return Response(status_code=204)


@router.get("/scan/{scan_id}/image")
def scan_image(scan_id: str, db: Session = Depends(get_db)):
    sc = _get(db, scan_id)
    data = storage.get(sc.image_url) if sc.image_url else None
    if data is None:
        raise HTTPException(404, "No stored image (consent was not given)")
    return Response(data, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=3600"})


@router.get("/scan/{scan_id}/report")
def scan_report(scan_id: str, format: str = Query("png", pattern="^(png|pdf)$"), db: Session = Depends(get_db)):
    sc = _get(db, scan_id)
    img = storage.get(sc.image_url) if sc.image_url else None
    body, mime = report.render(sc.result, img, format)
    return Response(body, media_type=mime,
                    headers={"Content-Disposition": f'inline; filename="ouroboros-{scan_id}.{format}"'})


@router.get("/scans")
def list_scans(
    user: str = Query("me"), limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
    db: Session = Depends(get_db), me: m.User | None = Depends(current_user),
):
    """History for the current (anonymous-device or phone) user. `user=me` is the only accepted value."""
    if user != "me" and (not me or user != me.id):
        raise HTTPException(403, "You can only list your own scans")
    if not me:
        return {"items": [], "total": 0}
    q = select(m.Scan).where(m.Scan.user_id == me.id).order_by(m.Scan.created_at.desc())
    rows = db.scalars(q.limit(limit).offset(offset)).all()
    return {"items": [{"scan_id": r.id, "created_at": r.created_at.isoformat(), "board_type": r.board_type,
                       "board_confidence": r.board_confidence, "value_low": r.value_low, "value_high": r.value_high,
                       "top_route": r.top_route, "warning": r.result.get("warning"),
                       "recommendation": r.result.get("recommendation")} for r in rows],
            "total": db.scalar(select(func.count()).select_from(m.Scan).where(m.Scan.user_id == me.id))}
