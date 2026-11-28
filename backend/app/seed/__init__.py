"""Idempotent seeding of reference tables.  `python -m app.seed [--force]`"""
import csv
import sys
from pathlib import Path
from datetime import datetime, timezone

from geoalchemy2 import WKTElement
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models as m
from . import data as d


def point(lat: float, lng: float) -> WKTElement:
    return WKTElement(f"POINT({lng} {lat})", srid=4326)


def seed(db: Session, force: bool = False) -> None:
    ts = datetime.now(timezone.utc)

    def empty(model) -> bool:
        return db.scalar(select(model.id if hasattr(model, "id") else model.route).limit(1)) is None

    if force or empty(m.MaterialTable):
        db.query(m.MaterialTable).delete()
        db.add_all(m.MaterialTable(board_type=b, metal=me, grams_low=lo, grams_high=hi, source=s)
                   for b, me, lo, hi, s in d.MATERIALS)
    if force or empty(m.PriceTable):
        db.query(m.PriceTable).delete()
        db.add_all(m.PriceTable(item=i, unit=u, price_low=lo, price_high=hi, reuse_prob_low=pl,
                                reuse_prob_high=ph, source=s, updated_at=ts)
                   for i, u, lo, hi, pl, ph, s in d.PRICES)
    if force or empty(m.RouteParam):
        db.query(m.RouteParam).delete()
        db.add_all(m.RouteParam(route=r, reuse_factor=rf, metal_recovery=mr, cost_low=cl, cost_high=ch, source=s)
                   for r, rf, mr, cl, ch, s in d.ROUTE_PARAMS)
    if force or empty(m.RouteRule):
        db.query(m.RouteRule).delete()
        db.add_all(m.RouteRule(route=r, criterion=c, weight=d.DEFAULT_WEIGHTS[c], rating=rt, formula_ref=f)
                   for r, c, rt, f in d.ROUTE_RATINGS)
    sample_only = db.scalar(select(m.Recycler.id).where(~m.Recycler.cpcb_reg_no.like("SAMPLE-%")).limit(1)) is None
    if force or sample_only:  # replace placeholder rows with the real CPCB-list dataset
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


if __name__ == "__main__":
    from ..db import SessionLocal, init_db

    init_db()
    with SessionLocal() as s:
        seed(s, force="--force" in sys.argv)
    print("seeded")
