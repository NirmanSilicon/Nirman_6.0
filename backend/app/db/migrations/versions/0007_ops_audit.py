"""Create fee, payment, subscription, notification, maintenance, and immutable audit log tables (File 40).

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-25 00:06:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "fee_configuration",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("facility_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bay_type", sa.Text(), nullable=False),
        sa.Column("rate_per_hour", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), server_default="INR", nullable=False),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("effective_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("bay_type IN ('regular', 'loading')", name="ck_fee_bay_type"),
        sa.CheckConstraint("rate_per_hour >= 0", name="ck_fee_rate_positive"),
        sa.CheckConstraint("effective_to IS NULL OR effective_to > effective_from", name="ck_fee_effective_range"),
        sa.ForeignKeyConstraint(["facility_id"], ["parking_facility.id"], name="fk_fee_configuration_facility_id_parking_facility", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_fee_configuration"),
    )

    op.create_table(
        "payment_transaction",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reservation_type", sa.Text(), nullable=True),
        sa.Column("reservation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), server_default="INR", nullable=False),
        sa.Column("status", sa.Text(), server_default="created", nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=True),
        sa.Column("provider_ref", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('created', 'pending', 'succeeded', 'failed', 'refunded')",
            name="ck_payment_status",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["app_user.id"], name="fk_payment_transaction_user_id_app_user", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_payment_transaction"),
    )

    op.create_table(
        "subscription",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan", sa.String(length=50), nullable=False),
        sa.Column("status", sa.Text(), server_default="active", nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('active', 'cancelled', 'expired')", name="ck_subscription_status"),
        sa.ForeignKeyConstraint(["business_id"], ["business.id"], name="fk_subscription_business_id_business", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_subscription"),
    )

    op.create_table(
        "notification",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("role_target", sa.Text(), nullable=True),
        sa.Column("kind", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("(user_id IS NOT NULL) OR (role_target IS NOT NULL)", name="ck_notification_recipient"),
        sa.ForeignKeyConstraint(["user_id"], ["app_user.id"], name="fk_notification_user_id_app_user", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_notification"),
    )
    op.create_index("ix_notification_user_id_read_at", "notification", ["user_id", "read_at"])
    op.create_index("ix_notification_role_target_created_at", "notification", ["role_target", "created_at"])

    op.create_table(
        "maintenance_event",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("camera_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("opened_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("resolved_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("opened_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "kind IN ('camera_down', 'stale_data', 'repair', 'calibration', 'other')",
            name="ck_maintenance_event_kind",
        ),
        sa.ForeignKeyConstraint(["camera_id"], ["camera.id"], name="fk_maintenance_event_camera_id_camera", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["zone_id"], ["zone.id"], name="fk_maintenance_event_zone_id_zone", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_maintenance_event"),
    )
    op.create_index(
        "ix_maintenance_event_open",
        "maintenance_event",
        ["camera_id"],
        postgresql_where=sa.text("resolved_at IS NULL"),
    )

    op.create_table(
        "audit_log",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.Text(), nullable=True),
        sa.Column("before", postgresql.JSONB(), nullable=True),
        sa.Column("after", postgresql.JSONB(), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_audit_log"),
    )
    op.create_index("ix_audit_log_created_at", "audit_log", ["created_at"])
    op.create_index("ix_audit_log_entity", "audit_log", ["entity_type", "entity_id"])

    # Create append-only immutability trigger on audit_log
    op.execute(
        """
        CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'audit_log is append-only';
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_audit_log_immutable
        BEFORE UPDATE OR DELETE ON audit_log
        FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_audit_log_immutable ON audit_log")
    op.execute("DROP FUNCTION IF EXISTS audit_log_immutable()")
    op.drop_table("audit_log")
    op.drop_table("maintenance_event")
    op.drop_table("notification")
    op.drop_table("subscription")
    op.drop_table("payment_transaction")
    op.drop_table("fee_configuration")
