"""Unit tests for domain models and contracts."""
import pytest
from pydantic import ValidationError
from packages.domain.enums import AssetType, LogicalState, DependencyType, DependencyMode
from packages.domain.models import Asset, Dependency, Position, BackupResource, Scenario, FloodSource


def test_asset_creation_and_bounds():
    asset = Asset(
        asset_id="P-01",
        asset_type=AssetType.POWER_SUBSTATION,
        name="Substation West",
        position=Position(x=10.0, y=10.0),
        physical_damage=0.0,
        nominal_capacity=1.0,
        intrinsic_capacity_fraction=1.0,
        delivered_service_fraction=1.0,
        minimum_operational_service=0.6,
        criticality_weight=5.0,
    )
    assert asset.asset_id == "P-01"
    assert asset.logical_state == LogicalState.OPERATIONAL

    # Test invalid physical damage > 1.0
    with pytest.raises(ValidationError):
        Asset(
            asset_id="P-02",
            asset_type=AssetType.POWER_SUBSTATION,
            name="P2",
            position=Position(x=0, y=0),
            physical_damage=1.5,
        )


def test_dependency_validation():
    dep = Dependency(
        dependency_id="DEP-01",
        source_asset_id="P-01",
        target_asset_id="W-01",
        dependency_type=DependencyType.ELECTRICITY,
        mode=DependencyMode.HARD,
        required_fraction=0.8,
        minimum_fraction=0.5,
        latency_ticks=1,
        grace_ticks=2,
    )
    assert dep.mode == DependencyMode.HARD
    assert dep.latency_ticks == 1

    with pytest.raises(ValidationError):
        Dependency(
            dependency_id="DEP-02",
            source_asset_id="P-01",
            target_asset_id="W-01",
            dependency_type=DependencyType.ELECTRICITY,
            mode=DependencyMode.HARD,
            required_fraction=-0.1,  # Negative fraction invalid
        )
