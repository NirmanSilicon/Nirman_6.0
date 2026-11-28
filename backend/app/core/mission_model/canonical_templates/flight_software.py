"""
backend/app/core/mission_model/canonical_templates/flight_software.py

Canonical Causal Template: Flight Software (FSW) Subsystem.
Models the Real-Time Operating System (RTOS), FDIR (Fault Detection,
Isolation, and Recovery) state machines, control task schedulers,
and inter-task message queues.
"""

from .module_spec import (
    CausalModuleTemplate,
    VariableDefinition,
    InterfaceDefinition,
    PropagationDelayRange,
    StructuralRule,
)

FLIGHT_SOFTWARE_TEMPLATE = CausalModuleTemplate(
    module_type="FlightSoftware",
    name="Flight Software & FDIR Execution Environment",
    description="RTOS executive, FDIR state machine, attitude guidance loops, and telecommand router.",
    default_component_id="flight_software",
    states=["NOMINAL", "DEGRADED", "SAFE_MODE_ENTRY", "WATCHDOG_REBOOT", "DEADLOCK", "CRITICAL_FAULT"],
    measurable_variables={
        "cpu_execution_time_pct": VariableDefinition(
            parameter_name="cpu_load_pct",
            unit="%",
            nominal_mean=42.0,
            nominal_std=4.0,
            sampling_interval_seconds=1.0,
            nominal_min=0.0,
            nominal_max=100.0,
            description="Core loop execution budget utilization.",
        ),
        "task_missed_deadlines": VariableDefinition(
            parameter_name="missed_deadlines_count",
            unit="events",
            nominal_mean=0.0,
            nominal_std=0.0,
            sampling_interval_seconds=1.0,
            nominal_min=0.0,
            nominal_max=100.0,
            description="Real-time operating system scheduler missed deadline count.",
        ),
        "ipc_queue_depth": VariableDefinition(
            parameter_name="queue_depth",
            unit="messages",
            nominal_mean=3.0,
            nominal_std=1.0,
            sampling_interval_seconds=1.0,
            nominal_min=0.0,
            nominal_max=256.0,
            description="Inter-process communication messaging queue backlog depth.",
        ),
    },
    allowed_interfaces=[
        InterfaceDefinition("obc_host", "in", "software", "Execution environment hosted on OBC processor."),
        InterfaceDefinition("adcs_control", "out", "control", "Attitude control loop commands."),
        InterfaceDefinition("comms_telecommand", "bidirectional", "software", "Command parsing and telemetry packet dispatch."),
        InterfaceDefinition("fdir_watchdog", "out", "software", "FDIR heartbeat reset line."),
    ],
    dependency_types=["software", "control", "data", "hardware"],
    plausible_propagation_delays={
        "obc_throttle_to_deadline_miss": PropagationDelayRange(
            min_seconds=0.01,
            max_seconds=1.0,
            typical_seconds=0.1,
            physics_basis="CPU underclocking or starvation causing scheduler thread slips.",
        ),
        "fsw_deadlock_to_fdir_trigger": PropagationDelayRange(
            min_seconds=0.5,
            max_seconds=10.0,
            typical_seconds=2.0,
            physics_basis="Watchdog timer expiration threshold triggering spacecraft Safe Mode.",
        ),
    },
    relevant_failure_types=[
        "scheduler_starvation_fault",
        "safe_mode_trip",
        "memory_leak_exhaustion",
        "fdir_reboot_cascade",
    ],
    structural_rules=[
        StructuralRule(
            rule_id="fsw_requires_obc",
            rule_type="requires_incoming",
            description="Flight software must execute on an OBC processor host.",
            target_dependency_type="software",
        )
    ],
)
