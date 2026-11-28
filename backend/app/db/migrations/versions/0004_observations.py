"""Create occupancy and crowd observation tables (File 37).

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-25 00:03:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "occupancy_event",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("msg_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bay_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("camera_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("state", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("applied", sa.Boolean(), nullable=False),
        sa.Column("schema_version", sa.SmallInteger(), server_default="1", nullable=False),
        sa.CheckConstraint("state IN ('occupied', 'free', 'unknown')", name="ck_occupancy_event_state"),
        sa.CheckConstraint("confidence IS NULL OR (confidence >= 0.0 AND confidence <= 1.0)", name="ck_occupancy_event_confidence"),
        sa.CheckConstraint("source IN ('edge', 'simulator', 'manual')", name="ck_occupancy_event_source"),
        sa.ForeignKeyConstraint(["bay_id"], ["parking_bay.id"], name="fk_occupancy_event_bay_id_parking_bay", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["camera_id"], ["camera.id"], name="fk_occupancy_event_camera_id_camera", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_occupancy_event"),
        sa.UniqueConstraint("msg_id", "bay_id", name="uq_occupancy_event_msg_bay"),
    )
    op.create_index(
        "ix_occupancy_event_bay_id_observed_at",
        "occupancy_event",
        ["bay_id", sa.text("observed_at DESC")],
    )
    op.create_index(
        "ix_occupancy_event_camera_id_observed_at",
        "occupancy_event",
        ["camera_id", sa.text("observed_at DESC")],
    )

    op.create_table(
        "current_bay_status",
        sa.Column("bay_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("occupancy", sa.Text(), server_default="unknown", nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_event_id", sa.BigInteger(), nullable=True),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("occupancy IN ('occupied', 'free', 'unknown')", name="ck_current_bay_status_occupancy"),
        sa.ForeignKeyConstraint(["bay_id"], ["parking_bay.id"], name="fk_current_bay_status_bay_id_parking_bay", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["last_event_id"], ["occupancy_event.id"], name="fk_current_bay_status_last_event_id_occupancy_event", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("bay_id", name="pk_current_bay_status"),
    )

    op.create_table(
        "occupancy_history",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("bay_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("state", sa.Text(), nullable=False),
        sa.Column("from_ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("to_ts", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("state IN ('occupied', 'free')", name="ck_occupancy_history_state"),
        sa.CheckConstraint("to_ts IS NULL OR to_ts > from_ts", name="ck_occupancy_history_range"),
        sa.ForeignKeyConstraint(["bay_id"], ["parking_bay.id"], name="fk_occupancy_history_bay_id_parking_bay", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_occupancy_history"),
    )
    op.create_index(
        "uq_occupancy_history_open_bay",
        "occupancy_history",
        ["bay_id"],
        unique=True,
        postgresql_where=sa.text("to_ts IS NULL"),
    )
    op.create_index("ix_occupancy_history_bay_from", "occupancy_history", ["bay_id", "from_ts"])

    op.create_table(
        "vehicle_count_observation",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("camera_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("interval_s", sa.Integer(), nullable=False),
        sa.Column("vehicle_count", sa.Integer(), nullable=False),
        sa.Column("by_category", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("quality", sa.Text(), server_default="ok", nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.CheckConstraint("interval_s > 0", name="ck_vehicle_obs_interval"),
        sa.CheckConstraint("vehicle_count >= 0", name="ck_vehicle_obs_count"),
        sa.CheckConstraint("quality IN ('ok', 'degraded', 'suspect')", name="ck_vehicle_obs_quality"),
        sa.CheckConstraint("source IN ('edge', 'simulator', 'manual')", name="ck_vehicle_obs_source"),
        sa.ForeignKeyConstraint(["camera_id"], ["camera.id"], name="fk_vehicle_count_observation_camera_id_camera", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["zone_id"], ["zone.id"], name="fk_vehicle_count_observation_zone_id_zone", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_vehicle_count_observation"),
        sa.UniqueConstraint("camera_id", "observed_at", name="uq_vehicle_obs_camera_ts"),
    )
    op.create_index(
        "ix_vehicle_count_zone_id_observed_at",
        "vehicle_count_observation",
        ["zone_id", sa.text("observed_at DESC")],
    )

    op.create_table(
        "crowd_observation",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("camera_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("interval_s", sa.Integer(), nullable=False),
        sa.Column("pedestrian_count", sa.Integer(), nullable=False),
        sa.Column("density_per_m2", sa.Numeric(precision=8, scale=4), nullable=True),
        sa.Column("quality", sa.Text(), server_default="ok", nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.CheckConstraint("interval_s > 0", name="ck_crowd_obs_interval"),
        sa.CheckConstraint("pedestrian_count >= 0", name="ck_crowd_obs_count"),
        sa.CheckConstraint("density_per_m2 IS NULL OR density_per_m2 >= 0", name="ck_crowd_obs_density"),
        sa.CheckConstraint("quality IN ('ok', 'degraded', 'suspect')", name="ck_crowd_obs_quality"),
        sa.CheckConstraint("source IN ('edge', 'simulator', 'manual')", name="ck_crowd_obs_source"),
        sa.ForeignKeyConstraint(["camera_id"], ["camera.id"], name="fk_crowd_observation_camera_id_camera", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["zone_id"], ["zone.id"], name="fk_crowd_observation_zone_id_zone", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_crowd_observation"),
        sa.UniqueConstraint("camera_id", "observed_at", name="uq_crowd_obs_camera_ts"),
    )
    op.create_index(
        "ix_crowd_obs_zone_id_observed_at",
        "crowd_observation",
        ["zone_id", sa.text("observed_at DESC")],
    )


def downgrade() -> None:
    op.drop_table("crowd_observation")
    op.drop_table("vehicle_count_observation")
    op.drop_table("occupancy_history")
    op.drop_table("current_bay_status")
    op.drop_table("occupancy_event")
