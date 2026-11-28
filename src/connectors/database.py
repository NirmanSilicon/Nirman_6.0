"""TimescaleDB asyncpg repository for time-series persistence."""

import json
import logging
from datetime import datetime
from typing import Any
import asyncpg
from src.config import settings

logger = logging.getLogger("VidyutSync.Database")


class TimescaleRepository:
    """Async repository for TimescaleDB telemetry, agent decisions, and reward metrics."""

    def __init__(self, dsn: str | None = None):
        self.dsn = dsn or settings.DATABASE_URL
        self.pool: asyncpg.Pool | None = None
        self._is_connected = False
        # In-memory buffer for offline/test environments
        self._in_memory_telemetry: list[dict] = []
        self._in_memory_decisions: list[dict] = []
        self._in_memory_rewards: list[dict] = []

    async def connect(self) -> bool:
        """Initializes connection pool and ensures hypertables exist."""
        try:
            self.pool = await asyncpg.create_pool(
                self.dsn,
                min_size=2,
                max_size=10,
                command_timeout=10,
            )
            self._is_connected = True
            logger.info("Connected to TimescaleDB.")
            await self._ensure_schema()
            return True
        except Exception as e:
            logger.warning(f"Could not connect to TimescaleDB ({e}). Operating in in-memory fallback mode.")
            self._is_connected = False
            return False

    async def disconnect(self):
        """Closes the connection pool."""
        if self.pool:
            await self.pool.close()
            self._is_connected = False
            logger.info("Disconnected from TimescaleDB.")

    async def _ensure_schema(self):
        """Creates hypertables if not already present."""
        if not self._is_connected or not self.pool:
            return

        async with self.pool.acquire() as conn:
            # Enable TimescaleDB extension
            await conn.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")

            # Telemetry table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS telemetry_stream (
                    time TIMESTAMPTZ NOT NULL,
                    asset_id VARCHAR(64) NOT NULL,
                    metric VARCHAR(64) NOT NULL,
                    value DOUBLE PRECISION NOT NULL,
                    unit VARCHAR(32)
                );
            """)
            try:
                await conn.execute("SELECT create_hypertable('telemetry_stream', 'time', if_not_exists => TRUE);")
            except Exception:
                pass

            # Decisions table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_decisions (
                    time TIMESTAMPTZ NOT NULL,
                    tick_id VARCHAR(64) NOT NULL,
                    agent_name VARCHAR(64) NOT NULL,
                    action_payload JSONB NOT NULL,
                    passed_guardrails BOOLEAN NOT NULL,
                    guardrail_modifications JSONB,
                    mode VARCHAR(32) NOT NULL DEFAULT 'shadow'
                );
            """)
            try:
                await conn.execute("SELECT create_hypertable('agent_decisions', 'time', if_not_exists => TRUE);")
            except Exception:
                pass

            # Rewards table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS orchestrator_rewards (
                    time TIMESTAMPTZ NOT NULL,
                    tick_id VARCHAR(64) NOT NULL,
                    r_carbon DOUBLE PRECISION NOT NULL,
                    r_cost DOUBLE PRECISION NOT NULL,
                    r_schedule DOUBLE PRECISION NOT NULL,
                    r_worker DOUBLE PRECISION NOT NULL,
                    r_total DOUBLE PRECISION NOT NULL
                );
            """)
            try:
                await conn.execute("SELECT create_hypertable('orchestrator_rewards', 'time', if_not_exists => TRUE);")
            except Exception:
                pass

    async def record_telemetry(self, asset_id: str, metric: str, value: float, unit: str = "", dt: datetime | None = None):
        """Records a single telemetry data point."""
        dt = dt or datetime.utcnow()
        if self._is_connected and self.pool:
            async with self.pool.acquire() as conn:
                await conn.execute(
                    "INSERT INTO telemetry_stream (time, asset_id, metric, value, unit) VALUES ($1, $2, $3, $4, $5)",
                    dt, asset_id, metric, float(value), unit,
                )
        else:
            self._in_memory_telemetry.append({
                "time": dt.isoformat(),
                "asset_id": asset_id,
                "metric": metric,
                "value": value,
                "unit": unit,
            })
            if len(self._in_memory_telemetry) > 2000:
                self._in_memory_telemetry.pop(0)

    async def record_decision(
        self,
        tick_id: str,
        agent_name: str,
        action_payload: dict,
        passed_guardrails: bool,
        modifications: dict | None = None,
        mode: str = "shadow",
        dt: datetime | None = None,
    ):
        """Records an agent's proposed action and validation outcome."""
        dt = dt or datetime.utcnow()
        if self._is_connected and self.pool:
            async with self.pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO agent_decisions
                    (time, tick_id, agent_name, action_payload, passed_guardrails, guardrail_modifications, mode)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    dt, tick_id, agent_name, json.dumps(action_payload), passed_guardrails,
                    json.dumps(modifications or {}), mode,
                )
        else:
            self._in_memory_decisions.append({
                "time": dt.isoformat(),
                "tick_id": tick_id,
                "agent_name": agent_name,
                "action_payload": action_payload,
                "passed_guardrails": passed_guardrails,
                "mode": mode,
            })

    async def record_reward(
        self,
        tick_id: str,
        r_carbon: float,
        r_cost: float,
        r_schedule: float,
        r_worker: float,
        r_total: float,
        dt: datetime | None = None,
    ):
        """Records composite multi-agent reward metrics."""
        dt = dt or datetime.utcnow()
        if self._is_connected and self.pool:
            async with self.pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO orchestrator_rewards
                    (time, tick_id, r_carbon, r_cost, r_schedule, r_worker, r_total)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    dt, tick_id, r_carbon, r_cost, r_schedule, r_worker, r_total,
                )
        else:
            self._in_memory_rewards.append({
                "time": dt.isoformat(),
                "tick_id": tick_id,
                "r_carbon": r_carbon,
                "r_cost": r_cost,
                "r_schedule": r_schedule,
                "r_worker": r_worker,
                "r_total": r_total,
            })

    async def get_recent_rewards(self, limit: int = 50) -> list[dict]:
        """Queries recent reward trajectory metrics for Grafana dashboards."""
        if self._is_connected and self.pool:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT time, tick_id, r_carbon, r_cost, r_schedule, r_worker, r_total "
                    "FROM orchestrator_rewards ORDER BY time DESC LIMIT $1",
                    limit,
                )
                return [dict(r) for r in rows]
        else:
            return list(reversed(self._in_memory_rewards[-limit:]))
