import uuid
from datetime import datetime, timezone

from geoalchemy2 import Geography
from sqlalchemy import ARRAY, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    role: Mapped[str] = mapped_column(String(30), default="aggregator")
    language: Mapped[str] = mapped_column(String(5), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Scan(Base):
    __tablename__ = "scans"
    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    image_url: Mapped[str | None] = mapped_column(String(300), nullable=True)  # s3 key; only set with consent
    board_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    board_confidence: Mapped[float] = mapped_column(Float)
    value_low: Mapped[float | None] = mapped_column(Float, nullable=True)
    value_high: Mapped[float | None] = mapped_column(Float, nullable=True)
    top_route: Mapped[str | None] = mapped_column(String(20), nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    consent_image: Mapped[bool] = mapped_column(Boolean, default=False)
    result: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    detections: Mapped[list["Detection"]] = relationship(cascade="all, delete-orphan", lazy="selectin")


class Detection(Base):
    __tablename__ = "detections"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scan_id: Mapped[str] = mapped_column(ForeignKey("scans.id", ondelete="CASCADE"), index=True)
    cls: Mapped[str] = mapped_column("class", String(30))
    confidence: Mapped[float] = mapped_column(Float)
    bbox: Mapped[list[float]] = mapped_column(ARRAY(Float))  # [x, y, w, h] in px
    ocr_text: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reusable_flag: Mapped[bool] = mapped_column(Boolean, default=False)


class MaterialTable(Base):
    __tablename__ = "material_table"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    board_type: Mapped[str] = mapped_column(String(40), index=True)
    metal: Mapped[str] = mapped_column(String(4))
    grams_low: Mapped[float] = mapped_column(Float)
    grams_high: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(Text)


class PriceTable(Base):
    __tablename__ = "price_table"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item: Mapped[str] = mapped_column(String(40), unique=True)  # "metal:Au" | "reuse:RAM_IC"
    unit: Mapped[str] = mapped_column(String(20))
    price_low: Mapped[float] = mapped_column(Float)
    price_high: Mapped[float] = mapped_column(Float)
    reuse_prob_low: Mapped[float | None] = mapped_column(Float, nullable=True)
    reuse_prob_high: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class RouteRule(Base):
    __tablename__ = "route_rules"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    route: Mapped[str] = mapped_column(String(20), index=True)
    criterion: Mapped[str] = mapped_column(String(10))
    weight: Mapped[float] = mapped_column(Float)   # default-preset weight
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)  # 1-5, more = better; null => computed
    formula_ref: Mapped[str] = mapped_column(String(80))


class RouteParam(Base):
    __tablename__ = "route_params"
    route: Mapped[str] = mapped_column(String(20), primary_key=True)
    reuse_factor: Mapped[float] = mapped_column(Float)
    metal_recovery: Mapped[float] = mapped_column(Float)
    cost_low: Mapped[float] = mapped_column(Float)
    cost_high: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(Text)


class Recycler(Base):
    __tablename__ = "recyclers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200))
    cpcb_reg_no: Mapped[str] = mapped_column(String(80))
    address: Mapped[str] = mapped_column(Text)
    city: Mapped[str] = mapped_column(String(80), default="")
    state: Mapped[str] = mapped_column(String(80), default="")
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    geom = mapped_column(Geography(geometry_type="POINT", srid=4326))
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    accepts: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(Text, default="")


class OtpCode(Base):
    __tablename__ = "otp_codes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    phone: Mapped[str] = mapped_column(String(20), index=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
