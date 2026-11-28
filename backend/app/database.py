import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import inspect, text
load_dotenv()


def _normalize_database_url(raw_url: str) -> str:
    """Ensure Postgres URLs explicitly target Psycopg 3 (Python 3.13 compatible)."""
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+psycopg://", 1)
    if raw_url.startswith("postgresql://") and "+psycopg" not in raw_url:
        return raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return raw_url


RAW_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cyberguard_local.db")
DATABASE_URL = _normalize_database_url(RAW_DATABASE_URL)

IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    # SQLite allows connections only on the thread that created them unless disabled for FastAPI's threadpool
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # PostgreSQL / Neon settings: recover cleanly after serverless idle pauses & stay lean on Render RAM
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_recycle=300,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    """Create all ORM tables if they do not already exist."""
    from app import models  # noqa: F401 — ensure models register on Base.metadata
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    if inspector.has_table("scans"):
        existing_cols = {col["name"] for col in inspector.get_columns("scans")}
        if "user_id" not in existing_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE scans ADD COLUMN user_id INTEGER"))