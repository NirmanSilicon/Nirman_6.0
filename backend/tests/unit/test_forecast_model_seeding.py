"""ParkSMART - Unit & Schema Tests for Idempotent Forecast Model Seeding (Migration 0006)."""

from __future__ import annotations

import importlib.util
import json
import re
import sqlite3
import sys
import types
import unittest
import uuid
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

MIGRATION_0006_PATH = (
    Path(__file__).resolve().parents[2]
    / "app"
    / "db"
    / "migrations"
    / "versions"
    / "0006_forecasting.py"
)

EXPECTED_INITIAL_SEEDS: tuple[tuple[str, str, str, str, str, str], ...] = (
    ("seasonal_naive", "0", "occupancy_pct", "seasonal_naive", "none", "active"),
    ("seasonal_naive", "0-vehicle_count", "vehicle_count", "seasonal_naive", "none", "active"),
    ("seasonal_naive", "0-pedestrian_count", "pedestrian_count", "seasonal_naive", "none", "active"),
)


def _load_migration_0006(op_stub: Any | None = None) -> Any:
    """Loads migration 0006 directly without requiring global Alembic installation."""
    injected_alembic = False
    if "alembic" not in sys.modules or op_stub is not None:
        alembic_mod = types.ModuleType("alembic")
        alembic_mod.op = op_stub or types.SimpleNamespace()  # type: ignore[attr-defined]
        prev_alembic = sys.modules.get("alembic")
        sys.modules["alembic"] = alembic_mod
        injected_alembic = True
    else:
        prev_alembic = None

    try:
        spec = importlib.util.spec_from_file_location("migration_0006_under_test", MIGRATION_0006_PATH)
        assert spec is not None and spec.loader is not None
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    finally:
        if injected_alembic:
            if prev_alembic is None:
                sys.modules.pop("alembic", None)
            else:
                sys.modules["alembic"] = prev_alembic


class _RecordingOp:
    """Minimal Alembic `op` stub capturing tables, indexes, and executed statements."""

    def __init__(self) -> None:
        self.tables: dict[str, sa.Table] = {}
        self.indexes: list[tuple[str, str]] = []
        self.executed: list[Any] = []
        self._metadata = sa.MetaData()

    def create_table(self, name: str, *columns_and_constraints: Any) -> sa.Table:
        tbl = sa.Table(name, self._metadata, *columns_and_constraints)
        self.tables[name] = tbl
        return tbl

    def create_index(self, name: str, table_name: str, columns: list[str], **kwargs: Any) -> None:
        self.indexes.append((name, table_name))

    def execute(self, stmt: Any) -> None:
        self.executed.append(stmt)

    def drop_table(self, name: str) -> None:
        pass


def _extract_pg_insert_rows(stmt: Any) -> tuple[str, list[dict[str, Any]]]:
    """Compiles a PostgreSQL INSERT statement and extracts its bound multi-row seed payloads."""
    compiled = stmt.compile(dialect=postgresql.dialect())
    params = dict(compiled.params)

    grouped: dict[int, dict[str, Any]] = {}
    multi_key_re = re.compile(r"^(.+)_m(\d+)$")
    for key, val in params.items():
        match = multi_key_re.match(key)
        if match:
            col_name, idx = match.group(1), int(match.group(2))
            grouped.setdefault(idx, {})[col_name] = val

    if grouped:
        return str(compiled), [grouped[idx] for idx in sorted(grouped)]
    return str(compiled), [params]


def _seed_sqlite_from_rows(
    conn: sqlite3.Connection,
    dedup_fn: Any,
    records: Sequence[Mapping[str, Any]],
) -> int:
    """Applies migration 0006's deduplication and ON CONFLICT semantics against SQLite."""
    normalized = [
        {
            "id": str(r.get("id") or uuid.uuid4()),
            "name": r["name"],
            "version": r["version"],
            "target": r["target"],
            "kind": r["kind"],
            "trained_on": r["trained_on"],
            "status": r["status"],
            "params": dict(r.get("params") or {}),
            "metrics": dict(r.get("metrics") or {}),
        }
        for r in records
    ]
    deduped = dedup_fn(normalized)
    if not deduped:
        return 0

    sql = (
        "INSERT INTO forecast_model_version "
        "(id, name, version, target, kind, trained_on, status, params, metrics) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) "
        "ON CONFLICT (name, version) DO NOTHING"
    )
    inserted = 0
    cursor = conn.cursor()
    for row in deduped:
        cursor.execute(
            sql,
            (
                str(row["id"]),
                str(row["name"]),
                str(row["version"]),
                row["target"],
                row["kind"],
                row["trained_on"],
                row["status"],
                json.dumps(row["params"]),
                json.dumps(row["metrics"]),
            ),
        )
        if cursor.rowcount and cursor.rowcount > 0:
            inserted += cursor.rowcount
    return inserted


class TestForecastModelSeeding(unittest.TestCase):
    """Tests covering migration 0006 self-containment, 3-target seeding, and constraints."""

    def _create_schema(self, conn: sqlite3.Connection) -> None:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.executescript(
            """
            CREATE TABLE forecast_model_version (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                version TEXT NOT NULL,
                target TEXT NOT NULL CHECK (target IN ('occupancy_pct', 'vehicle_count', 'pedestrian_count')),
                kind TEXT NOT NULL,
                trained_at TEXT,
                train_start TEXT,
                train_end TEXT,
                params TEXT NOT NULL DEFAULT '{}',
                metrics TEXT NOT NULL DEFAULT '{}',
                trained_on TEXT NOT NULL CHECK (trained_on IN ('simulated', 'observed', 'mixed', 'none')),
                status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'active', 'retired')),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_forecast_model_name_version UNIQUE (name, version)
            );

            CREATE UNIQUE INDEX uq_model_one_active_per_target
                ON forecast_model_version (target)
                WHERE status = 'active';

            CREATE TABLE demand_forecast (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_version_id TEXT NOT NULL,
                CONSTRAINT fk_demand_forecast_model_version_id_forecast_model_version
                    FOREIGN KEY (model_version_id) REFERENCES forecast_model_version (id) ON DELETE RESTRICT
            );

            CREATE TABLE availability_probability (
                id TEXT PRIMARY KEY,
                model_version_id TEXT,
                CONSTRAINT fk_availability_probability_model_version
                    FOREIGN KEY (model_version_id) REFERENCES forecast_model_version (id) ON DELETE SET NULL
            );
            """
        )

    def _get_migration_seed_rows(self) -> tuple[Any, str, list[dict[str, Any]]]:
        recorder = _RecordingOp()
        mod = _load_migration_0006(recorder)
        mod.upgrade()
        self.assertEqual(len(recorder.executed), 1)
        compiled_sql, rows = _extract_pg_insert_rows(recorder.executed[0])
        return mod, compiled_sql, rows

    def test_migration_0006_is_self_contained_and_emits_three_target_seeds(self) -> None:
        """Migration 0006 has no app.* imports, uses ON CONFLICT, and emits all 3 target rows."""
        content = MIGRATION_0006_PATH.read_text(encoding="utf-8")
        self.assertNotIn("from app.", content)
        self.assertNotIn("import app.", content)
        self.assertNotIn("op.bulk_insert(", content)

        _, compiled, rows = self._get_migration_seed_rows()
        self.assertIn("INSERT INTO forecast_model_version", compiled)
        self.assertIn("ON CONFLICT (name, version) DO NOTHING", compiled)

        actual_tuples = tuple(
            (r["name"], r["version"], r["target"], r["kind"], r["trained_on"], r["status"])
            for r in rows
        )
        self.assertEqual(actual_tuples, EXPECTED_INITIAL_SEEDS)

        name_version_pairs = [(r["name"], r["version"]) for r in rows]
        self.assertEqual(len(name_version_pairs), len(set(name_version_pairs)))

    def test_migration_0006_preserves_constraints_and_identifiers_within_63_bytes(self) -> None:
        """All constraints and indexes in migration 0006 remain intact and <= 63 bytes."""
        recorder = _RecordingOp()
        mod = _load_migration_0006(recorder)
        mod.upgrade()

        fk_names = [
            c.name
            for tbl in recorder.tables.values()
            for c in tbl.constraints
            if isinstance(c, sa.ForeignKeyConstraint)
        ]
        self.assertIn("fk_availability_probability_model_version", fk_names)
        self.assertNotIn(
            "fk_availability_probability_model_version_id_forecast_model_version", fk_names
        )

        unique_names = [
            c.name
            for tbl in recorder.tables.values()
            for c in tbl.constraints
            if isinstance(c, sa.UniqueConstraint)
        ]
        self.assertIn("uq_forecast_model_name_version", unique_names)

        idx_names = [idx_name for idx_name, _ in recorder.indexes]
        self.assertIn("uq_model_one_active_per_target", idx_names)

        all_names = [
            c.name
            for tbl in recorder.tables.values()
            for c in tbl.constraints
            if c.name
        ] + idx_names
        for name in all_names:
            self.assertLessEqual(len(name.encode("utf-8")), 63, f"Identifier too long: {name}")

    def test_fresh_db_and_repeated_seed_execution_are_idempotent(self) -> None:
        """Fresh DB gets all 3 target seeds once and repeated runs add zero duplicates."""
        mod, _, rows = self._get_migration_seed_rows()
        with sqlite3.connect(":memory:") as conn:
            self._create_schema(conn)
            first = _seed_sqlite_from_rows(conn, mod._deduplicate_forecast_models, rows)
            second = _seed_sqlite_from_rows(conn, mod._deduplicate_forecast_models, rows)
            stored = conn.execute(
                "SELECT name, version, target, kind, trained_on, status "
                "FROM forecast_model_version ORDER BY target"
            ).fetchall()

        self.assertEqual(first, 3)
        self.assertEqual(second, 0)
        self.assertEqual(
            stored,
            sorted(EXPECTED_INITIAL_SEEDS, key=lambda item: item[2]),
        )

    def test_preexisting_model_and_fk_references_preserved(self) -> None:
        """Pre-existing `(name, version)` IDs, metadata, and FK references stay intact across reruns."""
        mod, _, seed_rows = self._get_migration_seed_rows()
        existing_id = str(uuid.uuid4())
        forecast_id = str(uuid.uuid4())
        with sqlite3.connect(":memory:") as conn:
            self._create_schema(conn)
            conn.execute(
                """
                INSERT INTO forecast_model_version
                    (id, name, version, target, kind, trained_on, status, params, metrics)
                VALUES (?, 'seasonal_naive', '0-vehicle_count', 'vehicle_count', 'seasonal_naive', 'simulated', 'active', '{"season_hours": 168}', '{"mae": 4.2}')
                """,
                (existing_id,),
            )
            conn.execute("INSERT INTO demand_forecast (model_version_id) VALUES (?)", (existing_id,))
            conn.execute(
                "INSERT INTO availability_probability (id, model_version_id) VALUES (?, ?)",
                (forecast_id, existing_id),
            )

            inserted = _seed_sqlite_from_rows(conn, mod._deduplicate_forecast_models, seed_rows)
            model_row = conn.execute(
                "SELECT id, trained_on, params, metrics "
                "FROM forecast_model_version "
                "WHERE name = 'seasonal_naive' AND version = '0-vehicle_count'"
            ).fetchone()
            all_targets = [
                r[0]
                for r in conn.execute(
                    "SELECT target FROM forecast_model_version ORDER BY target"
                ).fetchall()
            ]
            df_ref = conn.execute("SELECT model_version_id FROM demand_forecast").fetchone()[0]
            ap_ref = conn.execute("SELECT model_version_id FROM availability_probability").fetchone()[0]

        self.assertEqual(inserted, 2)
        self.assertEqual(all_targets, ["occupancy_pct", "pedestrian_count", "vehicle_count"])
        self.assertEqual(model_row[0], existing_id)
        self.assertEqual(model_row[1], "simulated")
        self.assertEqual(model_row[2], '{"season_hours": 168}')
        self.assertEqual(model_row[3], '{"mae": 4.2}')
        self.assertEqual(df_ref, existing_id)
        self.assertEqual(ap_ref, existing_id)

    def test_duplicate_pairs_in_seed_input_deduplicated(self) -> None:
        """Duplicate `(name, version)` pairs in an input batch are deduplicated before insert."""
        mod = _load_migration_0006(_RecordingOp())
        duplicate_batch = [
            {
                "name": "seasonal_naive",
                "version": "0",
                "target": "occupancy_pct",
                "kind": "seasonal_naive",
                "trained_on": "none",
                "status": "active",
            },
            {
                "name": "seasonal_naive",
                "version": "0",
                "target": "vehicle_count",
                "kind": "seasonal_naive",
                "trained_on": "none",
                "status": "active",
            },
            {
                "name": "seasonal_naive",
                "version": "0-pedestrian_count",
                "target": "pedestrian_count",
                "kind": "seasonal_naive",
                "trained_on": "none",
                "status": "active",
            },
        ]
        deduped = mod._deduplicate_forecast_models(duplicate_batch)
        self.assertEqual(len(deduped), 2)
        self.assertEqual([(d["version"], d["target"]) for d in deduped], [("0", "occupancy_pct"), ("0-pedestrian_count", "pedestrian_count")])

        with sqlite3.connect(":memory:") as conn:
            self._create_schema(conn)
            inserted = _seed_sqlite_from_rows(conn, mod._deduplicate_forecast_models, duplicate_batch)
            count = conn.execute("SELECT COUNT(*) FROM forecast_model_version").fetchone()[0]

        self.assertEqual(inserted, 2)
        self.assertEqual(count, 2)

    def test_distinct_names_and_versions_still_inserted(self) -> None:
        """Distinct model names or versions continue to be inserted alongside seeded rows."""
        mod, _, seed_rows = self._get_migration_seed_rows()
        extra_candidate = [
            {
                "name": "historic_average",
                "version": "1",
                "target": "vehicle_count",
                "kind": "historic_average",
                "trained_on": "simulated",
                "status": "candidate",
            }
        ]
        with sqlite3.connect(":memory:") as conn:
            self._create_schema(conn)
            first = _seed_sqlite_from_rows(conn, mod._deduplicate_forecast_models, seed_rows)
            second = _seed_sqlite_from_rows(
                conn, mod._deduplicate_forecast_models, seed_rows + extra_candidate
            )
            count = conn.execute("SELECT COUNT(*) FROM forecast_model_version").fetchone()[0]

        self.assertEqual(first, 3)
        self.assertEqual(second, 1)
        self.assertEqual(count, 4)

    def test_unrelated_integrity_errors_not_suppressed(self) -> None:
        """Unrelated constraint errors (check violation, active-target conflict) still raise."""
        mod, _, seed_rows = self._get_migration_seed_rows()
        bad_status = [
            {
                "name": "broken_model",
                "version": "0",
                "target": "occupancy_pct",
                "kind": "seasonal_naive",
                "trained_on": "none",
                "status": "invalid_status",
            }
        ]
        second_active_for_vehicle = [
            {
                "name": "other_model",
                "version": "1",
                "target": "vehicle_count",
                "kind": "historic_average",
                "trained_on": "none",
                "status": "active",
            }
        ]
        with sqlite3.connect(":memory:") as conn:
            self._create_schema(conn)
            with self.assertRaises(sqlite3.IntegrityError):
                _seed_sqlite_from_rows(conn, mod._deduplicate_forecast_models, bad_status)

            _seed_sqlite_from_rows(conn, mod._deduplicate_forecast_models, seed_rows)
            with self.assertRaises(sqlite3.IntegrityError):
                _seed_sqlite_from_rows(
                    conn,
                    mod._deduplicate_forecast_models,
                    second_active_for_vehicle,
                )


if __name__ == "__main__":
    unittest.main()
