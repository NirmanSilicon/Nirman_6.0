"""Graph validation and analytics."""
from __future__ import annotations

import networkx as nx
from packages.graph.builder import InvalidModelError
from packages.domain.models import DistrictModel


def validate_model(district: DistrictModel) -> None:
    """Validate asset and dependency consistency for a district model."""
    asset_ids = set()
    for asset in district.assets:
        if not asset.asset_id or not asset.asset_id.strip():
            raise InvalidModelError("Asset ID must not be empty")
        if asset.asset_id in asset_ids:
            raise InvalidModelError(f"Duplicate asset ID: {asset.asset_id}")
        asset_ids.add(asset.asset_id)

    dependency_ids = set()
    for dep in district.dependencies:
        if not dep.dependency_id or not dep.dependency_id.strip():
            raise InvalidModelError("Dependency ID must not be empty")
        if dep.dependency_id in dependency_ids:
            raise InvalidModelError(f"Duplicate dependency ID: {dep.dependency_id}")
        dependency_ids.add(dep.dependency_id)

        if dep.source_asset_id not in asset_ids:
            raise InvalidModelError(f"Unknown source {dep.source_asset_id} in dependency {dep.dependency_id}")
        if dep.target_asset_id not in asset_ids:
            raise InvalidModelError(f"Unknown target {dep.target_asset_id} in dependency {dep.dependency_id}")


def compute_graph_metrics(g: nx.MultiDiGraph) -> dict[str, dict]:
    """Compute centrality metrics for diagnostic analysis."""
    # Convert to simple DiGraph for standard centrality algorithms
    dg = nx.DiGraph()
    for u, v, data in g.edges(data=True):
        dg.add_edge(u, v)
    for n in g.nodes:
        if n not in dg:
            dg.add_node(n)

    in_degree = dict(g.in_degree())
    out_degree = dict(g.out_degree())
    in_degree_centrality = nx.in_degree_centrality(dg)
    out_degree_centrality = nx.out_degree_centrality(dg)
    betweenness = nx.betweenness_centrality(dg)

    return {
        node: {
            "in_degree": in_degree.get(node, 0),
            "out_degree": out_degree.get(node, 0),
            "in_centrality": in_degree_centrality.get(node, 0.0),
            "out_centrality": out_degree_centrality.get(node, 0.0),
            "betweenness": betweenness.get(node, 0.0),
        }
        for node in g.nodes
    }
