"""ParkSMART - Parking Infrastructure, Camera, and Hardware Mapping Models (File 29)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPk


class City(Base, UUIDPk):
    """City administrative boundary entity."""

    __tablename__ = "city"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    tz: Mapped[str] = mapped_column(String(50), nullable=False, default="Asia/Kolkata", server_default="Asia/Kolkata")

    __table_args__ = (
        UniqueConstraint("name", "state", name="uq_city_name_state"),
    )

    zones: Mapped[list[Zone]] = relationship("Zone", cascade="all, delete-orphan", lazy="select")


class Zone(Base, UUIDPk, TimestampMixin):
    """Designated parking / loading zone within a city."""

    __tablename__ = "zone"

    city_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("city.id", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    boundary: Mapped[Any | None] = mapped_column(
        Geography(geometry_type="POLYGON", srid=4326, spatial_index=False),
        nullable=True,
    )
    centroid: Mapped[Any] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    operating_schedule: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    crowd_thresholds: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    reservation_rules: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    __table_args__ = (
        CheckConstraint("kind IN ('parking', 'loading', 'mixed')", name="ck_zone_kind"),
        CheckConstraint("boundary IS NULL OR ST_IsValid(boundary::geometry)", name="ck_zone_boundary_valid"),
        UniqueConstraint("city_id", "name", name="uq_zone_city_id_name"),
        Index("ix_zone_centroid_gist", "centroid", postgresql_using="gist"),
        Index("ix_zone_boundary_gist", "boundary", postgresql_using="gist"),
    )

    city: Mapped[City] = relationship("City", lazy="selectin")
    facilities: Mapped[list[ParkingFacility]] = relationship("ParkingFacility", cascade="all, delete-orphan", lazy="select")
    cameras: Mapped[list[Camera]] = relationship("Camera", cascade="all, delete-orphan", lazy="select")


class ParkingFacility(Base, UUIDPk, TimestampMixin):
    """A designated parking facility or roadside section inside a zone."""

    __tablename__ = "parking_facility"

    zone_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("zone.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False, default="facility", server_default="facility")
    location: Mapped[Any] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    supports_reservation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    __table_args__ = (
        CheckConstraint("kind IN ('facility', 'roadside')", name="ck_parking_facility_kind"),
        UniqueConstraint("zone_id", "name", name="uq_parking_facility_zone_name"),
        Index("ix_parking_facility_location_gist", "location", postgresql_using="gist"),
    )

    zone: Mapped[Zone] = relationship("Zone", lazy="select")
    bays: Mapped[list[ParkingBay]] = relationship("ParkingBay", cascade="all, delete-orphan", lazy="select")


class ParkingBay(Base, UUIDPk, TimestampMixin):
    """Individual parking or commercial loading bay."""

    __tablename__ = "parking_bay"

    facility_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("parking_facility.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(30), nullable=False)
    bay_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    location: Mapped[Any] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    permitted_vehicle_categories: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
    )
    operating_schedule: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    restrictions: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    out_of_service: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    __table_args__ = (
        CheckConstraint("bay_type IN ('regular', 'loading')", name="ck_parking_bay_type"),
        CheckConstraint("cardinality(permitted_vehicle_categories) > 0", name="ck_parking_bay_vehicle_categories_nonempty"),
        UniqueConstraint("facility_id", "code", name="uq_parking_bay_facility_code"),
        Index("ix_parking_bay_location_gist", "location", postgresql_using="gist"),
        Index("ix_parking_bay_bay_type", "bay_type"),
    )

    facility: Mapped[ParkingFacility] = relationship("ParkingFacility", lazy="select")


class Camera(Base, UUIDPk, TimestampMixin):
    """Edge optical camera registered to monitor a zone."""

    __tablename__ = "camera"

    zone_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("zone.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    device_secret_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="provisioned",
        server_default="provisioned",
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    registered_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("app_user.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    __table_args__ = (
        CheckConstraint("status IN ('provisioned', 'online', 'degraded', 'offline', 'maintenance')", name="ck_camera_status"),
    )

    zone: Mapped[Zone] = relationship("Zone", lazy="select")
    mappings: Mapped[list[CameraBayMapping]] = relationship("CameraBayMapping", cascade="all, delete-orphan", lazy="select")


class CameraBayMapping(Base, UUIDPk):
    """Mapping between a camera and a specific bay's normalized ROI polygon."""

    __tablename__ = "camera_bay_mapping"

    camera_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("camera.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    bay_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("parking_bay.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    roi_polygon: Mapped[list[Any]] = mapped_column(JSONB, nullable=False)

    camera: Mapped[Camera] = relationship("Camera", lazy="select")
    bay: Mapped[ParkingBay] = relationship("ParkingBay", lazy="select")


class DeviceHealthEvent(Base, UUIDPk):
    """Historical record of camera connectivity and health transitions."""

    __tablename__ = "device_health_event"

    camera_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("camera.id", ondelete="CASCADE"),
        nullable=False,
    )
    state: Mapped[str] = mapped_column(Text, nullable=False)
    detail: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("state IN ('online', 'degraded', 'offline', 'maintenance')", name="ck_device_health_state"),
        Index("ix_device_health_event_camera_id_observed_at", "camera_id", text("observed_at DESC")),
    )
