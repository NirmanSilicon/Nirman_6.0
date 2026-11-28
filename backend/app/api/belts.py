"""Belts and their QR pages.

Every physical belt carries one or more printed QR labels. A label encodes a
fixed URL -- ``<dashboard>/#/b/<belt id>?tag=<n>`` -- and never changes; what
it shows is whatever that belt's pipeline is doing at the moment it is scanned.
The ``/live`` route below is the single call that page makes.

Reading is open, because a label on a belt is scanned by whoever is standing
there. Changing belts is the dashboard's job, the same as starting a stream.
"""
from __future__ import annotations

import asyncio
import logging
import re
import time

from fastapi import APIRouter, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from psycopg.errors import UniqueViolation
from pydantic import BaseModel, Field

from ..analytics import forecast as forecast_model
from ..analytics import reliability
from ..pipeline.session import DEFAULT_BELT, manager
from ..pipeline.types import CLASS_LABELS
from ..sources import SourceError
from ..store.db import get_db

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/belts", tags=["belts"])

# What is printed on the label, so kept short, upper-case and URL-safe.
_ID = re.compile(r"^[A-Z0-9][A-Z0-9_-]{0,31}$")
MAX_TAGS = 50
RECENT_LIMIT = 12


class BeltCreate(BaseModel):
    id: str | None = Field(None, description="Leave empty for the next BELT-NN")
    name: str = Field(..., min_length=1, max_length=80)
    location: str = Field("", max_length=120)
    source_uri: str = Field("", max_length=500)
    tags: int = Field(1, ge=1, le=MAX_TAGS)


class BeltPatch(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=80)
    location: str | None = Field(None, max_length=120)
    source_uri: str | None = Field(None, max_length=500)
    tags: int | None = Field(None, ge=1, le=MAX_TAGS)


class BeltStart(BaseModel):
    uri: str | None = None


def _next_id(existing: list[dict]) -> str:
    taken = {b["id"] for b in existing}
    n = 1
    while f"BELT-{n:02d}" in taken:
        n += 1
    return f"BELT-{n:02d}"


def _runtime(belt_id: str) -> dict:
    """The belt's pipeline state, whether or not anything is running."""
    session = manager.get(belt_id)
    if session is None or not session.running:
        return {"running": False, "open_incidents": 0, "source": None}
    status = session.status()
    return {
        "running": True,
        "open_incidents": status.get("open_incidents", 0),
        "source": status.get("label"),
        "inference_fps": status.get("inference_fps"),
        "uptime": status.get("uptime"),
    }


async def _require(belt_id: str) -> dict:
    belt = await run_in_threadpool(get_db().get_belt, belt_id.upper())
    if belt is None:
        raise HTTPException(status_code=404, detail=f"No belt {belt_id!r}")
    return belt


# -- management ---------------------------------------------------------------

@router.get("")
async def list_belts() -> list[dict]:
    belts = await run_in_threadpool(get_db().list_belts)
    return [{**b, **_runtime(b["id"])} for b in belts]


@router.post("", status_code=201)
async def create_belt(req: BeltCreate) -> dict:
    db = get_db()
    existing = await run_in_threadpool(db.list_belts)
    belt_id = (req.id or "").strip().upper() or _next_id(existing)
    if not _ID.match(belt_id):
        raise HTTPException(
            status_code=400,
            detail="Belt id must be 1-32 characters: A-Z, 0-9, '-' or '_'")
    try:
        belt = await run_in_threadpool(
            db.create_belt, belt_id, req.name.strip(), req.location.strip(),
            req.source_uri.strip(), req.tags)
    except UniqueViolation as exc:
        raise HTTPException(status_code=409,
                            detail=f"Belt {belt_id} already exists") from exc
    return {**belt, **_runtime(belt_id)}


@router.patch("/{belt_id}")
async def update_belt(belt_id: str, req: BeltPatch) -> dict:
    await _require(belt_id)
    fields = {k: (v.strip() if isinstance(v, str) else v)
              for k, v in req.model_dump(exclude_none=True).items()}
    belt = await run_in_threadpool(get_db().update_belt, belt_id.upper(), fields)
    if belt is None:
        raise HTTPException(status_code=404, detail="Belt not found")
    return {**belt, **_runtime(belt["id"])}


@router.delete("/{belt_id}", status_code=204)
async def delete_belt(belt_id: str) -> None:
    """Remove the belt. Its incident history stays, tagged with its old id."""
    belt = await _require(belt_id)
    if manager.get(belt["id"]) is not None:
        await asyncio.to_thread(manager.stop, belt["id"])
    await run_in_threadpool(get_db().delete_belt, belt["id"])


@router.post("/{belt_id}/start")
async def start_belt(belt_id: str, req: BeltStart | None = None) -> dict:
    """Start this belt's pipeline on its saved source, or on ``uri`` if given.

    A ``uri`` given here is also saved as the belt's source, so the next start
    -- and the next restart of the server -- uses it without asking again.
    """
    belt = await _require(belt_id)
    uri = ((req.uri if req else None) or belt["source_uri"] or "").strip()
    if not uri:
        raise HTTPException(status_code=400,
                            detail="This belt has no source; choose one first")
    try:
        session = await asyncio.to_thread(manager.start, uri, belt["id"])
    except SourceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        log.exception("Failed to start belt %s", belt["id"])
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    if uri != belt["source_uri"]:
        await run_in_threadpool(get_db().update_belt, belt["id"],
                                {"source_uri": uri})
    return session.status()


@router.post("/{belt_id}/stop")
async def stop_belt(belt_id: str) -> dict:
    belt = await _require(belt_id)
    if manager.get(belt["id"]) is not None:
        await asyncio.to_thread(manager.stop, belt["id"])
    return _runtime(belt["id"])


# -- the QR page ----------------------------------------------------------------

@router.get("/{belt_id}/live")
async def belt_live(
    belt_id: str,
    hours: float = Query(8.0, ge=0.25, le=720),
) -> dict:
    """Everything the QR page shows, in one call.

    * ``in_view`` -- incidents open right now, i.e. defects on camera at this
      moment, straight from the running incident engine.
    * ``on_belt`` -- distinct defects over the window, by class. A belt is a
      loop, so this is "how many holes does this belt have", not "how many
      times did a hole go past" (docs/adr/0009).
    * ``quality`` -- the Reliability Yield for this belt alone.
    """
    belt = await _require(belt_id)
    bid = belt["id"]
    db = get_db()
    now = time.time()
    since = now - hours * 3600

    session = manager.get(bid)
    running = session is not None and session.running
    stream = session.status() if running else None
    open_now = ([{**i.to_dict(), "belt_id": bid}
                 for i in session.incidents.open_incidents] if running else [])

    rows = await run_in_threadpool(db.analytics_rows, hours, None, 20000, bid)
    frames = await run_in_threadpool(db.frame_totals, hours, None, bid)
    if running and stream is not None:
        # The live run has not written its frame counts yet; add them in.
        for key in ("frames_read", "frames_processed", "frames_skipped"):
            frames[key] = int(frames.get(key) or 0) + int(stream.get(key) or 0)

    assessed = reliability.assess(
        rows,
        observed_hours=hours,
        window_start=since,
        window_end=now,
        frames_read=int(frames.get("frames_read") or 0),
        frames_processed=int(frames.get("frames_processed") or 0),
    )
    distinct_by_class: dict[str, int] = {}
    for d in assessed["defects"]:
        distinct_by_class[d["cls"]] = distinct_by_class.get(d["cls"], 0) + 1

    in_view_by_class: dict[str, int] = {}
    for i in open_now:
        in_view_by_class[i["cls"]] = in_view_by_class.get(i["cls"], 0) + 1

    recent = await run_in_threadpool(
        db.list_incidents, RECENT_LIMIT, 0, None, None, None, bid)
    sightings = await run_in_threadpool(db.belt_class_counts, bid, since)

    return {
        "belt": belt,
        "now": now,
        "window_hours": hours,
        "online": running,
        "stream": None if stream is None else {
            "source": stream.get("label"),
            "kind": stream.get("kind"),
            "is_live": stream.get("is_live"),
            "capture_fps": stream.get("capture_fps"),
            "inference_fps": stream.get("inference_fps"),
            "inference_ms": stream.get("inference_ms"),
            "uptime": stream.get("uptime"),
            "frames_processed": stream.get("frames_processed"),
            "frames_skipped": stream.get("frames_skipped"),
            "detector": stream.get("detector"),
            "error": stream.get("error"),
        },
        "in_view": open_now,
        "in_view_by_class": in_view_by_class,
        "on_belt_by_class": distinct_by_class,
        "sightings_by_class": sightings,
        "quality": {
            "condition": assessed["condition"],
            "band": assessed["band"],
            "coverage": assessed["coverage"],
            "trend": assessed["trend"],
            "distinct_defects": assessed["distinct_defects"],
            "incident_rows": assessed["incident_rows"],
            "defects_per_hour": assessed["defects_per_hour"],
            "distinct_by_severity": assessed["distinct_by_severity"],
        },
        "worst": assessed["defects"][:5],
        "recent": recent,
        "last_incident_at": recent[0]["opened_at"] if recent else None,
        "classes": CLASS_LABELS,
    }


@router.get("/{belt_id}/forecast")
async def belt_forecast(
    belt_id: str,
    hours: float = Query(24.0, ge=0.25, le=720),
) -> dict:
    """Where this belt's condition is heading: growth, time-to-band, advice.

    ``hours`` is how much history the projection learns from. See
    analytics/forecast.py for the model and its stated limits.
    """
    belt = await _require(belt_id)
    bid = belt["id"]
    now = time.time()
    rows = await run_in_threadpool(get_db().analytics_rows, hours, None, 20000, bid)
    payload = forecast_model.forecast(rows, window_start=now - hours * 3600,
                                      window_end=now, now=now)
    session = manager.get(bid)
    running = session is not None and session.running
    payload["belt"] = belt
    payload["online"] = running
    payload["in_view"] = ([{**i.to_dict(), "belt_id": bid}
                           for i in session.incidents.open_incidents]
                          if running else [])
    payload["classes"] = CLASS_LABELS
    return payload


def ensure_default_belt() -> None:
    """Make sure the belt the legacy dashboard drives has a row of its own.

    Without it, streams started from the original Sources page would record
    incidents under a belt nobody can print a label for.
    """
    db = get_db()
    if db.get_belt(DEFAULT_BELT) is None:
        try:
            db.create_belt(DEFAULT_BELT, "Belt 1", "", "", 1)
        except UniqueViolation:
            pass
