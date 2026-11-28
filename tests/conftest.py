"""Pytest fixtures for VidyutSync test suite."""

import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport

from src.orchestrator.state import FactoryState, WorkOrder
from src.orchestrator.engine import VidyutSyncOrchestrator
from src.connectors.database import TimescaleRepository
from src.connectors.mqtt_bus import MQTTBusConnector
from src.api.routes import set_dependencies
from src.api.main import app


@pytest.fixture
def sample_factory_state() -> FactoryState:
    now = datetime(2026, 6, 1, 10, 0, 0)
    orders = [
        WorkOrder(
            order_id="WO-TEST-01",
            machine_id="CNC_MILL_5AXIS_01",
            part_type="Test_Flange",
            duration_minutes=60,
            deadline_utc=now + timedelta(hours=2),
            nominal_power_kw=40.0,
        ),
        WorkOrder(
            order_id="WO-TEST-02",
            machine_id="VACUUM_OVEN_01",
            part_type="Test_Carburizing",
            duration_minutes=120,
            deadline_utc=now + timedelta(hours=4),
            nominal_power_kw=110.0,
            preheat_required=True,
        ),
    ]
    return FactoryState(
        timestamp=now,
        grid_carbon_intensity_gco2=350.0,
        grid_tou_tariff_usd_kwh=0.22,
        bess_soc_pct=50.0,
        pv_generation_kw=80.0,
        active_orders=orders,
    )


@pytest.fixture
def orchestrator_instance(sample_factory_state) -> VidyutSyncOrchestrator:
    return VidyutSyncOrchestrator(initial_state=sample_factory_state, execution_mode="shadow")


@pytest.fixture
async def async_client(orchestrator_instance):
    repo = TimescaleRepository()
    mqtt = MQTTBusConnector()
    set_dependencies(orchestrator_instance, repo, mqtt)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
