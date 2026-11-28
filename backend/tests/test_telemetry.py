import asyncio
from pathlib import Path

from app.services.telemetry.data_loader import load_engine_rows
from app.services.telemetry.controller import TelemetryController


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_load_engine_rows_selects_and_orders_engine():
    csv_path = PROJECT_ROOT / "data" / "telemetry" / "telemetry_sample.csv"
    rows = load_engine_rows(csv_path, "ENGINE_DEMO_01")
    assert len(rows) == 4
    assert [row["source_cycle"] for row in rows] == [1, 2, 3, 4]
    assert "sensor_1" in rows[0]["sensors"]
    assert "setting_1" in rows[0]["operating_conditions"]


def test_load_engine_rows_defaults_to_first_engine():
    csv_path = PROJECT_ROOT / "data" / "telemetry" / "telemetry_sample.csv"
    rows = load_engine_rows(csv_path)
    assert rows[0]["engine_id"] == "ENGINE_DEMO_01"


def test_controller_start_and_complete():
    async def scenario():
        controller = TelemetryController()
        rows = load_engine_rows(
            PROJECT_ROOT / "data" / "telemetry" / "telemetry_sample.csv",
            "ENGINE_DEMO_01",
        )
        queue = await controller.subscribe()
        await controller.start(rows, "ENGINE_DEMO_01", 0)
        received = [await asyncio.wait_for(queue.get(), timeout=2) for _ in range(4)]
        await asyncio.sleep(0)
        assert received[0]["sequence"] == 1
        assert received[-1]["source_cycle"] == 4
        assert controller.state == "completed"
        controller.unsubscribe(queue)

    asyncio.run(scenario())
