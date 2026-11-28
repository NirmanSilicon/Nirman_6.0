"""
backend/app/core/mission_model/graph_generator.py

Mission Dependency Graph Generator.
Dynamically generates the spacecraft subsystem dependency graph (NetworkX DiGraph)
from canonical module templates and a mission configuration (JSON/YAML/object).
Enforces structural rules, parameter checks, and interface compatibility.
"""

import os
from typing import Dict, List, Optional, Tuple, Any, Union
import networkx as nx

from .canonical_templates import (
    CausalModuleTemplate,
    get_canonical_template,
)
from .mission_schema import (
    MissionConfig,
    load_mission_config,
    validate_mission_config,
    assert_valid_mission_config,
    MissionValidationError,
)

DEFAULT_CANONICAL_CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "missions",
    "canonical_cubesat.json",
)

# Canonical mapping from dependency_strength string to numeric weight
STRENGTH_WEIGHT: Dict[str, float] = {
    "critical": 1.0,
    "strong": 0.75,
    "moderate": 0.5,
    "weak": 0.25,
}

WEIGHT_TO_STRENGTH = [
    (0.9, "critical"),
    (0.7, "strong"),
    (0.4, "moderate"),
    (0.0, "weak"),
]


def weight_to_strength(weight: float) -> str:
    """Convert numeric weight [0.0..1.0] to canonical strength label."""
    for threshold, label in WEIGHT_TO_STRENGTH:
        if weight >= threshold:
            return label
    return "weak"


class MissionDependencyGraph:
    """
    Encapsulates the compiled spacecraft subsystem dependency graph.
    Provides graph traversal, candidate cause generation, path strength evaluation,
    and structural verification against subsystem templates.
    """

    def __init__(self, config: MissionConfig, graph: nx.DiGraph):
        self.config = config
        self.graph = graph

    @property
    def number_of_nodes(self) -> int:
        return self.graph.number_of_nodes()

    @property
    def number_of_edges(self) -> int:
        return self.graph.number_of_edges()

    def to_networkx(self) -> nx.DiGraph:
        """Return the underlying NetworkX directed graph."""
        return self.graph

    def path_strength(self, source: str, target: str) -> Optional[float]:
        """
        Multiply dependency strength along the shortest path from source to target.
        Returns None if target is unreachable from source.
        """
        if source not in self.graph or target not in self.graph:
            return None
        if not nx.has_path(self.graph, source, target):
            return None
        path = nx.shortest_path(self.graph, source, target)
        strength = 1.0
        for i in range(len(path) - 1):
            edge_data = self.graph.edges[path[i], path[i + 1]]
            s_label = edge_data.get("dependency_strength", "moderate")
            strength *= STRENGTH_WEIGHT.get(s_label, edge_data.get("weight", 0.5))
        return strength

    def get_upstream_candidates(self, component: str, max_hops: int = 3) -> List[Tuple[str, int]]:
        """Find all upstream ancestor components within max_hops."""
        if component not in self.graph:
            return []
        candidates = []
        lengths = nx.single_source_shortest_path_length(self.graph.reverse(), component)
        for anc, dist in lengths.items():
            if anc != component and dist <= max_hops:
                candidates.append((anc, dist))
        return candidates

    def get_downstream_dependents(self, component: str) -> List[str]:
        """Find all reachable downstream dependent components from a given node."""
        if component not in self.graph:
            return []
        return list(nx.descendants(self.graph, component))

    def validate_structural_rules(self) -> List[str]:
        """
        Evaluate structural rules declared in canonical subsystem templates
        against the instantiated mission graph edges.
        """
        violations: List[str] = []
        for module_cfg in self.config.modules:
            tmpl = get_canonical_template(module_cfg.module_type)
            if not tmpl:
                continue

            for rule in tmpl.structural_rules:
                if rule.rule_type == "requires_incoming":
                    # Check if incoming edge with target_dependency_type exists
                    in_edges = self.graph.in_edges(module_cfg.module_id, data=True)
                    has_matching = any(
                        d.get("dependency_type") == rule.target_dependency_type
                        for _, _, d in in_edges
                    )
                    if not has_matching:
                        violations.append(
                            f"Structural rule '{rule.rule_id}' violated for module '{module_cfg.module_id}': "
                            f"Subsystem requires incoming '{rule.target_dependency_type}' dependency."
                        )
        return violations

    def to_dict(self) -> Dict[str, Any]:
        """Export serializable representation of mission architecture."""
        nodes_data = []
        for node_id, data in self.graph.nodes(data=True):
            nodes_data.append({
                "id": node_id,
                "component_type": data.get("component_type", "subsystem"),
                "module_type": data.get("module_type", "Unknown"),
                "name": data.get("name", node_id),
                "description": data.get("description", ""),
                "telemetry_channels": data.get("telemetry_channels", []),
                "parameters": data.get("parameters", {}),
            })

        edges_data = []
        for u, v, data in self.graph.edges(data=True):
            edges_data.append({
                "source": u,
                "target": v,
                "dependency_type": data.get("dependency_type", "functional"),
                "dependency_strength": data.get("dependency_strength", "moderate"),
                "weight": data.get("weight", 0.5),
                "propagation_delay_seconds": data.get("propagation_delay_seconds", 0.5),
                "description": data.get("description", ""),
            })

        return {
            "mission_id": self.config.mission_id,
            "spacecraft_name": self.config.spacecraft_name,
            "orbit_type": self.config.orbit_type,
            "nodes": nodes_data,
            "edges": edges_data,
            "rule_violations": self.validate_structural_rules(),
        }


def generate_mission_dependency_graph(
    source: Optional[Union[str, Dict[str, Any], MissionConfig]] = None,
    validate: bool = True,
    require_dag: bool = False,
) -> MissionDependencyGraph:
    """
    Generate the mission dependency graph from configuration and canonical templates.

    Parameters:
    - source: File path (.json/.yaml), raw dict, MissionConfig object, or None (defaults to canonical CubeSat reference architecture)
    - validate: Whether to run semantic validation
    - require_dag: If True, rejects configurations containing directed cycles

    Returns:
    - MissionDependencyGraph instance
    """
    if source is None:
        source = DEFAULT_CANONICAL_CONFIG_PATH

    if isinstance(source, MissionConfig):
        cfg = source
    else:
        cfg = load_mission_config(source)

    if validate:
        assert_valid_mission_config(cfg, require_dag=require_dag)

    g = nx.DiGraph()

    # 1. Add nodes with merged attributes from template + module config
    for m in cfg.modules:
        tmpl = get_canonical_template(m.module_type)

        component_type = m.parameters.get("component_type")
        if not component_type:
            # Derive default component_type from template or module_type
            type_map = {
                "Thermal": "sensor" if "sensor" in m.module_id else "controller",
                "Battery": "power",
                "EPS": "power",
                "OBC": "compute",
                "FlightSoftware": "compute",
                "Communications": "comms",
                "ADCS": "control",
                "Payload": "payload",
            }
            component_type = type_map.get(m.module_type, "subsystem")

        states = tmpl.states if tmpl else []
        failure_modes = tmpl.relevant_failure_types if tmpl else []
        variables = tmpl.measurable_variables if tmpl else {}

        g.add_node(
            m.module_id,
            component_type=component_type,
            module_type=m.module_type,
            name=m.name or m.module_id,
            description=m.description or (tmpl.description if tmpl else ""),
            parameters=m.parameters,
            telemetry_channels=m.telemetry_channels,
            states=states,
            failure_modes=failure_modes,
            measurable_variables=variables,
        )

    # 2. Add edges with merged attributes from template + dependency config
    for dep in cfg.dependencies:
        dep_strength = dep.metadata.get("dependency_strength")
        if not dep_strength:
            dep_strength = weight_to_strength(dep.weight)

        g.add_edge(
            dep.source_module_id,
            dep.target_module_id,
            dependency_type=dep.dependency_type,
            dependency_strength=dep_strength,
            weight=dep.weight,
            propagation_delay_seconds=dep.propagation_delay_seconds,
            description=dep.description,
            metadata=dep.metadata,
        )

    return MissionDependencyGraph(config=cfg, graph=g)


def build_generated_dependency_graph(
    source: Optional[Union[str, Dict[str, Any], MissionConfig]] = None,
) -> nx.DiGraph:
    """
    Convenience helper: returns the raw nx.DiGraph for direct drop-in compatibility
    with existing callers expecting build_dependency_graph().
    """
    mdg = generate_mission_dependency_graph(source=source)
    return mdg.to_networkx()
