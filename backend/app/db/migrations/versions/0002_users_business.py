"""Create users, roles, memberships, and vehicles tables (File 35).

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-25 00:01:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    role_table = op.create_table(
        "role",
        sa.Column("id", sa.SmallInteger(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_role"),
        sa.UniqueConstraint("name", name="uq_role_name"),
    )

    op.create_table(
        "app_user",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("status", sa.Text(), server_default="pending", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('pending', 'approved', 'suspended')", name="ck_app_user_status"),
        sa.PrimaryKeyConstraint("id", name="pk_app_user"),
        sa.UniqueConstraint("email", name="uq_app_user_email"),
    )
    op.create_index("ix_app_user_email", "app_user", ["email"])
    op.create_index("ix_app_user_status", "app_user", ["status"])

    op.create_table(
        "user_role",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role_id", sa.SmallInteger(), nullable=False),
        sa.Column("granted_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("granted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["granted_by"], ["app_user.id"], name="fk_user_role_granted_by_app_user", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["role_id"], ["role.id"], name="fk_user_role_role_id_role", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["app_user.id"], name="fk_user_role_user_id_app_user", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "role_id", name="pk_user_role"),
    )

    op.create_table(
        "refresh_token",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["app_user.id"], name="fk_refresh_token_user_id_app_user", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_refresh_token"),
        sa.UniqueConstraint("token_hash", name="uq_refresh_token_token_hash"),
    )
    op.create_index("ix_refresh_token_expires_at", "refresh_token", ["expires_at"])
    op.create_index("ix_refresh_token_user_id", "refresh_token", ["user_id"])

    op.create_table(
        "business",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("registration_no", sa.String(length=100), nullable=True),
        sa.Column("status", sa.Text(), server_default="pending", nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('pending', 'approved', 'suspended')", name="ck_business_status"),
        sa.ForeignKeyConstraint(["created_by"], ["app_user.id"], name="fk_business_created_by_app_user", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_business"),
    )
    op.create_index("ix_business_status", "business", ["status"])

    op.create_table(
        "business_member",
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("member_role", sa.Text(), nullable=False),
        sa.CheckConstraint("member_role IN ('owner', 'staff')", name="ck_business_member_role"),
        sa.ForeignKeyConstraint(["business_id"], ["business.id"], name="fk_business_member_business_id_business", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["app_user.id"], name="fk_business_member_user_id_app_user", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("business_id", "user_id", name="pk_business_member"),
    )
    op.create_index("ix_business_member_user_id", "business_member", ["user_id"])

    op.create_table(
        "vehicle",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("plate", sa.String(length=20), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("category IN ('two_wheeler', 'car', 'van', 'truck', 'bus')", name="ck_vehicle_category"),
        sa.CheckConstraint("((business_id IS NULL) <> (owner_user_id IS NULL))", name="ck_vehicle_one_owner"),
        sa.ForeignKeyConstraint(["business_id"], ["business.id"], name="fk_vehicle_business_id_business", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_user_id"], ["app_user.id"], name="fk_vehicle_owner_user_id_app_user", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_vehicle"),
        sa.UniqueConstraint("business_id", "plate", name="uq_vehicle_business_plate"),
        sa.UniqueConstraint("owner_user_id", "plate", name="uq_vehicle_user_plate"),
    )

    # Seed the 5 canonical system roles
    op.bulk_insert(
        role_table,
        [
            {"id": 1, "name": "driver"},
            {"id": 2, "name": "business_operator"},
            {"id": 3, "name": "municipal_admin"},
            {"id": 4, "name": "field_operator"},
            {"id": 5, "name": "system_admin"},
        ],
    )


def downgrade() -> None:
    op.drop_table("vehicle")
    op.drop_table("business_member")
    op.drop_table("business")
    op.drop_table("refresh_token")
    op.drop_table("user_role")
    op.drop_table("app_user")
    op.drop_table("role")
