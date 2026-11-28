"""Idempotent seeding of reference tables.  `python -m app.seed [--force]`"""
import csv
import sys
from pathlib import Path
from datetime import datetime, timezone

from geoalchemy2 import WKTElement
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models as m
from . import data as d


def point(lat: float, lng: float) -> WKTElement:
    return WKTElement(f"POINT({lng} {lat})", srid=4326)


def seed(db: Session, force: bool = False) -> None:
    ts = datetime.now(timezone.utc)

    def empty(model) -> bool:
        return db.scalar(select(model.id if hasattr(model, "id") else model.route).limit(1)) is None

    # Materials and prices are upserted on every start: backend/app/seed/data.py is the source of truth.
    have = {(r.board_type, r.metal): r for r in db.query(m.MaterialTable)}
    for b, me, lo, hi, src in d.MATERIALS:
        r = have.get((b, me)) or m.MaterialTable(board_type=b, metal=me)
        r.grams_low, r.grams_high, r.source = lo, hi, src
        db.add(r)
    have_p = {r.item: r for r in db.query(m.PriceTable)}
    for i, u, lo, hi, pl, ph, src in d.PRICES:
        r = have_p.get(i)
        if r is None:
            r = m.PriceTable(item=i, updated_at=ts)
        elif force or (r.price_low, r.price_high, r.source) != (lo, hi, src):
            r.updated_at = ts
        r.unit, r.price_low, r.price_high, r.reuse_prob_low, r.reuse_prob_high, r.source = u, lo, hi, pl, ph, src
        cls = i.split(":", 1)[1] if i.startswith("reuse:") else None
        if cls in d.PRESENCE_COUNTS:
            r.presence_count_low, r.presence_count_high = d.PRESENCE_COUNTS[cls]
        db.add(r)
    if force or empty(m.RouteParam):
        db.query(m.RouteParam).delete()
        db.add_all(m.RouteParam(route=r, reuse_factor=rf, metal_recovery=mr, cost_low=cl, cost_high=ch, source=s)
                   for r, rf, mr, cl, ch, s in d.ROUTE_PARAMS)
    if force or empty(m.RouteRule):
        db.query(m.RouteRule).delete()
        db.add_all(m.RouteRule(route=r, criterion=c, weight=d.DEFAULT_WEIGHTS[c], rating=rt, formula_ref=f)
                   for r, c, rt, f in d.ROUTE_RATINGS)
    sample_only = db.scalar(select(m.Recycler.id).where(~m.Recycler.cpcb_reg_no.like("SAMPLE-%")).limit(1)) is None
    with open(CSV, newline="", encoding="utf-8") as f:
        wanted = sum(1 for r in csv.DictReader(f) if r.get("lat") and r.get("lng"))
    have_n = db.scalar(select(func.count()).select_from(m.Recycler)) or 0
    if force or sample_only or have_n != wanted:  # keep the table in sync with the CPCB-list dataset
        load_recyclers_csv(db, CSV)
    db.commit()


CSV = Path(__file__).with_name("recyclers.csv")


def load_recyclers_csv(db: Session, path: Path) -> int:
    """Replace the recycler table from a CSV (see scripts/build_recyclers.py). Rows without coordinates are skipped."""
    db.query(m.Recycler).delete()
    n = 0
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if not r.get("lat") or not r.get("lng"):
                continue
            lat, lng = float(r["lat"]), float(r["lng"])
            db.add(m.Recycler(
                name=r["name"], cpcb_reg_no=r.get("cpcb_reg_no", ""), address=r["address"], city=r.get("city", ""),
                state=r["state"], lat=lat, lng=lng, geom=point(lat, lng), phone=r.get("phone") or None,
                accepts=[a for a in r.get("accepts", "").split("|") if a], verified=r.get("verified") == "true",
                source=r.get("source", ""), capacity_mta=float(r["capacity_mta"]) if r.get("capacity_mta") else None,
                geocode_level=r.get("geocode_level") or None, list_date=r.get("list_date") or None,
                source_url=r.get("source_url") or None, validity_note=r.get("validity_note") or None))
            n += 1
    return n

