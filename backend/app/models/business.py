"""ParkSMART - Business, Fleet, and Vehicle Models (File 28)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPk


class Business(Base, UUIDPk, TimestampMixin):
    """Registered commercial business or fleet entity."""

    __tablename__ = "business"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    registration_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="pending",
        server_default="pending",
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("app_user.id", ondelete="SET NULL"),
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'approved', 'suspended')",
            name="ck_business_status",
        ),
        Index("ix_business_status", "status"),
    )

    members: Mapped[list[BusinessMember]] = relationship(
        "BusinessMember",
        cascade="all, delete-orphan",
        lazy="select",
    )
    vehicles: Mapped[list[Vehicle]] = relationship(
        "Vehicle",
        cascade="all, delete-orphan",
        lazy="select",
        foreign_keys="Vehicle.business_id",
    )


class BusinessMember(Base):
    """Membership link connecting a business with an authorized user."""

    __tablename__ = "business_member"

    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("business.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("app_user.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    member_role: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "member_role IN ('owner', 'staff')",
            name="ck_business_member_role",
        ),
        Index("ix_business_member_user_id", "user_id"),
    )

    business: Mapped[Business] = relationship("Business", lazy="select")
    user: Mapped[Any] = relationship("User", lazy="select")


class Vehicle(Base, UUIDPk):
    """Registered vehicle entity owned either by a business or an individual driver."""

    __tablename__ = "vehicle"

    business_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("business.id", ondelete="CASCADE"),
        nullable=True,
    )
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("app_user.id", ondelete="CASCADE"),
        nullable=True,
    )
    plate: Mapped[str] = mapped_column(String(20), nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "category IN ('two_wheeler', 'car', 'van', 'truck', 'bus')",
            name="ck_vehicle_category",
        ),
        CheckConstraint(
            "((business_id IS NULL) <> (owner_user_id IS NULL))",
            name="ck_vehicle_one_owner",
        ),
        UniqueConstraint("business_id", "plate", name="uq_vehicle_business_plate"),
        UniqueConstraint("owner_user_id", "plate", name="uq_vehicle_user_plate"),
    )
