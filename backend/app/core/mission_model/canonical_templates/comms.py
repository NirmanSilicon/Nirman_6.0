"""
backend/app/core/mission_model/canonical_templates/comms.py

Canonical Causal Template: Communications Subsystem.
Models RF transponders, power amplifiers (PA), antennas, carrier tracking,
and telemetry framing interfaces.
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

COMMS_TEMPLATE = CausalModuleTemplate(
    module_type="Communications",
    name="RF Communications Transponder Subsystem",
    description="S-Band / UHF transceiver, RF power amplifier, and carrier modulation hardware.",
    default_component_id="comms",
    states=["TRANSMITTING", "RECEIVING", "CARRIER_LOST", "PA_OVERCURRENT", "OFFLINE"],
    measurable_variables={
        "signal_strength_dbm": VariableDefinition(
            parameter_name="signal_strength_dbm",
            unit="dBm",
            nominal_mean=-70.0,
            nominal_std=2.0,
            sampling_interval_seconds=2.0,
            nominal_min=-115.0,
            nominal_max=-40.0,
            description="RF receiver signal strength / AGC indicator.",
        ),
        "pa_temperature_c": VariableDefinition(
            parameter_name="temperature_c",
            unit="°C",
            nominal_mean=32.0,
            nominal_std=1.5,
            sampling_interval_seconds=5.0,
            nominal_min=-20.0,
            nominal_max=70.0,
            description="Power amplifier transistor casing temperature.",
        ),
        "tx_power_w": VariableDefinition(
            parameter_name="power_w",
            unit="W",
            nominal_mean=2.0,
            nominal_std=0.1,
            sampling_interval_seconds=2.0,
            nominal_min=0.0,
            nominal_max=5.0,
            description="Transmitter forward RF output power.",
        ),
    },
    allowed_interfaces=[
        InterfaceDefinition("power_in", "in", "power", "Power rail supply from EPS power bus."),
        InterfaceDefinition("software_ctrl", "bidirectional", "software", "Telecommand ingest and framing with Flight Software."),
        InterfaceDefinition("payload_data_in", "in", "data", "Downlink science packets from payload."),
    ],
    dependency_types=["power", "control", "software", "data"],
    plausible_propagation_delays={
        "power_loss_to_carrier_mute": PropagationDelayRange(
            min_seconds=0.01,
            max_seconds=3.0,
            typical_seconds=0.5,
            physics_basis="Transceiver oscillator PLL loss-of-lock upon rail drop.",
        ),
        "fsw_mute_to_carrier_loss": PropagationDelayRange(
            min_seconds=0.1,
            max_seconds=5.0,
            typical_seconds=1.0,
            physics_basis="Diagnostic telecommand execution or FDIR command muting PA enable pin.",
        ),
    },
    relevant_failure_types=[
        "carrier_lost_sentinel_dropout",
        "pa_current_surge",
        "pll_lock_failure",
        "uplink_command_buffer_lockup",
    ],
    structural_rules=[
        StructuralRule(
            rule_id="comms_requires_power",
            rule_type="requires_incoming",
            description="Communications transponder requires incoming electrical power rail.",
            target_dependency_type="power",
        )
    ],
    state_transition_spec=StateTransitionSpec(
        initial_state="TRANSMITTING",
        initial_values={"signal_strength_dbm": -70.0, "tx_power_w": 2.0},
        relevant_inputs=["power_bus.voltage_v"],
        evolution_rules=[
            StateEvolutionRule(
                target_variable="signal_strength_dbm",
                equation_description="signal_strength_dbm = -999.0 if power_bus.voltage_v < 3.2 else -70.0",
                parameters={"nominal_dbm": -70.0, "carrier_loss_dbm": -999.0},
                rule_type="algebraic",
            ),
        ],
        failure_transitions=[
            FailureTransitionRule(
                rule_id="comms_carrier_loss_uvlo",
                condition_description="power_bus.voltage_v < 3.2",
                from_state="TRANSMITTING",
                to_state="CARRIER_LOST",
                failure_type="carrier_dropout_bus_failure",
                consequence_variables={"signal_strength_dbm": -999.0, "tx_power_w": 0.0},
            ),
        ],
        recovery_protection_rules=[
            RecoveryProtectionRule(
                rule_id="comms_link_restoration",
                condition_description="power_bus.voltage_v >= 3.2",
                trigger_variable="signal_strength_dbm",
                action="restore_nominal",
                target_subsystem="comms",
                consequence_variables={"signal_strength_dbm": -70.0, "tx_power_w": 2.0, "state": "TRANSMITTING"},
            ),
        ],
    ),
)

