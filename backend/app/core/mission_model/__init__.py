"""
backend/app/core/mission_model/__init__.py

AXYRA Mission Architecture Compatibility Boundary & Causal Model System.
Exposes canonical subsystem templates, mission configuration schema & validation,
dynamic dependency graph generation, causal model specs, event models, and
compiled mission causal graphs.
"""

from .event_model import (
    EventRecord,
    EventType,
    EventSeverity,
    TimingConfidence,
    CausalRole,
)
from .canonical_templates import (
    CausalModuleTemplate,
    VariableDefinition,
    InterfaceDefinition,
    PropagationDelayRange,
    StructuralRule,
    EPS_POWER_TEMPLATE,
    BATTERY_TEMPLATE,
    THERMAL_TEMPLATE,
    ADCS_TEMPLATE,
    OBC_TEMPLATE,
    COMMS_TEMPLATE,
    PAYLOAD_TEMPLATE,
    FLIGHT_SOFTWARE_TEMPLATE,
    CANONICAL_MODULE_TEMPLATES,
    get_canonical_template,
    list_canonical_templates,
)
from .mission_schema import (
    MissionConfig,
    MissionModuleConfig,
    MissionDependencyConfig,
    MissionRuleConfig,
    load_mission_config,
    validate_mission_config,
    assert_valid_mission_config,
    MissionValidationError,
)
from .graph_generator import (
    MissionDependencyGraph,
    generate_mission_dependency_graph,
    build_generated_dependency_graph,
    STRENGTH_WEIGHT as GRAPH_STRENGTH_WEIGHT,
)
from .subsystem_template import (
    ComponentDefinition,
    DependencyDefinition,
    SubsystemTemplate,
    STANDARD_CUBESAT_13_NODE_TEMPLATE,
    STRENGTH_WEIGHT,
    DependencyType,
    DependencyStrength,
)
from .causal_model import (
    CausalScoringWeights,
    CausalModelSpec,
    STANDARD_CAUSAL_MODEL_SPEC,
    load_causal_spec_from_file,
)
from .mission_graph import (
    MissionCausalNode,
    MissionCausalEdge,
    MissionCausalGraph,
)
from .temporal_event_graph import (
    TemporalEventGraph,
    TemporalEventNode,
    TemporalCausalEdge,
    find_plausible_propagation_window,
    compute_temporal_score,
)
from .learned_causal_scorer import (
    HardConstraintResult,
    HardConstraintValidator,
    LegacyCausalScorer,
    LearnedCausalScorer,
    ScoredEdgeResult,
    get_learned_causal_scorer,
)
from .legacy_adapter import (
    get_standard_dependency_graph,
    calculate_path_strength,
    compile_mission_graph_from_events,
)
from .structural_simulator import (
    StructuralCounterfactualSimulator,
    StructuralCounterfactualResult,
    StructuralIntervention,
    SimulatedFailureEvent,
    ShiftedFailureEvent,
    MissionImpactDifference,
)



__all__ = [
    # Event representation
    "EventRecord",
    "EventType",
    "EventSeverity",
    "TimingConfidence",
    "CausalRole",
    # Canonical Templates
    "CausalModuleTemplate",
    "VariableDefinition",
    "InterfaceDefinition",
    "PropagationDelayRange",
    "StructuralRule",
    "EPS_POWER_TEMPLATE",
    "BATTERY_TEMPLATE",
    "THERMAL_TEMPLATE",
    "ADCS_TEMPLATE",
    "OBC_TEMPLATE",
    "COMMS_TEMPLATE",
    "PAYLOAD_TEMPLATE",
    "FLIGHT_SOFTWARE_TEMPLATE",
    "CANONICAL_MODULE_TEMPLATES",
    "get_canonical_template",
    "list_canonical_templates",
    # Mission Configuration Schema & Validation
    "MissionConfig",
    "MissionModuleConfig",
    "MissionDependencyConfig",
    "MissionRuleConfig",
    "load_mission_config",
    "validate_mission_config",
    "assert_valid_mission_config",
    "MissionValidationError",
    # Dynamic Mission Graph Generation
    "MissionDependencyGraph",
    "generate_mission_dependency_graph",
    "build_generated_dependency_graph",
    "GRAPH_STRENGTH_WEIGHT",
    # Subsystem templates & Legacy structures
    "ComponentDefinition",
    "DependencyDefinition",
    "SubsystemTemplate",
    "STANDARD_CUBESAT_13_NODE_TEMPLATE",
    "STRENGTH_WEIGHT",
    "DependencyType",
    "DependencyStrength",
    # Causal model
    "CausalScoringWeights",
    "CausalModelSpec",
    "STANDARD_CAUSAL_MODEL_SPEC",
    "load_causal_spec_from_file",
    # Mission graph & Temporal Event Graph
    "MissionCausalNode",
    "MissionCausalEdge",
    "MissionCausalGraph",
    "TemporalEventGraph",
    "TemporalEventNode",
    "TemporalCausalEdge",
    "find_plausible_propagation_window",
    "compute_temporal_score",
    # Learned Causal Scorer & Hard Constraints
    "HardConstraintResult",
    "HardConstraintValidator",
    "LegacyCausalScorer",
    "LearnedCausalScorer",
    "ScoredEdgeResult",
    "get_learned_causal_scorer",
    # Legacy adapter
    "get_standard_dependency_graph",
    "calculate_path_strength",
    "compile_mission_graph_from_events",
    # Structural Counterfactual Simulator
    "StructuralCounterfactualSimulator",
    "StructuralCounterfactualResult",
    "StructuralIntervention",
    "SimulatedFailureEvent",
    "ShiftedFailureEvent",
    "MissionImpactDifference",
]


