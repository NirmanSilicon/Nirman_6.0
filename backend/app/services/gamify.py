"""Points, levels and badges. Rules are plain constants so the UI can show exactly how points are earned."""
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models as m

RULES = [
    {"id": "scan", "points": 10, "title": "Scan a board", "why": "Every scan creates a structured record for later EPR/DPP use."},
    {"id": "clear_photo", "points": 5, "title": "Clear photo", "why": "Good lighting and focus make the AI more accurate."},
    {"id": "reusable", "points": 1, "title": "Reusable part flagged (max 20 per scan)", "why": "Working chips and RAM kept out of the shredder."},
    {"id": "dropoff", "points": 50, "title": "Take it to a listed recycler", "why": "Closes the loop: the board reaches an authorised facility."},
    {"id": "streak", "points": 5, "title": "Daily streak bonus (per extra day)", "why": "Regular use builds the dataset."},
]
LEVELS = [(0, "Scout"), (100, "Sorter"), (300, "Recoverer"), (700, "Loop Keeper")]
BADGES = [
    ("first_scan", "First scan", "Scan your first board", lambda s: s["scans"] >= 1),
    ("ten_scans", "Ten boards", "Scan 10 boards", lambda s: s["scans"] >= 10),
    ("reuse_finder", "Reuse finder", "Flag a reusable part", lambda s: s["reusable_flagged"] >= 1),
    ("closed_loop", "Closed loop", "Take a board to a listed recycler", lambda s: s["dropoffs"] >= 1),
    ("streak3", "3-day streak", "Scan on 3 days in a row", lambda s: s["streak_days"] >= 3),
]


def _streak(days: set) -> int:
    if not days:
        return 0
    d = max(days)
    n = 0
    while d in days:
        n += 1
        d -= timedelta(days=1)
    return n


def impact(db: Session, user: m.User | None) -> dict:
    stats = {"scans": 0, "value_low": 0, "value_high": 0, "reusable_flagged": 0, "dropoffs": 0, "clear_photos": 0, "streak_days": 0}
    points = 0
    if user:
        scans = db.scalars(select(m.Scan).where(m.Scan.user_id == user.id)).all()
        stats["scans"] = len(scans)
        days = set()
        for s in scans:
            stats["value_low"] += s.value_low or 0
            stats["value_high"] += s.value_high or 0
            days.add(s.created_at.date())
            q = (s.result or {}).get("quality", {})
            clear = bool(q.get("ok"))
            stats["clear_photos"] += clear
            flagged = sum(c.get("reusable_confident", 0) or 0 for c in (s.result or {}).get("components", []))
            stats["reusable_flagged"] += flagged
            points += 10 + (5 if clear else 0) + min(20, flagged)
        stats["dropoffs"] = db.scalar(select(func.count()).select_from(m.Dropoff).where(m.Dropoff.user_id == user.id)) or 0
        stats["streak_days"] = _streak(days)
        points += 50 * stats["dropoffs"] + 5 * max(0, stats["streak_days"] - 1)
    idx = max(i for i, (t, _) in enumerate(LEVELS) if points >= t)
    nxt = LEVELS[idx + 1][0] if idx + 1 < len(LEVELS) else None
    lo = LEVELS[idx][0]
    return {
        "points": points,
        "level": {"index": idx, "name": LEVELS[idx][1], "floor": lo, "next_at": nxt,
                  "progress": 1.0 if nxt is None else round((points - lo) / (nxt - lo), 3)},
        "stats": {**stats, "value_low": round(stats["value_low"]), "value_high": round(stats["value_high"])},
        "badges": [{"id": i, "title": t, "desc": d, "earned": bool(f(stats))} for i, t, d, f in BADGES],
        "rules": RULES, "levels": [{"at": a, "name": n} for a, n in LEVELS],
    }
