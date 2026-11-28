"""ParkSMART - Demand Forecasting, Aggregates, and Availability Domain Models (File 32)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Identity,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPk


class OccupancyAggregate(Base, UUIDPk, TimestampMixin):
    """Periodic historical roll-up bucket per zone for crowd and demand analytics."""

    __tablename__ = "occupancy_aggregate"

    zone_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("zone.id", ondelete="CASCADE"),
        nullable=False,
    )
    bucket_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    interval_min: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    avg_occupied: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    max_occupied: Mapped[int | None] = mapped_column(Integer, nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    avg_occupancy_pct: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    avg_vehicles: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    avg_pedestrians: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    n_samples: Mapped[int] = mapped_column(Integer, nullable=False)
    expected_samples: Mapped[int] = mapped_column(Integer, nullable=False)
    quality: Mapped[str] = mapped_column(Text, nullable=False, default="ok", server_default="ok")

    __table_args__ = (
        CheckConstraint("interval_min IN (5, 15)", name="ck_occ_agg_interval"),
        CheckConstraint("quality IN ('ok', 'partial', 'missing')", name="ck_occ_agg_quality"),
        UniqueConstraint("zone_id", "bucket_start", "interval_min", name="uq_occupancy_aggregate_zone_bucket"),
        Index("ix_occupancy_aggregate_zone_bucket", "zone_id", "bucket_start"),
    )


class ForecastModelVersion(Base, UUIDPk):
    """Model registry tracking model versions, parameters, and training provenance."""

    __tablename__ = "forecast_model_version"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    target: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(String(50), nullable=False)
    trained_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    train_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    train_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    params: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    metrics: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    trained_on: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="candidate", server_default="candidate")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("target IN ('occupancy_pct', 'vehicle_count', 'pedestrian_count')", name="ck_model_target"),
        CheckConstraint("trained_on IN ('simulated', 'observed', 'mixed', 'none')", name="ck_model_trained_on"),
        CheckConstraint("status IN ('candidate', 'active', 'retired')", name="ck_model_status"),
        UniqueConstraint("name", "version", name="uq_forecast_model_name_version"),
        Index(
            "uq_model_one_active_per_target",
            "target",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )


class DemandForecast(Base):
    """Generated forecast outputs with uncertainty bounds."""

    __tablename__ = "demand_forecast"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    zone_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("zone.id", ondelete="CASCADE"),
        nullable=False,
    )
    target: Mapped[str] = mapped_column(Text, nullable=False)
    target_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    model_version_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("forecast_model_version.id", ondelete="RESTRICT"),
        nullable=False,
    )
    mean: Mapped[float] = mapped_column(Float, nullable=False)
    lower: Mapped[float | None] = mapped_column(Float, nullable=True)
    upper: Mapped[float | None] = mapped_column(Float, nullable=True)
    interval_level: Mapped[float | None] = mapped_column(Float, nullable=True)
    n_history_days: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (
        CheckConstraint("target IN ('occupancy_pct', 'vehicle_count', 'pedestrian_count')", name="ck_demand_forecast_target"),
        UniqueConstraint("zone_id", "target", "target_ts", "model_version_id", "generated_at", name="uq_demand_forecast_unique"),
        Index("ix_demand_forecast_zone_target_ts", "zone_id", "target", "target_ts"),
    )

    model_version: Mapped[ForecastModelVersion] = relationship("ForecastModelVersion", lazy="select")


class AvailabilityProbability(Base, UUIDPk):
    """Cached calculated arrival-time availability probability."""

    __tablename__ = "availability_probability"

    zone_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("zone.id", ondelete="CASCADE"),
        nullable=False,
    )
    requested_arrival_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    estimated_arrival_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    total_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    expected_occupancy_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    expected_available: Mapped[float | None] = mapped_column(Float, nullable=True)
    probability: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    method: Mapped[str] = mapped_column(String(50), nullable=False)
    n_simulations: Mapped[int | None] = mapped_column(Integer, nullable=True)
    model_version_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "forecast_model_version.id",
            name="fk_availability_probability_model_version",
            ondelete="SET NULL",
        ),
        nullable=True,
    )
    data_freshness_s: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reliability: Mapped[str] = mapped_column(Text, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("reliability IN ('unavailable', 'low', 'medium', 'high')", name="ck_avail_prob_reliability"),
        Index("ix_availability_probability_zone_generated", "zone_id", text("generated_at DESC")),
    )
