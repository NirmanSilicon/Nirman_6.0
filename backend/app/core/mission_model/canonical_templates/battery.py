"""
backend/app/core/mission_model/canonical_templates/battery.py

Canonical Causal Template: Battery & Electrochemical Energy Storage.
Models Li-Ion battery packs, thermal runaway dynamics, cell degradation,
and Battery Management System (BMS) / solid-state protection switches.
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

BATTERY_TEMPLATE = CausalModuleTemplate(
    module_type="Battery",
    name="Battery Pack & Protection Circuit (BMS)",
    description="Lithium-ion energy storage, thermal dissipation, and over-temperature protection circuit.",
    default_component_id="battery",
    states=["NOMINAL", "CHARGING", "DISCHARGING", "OVERHEAT", "TRIPPED_ISOLATED", "CELL_DEGRADED"],
    measurable_variables={
        "temperature_c": VariableDefinition(
            parameter_name="temperature_c",
            unit="°C",
            nominal_mean=25.0,
            nominal_std=0.8,
            sampling_interval_seconds=1.0,
            nominal_min=0.0,
            nominal_max=45.0,
            description="Battery core pack temperature.",
        ),
        "trip_state": VariableDefinition(
            parameter_name="trip_state",
            unit="state",
            nominal_mean=0.0,
            nominal_std=0.0,
            sampling_interval_seconds=5.0,
            nominal_min=0.0,
            nominal_max=1.0,
            description="Solid-state protection trip switch flag (0=nominal, 1=tripped).",
        ),
        "soc_percent": VariableDefinition(
            parameter_name="soc_percent",
            unit="%",
            nominal_mean=82.0,
            nominal_std=5.0,
            sampling_interval_seconds=10.0,
            nominal_min=20.0,
            nominal_max=100.0,
            description="State-of-Charge battery reserve percentage.",
        ),
    },
    allowed_interfaces=[
        InterfaceDefinition("thermal_in", "in", "thermal", "Thermal flux from internal Joule heating or external heaters."),
        InterfaceDefinition("protection_control", "out", "control", "Trip signal from thermal sensor to protection breaker."),
        InterfaceDefinition("power_out", "out", "power", "Energy transfer to main power distribution bus."),
    ],
    dependency_types=["thermal", "control", "power"],
    plausible_propagation_delays={
        "thermal_conduction": PropagationDelayRange(
            min_seconds=30.0,
            max_seconds=180.0,
            typical_seconds=75.0,
            physics_basis="Thermal mass of Li-ion cells and conductive bracket resistance.",
        ),
        "overtemp_trip": PropagationDelayRange(
            min_seconds=0.5,
            max_seconds=5.0,
            typical_seconds=2.0,
            physics_basis="BMS threshold comparator latency and MOSFET gate discharge.",
        ),
    },
    relevant_failure_types=[
        "cell_overheating",
        "thermal_runaway",
        "battery_micro_short",
        "solid_state_protection_trip",
        "under_voltage_lockout",
    ],
    structural_rules=[
        StructuralRule(
            rule_id="battery_protection_coupling",
            rule_type="requires_outgoing",
            description="Battery protection must couple to the main power bus to isolate loads upon fault.",
            target_dependency_type="power",
        )
    ],
    physics_parameters={
        "nominal_temp_c": 25.0,
        "runaway_temp_c": 60.0,
        "trip_threshold_temp_c": 60.0,
        "thermal_conduction_resistance": 1.8,
        "sigma_expected": 0.8,
    },
    state_transition_spec=StateTransitionSpec(
        initial_state="NOMINAL",
        initial_values={"temperature_c": 25.0, "trip_state": 0.0, "soc_percent": 82.0},
        relevant_inputs=["heater_controller.duty_cycle", "power_bus.bus_current_a", "prevent_protection_trip"],
        evolution_rules=[
            StateEvolutionRule(
                target_variable="temperature_c",
                equation_description="T_bat(t+dt) = T_bat(t) + dt * (0.15 * duty + 0.005 * I^2 - 0.02 * (T_bat - 20.0))",
                parameters={"conduction_gain": 0.15, "joule_gain": 0.005, "dissipation_beta": 0.02, "ambient_c": 20.0},
                rule_type="differential_discrete",
            ),
            StateEvolutionRule(
                target_variable="soc_percent",
                equation_description="soc(t+dt) = max(0.0, soc(t) - dt * (0.01 * I_load + (0.05 if T_bat > 45 else 0.0)))",
                parameters={"discharge_rate": 0.01, "thermal_degrade_rate": 0.05},
                rule_type="differential_discrete",
            ),
            StateEvolutionRule(
                target_variable="trip_state",
                equation_description="trip_state = 1.0 if (T_bat >= 60.0 and not prevent_protection_trip) else 0.0",
                parameters={"threshold_temp_c": 60.0},
                rule_type="algebraic",
            ),
        ],
        failure_transitions=[
            FailureTransitionRule(
                rule_id="battery_cell_overheat",
                condition_description="temperature_c >= 60.0",
                from_state="NOMINAL",
                to_state="OVERHEAT",
                failure_type="cell_overheating",
                consequence_variables={"cell_state": "OVERHEAT"},
            ),
            FailureTransitionRule(
                rule_id="battery_bms_isolation_trip",
                condition_description="trip_state == 1.0",
                from_state="OVERHEAT",
                to_state="TRIPPED_ISOLATED",
                failure_type="solid_state_protection_trip",
                consequence_variables={"trip_state": 1.0, "power_available": False},
            ),
        ],
        recovery_protection_rules=[
            RecoveryProtectionRule(
                rule_id="bms_prevent_protection_override",
                condition_description="prevent_protection_trip == True",
                trigger_variable="trip_state",
                action="clamp",
                target_subsystem="battery_protection",
                consequence_variables={"trip_state": 0.0, "power_available": True, "state": "OVERHEAT"},
            ),
        ],
    ),
)

