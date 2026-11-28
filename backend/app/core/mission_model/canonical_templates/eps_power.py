"""
backend/app/core/mission_model/canonical_templates/eps_power.py

Canonical Causal Template: Electrical Power System (EPS) & Power Distribution.
Models photovoltaic solar generation, main power distribution buses, regulators,
and electrical rails across the spacecraft.
"""

from .module_spec import (
    CausalModuleTemplate,
    VariableDefinition,
    InterfaceDefinition,
    PropagationDelayRange,
    StructuralRule,
    StateEvolutionRule,
    FailureTransitionRule,
    RecoveryProtectionRule,
    StateTransitionSpec,
)

EPS_POWER_TEMPLATE = CausalModuleTemplate(
    module_type="EPS_Power",
    name="Electrical Power System & Bus Distribution",
    description="Photovoltaic solar generation, EPS regulators, and main voltage distribution bus.",
    default_component_id="power_bus",
    states=["NOMINAL", "UNDERVOLTAGE_SAG", "OVERCURRENT", "ISOLATED", "OFFLINE"],
    measurable_variables={
        "voltage_v": VariableDefinition(
            parameter_name="voltage_v",
            unit="V",
            nominal_mean=7.4,
            nominal_std=0.1,
            sampling_interval_seconds=1.0,
            nominal_min=6.8,
            nominal_max=8.4,
            description="Main unregulated spacecraft power bus voltage.",
        ),
        "solar_voltage_v": VariableDefinition(
            parameter_name="voltage_v",
            unit="V",
            nominal_mean=8.2,
            nominal_std=0.2,
            sampling_interval_seconds=1.0,
            nominal_min=0.0,
            nominal_max=9.5,
            description="Photovoltaic array generation voltage.",
        ),
        "bus_current_a": VariableDefinition(
            parameter_name="current_a",
            unit="A",
            nominal_mean=1.2,
            nominal_std=0.15,
            sampling_interval_seconds=1.0,
            nominal_min=0.2,
            nominal_max=3.5,
            description="Aggregate load current across main power bus.",
        ),
    },
    allowed_interfaces=[
        InterfaceDefinition("power_in", "in", "power", "Incoming power from solar arrays or battery."),
        InterfaceDefinition("power_out", "out", "power", "Regulated and unregulated power rails to avionics."),
        InterfaceDefinition("control_in", "in", "control", "EPS latch and switch commands from OBC/BMS."),
        InterfaceDefinition("telemetry_out", "out", "data", "Voltage, current, and switch telemetry."),
    ],
    dependency_types=["power", "control"],
    plausible_propagation_delays={
        "power_collapse": PropagationDelayRange(
            min_seconds=0.05,
            max_seconds=5.0,
            typical_seconds=1.0,
            physics_basis="Solid-state switch isolation and bulk filter capacitor discharge time constant.",
        ),
        "solar_occlusion": PropagationDelayRange(
            min_seconds=1.0,
            max_seconds=30.0,
            typical_seconds=5.0,
            physics_basis="Orbital eclipse entry rate and array attitude slew transition.",
        ),
    },
    relevant_failure_types=[
        "bus_undervoltage",
        "power_bus_uvlo_sag",
        "regulator_latchup",
        "solar_panel_short",
        "overcurrent_crowbar_trip",
    ],
    structural_rules=[
        StructuralRule(
            rule_id="eps_requires_power_input",
            rule_type="requires_incoming",
            description="Power bus must have at least one incoming power source (battery or solar array).",
            target_dependency_type="power",
        )
    ],
    physics_parameters={
        "v_nominal": 7.4,
        "v_trip": 1.8,
        "uvlo_threshold": 3.2,
        "internal_resistance_ohms": 0.05,
        "sigma_expected": 0.25,
    },
    state_transition_spec=StateTransitionSpec(
        initial_state="NOMINAL",
        initial_values={"voltage_v": 7.4, "bus_current_a": 1.2, "solar_voltage_v": 8.2},
        relevant_inputs=["battery.trip_state", "battery.soc_percent", "in_eclipse"],
        evolution_rules=[
            StateEvolutionRule(
                target_variable="voltage_v",
                equation_description="voltage_v(t+dt) = max(0.04, voltage_v(t) * 0.4) if battery_tripped and in_eclipse else (7.4 - 0.05 * bus_current_a)",
                parameters={"v_nominal": 7.4, "v_collapse_decay": 0.4, "v_floor": 0.04},
                rule_type="differential_discrete",
            ),
        ],
        failure_transitions=[
            FailureTransitionRule(
                rule_id="eps_bus_uvlo_collapse",
                condition_description="voltage_v < 3.2",
                from_state="NOMINAL",
                to_state="UNDERVOLTAGE_SAG",
                failure_type="power_bus_uvlo_sag",
                consequence_variables={"bus_state": "UNDERVOLTAGE_SAG", "avionics_power": False},
            ),
        ],
        recovery_protection_rules=[
            RecoveryProtectionRule(
                rule_id="eps_bus_nominal_restoration",
                condition_description="battery_trip_state == 0.0 and soc_percent > 15.0",
                trigger_variable="voltage_v",
                action="restore_nominal",
                target_subsystem="power_bus",
                consequence_variables={"voltage_v": 7.4, "bus_state": "NOMINAL", "avionics_power": True},
            ),
        ],
    ),
)

