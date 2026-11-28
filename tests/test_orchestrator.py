"""Unit tests for Dec-POMDP orchestrator and operator override system."""

import pytest
from src.orchestrator.engine import VidyutSyncOrchestrator
from src.orchestrator.state import FactoryState, WorkOrder
from datetime import datetime, timedelta


def test_orchestrator_tick_execution(orchestrator_instance):
    """Test full tick negotiation cycle."""
    tick_res = orchestrator_instance.execute_tick()

    assert "tick_id" in tick_res
    assert tick_res["mode"] == "shadow"
    assert "actions" in tick_res
    assert "rewards" in tick_res
    assert "grid_carbon" in tick_res["actions"]
    assert "microgrid_storage" in tick_res["actions"]
    assert "production_scheduling" in tick_res["actions"]
    assert "ergonomics_shift" in tick_res["actions"]
    assert tick_res["kpis"]["total_ticks"] == 1


def test_orchestrator_mode_switching(orchestrator_instance):
    """Test switching between shadow and live_pilot modes."""
    assert orchestrator_instance.mode == "shadow"
    new_mode = orchestrator_instance.set_execution_mode("live_pilot")
    assert new_mode == "live_pilot"
    assert orchestrator_instance.mode == "live_pilot"

    with pytest.raises(ValueError):
        orchestrator_instance.set_execution_mode("invalid_mode")


def test_operator_override_application(orchestrator_instance):
    """Test applying and clearing manual operator overrides."""
    # Apply override forcing BESS charge
    override = orchestrator_instance.apply_operator_override(
        asset_id="bess",
        setpoints={"bess_charge_discharge_kw": 120.0},
        notes="Operator manual charging command",
    )
    assert override["asset_id"] == "bess"
    assert "bess" in orchestrator_instance.state.active_operator_overrides

    # Run tick and verify override is respected
    result = orchestrator_instance.execute_tick()
    assert result["actions"]["microgrid_storage"]["bess_charge_discharge_kw"] == 120.0

    # Clear override
    cleared = orchestrator_instance.clear_operator_override("bess")
    assert cleared is True
    assert "bess" not in orchestrator_instance.state.active_operator_overrides
