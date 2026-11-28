"""
backend/app/core/mission_model/canonical_templates/payload.py

Canonical Causal Template: Science / Mission Payload Subsystem.
Models optical imagers, scientific spectrometers, active sensors,
high-rate memory buffers, and instrument power interfaces.
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

PAYLOAD_TEMPLATE = CausalModuleTemplate(
    module_type="Payload",
    name="Science / Instrument Payload Subsystem",
    description="Optical imager, spectrometer, synthetic aperture radar, or secondary experiment package.",
    default_component_id="payload",
    states=["IDLE", "COLLECTING", "CALIBRATING", "BUFFER_OVERFLOW", "THERMAL_SHUTDOWN", "FAULT"],
    measurable_variables={
        "sensor_power_w": VariableDefinition(
            parameter_name="power_w",
            unit="W",
            nominal_mean=3.5,
            nominal_std=0.2,
            sampling_interval_seconds=1.0,
            nominal_min=0.0,
            nominal_max=8.0,
            description="Payload instrument active electrical draw.",
        ),
        "detector_temperature_c": VariableDefinition(
            parameter_name="temperature_c",
            unit="°C",
            nominal_mean=-10.0,
            nominal_std=0.8,
            sampling_interval_seconds=2.0,
            nominal_min=-40.0,
            nominal_max=25.0,
            description="Payload focal plane / detector temperature.",
        ),
        "data_buffer_occupancy_pct": VariableDefinition(
            parameter_name="buffer_pct",
            unit="%",
            nominal_mean=25.0,
            nominal_std=5.0,
            sampling_interval_seconds=5.0,
            nominal_min=0.0,
            nominal_max=100.0,
            description="High-rate payload internal memory buffer utilization.",
        ),
    },
    allowed_interfaces=[
        InterfaceDefinition("power_in", "in", "power", "Power rail supply from EPS power bus."),
        InterfaceDefinition("data_bus", "out", "data", "Science telemetry and downlink packet stream to OBC/FSW."),
        InterfaceDefinition("thermal_coupling", "in", "thermal", "Thermal dissipation connection to spacecraft bus / radiator."),
    ],
    dependency_types=["power", "control", "software", "thermal", "data"],
    plausible_propagation_delays={
        "power_loss_to_capture_halt": PropagationDelayRange(
            min_seconds=0.01,
            max_seconds=2.0,
            typical_seconds=0.3,
            physics_basis="Payload electronics reset or power cutoff when power bus fails.",
        ),
        "fsw_trigger_to_collect": PropagationDelayRange(
            min_seconds=0.05,
            max_seconds=1.0,
            typical_seconds=0.2,
            physics_basis="Instrument acquisition command scheduling across serial bus.",
        ),
    },
    relevant_failure_types=[
        "payload_detector_overheat",
        "focal_plane_adc_latchup",
        "buffer_underrun_overrun",
        "optical_calibration_drift",
    ],
    structural_rules=[
        StructuralRule(
            rule_id="payload_requires_power",
            rule_type="requires_incoming",
            description="Payload requires incoming electrical power rail.",
            target_dependency_type="power",
        )
    ],
    state_transition_spec=StateTransitionSpec(
        initial_state="COLLECTING",
        initial_values={"sensor_power_w": 3.5, "operational_state": 1.0},
        relevant_inputs=["power_bus.voltage_v"],
        evolution_rules=[
            StateEvolutionRule(
                target_variable="operational_state",
                equation_description="operational_state = 0.0 if power_bus.voltage_v < 5.0 else 1.0",
                parameters={"nominal_state": 1.0, "uvlo_threshold": 5.0},
                rule_type="algebraic",
            ),
        ],
        failure_transitions=[
            FailureTransitionRule(
                rule_id="payload_uvlo_shutdown",
                condition_description="power_bus.voltage_v < 5.0",
                from_state="COLLECTING",
                to_state="THERMAL_SHUTDOWN",
                failure_type="unscheduled_emergency_payload_shutdown",
                consequence_variables={"operational_state": 0.0, "sensor_power_w": 0.0},
            ),
        ],
        recovery_protection_rules=[
            RecoveryProtectionRule(
                rule_id="payload_nominal_recovery",
                condition_description="power_bus.voltage_v >= 5.0",
                trigger_variable="operational_state",
                action="restore_nominal",
                target_subsystem="payload",
                consequence_variables={"operational_state": 1.0, "sensor_power_w": 3.5, "state": "COLLECTING"},
            ),
        ],
    ),
)

