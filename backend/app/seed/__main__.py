import sys

from ..db import SessionLocal, init_db
from . import seed

init_db()
with SessionLocal() as s:
    seed(s, force="--force" in sys.argv)
print("seeded")
