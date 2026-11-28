"""In-memory implementation of RunRepository for deterministic testing and local execution."""
from __future__ import annotations

from typing import Optional
from packages.domain.models import RunManifest, RunMetrics, SimulationEvent
from packages.simulation.state import SimulationState
from packages.persistence.repository import RunRecord, RunRepository


class MemoryRunRepository(RunRepository):
    def __init__(self):
        self._runs: dict[str, RunRecord] = {}

    async def create_run(self, manifest: RunManifest) -> RunRecord:
        record = RunRecord(manifest=manifest, status="created")
        self._runs[manifest.run_id] = record
        return record

    async def get_run(self, run_id: str) -> Optional[RunRecord]:
        return self._runs.get(run_id)

    async def list_runs(self) -> list[RunRecord]:
        return list(self._runs.values())

    async def update_status(self, run_id: str, status: str) -> None:
        if run_id in self._runs:
            self._runs[run_id].status = status

    async def append_events(self, run_id: str, events: list[SimulationEvent]) -> None:
        if run_id in self._runs:
            self._runs[run_id].events.extend(events)

    async def get_events(
        self, run_id: str, from_sequence: Optional[int] = None, to_sequence: Optional[int] = None
    ) -> list[SimulationEvent]:
        run = self._runs.get(run_id)
        if not run:
            return []
        evs = run.events
        if from_sequence is not None:
            evs = [e for e in evs if e.sequence >= from_sequence]
        if to_sequence is not None:
            evs = [e for e in evs if e.sequence <= to_sequence]
        return evs

    async def save_snapshot(self, run_id: str, tick: int, state: SimulationState) -> None:
        if run_id in self._runs:
            self._runs[run_id].snapshots[tick] = state.clone()

    async def get_snapshot(self, run_id: str, tick: Optional[int] = None) -> Optional[SimulationState]:
        run = self._runs.get(run_id)
        if not run or not run.snapshots:
            return None
        if tick is not None and tick in run.snapshots:
            return run.snapshots[tick]
        # Return latest snapshot
        max_tick = max(run.snapshots.keys())
        return run.snapshots[max_tick]

    async def save_metrics(self, run_id: str, metrics: RunMetrics) -> None:
        if run_id in self._runs:
            self._runs[run_id].metrics = metrics

    async def complete_run(self, run_id: str, metrics: RunMetrics) -> None:
        if run_id in self._runs:
            self._runs[run_id].metrics = metrics
            self._runs[run_id].status = "completed"
