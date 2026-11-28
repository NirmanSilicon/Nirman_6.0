"""Event factory and emitter for simulation provenance."""
from __future__ import annotations

import uuid
from typing import Any, Optional
from packages.domain.models import SimulationEvent


class EventEmitter:
    def __init__(self, run_id: str, starting_sequence: int = 0):
        self.run_id = run_id
        self._sequence = starting_sequence

    @property
    def current_sequence(self) -> int:
        return self._sequence

    def emit(
        self,
        tick: int,
        event_type: str,
        cause_code: str,
        asset_id: Optional[str] = None,
        dependency_id: Optional[str] = None,
        previous_state: Optional[str] = None,
        new_state: Optional[str] = None,
        parent_event_ids: Optional[list[str]] = None,
        evidence: Optional[dict[str, Any]] = None,
    ) -> SimulationEvent:
        self._sequence += 1
        return SimulationEvent(
            event_id=f"EV-{self._sequence:04d}",
            run_id=self.run_id,
            sequence=self._sequence,
            tick=tick,
            event_type=event_type,
            asset_id=asset_id,
            dependency_id=dependency_id,
            previous_state=previous_state,
            new_state=new_state,
            cause_code=cause_code,
            parent_event_ids=parent_event_ids or [],
            evidence=evidence or {},
        )
