"""Create aggregate, forecast model registry, and availability probability tables (File 39).

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-25 00:05:00.000000
"""

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _deduplicate_forecast_models(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    """Deduplicates seed rows by `(name, version)`, keeping the first entry for each pair."""
    seen_pairs: set[tuple[str, str]] = set()
    unique_rows: list[dict[str, object]] = []
    for row in rows:
        pair = (str(row["name"]), str(row["version"]))
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        unique_rows.append(row)
    return unique_rows


def upgrade() -> None:
    op.create_table(
        "occupancy_aggregate",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("bucket_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("interval_min", sa.SmallInteger(), nullable=False),
        sa.Column("avg_occupied", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column("max_occupied", sa.Integer(), nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("avg_occupancy_pct", sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column("avg_vehicles", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column("avg_pedestrians", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column("n_samples", sa.Integer(), nullable=False),
        sa.Column("expected_samples", sa.Integer(), nullable=False),
        sa.Column("quality", sa.Text(), server_default="ok", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("interval_min IN (5, 15)", name="ck_occ_agg_interval"),
        sa.CheckConstraint("quality IN ('ok', 'partial', 'missing')", name="ck_occ_agg_quality"),
        sa.ForeignKeyConstraint(["zone_id"], ["zone.id"], name="fk_occupancy_aggregate_zone_id_zone", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_occupancy_aggregate"),
        sa.UniqueConstraint("zone_id", "bucket_start", "interval_min", name="uq_occupancy_aggregate_zone_bucket"),
    )
    op.create_index("ix_occupancy_aggregate_zone_bucket", "occupancy_aggregate", ["zone_id", "bucket_start"])

    model_table = op.create_table(
        "forecast_model_version",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("version", sa.String(length=50), nullable=False),
        sa.Column("target", sa.Text(), nullable=False),
        sa.Column("kind", sa.String(length=50), nullable=False),
        sa.Column("trained_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("train_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("train_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("params", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("metrics", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("trained_on", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), server_default="candidate", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("target IN ('occupancy_pct', 'vehicle_count', 'pedestrian_count')", name="ck_model_target"),
        sa.CheckConstraint("trained_on IN ('simulated', 'observed', 'mixed', 'none')", name="ck_model_trained_on"),
        sa.CheckConstraint("status IN ('candidate', 'active', 'retired')", name="ck_model_status"),
        sa.PrimaryKeyConstraint("id", name="pk_forecast_model_version"),
        sa.UniqueConstraint("name", "version", name="uq_forecast_model_name_version"),
    )
    op.create_index(
        "uq_model_one_active_per_target",
        "forecast_model_version",
        ["target"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )

    op.create_table(
        "demand_forecast",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target", sa.Text(), nullable=False),
        sa.Column("target_ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("model_version_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mean", sa.Float(), nullable=False),
        sa.Column("lower", sa.Float(), nullable=True),
        sa.Column("upper", sa.Float(), nullable=True),
        sa.Column("interval_level", sa.Float(), nullable=True),
        sa.Column("n_history_days", sa.Integer(), nullable=False),
        sa.CheckConstraint("target IN ('occupancy_pct', 'vehicle_count', 'pedestrian_count')", name="ck_demand_forecast_target"),
        sa.ForeignKeyConstraint(["model_version_id"], ["forecast_model_version.id"], name="fk_demand_forecast_model_version_id_forecast_model_version", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["zone_id"], ["zone.id"], name="fk_demand_forecast_zone_id_zone", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_demand_forecast"),
        sa.UniqueConstraint("zone_id", "target", "target_ts", "model_version_id", "generated_at", name="uq_demand_forecast_unique"),
    )
    op.create_index("ix_demand_forecast_zone_target_ts", "demand_forecast", ["zone_id", "target", "target_ts"])

    op.create_table(
        "availability_probability",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requested_arrival_ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("estimated_arrival_ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("total_capacity", sa.Integer(), nullable=False),
        sa.Column("expected_occupancy_pct", sa.Float(), nullable=True),
        sa.Column("expected_available", sa.Float(), nullable=True),
        sa.Column("probability", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("method", sa.String(length=50), nullable=False),
        sa.Column("n_simulations", sa.Integer(), nullable=True),
        sa.Column("model_version_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("data_freshness_s", sa.Integer(), nullable=True),
        sa.Column("reliability", sa.Text(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("reliability IN ('unavailable', 'low', 'medium', 'high')", name="ck_avail_prob_reliability"),
        sa.ForeignKeyConstraint(["model_version_id"], ["forecast_model_version.id"], name="fk_availability_probability_model_version", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["zone_id"], ["zone.id"], name="fk_availability_probability_zone_id_zone", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_availability_probability"),
    )
    op.create_index(
        "ix_availability_probability_zone_generated",
        "availability_probability",
        ["zone_id", sa.text("generated_at DESC")],
    )

    # Idempotently seed the initial baseline seasonal_naive models across all 3 targets.
    # `uq_forecast_model_name_version` enforces uniqueness on `(name, version)` while
    # `uq_model_one_active_per_target` allows one active model per target, so each target
    # uses a distinct `(name, version)` pair with `ON CONFLICT (name, version) DO NOTHING`.
    seed_rows = _deduplicate_forecast_models(
        [
            {
                "id": uuid.uuid4(),
                "name": "seasonal_naive",
                "version": "0",
                "target": "occupancy_pct",
                "kind": "seasonal_naive",
                "trained_on": "none",
                "status": "active",
                "params": {},
                "metrics": {},
            },
            {
                "id": uuid.uuid4(),
                "name": "seasonal_naive",
                "version": "0-vehicle_count",
                "target": "vehicle_count",
                "kind": "seasonal_naive",
                "trained_on": "none",
                "status": "active",
                "params": {},
                "metrics": {},
            },
            {
                "id": uuid.uuid4(),
                "name": "seasonal_naive",
                "version": "0-pedestrian_count",
                "target": "pedestrian_count",
                "kind": "seasonal_naive",
                "trained_on": "none",
                "status": "active",
                "params": {},
                "metrics": {},
            },
        ]
    )
    if seed_rows:
        op.execute(
            postgresql.insert(model_table)
            .values(seed_rows)
            .on_conflict_do_nothing(index_elements=["name", "version"])
        )


def downgrade() -> None:
    op.drop_table("availability_probability")
    op.drop_table("demand_forecast")
    op.drop_table("forecast_model_version")
    op.drop_table("occupancy_aggregate")
