"""
backend/app/core/mission_model/subsystem_template.py

Spacecraft subsystem templates and cyber-physical dependency specifications.
Decouples hardcoded graph definitions into reusable spacecraft profiles while
preserving exact parity with the standard 13-node CubeSat architecture.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Literal
import networkx as nx

DependencyType = Literal["thermal", "control", "power", "kinematic", "software", "data", "indirect"]
DependencyStrength = Literal["critical", "strong", "moderate", "weak", "indirect"]

STRENGTH_WEIGHT: Dict[str, float] = {
    "critical": 1.0,
    "strong": 0.75,
    "moderate": 0.5,
    "weak": 0.25,
    "indirect": 0.25,
}


@dataclass
class ComponentDefinition:
    """Specification of an avionics or payload component."""
    component_id: str
    name: str
    component_type: str  # sensor | controller | power | compute | comms | payload | actuator | control
    parameter_name: str = "value"
    unit: str = ""
    nominal_mean: float = 0.0
    nominal_std: float = 0.1
    sampling_interval_seconds: float = 1.0
    description: str = ""


@dataclass
class DependencyDefinition:
    """Directed causal dependency between two components."""
    source: str
    target: str
    dependency_type: DependencyType
    dependency_strength: DependencyStrength
    description: str = ""


@dataclass
class SubsystemTemplate:
    """
    Complete architectural blueprint for a spacecraft's subsystem topology.
    Can be compiled into a NetworkX DiGraph for causal graph traversal.
    """
    template_id: str
    name: str
    craft_class: str
    description: str
    components: List[ComponentDefinition] = field(default_factory=list)
    dependencies: List[DependencyDefinition] = field(default_factory=list)

    def to_networkx(self) -> nx.DiGraph:
        """Compile template into a NetworkX DiGraph."""
        g = nx.DiGraph()
        for comp in self.components:
            g.add_node(
                comp.component_id,
                component_type=comp.component_type,
                name=comp.name,
                parameter_name=comp.parameter_name,
                unit=comp.unit,
                nominal_mean=comp.nominal_mean,
                nominal_std=comp.nominal_std,
                sampling_interval_seconds=comp.sampling_interval_seconds,
            )
        for dep in self.dependencies:
            g.add_edge(
                dep.source,
                dep.target,
                dependency_type=dep.dependency_type,
                dependency_strength=dep.dependency_strength,
                description=dep.description,
            )
        return g

    def get_component(self, component_id: str) -> Optional[ComponentDefinition]:
        for c in self.components:
            if c.component_id == component_id:
                return c
        return None


# -----------------------------------------------------------------------------
# STANDARD CUBESAT 13-NODE REFERENCE TEMPLATE
# Exact parity with legacy backend/app/core/dependency_graph.py
# -----------------------------------------------------------------------------

STANDARD_CUBESAT_13_NODE_TEMPLATE = SubsystemTemplate(
    template_id="cubesat_13_node_standard",
    name="Standard 3U/6U CubeSat Architecture",
    craft_class="CubeSat (1U-6U)",
    description="Standard baseline CubeSat cyber-physical subsystem topology with thermal, electrical, and flight software control loops.",
    components=[
        ComponentDefinition("thermal_sensor", "Thermal Sensor", "sensor", "temperature_c", "°C", 20.0, 0.5, 5.0),
        ComponentDefinition("heater_controller", "Heater Controller", "controller", "duty_cycle", "duty", 0.325, 0.028, 5.0),
        ComponentDefinition("battery", "Battery Pack", "power", "temperature_c", "°C", 25.0, 0.8, 1.0),
        ComponentDefinition("battery_protection", "Battery Protection Circuit", "controller", "trip_state", "state", 0.0, 0.0, 5.0),
        ComponentDefinition("power_bus", "Power Distribution Bus", "power", "voltage_v", "V", 7.4, 0.1, 1.0),
        ComponentDefinition("comms", "RF Communications Transponder", "comms", "signal_strength_dbm", "dBm", -70.0, 2.0, 2.0),
        ComponentDefinition("obc", "On-Board Computer", "compute", "cpu_load", "load", 0.243, 0.031, 1.0),
        ComponentDefinition("payload", "Science Payload", "payload", "operational_state", "state", 1.0, 0.0, 10.0),
        ComponentDefinition("solar_array", "Photovoltaic Solar Array", "power", "voltage_v", "V", 8.2, 0.2, 1.0),
        ComponentDefinition("adcs", "Attitude Determination & Control", "control", "status", "mode", 1.0, 0.0, 1.0),
        ComponentDefinition("reaction_wheel", "Reaction Wheel Array", "actuator", "speed_rpm", "RPM", 2400.0, 50.0, 0.5),
        ComponentDefinition("star_tracker", "Optical Star Tracker", "sensor", "tracking_status", "mode", 1.0, 0.0, 1.0),
        ComponentDefinition("flight_software", "Flight Software / FDIR Core", "compute", "fdir_state", "state", 1.0, 0.0, 5.0),
    ],
    dependencies=[
        DependencyDefinition("thermal_sensor", "heater_controller", "thermal", "critical"),
        DependencyDefinition("heater_controller", "battery", "thermal", "strong"),
        DependencyDefinition("battery", "battery_protection", "control", "critical"),
        DependencyDefinition("battery_protection", "power_bus", "power", "critical"),
        DependencyDefinition("power_bus", "comms", "power", "critical"),
        DependencyDefinition("power_bus", "obc", "power", "critical"),
        DependencyDefinition("obc", "payload", "power", "strong"),
        DependencyDefinition("solar_array", "power_bus", "power", "critical"),
        DependencyDefinition("obc", "adcs", "control", "strong"),
        DependencyDefinition("adcs", "reaction_wheel", "control", "critical"),
        DependencyDefinition("star_tracker", "adcs", "kinematic", "strong"),
        DependencyDefinition("payload", "comms", "data", "moderate"),
        DependencyDefinition("comms", "flight_software", "software", "strong"),
        DependencyDefinition("flight_software", "comms", "control", "critical"),
        DependencyDefinition("flight_software", "obc", "software", "strong"),
        DependencyDefinition("obc", "flight_software", "software", "critical"),
    ]
)
