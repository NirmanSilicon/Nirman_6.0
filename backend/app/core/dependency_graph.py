"""
app/core/dependency_graph.py

Backward-compatible entry point for spacecraft subsystem dependency graphs.
Delegates to the dynamic Mission Dependency Graph Generator (canonical templates
+ declarative mission configuration) while providing a fallback to the standard
CubeSat reference profile for standalone/legacy operation.

Graph reference: Canonical CubeSat architecture compiled from subsystem templates.
"""

import networkx as nx
from typing import Optional, List, Tuple


try:
    from app.core.mission_model.graph_generator import (
        generate_mission_dependency_graph,
        build_generated_dependency_graph,
        STRENGTH_WEIGHT as GENERATED_STRENGTH_WEIGHT,
    )
except ImportError:
    try:
        from mission_model.graph_generator import (
            generate_mission_dependency_graph,
            build_generated_dependency_graph,
            STRENGTH_WEIGHT as GENERATED_STRENGTH_WEIGHT,
        )
    except ImportError:
        generate_mission_dependency_graph = None
        build_generated_dependency_graph = None
        GENERATED_STRENGTH_WEIGHT = None


def build_dependency_graph(mission_source: Optional[object] = None) -> nx.DiGraph:
    """
    Constructs the CubeSat subsystem dependency graph.
    Delegates to the mission configuration graph generator (canonical templates + mission config)
    while providing a fallback for standalone operation.
    """
    if build_generated_dependency_graph is not None:
        return build_generated_dependency_graph(source=mission_source)

    g = nx.DiGraph()

    # --- Nodes: component_id, component_type ---
    nodes = [
        ("thermal_sensor", "sensor"),
        ("heater_controller", "controller"),
        ("battery", "power"),
        ("battery_protection", "controller"),
        ("power_bus", "power"),
        ("comms", "comms"),
        ("obc", "compute"),
        ("payload", "payload"),
        ("solar_array", "power"),
        ("adcs", "control"),
        ("reaction_wheel", "actuator"),
        ("star_tracker", "sensor"),
        ("flight_software", "compute"),
    ]
    for component_id, component_type in nodes:
        g.add_node(component_id, component_type=component_type)

    # --- Edges: (source, target, dependency_type, dependency_strength) ---
    edges = [
        ("thermal_sensor", "heater_controller", "thermal", "critical"),
        ("heater_controller", "battery", "thermal", "strong"),
        ("battery", "battery_protection", "control", "critical"),
        ("battery_protection", "power_bus", "power", "critical"),
        ("power_bus", "comms", "power", "critical"),
        ("power_bus", "obc", "power", "critical"),
        ("obc", "payload", "power", "strong"),
        ("solar_array", "power_bus", "power", "critical"),
        ("obc", "adcs", "control", "strong"),
        ("adcs", "reaction_wheel", "control", "critical"),
        ("star_tracker", "adcs", "kinematic", "strong"),
        ("payload", "comms", "data", "moderate"),
        ("comms", "flight_software", "software", "strong"),
        ("flight_software", "comms", "control", "critical"),
        ("flight_software", "obc", "software", "strong"),
        ("obc", "flight_software", "software", "critical"),
    ]
    for source, target, dep_type, strength in edges:
        g.add_edge(source, target, dependency_type=dep_type, dependency_strength=strength)

    return g


# Numeric weight for dependency_strength, used directly in Stage 3 scoring.
STRENGTH_WEIGHT = GENERATED_STRENGTH_WEIGHT if GENERATED_STRENGTH_WEIGHT is not None else {
    "critical": 1.0,
    "strong": 0.75,
    "moderate": 0.5,
    "weak": 0.25,
}



def path_strength(g: nx.DiGraph, source: str, target: str) -> Optional[float]:
    """
    Multiply dependency_strength along the shortest path from source to
    target. Returns None if no path exists (i.e. target is not reachable
    from source at all — used by Stage 3 to reject impossible candidates
    before scoring).
    """
    if source not in g or target not in g:
        return None
    if not nx.has_path(g, source, target):
        return None
    path = nx.shortest_path(g, source, target)
    strength = 1.0
    for i in range(len(path) - 1):
        edge = g.edges[path[i], path[i + 1]]
        strength *= STRENGTH_WEIGHT[edge["dependency_strength"]]
    return strength


def get_upstream_candidates(g: nx.DiGraph, component: str, max_hops: int = 3) -> List[Tuple[str, int]]:
    """
    Find all upstream ancestor components up to max_hops away.
    Returns a list of (ancestor_component, hop_distance).
    """
    if component not in g:
        return []

    candidates = []
    lengths = nx.single_source_shortest_path_length(g.reverse(), component)
    for anc, dist in lengths.items():
        if anc != component and dist <= max_hops:
            candidates.append((anc, dist))

    return candidates


def get_downstream_dependents(g: nx.DiGraph, component: str) -> List[str]:
    """Find all reachable downstream dependent components from a given node."""
    if component not in g:
        return []
    return list(nx.descendants(g, component))


if __name__ == "__main__":
    # Quick sanity check — run this file directly to confirm the graph loads
    g = build_dependency_graph()
    print(f"Nodes ({g.number_of_nodes()}):", list(g.nodes(data="component_type")))
    print(f"Edges ({g.number_of_edges()}):")
    for u, v, d in g.edges(data=True):
        print(f"  {u} -> {v}  [{d['dependency_type']}, {d['dependency_strength']}]")
    print("\nPath strength thermal_sensor -> payload:",
          path_strength(g, "thermal_sensor", "payload"))
