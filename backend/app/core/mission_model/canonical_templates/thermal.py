"""
backend/app/core/mission_model/canonical_templates/thermal.py

Canonical Causal Template: Thermal Control System.
Models positive/negative temperature coefficient sensors, survival heaters,
TRIAC switches, and duty-cycle control loops.
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

THERMAL_TEMPLATE = CausalModuleTemplate(
    module_type="Thermal",
    name="Thermal Control & Heater Subsystem",
    description="Survival heating elements, thermistors, TRIAC switches, and temperature regulation.",
    default_component_id="thermal_sensor",
    states=["NOMINAL", "COLD_WARN", "HOT_WARN", "SENSOR_FREEZE", "HEATER_RUNAWAY"],
    measurable_variables={
        "temperature_c": VariableDefinition(
            parameter_name="temperature_c",
            unit="°C",
            nominal_mean=20.0,
            nominal_std=0.5,
            sampling_interval_seconds=5.0,
            nominal_min=-40.0,
            nominal_max=85.0,
            description="Chassis or structural thermistor reading.",
        ),
        "duty_cycle": VariableDefinition(
            parameter_name="duty_cycle",
            unit="duty",
            nominal_mean=0.325,
            nominal_std=0.028,
            sampling_interval_seconds=5.0,
            nominal_min=0.0,
            nominal_max=1.0,
            description="Pulse-width modulated heater duty cycle.",
        ),
    },
    allowed_interfaces=[
        InterfaceDefinition("sensor_control", "out", "thermal", "Sensor signal commanding heater controller."),
        InterfaceDefinition("thermal_flux_out", "out", "thermal", "Radiative/conductive heat transfer to battery or avionics."),
        InterfaceDefinition("power_in", "in", "power", "Heating element power supply from power bus."),
    ],
    dependency_types=["thermal", "control"],
    plausible_propagation_delays={
        "sensor_to_heater": PropagationDelayRange(
            min_seconds=1.0,
            max_seconds=15.0,
            typical_seconds=8.0,
            physics_basis="Flight software thermal loop update rate and hysteresis delay.",
        ),
        "heater_to_battery": PropagationDelayRange(
            min_seconds=30.0,
            max_seconds=150.0,
            typical_seconds=85.0,
            physics_basis="Thermal mass and conductive thermal resistance between heater mat and cell casing.",
        ),
    },
    relevant_failure_types=[
        "sensor_negative_rail_freeze",
        "thermistor_drift",
        "heater_triac_short_stuck_on",
        "heater_open_circuit",
    ],
    structural_rules=[
        StructuralRule(
            rule_id="thermal_no_self_loop",
            rule_type="no_self_loop",
            description="Thermal sensors cannot have direct self-loops in the primary causal graph.",
        )
    ],
    physics_parameters={
        "thermal_gain_alpha": 0.065,
        "dissipation_beta": 0.0015,
        "nominal_ambient_c": 20.0,
        "nominal_temp_c": 25.0,
        "max_slew_rate_c_per_s": 1.5,
        "sigma_expected": 1.0,
    },
    state_transition_spec=StateTransitionSpec(
        initial_state="NOMINAL",
        initial_values={"temperature_c": 20.0, "duty_cycle": 0.325},
        relevant_inputs=["sensor_clamp_value", "ambient_temperature_c"],
        evolution_rules=[
            StateEvolutionRule(
                target_variable="duty_cycle",
                equation_description="duty(t) = clip(0.325 + 0.05 * (20.0 - temperature_c), 0.0, 1.0) when closed loop active",
                parameters={"nominal_setpoint_c": 20.0, "p_gain": 0.05, "base_duty": 0.325},
                rule_type="algebraic",
            ),
            StateEvolutionRule(
                target_variable="temperature_c",
                equation_description="dT/dt = alpha * duty - beta * (temperature_c - ambient_c)",
                parameters={"alpha": 0.065, "beta": 0.0015, "ambient_c": 20.0},
                rule_type="differential_discrete",
            ),
        ],
        failure_transitions=[
            FailureTransitionRule(
                rule_id="thermal_sensor_freeze_runaway",
                condition_description="temperature_c <= -50.0",
                from_state="NOMINAL",
                to_state="HEATER_RUNAWAY",
                failure_type="sensor_negative_rail_freeze",
                consequence_variables={"duty_cycle": 1.0, "closed_loop_active": False},
            ),
        ],
        recovery_protection_rules=[
            RecoveryProtectionRule(
                rule_id="thermal_sensor_clamp_recovery",
                condition_description="clamped_temperature_c >= 10.0",
                trigger_variable="temperature_c",
                action="clamp",
                target_subsystem="thermal_sensor",
                consequence_variables={"duty_cycle": 0.325, "closed_loop_active": True, "state": "NOMINAL"},
            ),
        ],
    ),
)

