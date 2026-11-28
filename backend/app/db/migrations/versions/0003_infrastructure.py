"""Create parking hierarchy, cameras, mappings, and device health tables (File 36).

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-25 00:02:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "city",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("state", sa.String(length=100), nullable=False),
        sa.Column("tz", sa.String(length=50), server_default="Asia/Kolkata", nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_city"),
        sa.UniqueConstraint("name", "state", name="uq_city_name_state"),
    )

    op.create_table(
        "zone",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("city_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("boundary", Geography(geometry_type="POLYGON", srid=4326, spatial_index=False), nullable=True),
        sa.Column("centroid", Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False),
        sa.Column("operating_schedule", postgresql.JSONB(), nullable=True),
        sa.Column("crowd_thresholds", postgresql.JSONB(), nullable=True),
        sa.Column("reservation_rules", postgresql.JSONB(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("kind IN ('parking', 'loading', 'mixed')", name="ck_zone_kind"),
        sa.CheckConstraint("boundary IS NULL OR ST_IsValid(boundary::geometry)", name="ck_zone_boundary_valid"),
        sa.ForeignKeyConstraint(["city_id"], ["city.id"], name="fk_zone_city_id_city", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_zone"),
        sa.UniqueConstraint("city_id", "name", name="uq_zone_city_id_name"),
    )
    op.create_index("ix_zone_centroid_gist", "zone", ["centroid"], postgresql_using="gist")
    op.create_index("ix_zone_boundary_gist", "zone", ["boundary"], postgresql_using="gist")

    op.create_table(
        "parking_facility",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("kind", sa.Text(), server_default="facility", nullable=False),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False),
        sa.Column("supports_reservation", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("kind IN ('facility', 'roadside')", name="ck_parking_facility_kind"),
        sa.ForeignKeyConstraint(["zone_id"], ["zone.id"], name="fk_parking_facility_zone_id_zone", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_parking_facility"),
        sa.UniqueConstraint("zone_id", "name", name="uq_parking_facility_zone_name"),
    )
    op.create_index("ix_parking_facility_location_gist", "parking_facility", ["location"], postgresql_using="gist")
    op.create_index("ix_parking_facility_zone_id", "parking_facility", ["zone_id"])

    op.create_table(
        "parking_bay",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("facility_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=30), nullable=False),
        sa.Column("bay_type", sa.Text(), nullable=False),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False),
        sa.Column("permitted_vehicle_categories", postgresql.ARRAY(sa.Text()), nullable=False),
        sa.Column("operating_schedule", postgresql.JSONB(), nullable=True),
        sa.Column("restrictions", postgresql.JSONB(), nullable=True),
        sa.Column("out_of_service", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("bay_type IN ('regular', 'loading')", name="ck_parking_bay_type"),
        sa.CheckConstraint("cardinality(permitted_vehicle_categories) > 0", name="ck_parking_bay_vehicle_categories_nonempty"),
        sa.ForeignKeyConstraint(["facility_id"], ["parking_facility.id"], name="fk_parking_bay_facility_id_parking_facility", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_parking_bay"),
        sa.UniqueConstraint("facility_id", "code", name="uq_parking_bay_facility_code"),
    )
    op.create_index("ix_parking_bay_location_gist", "parking_bay", ["location"], postgresql_using="gist")
    op.create_index("ix_parking_bay_facility_id", "parking_bay", ["facility_id"])
    op.create_index("ix_parking_bay_bay_type", "parking_bay", ["bay_type"])

    op.create_table(
        "camera",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("device_secret_hash", sa.String(length=64), nullable=False),
        sa.Column("status", sa.Text(), server_default="provisioned", nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("config", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("registered_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('provisioned', 'online', 'degraded', 'offline', 'maintenance')", name="ck_camera_status"),
        sa.ForeignKeyConstraint(["registered_by"], ["app_user.id"], name="fk_camera_registered_by_app_user", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["zone_id"], ["zone.id"], name="fk_camera_zone_id_zone", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_camera"),
    )
    op.create_index("ix_camera_zone_id", "camera", ["zone_id"])

    op.create_table(
        "camera_bay_mapping",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("camera_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bay_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("roi_polygon", postgresql.JSONB(), nullable=False),
        sa.ForeignKeyConstraint(["bay_id"], ["parking_bay.id"], name="fk_camera_bay_mapping_bay_id_parking_bay", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["camera_id"], ["camera.id"], name="fk_camera_bay_mapping_camera_id_camera", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_camera_bay_mapping"),
        sa.UniqueConstraint("bay_id", name="uq_camera_bay_mapping_bay_id"),
    )
    op.create_index("ix_camera_bay_mapping_camera_id", "camera_bay_mapping", ["camera_id"])

    op.create_table(
        "device_health_event",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("camera_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("state", sa.Text(), nullable=False),
        sa.Column("detail", postgresql.JSONB(), nullable=True),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("state IN ('online', 'degraded', 'offline', 'maintenance')", name="ck_device_health_state"),
        sa.ForeignKeyConstraint(["camera_id"], ["camera.id"], name="fk_device_health_event_camera_id_camera", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_device_health_event"),
    )
    op.create_index(
        "ix_device_health_event_camera_id_observed_at",
        "device_health_event",
        ["camera_id", sa.text("observed_at DESC")],
    )


def downgrade() -> None:
    op.drop_table("device_health_event")
    op.drop_table("camera_bay_mapping")
    op.drop_table("camera")
    op.drop_table("parking_bay")
    op.drop_table("parking_facility")
    op.drop_table("zone")
    op.drop_table("city")
