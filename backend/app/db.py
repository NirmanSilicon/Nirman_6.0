import time

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import get_settings

engine = create_engine(get_settings().database_url, pool_pre_ping=True, pool_size=10)
SessionLocal = sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    with SessionLocal() as db:
        yield db


def init_db(retries: int = 30) -> None:
    from . import models  # noqa: F401  (register tables)

    for i in range(retries):
        try:
            with engine.begin() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            break
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(2)
    Base.metadata.create_all(engine)
    with engine.begin() as conn:  # lightweight migration for databases created before these columns existed
        for col, typ in [("capacity_mta", "double precision"), ("geocode_level", "varchar(12)"), ("list_date", "varchar(10)"),
                         ("source_url", "text"), ("validity_note", "text")]:
            conn.execute(text(f"ALTER TABLE recyclers ADD COLUMN IF NOT EXISTS {col} {typ}"))
