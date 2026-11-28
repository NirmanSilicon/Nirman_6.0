"""Idempotent seeding of reference tables.  `python -m app.seed [--force]`"""
import sys
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
    if force or empty(m.Recycler):
        db.query(m.Recycler).delete()
        db.add_all(m.Recycler(name=n, cpcb_reg_no=reg, address=a, city=c, state=s, lat=la, lng=ln,
                              geom=point(la, ln), phone=ph, accepts=acc, verified=False, source=d.SAMPLE)
                   for n, reg, a, c, s, la, ln, ph, acc in d.RECYCLERS)
    db.commit()


if __name__ == "__main__":
    from ..db import SessionLocal, init_db

    init_db()
    with SessionLocal() as s:
        seed(s, force="--force" in sys.argv)
    print("seeded")
