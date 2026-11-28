"""Industrial OPC UA Server Simulator and Event-Driven Subscription Client.

Avoids continuous polling bottlenecks by utilizing native OPC UA DataChange Subscriptions.
"""

import asyncio
import logging
import math
import random
from datetime import datetime
from typing import Any, Callable
from asyncua import Server, Client, ua

from src.config import settings

logger = logging.getLogger("VidyutSync.OPCUA")


class IndustrialOPCUASimulator:
    """Simulates an OT manufacturing plant PLC with CNCs, thermal ovens, and microgrid."""

    def __init__(self, port: int | None = None, endpoint: str | None = None):
        self.port = port or settings.OPCUA_SIMULATOR_PORT
        self.endpoint = endpoint or f"opc.tcp://0.0.0.0:{self.port}/freeopcua/server/"
        self.server = Server()
        self._running = False
        self.nodes = {}

    async def init(self):
        """Initializes the OPC UA address space and nodes."""
        await self.server.init()
        self.server.set_endpoint(self.endpoint)
        self.server.set_server_name("VidyutSync Industrial Microgrid PLC")

        idx = await self.server.register_namespace(settings.OPCUA_NAMESPACE)
        objects = self.server.nodes.objects

        # Industrial Plant Root
        plant = await objects.add_object(idx, "ManufacturingPlant")

        # 1. Grid Telemetry
        grid = await plant.add_object(idx, "Grid")
        self.nodes["grid_power"] = await grid.add_variable(idx, "ActivePowerKW", 450.0)
        self.nodes["grid_ci"] = await grid.add_variable(idx, "CarbonIntensityGCO2", 360.0)
        self.nodes["grid_tariff"] = await grid.add_variable(idx, "TOUTariffUSDKWh", 0.18)

        # 2. BESS & Renewable Microgrid
        bess = await plant.add_object(idx, "BESS")
        self.nodes["bess_soc"] = await bess.add_variable(idx, "StateOfCharge", 55.0)
        self.nodes["bess_power"] = await bess.add_variable(idx, "ActivePowerKW", 0.0)
        self.nodes["bess_soh"] = await bess.add_variable(idx, "HealthSOH", 98.4)

        solar = await plant.add_object(idx, "Solar")
        self.nodes["solar_ghi"] = await solar.add_variable(idx, "IrradianceGHI", 450.0)
        self.nodes["solar_power"] = await solar.add_variable(idx, "PVGenerationKW", 65.0)

        # 3. Heavy Machinery (5-axis CNC & Thermal Oven)
        cnc1 = await plant.add_object(idx, "CNC_Mill_5Axis_01")
        self.nodes["cnc1_rpm"] = await cnc1.add_variable(idx, "SpindleSpeedRPM", 12000.0)
        self.nodes["cnc1_power"] = await cnc1.add_variable(idx, "ActivePowerKW", 42.0)
        self.nodes["cnc1_state"] = await cnc1.add_variable(idx, "State", "RUNNING")

        oven1 = await plant.add_object(idx, "Vacuum_Oven_01")
        self.nodes["oven1_temp"] = await oven1.add_variable(idx, "TemperatureC", 850.0)
        self.nodes["oven1_power"] = await oven1.add_variable(idx, "ActivePowerKW", 110.0)
        self.nodes["oven1_state"] = await oven1.add_variable(idx, "State", "RUNNING")

        # 4. Factory Environment & Worker Metrics
        ergo = await plant.add_object(idx, "Ergonomics")
        self.nodes["sound_db"] = await ergo.add_variable(idx, "SoundLevelDB", 74.0)
        self.nodes["ambient_temp"] = await ergo.add_variable(idx, "AmbientTempC", 22.5)

        # Set all variables as writable by clients
        for node in self.nodes.values():
            await node.set_writable()

        logger.info(f"OPC UA Server initialized with {len(self.nodes)} industrial nodes.")

    async def start(self):
        """Starts server and simulation background loop."""
        await self.init()
        await self.server.start()
        self._running = True
        logger.info(f"OPC UA Server running on {self.endpoint}")
        asyncio.create_task(self._simulation_loop())

    async def stop(self):
        """Stops the server."""
        self._running = False
        await self.server.stop()
        logger.info("OPC UA Server stopped.")

    async def _simulation_loop(self):
        """Simulates physical plant dynamics."""
        tick = 0
        while self._running:
            try:
                tick += 1
                # Vary solar GHI and PV
                solar_val = max(0.0, 500.0 + 200.0 * math.sin(tick * 0.1))
                pv_val = solar_val * 0.18
                await self.nodes["solar_ghi"].write_value(round(solar_val, 1))
                await self.nodes["solar_power"].write_value(round(pv_val, 1))

                # CNC power fluctuations
                cnc_power = 40.0 + 5.0 * math.sin(tick * 0.2) + random.uniform(-2, 2)
                await self.nodes["cnc1_power"].write_value(round(cnc_power, 1))

                # Oven subtle temperature dynamics
                oven_temp = 850.0 + 2.0 * math.cos(tick * 0.05)
                await self.nodes["oven1_temp"].write_value(round(oven_temp, 1))

                # Sound fluctuations
                sound = 72.0 + 4.0 * math.sin(tick * 0.3)
                await self.nodes["sound_db"].write_value(round(sound, 1))

            except Exception as e:
                logger.error(f"Error in OPC UA simulation tick: {e}")

            await asyncio.sleep(2.0)


class OPCUASubscriptionHandler:
    """Event-driven subscription handler receiving data changes without polling."""

    def __init__(self, callback: Callable[[str, Any], None]):
        self.callback = callback

    def datachange_notification(self, node, val, data):
        """Called automatically by asyncua whenever a monitored item changes value."""
        try:
            node_name = node.nodeid.Identifier if hasattr(node.nodeid, "Identifier") else str(node)
            self.callback(str(node_name), val)
        except Exception as e:
            logger.error(f"Error in datachange notification: {e}")


class OPCUASubscriptionClient:
    """OPC UA Client using DataChange Subscriptions to prevent polling bottlenecks."""

    def __init__(
        self,
        endpoint: str | None = None,
        on_data_change: Callable[[str, Any], None] | None = None,
    ):
        self.endpoint = endpoint or settings.OPCUA_SERVER_ENDPOINT
        self.on_data_change = on_data_change or (lambda node, val: None)
        self.client: Client | None = None
        self.subscription = None
        self._is_connected = False

    async def connect_and_subscribe(self) -> bool:
        """Connects and creates subscriptions on plant variables."""
        try:
            self.client = Client(url=self.endpoint)
            await self.client.connect()
            self._is_connected = True
            logger.info(f"Connected to OPC UA Server at {self.endpoint}")

            handler = OPCUASubscriptionHandler(self.on_data_change)
            # 500ms sampling interval with zero polling overhead on the application
            self.subscription = await self.client.create_subscription(500, handler)

            # Discover and subscribe to all plant variables
            root = self.client.nodes.root
            objects = self.client.nodes.objects

            try:
                plant = await objects.get_child(["2:ManufacturingPlant"])
                children = await plant.get_children()
                monitored_nodes = []
                for sub in children:
                    vars_ = await sub.get_variables()
                    monitored_nodes.extend(vars_)

                if monitored_nodes:
                    await self.subscription.subscribe_data_change(monitored_nodes)
                    logger.info(f"Subscribed to {len(monitored_nodes)} OPC UA variables via data-change push.")
            except Exception as e:
                logger.warning(f"Could not automatically traverse children: {e}")

            return True
        except Exception as e:
            logger.warning(f"Could not connect OPC UA client ({e}). Operating in decoupled mode.")
            self._is_connected = False
            return False

    async def write_setpoint(self, node_path: list[str], value: Any):
        """Writes an actuator setpoint back to the PLC."""
        if not self._is_connected or not self.client:
            return
        try:
            node = await self.client.nodes.objects.get_child(node_path)
            await node.write_value(value)
        except Exception as e:
            logger.error(f"Failed to write OPC UA setpoint to {node_path}: {e}")

    async def disconnect(self):
        """Disconnects the subscription client."""
        if self.client and self._is_connected:
            await self.client.disconnect()
            self._is_connected = False
            logger.info("OPC UA Client disconnected.")


async def main():
    """CLI runner to start the standalone OPC UA simulator."""
    sim = IndustrialOPCUASimulator()
    await sim.start()
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        await sim.stop()


if __name__ == "__main__":
    asyncio.run(main())
