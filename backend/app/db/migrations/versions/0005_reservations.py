"""Create parking and loading reservation tables with exclusion constraints (File 38).

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-25 00:04:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "parking_reservation",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reference", sa.String(length=30), nullable=False),
        sa.Column("bay_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("vehicle_category", sa.Text(), nullable=False),
        sa.Column("during", postgresql.TSTZRANGE(), nullable=False),
        sa.Column("status", sa.Text(), server_default="confirmed", nullable=False),
        sa.Column("cancel_reason", sa.String(length=300), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'expired')",
            name="ck_parking_reservation_status",
        ),
        sa.CheckConstraint(
            "NOT isempty(during) AND NOT lower_inf(during) AND NOT upper_inf(during)",
            name="ck_parking_reservation_range_valid",
        ),
        sa.ForeignKeyConstraint(["bay_id"], ["parking_bay.id"], name="fk_parking_reservation_bay_id_parking_bay", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["app_user.id"], name="fk_parking_reservation_user_id_app_user", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicle.id"], name="fk_parking_reservation_vehicle_id_vehicle", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_parking_reservation"),
        sa.UniqueConstraint("reference", name="uq_parking_reservation_reference"),
    )
    op.create_index("ix_parking_reservation_bay_id", "parking_reservation", ["bay_id"])
    op.create_index("ix_parking_reservation_user_id", "parking_reservation", ["user_id"])
    op.create_index("ix_parking_reservation_status", "parking_reservation", ["status"])

    # Raw SQL exclusion constraint for parking overlap prevention
    op.execute(
        """
        ALTER TABLE parking_reservation
        ADD CONSTRAINT ex_parking_reservation_no_overlap
        EXCLUDE USING gist (
            bay_id WITH =,
            during WITH &&
        ) WHERE (status IN ('pending', 'confirmed', 'checked_in', 'in_progress'))
        """
    )

    op.create_table(
        "loading_reservation",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reference", sa.String(length=30), nullable=False),
        sa.Column("bay_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("vehicle_category", sa.Text(), nullable=False),
        sa.Column("during", postgresql.TSTZRANGE(), nullable=False),
        sa.Column("status", sa.Text(), server_default="confirmed", nullable=False),
        sa.Column("delivery_info", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_reason", sa.String(length=300), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'expired')",
            name="ck_loading_reservation_status",
        ),
        sa.CheckConstraint(
            "NOT isempty(during) AND NOT lower_inf(during) AND NOT upper_inf(during)",
            name="ck_loading_reservation_range_valid",
        ),
        sa.ForeignKeyConstraint(["bay_id"], ["parking_bay.id"], name="fk_loading_reservation_bay_id_parking_bay", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id"], ["business.id"], name="fk_loading_reservation_business_id_business", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by"], ["app_user.id"], name="fk_loading_reservation_created_by_app_user", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicle.id"], name="fk_loading_reservation_vehicle_id_vehicle", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_loading_reservation"),
        sa.UniqueConstraint("reference", name="uq_loading_reservation_reference"),
    )
    op.create_index("ix_loading_reservation_bay_id", "loading_reservation", ["bay_id"])
    op.create_index("ix_loading_reservation_business_id", "loading_reservation", ["business_id"])
    op.create_index("ix_loading_reservation_status", "loading_reservation", ["status"])

    # Raw SQL exclusion constraint for loading overlap prevention
    op.execute(
        """
        ALTER TABLE loading_reservation
        ADD CONSTRAINT ex_loading_reservation_no_overlap
        EXCLUDE USING gist (
            bay_id WITH =,
            during WITH &&
        ) WHERE (status IN ('pending', 'confirmed', 'checked_in', 'in_progress'))
        """
    )

    op.create_table(
        "reservation_status_history",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("reservation_type", sa.Text(), nullable=False),
        sa.Column("reservation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_status", sa.Text(), nullable=True),
        sa.Column("to_status", sa.Text(), nullable=False),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reason", sa.String(length=300), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("reservation_type IN ('parking', 'loading')", name="ck_res_history_type"),
        sa.PrimaryKeyConstraint("id", name="pk_reservation_status_history"),
    )
    op.create_index(
        "ix_reservation_status_history_ref",
        "reservation_status_history",
        ["reservation_type", "reservation_id", "changed_at"],
    )


def downgrade() -> None:
    op.execute("ALTER TABLE parking_reservation DROP CONSTRAINT IF EXISTS ex_parking_reservation_no_overlap")
    op.execute("ALTER TABLE loading_reservation DROP CONSTRAINT IF EXISTS ex_loading_reservation_no_overlap")
    op.drop_table("reservation_status_history")
    op.drop_table("loading_reservation")
    op.drop_table("parking_reservation")
