"""Unit tests for graph construction and validation."""
import pytest
from packages.domain.enums import AssetType, DependencyType, DependencyMode
from packages.domain.models import Asset, Dependency, Position, DistrictModel
from packages.graph.builder import build_graph, InvalidModelError
from packages.graph.validator import validate_model, compute_graph_metrics


def test_valid_graph_construction():
    assets = [
        Asset(asset_id="P-01", asset_type=AssetType.POWER_SUBSTATION, name="P1", position=Position(x=0, y=0)),
        Asset(asset_id="W-01", asset_type=AssetType.WATER_PUMP, name="W1", position=Position(x=10, y=10)),
    ]
    deps = [
        Dependency(
            dependency_id="D-1",
            source_asset_id="P-01",
            target_asset_id="W-01",
            dependency_type=DependencyType.ELECTRICITY,
            mode=DependencyMode.HARD,
        )
    ]
    g = build_graph(assets, deps)
    assert "P-01" in g
    assert "W-01" in g
    assert g.has_edge("P-01", "W-01", key="D-1")


def test_unknown_target_rejected():
    assets = [
        Asset(asset_id="P-01", asset_type=AssetType.POWER_SUBSTATION, name="P1", position=Position(x=0, y=0)),
    ]
    deps = [
        Dependency(
            dependency_id="D-1",
            source_asset_id="P-01",
            target_asset_id="NON-EXISTENT",
            dependency_type=DependencyType.ELECTRICITY,
            mode=DependencyMode.HARD,
        )
    ]
    with pytest.raises(InvalidModelError, match="Unknown target NON-EXISTENT"):
        build_graph(assets, deps)


def test_duplicate_asset_id_rejected():
    assets = [
        Asset(asset_id="P-01", asset_type=AssetType.POWER_SUBSTATION, name="P1", position=Position(x=0, y=0)),
        Asset(asset_id="P-01", asset_type=AssetType.POWER_SUBSTATION, name="P1-Dup", position=Position(x=1, y=1)),
    ]
    with pytest.raises(InvalidModelError, match="Duplicate asset ID"):
        build_graph(assets, [])
