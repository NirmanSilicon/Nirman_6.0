"""Deterministic simulation kernel for AFTERSHOCK."""
from __future__ import annotations

from copy import deepcopy
from typing import Generator, Optional
import numpy as np
import networkx as nx

from packages.domain.enums import (
    AssetType,
    LogicalState,
    DependencyType,
    DependencyMode,
    InterventionType,
)
from packages.domain.models import (
    Asset,
    Dependency,
    Scenario,
    Intervention,
    SimulationEvent,
    DistrictModel,
)
from packages.graph.builder import build_graph
from packages.simulation.hazard import evaluate_hazard_at_position
from packages.simulation.state import AssetRuntimeState, SimulationState
from packages.simulation.events import EventEmitter


class TickResult:
    def __init__(self, tick: int, state: SimulationState, events: list[SimulationEvent]):
        self.tick = tick
        self.state = state
        self.events = events


class Simulator:
    def __init__(
        self,
        district: DistrictModel,
        scenario: Scenario,
        interventions: Optional[list[Intervention]] = None,
        seed: Optional[int] = None,
        run_id: str = "RUN-001",
    ):
        self.district = district
        self.scenario = scenario
        self.interventions = interventions or []
        self.seed = seed if seed is not None else scenario.seed
        self.run_id = run_id

        # Deterministic RNG
        self.rng = np.random.default_rng(self.seed)

        # Graph construction
        self.graph = build_graph(district.assets, district.dependencies)
        self.assets_by_id = {a.asset_id: a for a in sorted(district.assets, key=lambda x: x.asset_id)}
        self.dependencies_by_id = {d.dependency_id: d for d in sorted(district.dependencies, key=lambda x: x.dependency_id)}

        self.emitter = EventEmitter(run_id=self.run_id)
        self.state = self._initialize_state()
        self.active_interventions: dict[str, Intervention] = {}
        self.history: list[SimulationState] = []
        self.all_events: list[SimulationEvent] = []

    def _initialize_state(self) -> SimulationState:
        state = SimulationState(tick=0, sequence=0)
        for asset_id, asset in sorted(self.assets_by_id.items()):
            state.assets[asset_id] = AssetRuntimeState(
                asset_id=asset_id,
                physical_damage=asset.physical_damage,
                intrinsic_capacity=asset.intrinsic_capacity_fraction,
                delivered_service=asset.delivered_service_fraction,
                logical_state=asset.logical_state,
                active_backups=[b.model_copy(deep=True) for b in asset.backup],
                service_history=[asset.delivered_service_fraction],
                grace_ticks_remaining={
                    d.dependency_id: d.grace_ticks
                    for d in self.dependencies_by_id.values()
                    if d.target_asset_id == asset_id
                },
                repair_ticks_remaining=None,
                is_protected=False,
                protection_factor=0.0,
            )
        return state

    def step(self) -> TickResult:
        tick = self.state.tick + 1
        previous = self.state.clone()
        next_state = self.state.clone()
        next_state.tick = tick
        tick_events: list[SimulationEvent] = []

        # 1. Apply scheduled intervention starts
        self._apply_interventions(previous, next_state, tick, tick_events)

        # 2 & 3. Evaluate hazard and apply direct damage
        self._apply_hazard_and_damage(previous, next_state, tick, tick_events)

        # 4. Process repairs
        self._process_repairs(previous, next_state, tick, tick_events)

        # 5. Compute intrinsic physical capacity
        for asset_id, rstate in next_state.assets.items():
            rstate.intrinsic_capacity = max(0.0, 1.0 - rstate.physical_damage)

        # 6 & 7. Evaluate upstream service dependencies (using previous tick state to prevent cycles)
        dependency_supplies, dep_events = self._evaluate_dependencies(previous, next_state, tick)
        tick_events.extend(dep_events)

        # 8 & 9. Calculate backup activation, output, and inventory depletion
        backup_outputs, bkp_events = self._apply_backups(previous, next_state, dependency_supplies, tick)
        tick_events.extend(bkp_events)

        # 10 & 11. Derive delivered service and logical states
        state_events = self._derive_service_and_states(previous, next_state, dependency_supplies, backup_outputs, tick)
        tick_events.extend(state_events)

        # 12. Record event references in state
        for ev in tick_events:
            if ev.asset_id:
                next_state.recent_events_by_asset[ev.asset_id] = ev.event_id
            next_state.recent_events_by_type[ev.event_type] = ev.event_id

        next_state.events.extend(tick_events)
        next_state.sequence = self.emitter.current_sequence

        for asset_id, rstate in next_state.assets.items():
            rstate.service_history.append(rstate.delivered_service)

        self.state = next_state
        self.history.append(next_state.clone())
        self.all_events.extend(tick_events)

        return TickResult(tick=tick, state=next_state, events=tick_events)

    def run(self) -> Generator[TickResult, None, None]:
        """Run the simulation through all horizon ticks."""
        for _ in range(self.scenario.horizon_ticks):
            result = self.step()
            yield result

    def run_all(self) -> list[TickResult]:
        """Synchronously execute full run."""
        return list(self.run())

    # ------------------ Step Helpers ------------------ #

    def _apply_interventions(
        self,
        prev: SimulationState,
        curr: SimulationState,
        tick: int,
        events: list[SimulationEvent],
    ) -> None:
        for intervention in sorted(self.interventions, key=lambda x: x.intervention_id):
            if intervention.start_tick == tick:
                target_id = intervention.target_asset_id
                if target_id in curr.assets:
                    rstate = curr.assets[target_id]
                    if intervention.type == InterventionType.PROTECT_ASSET:
                        rstate.is_protected = True
                        rstate.protection_factor = intervention.effect.get("protection_factor", 0.8)
                    elif intervention.type == InterventionType.DEPLOY_BACKUP:
                        extra_inventory = intervention.effect.get("inventory", 20.0)
                        max_output = intervention.effect.get("max_output", 1.0)
                        from packages.domain.models import BackupResource
                        rstate.active_backups.append(
                            BackupResource(
                                resource_type="deployed_mobile_backup",
                                remaining_inventory=extra_inventory,
                                max_output_per_tick=max_output,
                                conversion_efficiency=1.0,
                                is_active=False,
                            )
                        )
                    elif intervention.type == InterventionType.REPAIR_ASSET:
                        duration = intervention.duration_ticks or 10
                        rstate.repair_ticks_remaining = duration
                        rstate.logical_state = LogicalState.REPAIRING

                    ev = self.emitter.emit(
                        tick=tick,
                        event_type="intervention_started",
                        cause_code=f"intervention_{intervention.type}",
                        asset_id=target_id,
                        evidence={
                            "intervention_id": intervention.intervention_id,
                            "type": intervention.type,
                            "effect": intervention.effect,
                        },
                    )
                    events.append(ev)

    def _apply_hazard_and_damage(
        self,
        prev: SimulationState,
        curr: SimulationState,
        tick: int,
        events: list[SimulationEvent],
    ) -> None:
        for asset_id in sorted(self.assets_by_id.keys()):
            asset = self.assets_by_id[asset_id]
            rstate = curr.assets[asset_id]
            hazard = evaluate_hazard_at_position(asset.position, self.scenario.flood_sources, tick)

            if hazard > 0.05:
                # Check if exposed for the first time
                hazard_parent = prev.recent_events_by_asset.get(asset_id)
                ev_hazard = self.emitter.emit(
                    tick=tick,
                    event_type="hazard_exposure",
                    cause_code="flood_inundation",
                    asset_id=asset_id,
                    evidence={"hazard_intensity": round(hazard, 4)},
                )
                events.append(ev_hazard)

                # Monotone fragility formula: clamp(vulnerability * max(0, hazard - threshold), 0, 1)
                eff_threshold = asset.resistance_threshold
                if rstate.is_protected:
                    eff_threshold += rstate.protection_factor

                excess = max(0.0, hazard - eff_threshold)
                if excess > 0:
                    delta_damage = min(1.0, asset.vulnerability_scale * excess * 0.25)
                    new_damage = min(1.0, rstate.physical_damage + delta_damage)
                    if new_damage > rstate.physical_damage + 0.01:
                        rstate.physical_damage = new_damage
                        ev_damage = self.emitter.emit(
                            tick=tick,
                            event_type="direct_damage",
                            cause_code="structural_flood_damage",
                            asset_id=asset_id,
                            parent_event_ids=[ev_hazard.event_id],
                            evidence={
                                "damage_fraction": round(new_damage, 4),
                                "delta_damage": round(delta_damage, 4),
                            },
                        )
                        events.append(ev_damage)

    def _process_repairs(
        self,
        prev: SimulationState,
        curr: SimulationState,
        tick: int,
        events: list[SimulationEvent],
    ) -> None:
        for asset_id, rstate in curr.assets.items():
            if rstate.repair_ticks_remaining is not None:
                rstate.repair_ticks_remaining -= 1
                if rstate.repair_ticks_remaining <= 0:
                    rstate.repair_ticks_remaining = None
                    rstate.physical_damage = max(0.0, rstate.physical_damage - 0.9)
                    ev_rep = self.emitter.emit(
                        tick=tick,
                        event_type="repair_completed",
                        cause_code="crew_restoration",
                        asset_id=asset_id,
                        evidence={"physical_damage": round(rstate.physical_damage, 4)},
                    )
                    events.append(ev_rep)

    def _evaluate_dependencies(
        self,
        prev: SimulationState,
        curr: SimulationState,
        tick: int,
    ) -> tuple[dict[str, float], list[SimulationEvent]]:
        supplies: dict[str, float] = {}
        events: list[SimulationEvent] = []

        for asset_id in sorted(self.assets_by_id.keys()):
            incoming = [
                d for d in self.dependencies_by_id.values()
                if d.target_asset_id == asset_id
            ]
            if not incoming:
                supplies[asset_id] = 1.0
                continue

            hard_satisfactions: list[float] = []
            soft_weighted_sum = 0.0
            soft_total_weight = 0.0
            alt_groups: dict[str, list[Dependency]] = {}

            for dep in incoming:
                src_state = prev.assets.get(dep.source_asset_id)
                # Historical latency lookup
                latency = dep.latency_ticks
                if src_state and len(src_state.service_history) > latency:
                    src_service = src_state.service_history[-1 - latency]
                elif src_state:
                    src_service = src_state.delivered_service
                else:
                    src_service = 0.0

                if dep.mode == DependencyMode.HARD:
                    if src_service >= dep.minimum_fraction:
                        # Reset grace
                        curr.assets[asset_id].grace_ticks_remaining[dep.dependency_id] = dep.grace_ticks
                        hard_satisfactions.append(1.0)
                    else:
                        grace = curr.assets[asset_id].grace_ticks_remaining.get(dep.dependency_id, 0)
                        if grace > 0:
                            curr.assets[asset_id].grace_ticks_remaining[dep.dependency_id] = grace - 1
                            hard_satisfactions.append(1.0)
                        else:
                            hard_satisfactions.append(0.0)
                            parent_id = prev.recent_events_by_asset.get(dep.source_asset_id)
                            ev_cross = self.emitter.emit(
                                tick=tick,
                                event_type="dependency_threshold_crossed",
                                cause_code=f"insufficient_{dep.dependency_type}",
                                asset_id=asset_id,
                                dependency_id=dep.dependency_id,
                                parent_event_ids=[parent_id] if parent_id else [],
                                evidence={
                                    "source_service": round(src_service, 3),
                                    "threshold": dep.minimum_fraction,
                                },
                            )
                            events.append(ev_cross)

                elif dep.mode == DependencyMode.SOFT:
                    sat = min(1.0, max(0.0, src_service / max(0.01, dep.required_fraction)))
                    soft_weighted_sum += sat * dep.importance
                    soft_total_weight += dep.importance

                elif dep.mode == DependencyMode.ALTERNATIVE:
                    grp = dep.alternative_group or "default_alt"
                    alt_groups.setdefault(grp, []).append(dep)

            hard_sat = min(hard_satisfactions) if hard_satisfactions else 1.0
            soft_sat = (soft_weighted_sum / soft_total_weight) if soft_total_weight > 0 else 1.0

            alt_sat = 1.0
            for grp_name, deps in alt_groups.items():
                total_avail = 0.0
                req_total = sum(d.required_fraction for d in deps)
                for d in deps:
                    s_st = prev.assets.get(d.source_asset_id)
                    total_avail += s_st.delivered_service if s_st else 0.0
                alt_sat = min(alt_sat, min(1.0, total_avail / max(0.01, req_total)))

            supplies[asset_id] = min(hard_sat, soft_sat, alt_sat)

        return supplies, events

    def _apply_backups(
        self,
        prev: SimulationState,
        curr: SimulationState,
        supplies: dict[str, float],
        tick: int,
    ) -> tuple[dict[str, float], list[SimulationEvent]]:
        outputs: dict[str, float] = {}
        events: list[SimulationEvent] = []

        for asset_id, rstate in curr.assets.items():
            asset = self.assets_by_id[asset_id]
            norm_supply = supplies.get(asset_id, 1.0)
            unmet = max(0.0, asset.minimum_operational_service - norm_supply)

            total_output = 0.0
            if unmet > 0 and rstate.active_backups:
                for bkp in rstate.active_backups:
                    if bkp.remaining_inventory > 0:
                        if not bkp.is_active:
                            bkp.is_active = True
                            parent_ev = prev.recent_events_by_asset.get(asset_id)
                            ev_act = self.emitter.emit(
                                tick=tick,
                                event_type="backup_activated",
                                cause_code="power_loss_failover",
                                asset_id=asset_id,
                                parent_event_ids=[parent_ev] if parent_ev else [],
                                evidence={
                                    "remaining_inventory": round(bkp.remaining_inventory, 2),
                                    "unmet_demand": round(unmet, 3),
                                },
                            )
                            events.append(ev_act)

                        deliver = min(unmet - total_output, bkp.max_output_per_tick, bkp.remaining_inventory)
                        total_output += deliver
                        bkp.remaining_inventory = max(0.0, bkp.remaining_inventory - deliver / bkp.conversion_efficiency)

                        if bkp.remaining_inventory <= 0:
                            bkp.is_active = False
                            parent_ev = prev.recent_events_by_asset.get(asset_id)
                            ev_dep = self.emitter.emit(
                                tick=tick,
                                event_type="backup_depleted",
                                cause_code="backup_fuel_exhausted",
                                asset_id=asset_id,
                                parent_event_ids=[parent_ev] if parent_ev else [],
                                evidence={"remaining_inventory": 0.0},
                            )
                            events.append(ev_dep)

                    if total_output >= unmet:
                        break

            outputs[asset_id] = total_output

        return outputs, events

    def _derive_service_and_states(
        self,
        prev: SimulationState,
        curr: SimulationState,
        supplies: dict[str, float],
        backup_outputs: dict[str, float],
        tick: int,
    ) -> list[SimulationEvent]:
        events: list[SimulationEvent] = []

        for asset_id in sorted(self.assets_by_id.keys()):
            asset = self.assets_by_id[asset_id]
            rstate = curr.assets[asset_id]
            prev_rstate = prev.assets[asset_id]

            effective_supply = min(1.0, supplies.get(asset_id, 1.0) + backup_outputs.get(asset_id, 0.0))
            delivered = min(rstate.intrinsic_capacity, effective_supply)
            rstate.delivered_service = delivered

            old_state = prev_rstate.logical_state
            if rstate.intrinsic_capacity == 0.0 or delivered == 0.0:
                new_state = LogicalState.UNAVAILABLE
            elif delivered < asset.minimum_operational_service:
                new_state = LogicalState.DEGRADED
            elif rstate.repair_ticks_remaining is not None:
                new_state = LogicalState.REPAIRING
            elif old_state in (LogicalState.UNAVAILABLE, LogicalState.DEGRADED) and delivered >= asset.minimum_operational_service:
                new_state = LogicalState.RECOVERED
            else:
                new_state = LogicalState.OPERATIONAL

            rstate.logical_state = new_state

            if new_state != old_state:
                parent_id = prev.recent_events_by_asset.get(asset_id)
                event_type = f"asset_{new_state.value}"
                cause = (
                    "structural_failure" if rstate.intrinsic_capacity == 0.0
                    else "cascade_dependency_loss" if delivered < asset.minimum_operational_service
                    else "service_restoration"
                )
                ev = self.emitter.emit(
                    tick=tick,
                    event_type=event_type,
                    cause_code=cause,
                    asset_id=asset_id,
                    previous_state=old_state.value,
                    new_state=new_state.value,
                    parent_event_ids=[parent_id] if parent_id else [],
                    evidence={
                        "delivered_service": round(delivered, 3),
                        "intrinsic_capacity": round(rstate.intrinsic_capacity, 3),
                        "threshold": asset.minimum_operational_service,
                    },
                )
                events.append(ev)

        return events
