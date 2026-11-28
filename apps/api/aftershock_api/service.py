"""Application RunService orchestrating simulation execution and storage."""
from __future__ import annotations

import asyncio
import hashlib
import json
from pathlib import Path
from typing import Optional

from packages.domain.models import (
    DistrictModel,
    Scenario,
    Intervention,
    RunManifest,
    RunMetrics,
    SimulationEvent,
)
from packages.graph.builder import build_graph, InvalidModelError
from packages.graph.validator import compute_graph_metrics, validate_model
from packages.persistence.memory import MemoryRunRepository
from packages.persistence.repository import RunRecord
from packages.simulation.kernel import Simulator
from packages.simulation.state import SimulationState
from packages.metrics.calculator import compute_run_metrics, compare_runs
from apps.api.aftershock_api.bus import event_bus


class RunService:
    def __init__(self, repository: MemoryRunRepository):
        self.repo = repository
        self.districts: dict[str, DistrictModel] = {}
        self.scenarios: dict[str, Scenario] = {}
        self.active_simulators: dict[str, Simulator] = {}
        self.active_tasks: dict[str, asyncio.Task] = {}
        self.comparisons: dict[str, dict] = {}
        self._load_default_fixtures()

    def _load_default_fixtures(self):
        # Mini fixture
        mini_path = Path("fixtures/district_mini")
        if (mini_path / "district.json").exists():
            with open(mini_path / "district.json") as f:
                d = DistrictModel(**json.load(f))
                self.districts[d.project_id] = d
            with open(mini_path / "scenario.json") as f:
                s = Scenario(**json.load(f))
                self.scenarios[s.scenario_id] = s

        # V1 fixture
        v1_path = Path("fixtures/district_v1")
        if (v1_path / "district.json").exists():
            with open(v1_path / "district.json") as f:
                d = DistrictModel(**json.load(f))
                self.districts[d.project_id] = d
            with open(v1_path / "scenario.json") as f:
                s = Scenario(**json.load(f))
                self.scenarios[s.scenario_id] = s

    def get_district(self, project_id: str) -> Optional[DistrictModel]:
        return self.districts.get(project_id)

    def get_scenario(self, scenario_id: str) -> Optional[Scenario]:
        return self.scenarios.get(scenario_id)

    async def create_run(
        self,
        project_id: str,
        scenario_id: str,
        seed: Optional[int] = None,
        interventions: Optional[list[Intervention]] = None,
        run_id: Optional[str] = None,
    ) -> RunRecord:
        district = self.get_district(project_id)
        if not district:
            raise InvalidModelError(f"Project/District {project_id} not found")
        scenario = self.get_scenario(scenario_id)
        if not scenario:
            raise InvalidModelError(f"Scenario {scenario_id} not found")

        resolved_seed = seed if seed is not None else scenario.seed
        r_id = run_id or f"RUN-{len(await self.repo.list_runs()) + 1:04d}"

        model_hash = hashlib.sha256(district.model_dump_json().encode()).hexdigest()
        scen_hash = hashlib.sha256(scenario.model_dump_json().encode()).hexdigest()

        manifest = RunManifest(
            run_id=r_id,
            project_id=project_id,
            scenario_id=scenario_id,
            seed=resolved_seed,
            tick_seconds=scenario.tick_seconds,
            horizon_ticks=scenario.horizon_ticks,
            simulator_version="0.1.0",
            model_hash=model_hash,
            scenario_hash=scen_hash,
            interventions=interventions or [],
        )

        record = await self.repo.create_run(manifest)

        # Initialize simulator instance
        sim = Simulator(
            district=district,
            scenario=scenario,
            interventions=interventions or [],
            seed=resolved_seed,
            run_id=r_id,
        )
        self.active_simulators[r_id] = sim
        await self.repo.save_snapshot(r_id, 0, sim.state)

        return record

    async def execute_run_stream(self, run_id: str, tick_delay: float = 0.05) -> None:
        """Run the simulation tick-by-tick and broadcast events over the bus."""
        sim = self.active_simulators.get(run_id)
        record = await self.repo.get_run(run_id)
        if not sim or not record:
            return

        district = self.get_district(record.manifest.project_id)
        await self.repo.update_status(run_id, "running")

        try:
            for step_res in sim.run():
                await self.repo.append_events(run_id, step_res.events)
                await self.repo.save_snapshot(run_id, step_res.tick, step_res.state)

                for ev in step_res.events:
                    await event_bus.publish(run_id, ev)

                if tick_delay > 0:
                    await asyncio.sleep(tick_delay)

            # Compute final metrics
            resources_consumed = sum(i.resource_cost for i in record.manifest.interventions)
            metrics = compute_run_metrics(
                district=district,
                history=sim.history,
                events=sim.all_events,
                run_id=run_id,
                resources_consumed=resources_consumed,
            )
            await self.repo.complete_run(run_id, metrics)

            # Emit final completion event
            done_ev = sim.emitter.emit(
                tick=sim.state.tick,
                event_type="simulation_completed",
                cause_code="horizon_reached",
                evidence={"total_ticks": sim.state.tick, "total_events": len(sim.all_events)},
            )
            await self.repo.append_events(run_id, [done_ev])
            await event_bus.publish(run_id, done_ev)

        except asyncio.CancelledError:
            await self.repo.update_status(run_id, "cancelled")
            raise

    def start_background_run(self, run_id: str, tick_delay: float = 0.02) -> None:
        task = asyncio.create_task(self.execute_run_stream(run_id, tick_delay=tick_delay))
        self.active_tasks[run_id] = task

    async def step_single_tick(self, run_id: str) -> Optional[dict]:
        sim = self.active_simulators.get(run_id)
        record = await self.repo.get_run(run_id)
        if not sim or not record:
            return None

        if sim.state.tick >= sim.scenario.horizon_ticks:
            return None

        result = sim.step()
        await self.repo.append_events(run_id, result.events)
        await self.repo.save_snapshot(run_id, result.tick, result.state)

        for ev in result.events:
            await event_bus.publish(run_id, ev)

        return {
            "tick": result.tick,
            "events": [e.model_dump() for e in result.events],
            "assets": {aid: st.model_dump() for aid, st in result.state.assets.items()},
        }


# Singleton service instance
default_repo = MemoryRunRepository()
run_service = RunService(default_repo)
