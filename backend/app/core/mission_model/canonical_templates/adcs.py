"""
backend/app/core/mission_model/canonical_templates/adcs.py

Canonical Causal Template: Attitude Determination & Control System (ADCS).
Models star trackers, sun sensors, IMUs, reaction wheel assemblies,
and kinematic attitude pointing loops.
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

ADCS_TEMPLATE = CausalModuleTemplate(
    module_type="ADCS",
    name="Attitude Determination & Control System",
    description="Star trackers, gyroscopes, reaction wheels, magnetorquers, and pointing control.",
    default_component_id="adcs",
    states=["DETUMBLE", "SUN_POINTING", "FINE_POINTING", "MOMENTUM_SATURATION", "ACTUATOR_FAULT"],
    measurable_variables={
        "speed_rpm": VariableDefinition(
            parameter_name="speed_rpm",
            unit="RPM",
            nominal_mean=2400.0,
            nominal_std=50.0,
            sampling_interval_seconds=0.5,
            nominal_min=-6000.0,
            nominal_max=6000.0,
            description="Reaction wheel flywheel rotational velocity.",
        ),
        "tracking_status": VariableDefinition(
            parameter_name="tracking_status",
            unit="mode",
            nominal_mean=1.0,
            nominal_std=0.0,
            sampling_interval_seconds=1.0,
            nominal_min=0.0,
            nominal_max=1.0,
            description="Star tracker quaternion valid lock flag (1=valid, 0=lost).",
        ),
        "pointing_error_deg": VariableDefinition(
            parameter_name="pointing_error_deg",
            unit="deg",
            nominal_mean=0.05,
            nominal_std=0.02,
            sampling_interval_seconds=1.0,
            nominal_min=0.0,
            nominal_max=5.0,
            description="Boresight attitude pointing error.",
        ),
    },
    allowed_interfaces=[
        InterfaceDefinition("power_in", "in", "power", "Power rail from power bus."),
        InterfaceDefinition("sensor_data_in", "in", "kinematic", "Attitude sensors (star tracker, sun sensor)."),
        InterfaceDefinition("actuator_command_out", "out", "control", "Torque commands to reaction wheels."),
        InterfaceDefinition("control_in", "in", "control", "Target attitude commands from OBC."),
    ],
    dependency_types=["control", "kinematic", "power"],
    plausible_propagation_delays={
        "sensor_to_adcs": PropagationDelayRange(
            min_seconds=0.1,
            max_seconds=2.0,
            typical_seconds=0.5,
            physics_basis="Sensor readout pipeline and Kalman filter attitude estimation cadence.",
        ),
        "adcs_to_actuator": PropagationDelayRange(
            min_seconds=0.2,
            max_seconds=5.0,
            typical_seconds=1.0,
            physics_basis="Control law execution and motor current driver rise time.",
        ),
    },
    relevant_failure_types=[
        "reaction_wheel_bearing_drag",
        "star_tracker_sun_blinding",
        "momentum_wheel_overspeed",
        "detumble_rate_timeout",
    ],
    structural_rules=[
        StructuralRule(
            rule_id="adcs_requires_power",
            rule_type="requires_incoming",
            description="ADCS subsystem requires incoming electrical power coupling.",
            target_dependency_type="power",
        )
    ],
    state_transition_spec=StateTransitionSpec(
        initial_state="FINE_POINTING",
        initial_values={"speed_rpm": 2400.0, "pointing_error_deg": 0.15, "tracking_status": 1.0},
        relevant_inputs=["power_bus.voltage_v"],
        evolution_rules=[
            StateEvolutionRule(
                target_variable="pointing_error_deg",
                equation_description="pointing_error_deg = 15.0 if power_bus.voltage_v < 3.2 else 0.15",
                parameters={"nominal_error_deg": 0.15, "tumble_error_deg": 15.0},
                rule_type="algebraic",
            ),
        ],
        failure_transitions=[
            FailureTransitionRule(
                rule_id="adcs_power_loss_tumble",
                condition_description="power_bus.voltage_v < 3.2",
                from_state="FINE_POINTING",
                to_state="ACTUATOR_FAULT",
                failure_type="adcs_attitude_tumble",
                consequence_variables={"speed_rpm": 0.0, "pointing_error_deg": 15.0, "tracking_status": 0.0},
            ),
        ],
        recovery_protection_rules=[
            RecoveryProtectionRule(
                rule_id="adcs_power_restoration",
                condition_description="power_bus.voltage_v >= 3.2",
                trigger_variable="pointing_error_deg",
                action="restore_nominal",
                target_subsystem="adcs",
                consequence_variables={"speed_rpm": 2400.0, "pointing_error_deg": 0.15, "tracking_status": 1.0, "state": "FINE_POINTING"},
            ),
        ],
    ),
)

