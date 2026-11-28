"""ParkSMART - Real-Time and Historical Occupancy and Crowd Domain Models (File 30)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Identity,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OccupancyEvent(Base):
    """Raw append-only occupancy telemetry event log."""

    __tablename__ = "occupancy_event"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    msg_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    bay_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("parking_bay.id", ondelete="CASCADE"),
        nullable=False,
    )
    camera_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("camera.id", ondelete="SET NULL"),
        nullable=True,
    )
    state: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    source: Mapped[str] = mapped_column(Text, nullable=False)
    applied: Mapped[bool] = mapped_column(Boolean, nullable=False)
    schema_version: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1, server_default="1")

    __table_args__ = (
        CheckConstraint("state IN ('occupied', 'free', 'unknown')", name="ck_occupancy_event_state"),
        CheckConstraint("confidence IS NULL OR (confidence >= 0.0 AND confidence <= 1.0)", name="ck_occupancy_event_confidence"),
        CheckConstraint("source IN ('edge', 'simulator', 'manual')", name="ck_occupancy_event_source"),
        UniqueConstraint("msg_id", "bay_id", name="uq_occupancy_event_msg_bay"),
        Index("ix_occupancy_event_bay_id_observed_at", "bay_id", text("observed_at DESC")),
        Index("ix_occupancy_event_camera_id_observed_at", "camera_id", text("observed_at DESC")),
    )


class CurrentBayStatus(Base):
    """Authoritative mutable live physical occupancy state per bay."""

    __tablename__ = "current_bay_status"

    bay_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("parking_bay.id", ondelete="CASCADE"),
        primary_key=True,
    )
    occupancy: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="unknown",
        server_default="unknown",
    )
    observed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_event_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("occupancy_event.id", ondelete="SET NULL"),
        nullable=True,
    )
    source: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("occupancy IN ('occupied', 'free', 'unknown')", name="ck_current_bay_status_occupancy"),
    )


class OccupancyHistory(Base):
    """Historical continuous occupancy state intervals."""

    __tablename__ = "occupancy_history"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    bay_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("parking_bay.id", ondelete="CASCADE"),
        nullable=False,
    )
    state: Mapped[str] = mapped_column(Text, nullable=False)
    from_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    to_ts: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("state IN ('occupied', 'free')", name="ck_occupancy_history_state"),
        CheckConstraint("to_ts IS NULL OR to_ts > from_ts", name="ck_occupancy_history_range"),
        Index(
            "uq_occupancy_history_open_bay",
            "bay_id",
            unique=True,
            postgresql_where=text("to_ts IS NULL"),
        ),
        Index("ix_occupancy_history_bay_from", "bay_id", "from_ts"),
    )


class VehicleCountObservation(Base):
    """Periodic aggregate vehicle count telemetry."""

    __tablename__ = "vehicle_count_observation"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    zone_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("zone.id", ondelete="CASCADE"),
        nullable=False,
    )
    camera_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("camera.id", ondelete="SET NULL"),
        nullable=True,
    )
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    interval_s: Mapped[int] = mapped_column(Integer, nullable=False)
    vehicle_count: Mapped[int] = mapped_column(Integer, nullable=False)
    by_category: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    quality: Mapped[str] = mapped_column(Text, nullable=False, default="ok", server_default="ok")
    source: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        CheckConstraint("interval_s > 0", name="ck_vehicle_obs_interval"),
        CheckConstraint("vehicle_count >= 0", name="ck_vehicle_obs_count"),
        CheckConstraint("quality IN ('ok', 'degraded', 'suspect')", name="ck_vehicle_obs_quality"),
        CheckConstraint("source IN ('edge', 'simulator', 'manual')", name="ck_vehicle_obs_source"),
        UniqueConstraint("camera_id", "observed_at", name="uq_vehicle_obs_camera_ts"),
        Index("ix_vehicle_count_zone_id_observed_at", "zone_id", text("observed_at DESC")),
    )


class CrowdObservation(Base):
    """Periodic pedestrian and crowd density telemetry."""

    __tablename__ = "crowd_observation"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    zone_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("zone.id", ondelete="CASCADE"),
        nullable=False,
    )
    camera_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("camera.id", ondelete="SET NULL"),
        nullable=True,
    )
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    interval_s: Mapped[int] = mapped_column(Integer, nullable=False)
    pedestrian_count: Mapped[int] = mapped_column(Integer, nullable=False)
    density_per_m2: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    quality: Mapped[str] = mapped_column(Text, nullable=False, default="ok", server_default="ok")
    source: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        CheckConstraint("interval_s > 0", name="ck_crowd_obs_interval"),
        CheckConstraint("pedestrian_count >= 0", name="ck_crowd_obs_count"),
        CheckConstraint("density_per_m2 IS NULL OR density_per_m2 >= 0", name="ck_crowd_obs_density"),
        CheckConstraint("quality IN ('ok', 'degraded', 'suspect')", name="ck_crowd_obs_quality"),
        CheckConstraint("source IN ('edge', 'simulator', 'manual')", name="ck_crowd_obs_source"),
        UniqueConstraint("camera_id", "observed_at", name="uq_crowd_obs_camera_ts"),
        Index("ix_crowd_obs_zone_id_observed_at", "zone_id", text("observed_at DESC")),
    )
