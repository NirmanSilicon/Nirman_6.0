"""Replace the recycler table from a CSV of the geocoded CPCB list.

Columns: name,cpcb_reg_no,address,city,state,lat,lng,phone,accepts   (accepts separated by '|')
Usage:   python -m app.seed.import_recyclers recyclers.csv
"""
import csv
import sys

from ..db import SessionLocal, init_db
from ..models import Recycler
from . import point


def main(path: str) -> None:
    init_db()
    with SessionLocal() as db, open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
        db.query(Recycler).delete()
        for r in rows:
            lat, lng = float(r["lat"]), float(r["lng"])
            db.add(Recycler(name=r["name"], cpcb_reg_no=r["cpcb_reg_no"], address=r["address"],
                            city=r.get("city", ""), state=r.get("state", ""), lat=lat, lng=lng,
                            geom=point(lat, lng), phone=r.get("phone") or None,
                            accepts=[a for a in r.get("accepts", "").split("|") if a],
                            verified=True, source="CPCB list import"))
        db.commit()
    print(f"imported {len(rows)} recyclers")


if __name__ == "__main__":
    main(sys.argv[1])
