"""SQLite persistence and tamper-evident audit log store for SENTINEL Product."""

from __future__ import annotations

import hashlib
import json
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any


def utc_now_iso() -> str:
    """Return current UTC timestamp in ISO-8601 format."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def canonical_json(obj: Any) -> str:
    """Deterministic compact JSON serialization for hashing and digests."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def sha256_hex(data: str) -> str:
    """Compute SHA-256 hex digest of a UTF-8 string."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


class ProductStore:
    """Thread-safe SQLite store with transactional state transitions and hash-chained events."""

    def __init__(self, db_path: str = ":memory:") -> None:
        self.db_path = db_path
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self) -> None:
        with self._lock:
            cur = self._conn.cursor()
            cur.executescript(
                """
                PRAGMA journal_mode=WAL;
                PRAGMA foreign_keys=ON;

                CREATE TABLE IF NOT EXISTS runs (
                    run_id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    template_id TEXT NOT NULL,
                    contract_id TEXT NOT NULL,
                    contract_json TEXT NOT NULL,
                    policy_version TEXT NOT NULL,
                    mode TEXT NOT NULL,
                    status TEXT NOT NULL,
                    comparison_id TEXT,
                    fixture_id TEXT,
                    fixture_version TEXT,
                    evidence_source TEXT NOT NULL DEFAULT 'product',
                    agent_id TEXT,
                    calls_used INTEGER NOT NULL DEFAULT 0,
                    bytes_used INTEGER NOT NULL DEFAULT 0,
                    repeat_counts_json TEXT NOT NULL DEFAULT '{}',
                    read_only_quarantine INTEGER NOT NULL DEFAULT 0,
                    output_verdict_json TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS manifests (
                    tool_id TEXT PRIMARY KEY,
                    connector_id TEXT NOT NULL,
                    description TEXT NOT NULL,
                    schema_json TEXT NOT NULL,
                    side_effect TEXT NOT NULL,
                    data_labels_json TEXT NOT NULL,
                    required_privileges_json TEXT NOT NULL,
                    allowed_sinks_json TEXT NOT NULL,
                    fingerprint TEXT NOT NULL,
                    approved_fingerprint TEXT,
                    status TEXT NOT NULL,
                    sandbox_only INTEGER NOT NULL DEFAULT 0,
                    approved_by TEXT,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS decisions (
                    decision_id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    action_id TEXT NOT NULL,
                    tool_id TEXT NOT NULL,
                    arguments_json TEXT NOT NULL,
                    canonical_arguments_json TEXT,
                    args_hash TEXT NOT NULL,
                    verdict TEXT NOT NULL,
                    rule_id TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    approval_id TEXT,
                    created_at TEXT NOT NULL,
                    UNIQUE(run_id, action_id)
                );

                CREATE TABLE IF NOT EXISTS approvals (
                    approval_id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    tenant_id TEXT NOT NULL,
                    contract_id TEXT NOT NULL,
                    tool_id TEXT NOT NULL,
                    argument_digest TEXT NOT NULL,
                    canonical_arguments_json TEXT NOT NULL,
                    before_state_json TEXT,
                    after_state_json TEXT,
                    status TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    decided_by TEXT,
                    decided_at TEXT,
                    consumed_at TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS reservations (
                    reservation_id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    action_id TEXT NOT NULL,
                    decision_id TEXT NOT NULL,
                    approval_id TEXT,
                    tool_id TEXT NOT NULL,
                    canonical_arguments_json TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    UNIQUE(run_id, action_id)
                );

                CREATE TABLE IF NOT EXISTS audit_events (
                    seq INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_id TEXT NOT NULL,
                    run_id TEXT NOT NULL,
                    action_id TEXT,
                    origin TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    outcome TEXT NOT NULL,
                    details_json TEXT NOT NULL,
                    recorded_at TEXT NOT NULL,
                    prev_hash TEXT NOT NULL,
                    event_hash TEXT NOT NULL,
                    UNIQUE(run_id, event_id)
                );

                CREATE TABLE IF NOT EXISTS ingested_artifacts (
                    artifact_id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    carrier TEXT NOT NULL,
                    source_ref TEXT NOT NULL,
                    trust TEXT NOT NULL,
                    sensitivity TEXT NOT NULL,
                    visible_text TEXT NOT NULL,
                    extracted_text TEXT NOT NULL,
                    spans_json TEXT NOT NULL,
                    risk_signal_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS memory_entries (
                    memory_id TEXT PRIMARY KEY,
                    run_id TEXT NOT NULL,
                    namespace TEXT NOT NULL,
                    content TEXT NOT NULL,
                    provenance TEXT NOT NULL,
                    source_trust TEXT NOT NULL,
                    quarantined INTEGER NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS share_tokens (
                    token_id TEXT PRIMARY KEY,
                    token_hash TEXT NOT NULL UNIQUE,
                    run_id TEXT NOT NULL,
                    tenant_id TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    revoked INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS agent_inventory (
                    agent_id TEXT PRIMARY KEY,
                    display_name TEXT NOT NULL,
                    registered_tools_json TEXT NOT NULL,
                    baseline_json TEXT NOT NULL,
                    deviations_json TEXT NOT NULL,
                    last_seen_at TEXT NOT NULL
                );
                """
            )
            self._conn.commit()

    def lock(self) -> threading.RLock:
        return self._lock

    def execute(self, sql: str, params: tuple[Any, ...] = ()) -> sqlite3.Cursor:
        with self._lock:
            cur = self._conn.execute(sql, params)
            self._conn.commit()
            return cur

    def fetch_one(self, sql: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute(sql, params).fetchone()
            return dict(row) if row is not None else None

    def fetch_all(self, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(sql, params).fetchall()
            return [dict(r) for r in rows]

    def append_hash_chained_event(
        self,
        *,
        event_id: str,
        run_id: str,
        action_id: str | None,
        origin: str,
        kind: str,
        outcome: str,
        details: dict[str, Any],
        recorded_at: str | None = None,
    ) -> dict[str, Any]:
        """Idempotently append an ordered, tamper-evident hash-chained audit event."""
        with self._lock:
            existing = self.fetch_one(
                "SELECT * FROM audit_events WHERE run_id = ? AND event_id = ?",
                (run_id, event_id),
            )
            if existing is not None:
                return {
                    **existing,
                    "details": json.loads(existing["details_json"]),
                }

            last = self.fetch_one(
                "SELECT event_hash FROM audit_events WHERE run_id = ? ORDER BY seq DESC LIMIT 1",
                (run_id,),
            )
            prev_hash = last["event_hash"] if last is not None else ("0" * 64)
            ts = recorded_at or utc_now_iso()
            details_json = canonical_json(details)
            payload_to_hash = canonical_json(
                {
                    "prev_hash": prev_hash,
                    "event_id": event_id,
                    "run_id": run_id,
                    "action_id": action_id,
                    "origin": origin,
                    "kind": kind,
                    "outcome": outcome,
                    "details": details,
                    "recorded_at": ts,
                }
            )
            event_hash = sha256_hex(payload_to_hash)

            self._conn.execute(
                """
                INSERT INTO audit_events (
                    event_id, run_id, action_id, origin, kind, outcome,
                    details_json, recorded_at, prev_hash, event_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_id,
                    run_id,
                    action_id,
                    origin,
                    kind,
                    outcome,
                    details_json,
                    ts,
                    prev_hash,
                    event_hash,
                ),
            )
            self._conn.commit()
            row = self.fetch_one(
                "SELECT * FROM audit_events WHERE run_id = ? AND event_id = ?",
                (run_id, event_id),
            )
            assert row is not None
            return {
                **row,
                "details": json.loads(row["details_json"]),
            }

    def verify_event_chain(self, run_id: str) -> bool:
        """Verify SHA-256 hash continuity across all audit events for a run."""
        events = self.fetch_all(
            "SELECT * FROM audit_events WHERE run_id = ? ORDER BY seq ASC",
            (run_id,),
        )
        expected_prev = "0" * 64
        for ev in events:
            if ev["prev_hash"] != expected_prev:
                return False
            details = json.loads(ev["details_json"])
            recomputed = sha256_hex(
                canonical_json(
                    {
                        "prev_hash": ev["prev_hash"],
                        "event_id": ev["event_id"],
                        "run_id": ev["run_id"],
                        "action_id": ev["action_id"],
                        "origin": ev["origin"],
                        "kind": ev["kind"],
                        "outcome": ev["outcome"],
                        "details": details,
                        "recorded_at": ev["recorded_at"],
                    }
                )
            )
            if ev["event_hash"] != recomputed:
                return False
            expected_prev = ev["event_hash"]
        return True
