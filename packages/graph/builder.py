"""Graph exceptions and builder for AFTERSHOCK."""
from __future__ import annotations

import networkx as nx
from packages.domain.models import Asset, Dependency


class InvalidModelError(ValueError):
    """Raised when an asset or dependency definition is invalid."""
    pass


def build_graph(assets: list[Asset], dependencies: list[Dependency]) -> nx.MultiDiGraph:
    """
    Build a NetworkX MultiDiGraph from assets and dependencies.
    Convention:
        SOURCE ----supplies/supports----> TARGET
        e.g. P-01 --electricity--> W-01
    """
    g = nx.MultiDiGraph()
    seen_assets = set()

    for asset in assets:
        if asset.asset_id in seen_assets:
            raise InvalidModelError(f"Duplicate asset ID: {asset.asset_id}")
        seen_assets.add(asset.asset_id)
        g.add_node(
            asset.asset_id,
            asset_type=asset.asset_type,
            name=asset.name,
            asset=asset,
        )

    seen_dependencies = set()
    for dep in dependencies:
        if dep.dependency_id in seen_dependencies:
            raise InvalidModelError(f"Duplicate dependency ID: {dep.dependency_id}")
        seen_dependencies.add(dep.dependency_id)

        if dep.source_asset_id not in g:
            raise InvalidModelError(f"Unknown source {dep.source_asset_id}")
        if dep.target_asset_id not in g:
            raise InvalidModelError(f"Unknown target {dep.target_asset_id}")

        g.add_edge(
            dep.source_asset_id,
            dep.target_asset_id,
            key=dep.dependency_id,
            dependency=dep,
        )

    return g
