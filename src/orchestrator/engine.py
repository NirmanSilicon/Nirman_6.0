"""High-level Orchestrator Engine for VidyutSync.

Supports:
- Shadow mode vs live_pilot closed-loop execution
- Manual operator overrides
- Multi-agent negotiation coordination
- Telemetry & actuation callback dispatch
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Callable

from src.config import settings
from src.models.schemas import CooperativeActionPlan
from src.orchestrator.guardrails import SafetyGuardrails
from src.orchestrator.negotiator import DecPOMDPNegotiator
from src.orchestrator.reward_engine import OrchestratorRewardEngine
from src.orchestrator.state import FactoryState, WorkOrder

logger = logging.getLogger("VidyutSync.Orchestrator")


class VidyutSyncOrchestrator:
    """Central engine running real-time load-shifting orchestration."""

    def __init__(
        self,
        initial_state: FactoryState | None = None,
        execution_mode: str | None = None,
    ):
        self.state = initial_state or FactoryState.create_default()
        self.mode = execution_mode or settings.ORCHESTRATOR_MODE
        self.negotiator = DecPOMDPNegotiator()
        self.reward_engine = OrchestratorRewardEngine()
        self.guardrails = SafetyGuardrails()

        self._subscribers: list[Callable[[dict], None]] = []
        self._is_running = False
        self._ticker_task: asyncio.Task | None = None

        logger.info(f"VidyutSync Orchestrator initialized. Mode: {self.mode}")

    def register_event_listener(self, listener: Callable[[dict], None]):
        """Registers a callback for tick events (e.g. WebSocket broadcast)."""
        self._subscribers.append(listener)

    def set_execution_mode(self, mode: str) -> str:
        """Sets orchestrator mode to 'shadow' or 'live_pilot'."""
        if mode not in ["shadow", "live_pilot"]:
            raise ValueError(f"Invalid mode '{mode}'. Choose 'shadow' or 'live_pilot'.")
        self.mode = mode
        logger.info(f"Execution mode switched to: {self.mode}")
        return self.mode

    def apply_operator_override(self, asset_id: str, setpoints: dict[str, Any], notes: str = "") -> dict:
        """Sets a manual operator override that supersedes agent setpoints."""
        override = {
            "asset_id": asset_id,
            "setpoints": setpoints,
            "created_at": datetime.utcnow().isoformat(),
            "notes": notes,
            "is_active": True,
        }
        self.state.active_operator_overrides[asset_id] = override
        logger.warning(f"Operator Override applied on {asset_id}: {setpoints} (Notes: {notes})")
        return override

    def clear_operator_override(self, asset_id: str) -> bool:
        """Clears an active operator override."""
        if asset_id in self.state.active_operator_overrides:
            del self.state.active_operator_overrides[asset_id]
            logger.info(f"Operator Override cleared for {asset_id}")
            return True
        return False

    def update_telemetry(self, updates: dict[str, Any]):
        """Updates real-time plant telemetry from OPC UA or MQTT ingestion."""
        for k, v in updates.items():
            if hasattr(self.state, k):
                setattr(self.state, k, v)
        self.state.timestamp = datetime.utcnow()

    def add_work_order(self, order: WorkOrder):
        """Adds a new ERP work order into the active schedule."""
        self.state.active_orders.append(order)
        logger.info(f"Work order {order.order_id} added on {order.machine_id}")

    def execute_tick(self, state_override: dict[str, Any] | None = None) -> dict[str, Any]:
        """Executes a single Dec-POMDP negotiation tick and scores rewards."""
        if state_override:
            self.update_telemetry(state_override)

        # 1. Run Dec-POMDP multi-agent negotiation with hard safety guardrails
        action_plan = self.negotiator.negotiate_tick(
            state=self.state,
            execution_mode=self.mode,
        )

        # 2. Apply active operator overrides if present
        for asset_id, override in self.state.active_operator_overrides.items():
            if not override.get("is_active", True):
                continue
            setpoints = override.get("setpoints", {})
            if asset_id == "bess" and "bess_charge_discharge_kw" in setpoints:
                action_plan.microgrid_storage.bess_charge_discharge_kw = float(setpoints["bess_charge_discharge_kw"])
                action_plan.guardrail_corrections["operator_override_bess"] = setpoints["bess_charge_discharge_kw"]
            elif asset_id.startswith("cnc") or asset_id.startswith("oven"):
                for dec in action_plan.production_scheduling.decisions:
                    if dec.machine_id.lower() == asset_id.lower():
                        if "spindle_speed_pct" in setpoints:
                            dec.spindle_speed_pct = float(setpoints["spindle_speed_pct"])
                        if "action" in setpoints:
                            dec.action = setpoints["action"]
                        action_plan.guardrail_corrections[f"operator_override_{asset_id}"] = setpoints

        # Re-verify sanitized plan against physical rules after overrides
        action_plan = self.guardrails.validate_and_sanitize(action_plan, self.state)

        # 3. Evaluate composite reward
        breakdown = self.reward_engine.evaluate_tick(action_plan, self.state)

        # 4. Formulate event payload
        event_payload = {
            "tick_id": action_plan.tick_id,
            "timestamp": action_plan.timestamp.isoformat(),
            "mode": self.mode,
            "passed_guardrails": action_plan.passed_guardrails,
            "guardrail_warnings": action_plan.guardrail_warnings,
            "guardrail_corrections": action_plan.guardrail_corrections,
            "actions": {
                "grid_carbon": action_plan.grid_carbon.model_dump(),
                "microgrid_storage": action_plan.microgrid_storage.model_dump(),
                "production_scheduling": action_plan.production_scheduling.model_dump(),
                "ergonomics_shift": action_plan.ergonomics_shift.model_dump(),
            },
            "rewards": {
                "r_carbon": breakdown.r_carbon,
                "r_cost": breakdown.r_cost,
                "r_schedule": breakdown.r_schedule,
                "r_worker": breakdown.r_worker,
                "r_total": breakdown.r_total,
                "is_reward_hacked": breakdown.is_reward_hacked,
            },
            "kpis": {
                "total_ticks": self.reward_engine.kpis.total_ticks,
                "total_reward": round(self.reward_engine.kpis.total_reward, 3),
                "total_emissions_saved_kg": round(self.reward_engine.kpis.total_emissions_saved_kg, 2),
                "total_cost_saved_usd": round(self.reward_engine.kpis.total_cost_saved_usd, 2),
                "reward_hacking_detected_count": self.reward_engine.kpis.reward_hacking_detected_count,
                "guardrail_interventions_count": self.reward_engine.kpis.guardrail_interventions_count,
            },
        }

        # 5. Broadcast to subscribers (WebSockets, logging, connectors)
        for listener in self._subscribers:
            try:
                listener(event_payload)
            except Exception as e:
                logger.error(f"Error broadcasting tick event: {e}")

        return event_payload
