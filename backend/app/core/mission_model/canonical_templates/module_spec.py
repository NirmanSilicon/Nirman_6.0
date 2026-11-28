"""
backend/app/core/mission_model/canonical_templates/module_spec.py

Specification classes for the Canonical CubeSat Causal Template Library.
Defines formal abstractions for states, measurable telemetry variables,
physical interfaces, dependency types, propagation delays, failure modes,
and structural rules.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Literal, Any


DependencyType = Literal["thermal", "control", "power", "kinematic", "software", "data", "indirect"]
DependencyStrength = Literal["critical", "strong", "moderate", "weak", "indirect"]


@dataclass
class VariableDefinition:
    """Measurable telemetry parameter defined within a causal module."""
    parameter_name: str
    unit: str
    nominal_mean: float
    nominal_std: float
    sampling_interval_seconds: float
    nominal_min: Optional[float] = None
    nominal_max: Optional[float] = None
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "parameter_name": self.parameter_name,
            "unit": self.unit,
            "nominal_mean": self.nominal_mean,
            "nominal_std": self.nominal_std,
            "sampling_interval_seconds": self.sampling_interval_seconds,
            "nominal_min": self.nominal_min,
            "nominal_max": self.nominal_max,
            "description": self.description,
        }


@dataclass
class InterfaceDefinition:
    """Allowed incoming or outgoing interface on a spacecraft module."""
    name: str
    direction: Literal["in", "out", "bidirectional"]
    interface_type: DependencyType
    description: str = ""


@dataclass
class PropagationDelayRange:
    """Plausible physical propagation delay interval in seconds."""
    min_seconds: float
    max_seconds: float
    typical_seconds: float
    physics_basis: str = ""


@dataclass
class StructuralRule:
    """Structural validation rule governing module connectivity."""
    rule_id: str
    rule_type: Literal["requires_incoming", "requires_outgoing", "no_self_loop", "max_incoming", "custom"]
    description: str
    target_dependency_type: Optional[DependencyType] = None
    required_module_type: Optional[str] = None


@dataclass
class StateEvolutionRule:
    """Deterministic state evolution rule describing variable updates over time."""
    target_variable: str
    equation_description: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    rule_type: str = "algebraic"  # algebraic, differential_discrete, hysteresis

    def to_dict(self) -> Dict[str, Any]:
        return {
            "target_variable": self.target_variable,
            "equation_description": self.equation_description,
            "parameters": self.parameters,
            "rule_type": self.rule_type,
        }


@dataclass
class FailureTransitionRule:
    """Deterministic condition for transitioning into a degraded or failed state."""
    rule_id: str
    condition_description: str
    from_state: str
    to_state: str
    failure_type: str
    consequence_variables: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "condition_description": self.condition_description,
            "from_state": self.from_state,
            "to_state": self.to_state,
            "failure_type": self.failure_type,
            "consequence_variables": self.consequence_variables,
        }


@dataclass
class RecoveryProtectionRule:
    """Deterministic recovery, safety latch, or protection breaker behavior."""
    rule_id: str
    condition_description: str
    trigger_variable: str
    action: str  # clamp, trip_breaker, shed_load, restore_nominal
    target_subsystem: str = ""
    consequence_variables: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "condition_description": self.condition_description,
            "trigger_variable": self.trigger_variable,
            "action": self.action,
            "target_subsystem": self.target_subsystem,
            "consequence_variables": self.consequence_variables,
        }


@dataclass
class StateTransitionSpec:
    """
    Formal deterministic state-transition model for structural counterfactual simulation.
    Exposes state evolution, relevant inputs, failure transitions, and recovery/protection rules.
    """
    initial_state: str = "NOMINAL"
    initial_values: Dict[str, float] = field(default_factory=dict)
    relevant_inputs: List[str] = field(default_factory=list)
    evolution_rules: List[StateEvolutionRule] = field(default_factory=list)
    failure_transitions: List[FailureTransitionRule] = field(default_factory=list)
    recovery_protection_rules: List[RecoveryProtectionRule] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "initial_state": self.initial_state,
            "initial_values": self.initial_values,
            "relevant_inputs": self.relevant_inputs,
            "evolution_rules": [r.to_dict() for r in self.evolution_rules],
            "failure_transitions": [r.to_dict() for r in self.failure_transitions],
            "recovery_protection_rules": [r.to_dict() for r in self.recovery_protection_rules],
        }


@dataclass
class CausalModuleTemplate:
    """
    Standardized causal blueprint for a CubeSat subsystem category.
    Defines the physical characteristics, observables, and failure propagation rules.
    """
    module_type: str
    name: str
    description: str
    default_component_id: str
    states: List[str] = field(default_factory=list)
    measurable_variables: Dict[str, VariableDefinition] = field(default_factory=dict)
    allowed_interfaces: List[InterfaceDefinition] = field(default_factory=list)
    dependency_types: List[DependencyType] = field(default_factory=list)
    plausible_propagation_delays: Dict[str, PropagationDelayRange] = field(default_factory=dict)
    relevant_failure_types: List[str] = field(default_factory=list)
    structural_rules: List[StructuralRule] = field(default_factory=list)
    physics_parameters: Dict[str, Any] = field(default_factory=dict)
    state_transition_spec: Optional[StateTransitionSpec] = None

    def to_dict(self) -> Dict[str, Any]:
        res = {
            "module_type": self.module_type,
            "name": self.name,
            "description": self.description,
            "default_component_id": self.default_component_id,
            "states": self.states,
            "measurable_variables": {k: v.to_dict() for k, v in self.measurable_variables.items()},
            "dependency_types": self.dependency_types,
            "relevant_failure_types": self.relevant_failure_types,
            "physics_parameters": self.physics_parameters,
        }
        if self.state_transition_spec is not None:
            res["state_transition_spec"] = self.state_transition_spec.to_dict()
        return res

