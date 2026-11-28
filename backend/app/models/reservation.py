"""ParkSMART - Parking and Commercial Loading Reservation Domain Models (File 31)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import (
    JSONB,
    TSTZRANGE,
    ExcludeConstraint,
)
from sqlalchemy.dialects.postgresql import (
    UUID as PG_UUID,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPk


class ParkingReservation(Base, UUIDPk, TimestampMixin):
    """Advance parking reservation for individual vehicles."""

    __tablename__ = "parking_reservation"

    reference: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    bay_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("parking_bay.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("app_user.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    vehicle_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("vehicle.id", ondelete="SET NULL"),
        nullable=True,
    )
    vehicle_category: Mapped[str] = mapped_column(Text, nullable=False)
    during: Mapped[Any] = mapped_column(TSTZRANGE, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="confirmed", server_default="confirmed", index=True)
    cancel_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'expired')",
            name="ck_parking_reservation_status",
        ),
        CheckConstraint(
            "NOT isempty(during) AND NOT lower_inf(during) AND NOT upper_inf(during)",
            name="ck_parking_reservation_range_valid",
        ),
        ExcludeConstraint(
            ("bay_id", "="),
            ("during", "&&"),
            where=text("status IN ('pending', 'confirmed', 'checked_in', 'in_progress')"),
            using="gist",
            name="ex_parking_reservation_no_overlap",
        ),
    )


class LoadingReservation(Base, UUIDPk, TimestampMixin):
    """Scheduled commercial loading / unloading bay reservation."""

    __tablename__ = "loading_reservation"

    reference: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    bay_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("parking_bay.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("business.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("app_user.id", ondelete="RESTRICT"),
        nullable=False,
    )
    vehicle_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("vehicle.id", ondelete="SET NULL"),
        nullable=True,
    )
    vehicle_category: Mapped[str] = mapped_column(Text, nullable=False)
    during: Mapped[Any] = mapped_column(TSTZRANGE, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="confirmed", server_default="confirmed", index=True)
    delivery_info: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'expired')",
            name="ck_loading_reservation_status",
        ),
        CheckConstraint(
            "NOT isempty(during) AND NOT lower_inf(during) AND NOT upper_inf(during)",
            name="ck_loading_reservation_range_valid",
        ),
        ExcludeConstraint(
            ("bay_id", "="),
            ("during", "&&"),
            where=text("status IN ('pending', 'confirmed', 'checked_in', 'in_progress')"),
            using="gist",
            name="ex_loading_reservation_no_overlap",
        ),
    )


class ReservationStatusHistory(Base):
    """Polymorphic lifecycle transition audit log for both parking and loading reservations."""

    __tablename__ = "reservation_status_history"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    reservation_type: Mapped[str] = mapped_column(Text, nullable=False)
    reservation_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    from_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    to_status: Mapped[str] = mapped_column(Text, nullable=False)
    changed_by: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("reservation_type IN ('parking', 'loading')", name="ck_res_history_type"),
        Index("ix_reservation_status_history_ref", "reservation_type", "reservation_id", "changed_at"),
    )
