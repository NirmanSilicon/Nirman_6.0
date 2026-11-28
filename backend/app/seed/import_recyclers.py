"""Replace the recycler table from a CSV of the geocoded CPCB list.

Columns: see scripts/build_recyclers.py (name,cpcb_reg_no,address,city,state,lat,lng,phone,accepts,capacity_mta,...)
Usage:   python -m app.seed.import_recyclers recyclers.csv
"""
import sys
from pathlib import Path

from ..db import SessionLocal, init_db
from . import load_recyclers_csv


def main(path: str) -> None:
    init_db()
    with SessionLocal() as db:
        n = load_recyclers_csv(db, Path(path))
        db.commit()
    print(f"imported {n} recyclers")


if __name__ == "__main__":
    main(sys.argv[1])
