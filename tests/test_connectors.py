"""Unit tests for TimescaleDB repository, MQTT bus, and OPC UA simulation."""

import pytest
from datetime import datetime

from src.connectors.database import TimescaleRepository
from src.connectors.mqtt_bus import MQTTBusConnector
from src.connectors.opcua_bridge import IndustrialOPCUASimulator


@pytest.mark.asyncio
async def test_timescale_in_memory_fallback():
    """Verify repository in-memory fallback buffers telemetry, decisions, and rewards."""
    repo = TimescaleRepository(dsn="postgresql://invalid:5432/none")
    # Should safely fail connection and switch to offline fallback
    connected = await repo.connect()
    assert connected is False
    assert repo._is_connected is False

    # Record telemetry
    await repo.record_telemetry("cnc_01", "power_kw", 42.5, "kW")
    assert len(repo._in_memory_telemetry) == 1
    assert repo._in_memory_telemetry[0]["value"] == 42.5

    # Record decision
    await repo.record_decision(
        tick_id="tick_101",
        agent_name="grid_carbon",
        action_payload={"grid_draw_limit_kw": 500.0},
        passed_guardrails=True,
    )
    assert len(repo._in_memory_decisions) == 1

    # Record reward & query
    await repo.record_reward("tick_101", 0.5, 0.4, 0.9, 0.8, 0.65)
    rewards = await repo.get_recent_rewards(limit=10)
    assert len(rewards) == 1
    assert rewards[0]["r_total"] == 0.65

    await repo.disconnect()


def test_mqtt_connector_offline_buffer():
    """Verify MQTT connector handles publishing without crashing in offline mode."""
    mqtt_bus = MQTTBusConnector(host="localhost", port=1883)
    # Start in background (will fail or buffer if broker not running)
    mqtt_bus.start()

    # Publishing should safely buffer/log
    mqtt_bus.publish_telemetry("bess", {"soc": 55.0})
    mqtt_bus.publish_control_setpoint("bess", {"charge_kw": 50.0})
    mqtt_bus.publish_safety_alert({"warning": "test_alert"})

    mqtt_bus.stop()


@pytest.mark.asyncio
async def test_opcua_simulator_nodes_initialization():
    """Verify OPC UA server initializes all industrial nodes in address space."""
    sim = IndustrialOPCUASimulator(port=4841)  # alternate port for test
    await sim.init()

    expected_nodes = [
        "grid_power", "grid_ci", "grid_tariff",
        "bess_soc", "bess_power", "bess_soh",
        "solar_ghi", "solar_power",
        "cnc1_rpm", "cnc1_power", "cnc1_state",
        "oven1_temp", "oven1_power", "oven1_state",
        "sound_db", "ambient_temp",
    ]
    for node_key in expected_nodes:
        assert node_key in sim.nodes

    # Check node default values
    val_soc = await sim.nodes["bess_soc"].read_value()
    assert val_soc == 55.0

    val_temp = await sim.nodes["oven1_temp"].read_value()
    assert val_temp == 850.0
