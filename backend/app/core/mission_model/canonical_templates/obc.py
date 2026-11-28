"""
backend/app/core/mission_model/canonical_templates/obc.py

Canonical Causal Template: On-Board Computer (OBC).
Models flight computer microcontrollers, RTOS scheduler threads,
watchdog timers, reset circuits, and multi-subsystem coordination.
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

OBC_TEMPLATE = CausalModuleTemplate(
    module_type="OBC",
    name="On-Board Computer & Flight Controller",
    description="Central processing unit, RTOS executive, watchdog supervisor, and payload scheduler.",
    default_component_id="obc",
    states=["NOMINAL", "HIGH_LOAD", "RTOS_DEADLOCK", "BROWNOUT_RESET", "SAFE_MODE"],
    measurable_variables={
        "cpu_load": VariableDefinition(
            parameter_name="cpu_load",
            unit="load",
            nominal_mean=0.243,
            nominal_std=0.031,
            sampling_interval_seconds=1.0,
            nominal_min=0.05,
            nominal_max=0.90,
            description="Normalized CPU core scheduling utilization.",
        ),
        "ram_usage_pct": VariableDefinition(
            parameter_name="ram_usage_pct",
            unit="%",
            nominal_mean=42.0,
            nominal_std=2.0,
            sampling_interval_seconds=5.0,
            nominal_min=10.0,
            nominal_max=95.0,
            description="SRAM / ECC memory heap utilization percentage.",
        ),
        "reboot_count": VariableDefinition(
            parameter_name="reboot_count",
            unit="count",
            nominal_mean=0.0,
            nominal_std=0.0,
            sampling_interval_seconds=1.0,
            nominal_min=0.0,
            nominal_max=100.0,
            description="Unscheduled hardware watchdog reset event accumulator.",
        ),
    },
    allowed_interfaces=[
        InterfaceDefinition("power_in", "in", "power", "Regulated 3.3V / 5.0V power rail from EPS."),
        InterfaceDefinition("payload_ctrl_out", "out", "power", "Power and command bus gating to payload."),
        InterfaceDefinition("adcs_ctrl_out", "out", "control", "Attitude mode and guidance commands to ADCS."),
        InterfaceDefinition("software_bus", "bidirectional", "software", "RTOS inter-process messaging with Flight Software."),
    ],
    dependency_types=["power", "control", "software"],
    plausible_propagation_delays={
        "power_loss_to_reset": PropagationDelayRange(
            min_seconds=0.01,
            max_seconds=2.0,
            typical_seconds=0.5,
            physics_basis="Power rail brownout voltage detector threshold trip and POR assert.",
        ),
        "deadlock_to_watchdog": PropagationDelayRange(
            min_seconds=5.0,
            max_seconds=30.0,
            typical_seconds=15.0,
            physics_basis="Hardware watchdog counter countdown timeout without heartbeat kick.",
        ),
    },
    relevant_failure_types=[
        "obc_rtos_scheduler_deadlock",
        "watchdog_timer_trip_reboot",
        "power_loss_brownout",
        "memory_ecc_double_fault",
    ],
    structural_rules=[
        StructuralRule(
            rule_id="obc_requires_power",
            rule_type="requires_incoming",
            description="On-Board Computer must receive electrical power from power bus.",
            target_dependency_type="power",
        )
    ],
    state_transition_spec=StateTransitionSpec(
        initial_state="NOMINAL",
        initial_values={"cpu_load": 0.25, "reboot_count": 0.0},
        relevant_inputs=["power_bus.voltage_v"],
        evolution_rules=[
            StateEvolutionRule(
                target_variable="cpu_load",
                equation_description="cpu_load = 0.0 if power_bus.voltage_v < 3.2 else 0.25",
                parameters={"nominal_load": 0.25, "uvlo_threshold": 3.2},
                rule_type="algebraic",
            ),
        ],
        failure_transitions=[
            FailureTransitionRule(
                rule_id="obc_power_loss_brownout",
                condition_description="power_bus.voltage_v < 3.2",
                from_state="NOMINAL",
                to_state="BROWNOUT_RESET",
                failure_type="power_loss_brownout",
                consequence_variables={"cpu_load": 0.0, "online": False},
            ),
        ],
        recovery_protection_rules=[
            RecoveryProtectionRule(
                rule_id="obc_power_restoration",
                condition_description="power_bus.voltage_v >= 3.2",
                trigger_variable="cpu_load",
                action="restore_nominal",
                target_subsystem="obc",
                consequence_variables={"cpu_load": 0.25, "online": True, "state": "NOMINAL"},
            ),
        ],
    ),
)

