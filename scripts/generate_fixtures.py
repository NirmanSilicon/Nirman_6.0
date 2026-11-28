"""Generate DISTRICT-V1 fixture according to the specification."""
import json
from pathlib import Path

def generate_district_v1():
    assets = [
        # Power
        {
            "asset_id": "P-01",
            "asset_type": "power_substation",
            "name": "Substation West",
            "position": {"x": 10.0, "y": 15.0, "z": 0.0},
            "physical_damage": 0.0,
            "nominal_capacity": 1.0,
            "intrinsic_capacity_fraction": 1.0,
            "delivered_service_fraction": 1.0,
            "minimum_operational_service": 0.6,
            "criticality_weight": 8.0,
            "is_critical": True,
            "vulnerability_scale": 1.4,
            "resistance_threshold": 0.2,
            "backup": []
        },
        {
            "asset_id": "P-02",
            "asset_type": "power_substation",
            "name": "Substation East",
            "position": {"x": 70.0, "y": 75.0, "z": 0.0},
            "physical_damage": 0.0,
            "nominal_capacity": 1.0,
            "intrinsic_capacity_fraction": 1.0,
            "delivered_service_fraction": 1.0,
            "minimum_operational_service": 0.6,
            "criticality_weight": 7.0,
            "is_critical": True,
            "vulnerability_scale": 1.0,
            "resistance_threshold": 0.3,
            "backup": []
        },
        {
            "asset_id": "P-03",
            "asset_type": "power_substation",
            "name": "Distribution Node Central",
            "position": {"x": 45.0, "y": 50.0, "z": 0.0},
            "physical_damage": 0.0,
            "nominal_capacity": 1.0,
            "intrinsic_capacity_fraction": 1.0,
            "delivered_service_fraction": 1.0,
            "minimum_operational_service": 0.5,
            "criticality_weight": 6.0,
            "is_critical": False,
            "vulnerability_scale": 1.1,
            "resistance_threshold": 0.25,
            "backup": []
        },

        # Water
        {
            "asset_id": "W-01",
            "asset_type": "water_pump",
            "name": "Pump North",
            "position": {"x": 28.0, "y": 16.0, "z": 0.0},
            "physical_damage": 0.0,
            "nominal_capacity": 1.0,
            "intrinsic_capacity_fraction": 1.0,
            "delivered_service_fraction": 1.0,
            "minimum_operational_service": 0.6,
            "criticality_weight": 7.0,
            "is_critical": True,
            "vulnerability_scale": 1.0,
            "resistance_threshold": 0.4,
            "backup": [
                {
                    "resource_type": "backup_power",
                    "remaining_inventory": 12.0,
                    "max_output_per_tick": 1.0,
                    "conversion_efficiency": 1.0,
                    "is_active": False
                }
            ]
        },
        {
            "asset_id": "W-02",
            "asset_type": "water_pump",
            "name": "Pump South",
            "position": {"x": 65.0, "y": 30.0, "z": 0.0},
            "physical_damage": 0.0,
            "nominal_capacity": 1.0,
            "intrinsic_capacity_fraction": 1.0,
            "delivered_service_fraction": 1.0,
            "minimum_operational_service": 0.6,
            "criticality_weight": 6.0,
            "is_critical": True,
            "vulnerability_scale": 0.9,
            "resistance_threshold": 0.45,
            "backup": [
                {
                    "resource_type": "backup_power",
                    "remaining_inventory": 15.0,
                    "max_output_per_tick": 1.0,
                    "conversion_efficiency": 1.0,
                    "is_active": False
                }
            ]
        },
        {
            "asset_id": "W-03",
            "asset_type": "water_pump",
            "name": "Water Treatment Facility",
            "position": {"x": 50.0, "y": 20.0, "z": 0.0},
            "physical_damage": 0.0,
            "nominal_capacity": 1.0,
            "intrinsic_capacity_fraction": 1.0,
            "delivered_service_fraction": 1.0,
            "minimum_operational_service": 0.7,
            "criticality_weight": 8.0,
            "is_critical": True,
            "vulnerability_scale": 1.2,
            "resistance_threshold": 0.35,
            "backup": [
                {
                    "resource_type": "backup_power",
                    "remaining_inventory": 24.0,
                    "max_output_per_tick": 1.0,
                    "conversion_efficiency": 1.0,
                    "is_active": False
                }
            ]
        },

        # Healthcare
        {
            "asset_id": "H-01",
            "asset_type": "hospital",
            "name": "Central Hospital",
            "position": {"x": 45.0, "y": 35.0, "z": 0.0},
            "physical_damage": 0.0,
            "nominal_capacity": 1.0,
            "intrinsic_capacity_fraction": 1.0,
            "delivered_service_fraction": 1.0,
            "minimum_operational_service": 0.7,
            "criticality_weight": 10.0,
            "is_critical": True,
            "vulnerability_scale": 0.6,
            "resistance_threshold": 0.6,
            "backup": [
                {
                    "resource_type": "emergency_generator",
                    "remaining_inventory": 30.0,
                    "max_output_per_tick": 1.0,
                    "conversion_efficiency": 1.0,
                    "is_active": False
                }
            ]
        },
        {
            "asset_id": "H-02",
            "asset_type": "hospital",
            "name": "District Clinic",
            "position": {"x": 75.0, "y": 55.0, "z": 0.0},
            "physical_damage": 0.0,
            "nominal_capacity": 1.0,
            "intrinsic_capacity_fraction": 1.0,
            "delivered_service_fraction": 1.0,
            "minimum_operational_service": 0.6,
            "criticality_weight": 6.0,
            "is_critical": True,
            "vulnerability_scale": 0.8,
            "resistance_threshold": 0.5,
            "backup": [
                {
                    "resource_type": "emergency_generator",
                    "remaining_inventory": 10.0,
                    "max_output_per_tick": 1.0,
                    "conversion_efficiency": 1.0,
                    "is_active": False
                }
            ]
        },

        # Telecommunications
        {
            "asset_id": "T-01",
            "asset_type": "telecom_tower",
            "name": "Telecom Tower North",
            "position": {"x": 30.0, "y": 70.0, "z": 0.0},
            "physical_damage": 0.0,
            "nominal_capacity": 1.0,
            "intrinsic_capacity_fraction": 1.0,
            "delivered_service_fraction": 1.0,
            "minimum_operational_service": 0.5,
            "criticality_weight": 5.0,
            "is_critical": False,
            "vulnerability_scale": 0.7,
            "resistance_threshold": 0.4,
            "backup": [
                {
                    "resource_type": "battery_bank",
                    "remaining_inventory": 8.0,
                    "max_output_per_tick": 1.0,
                    "conversion_efficiency": 1.0,
                    "is_active": False
                }
            ]
        },
        {
            "asset_id": "T-02",
            "asset_type": "telecom_tower",
            "name": "Telecom Tower South",
            "position": {"x": 60.0, "y": 80.0, "z": 0.0},
            "physical_damage": 0.0,
            "nominal_capacity": 1.0,
            "intrinsic_capacity_fraction": 1.0,
            "delivered_service_fraction": 1.0,
            "minimum_operational_service": 0.5,
            "criticality_weight": 5.0,
            "is_critical": False,
            "vulnerability_scale": 0.7,
            "resistance_threshold": 0.4,
            "backup": [
                {
                    "resource_type": "battery_bank",
                    "remaining_inventory": 8.0,
                    "max_output_per_tick": 1.0,
                    "conversion_efficiency": 1.0,
                    "is_active": False
                }
            ]
        },

        # Roads
        {
            "asset_id": "R-01",
            "asset_type": "road_segment",
            "name": "Bridge Access Way",
            "position": {"x": 20.0, "y": 30.0, "z": 0.0},
            "physical_damage": 0.0,
            "nominal_capacity": 1.0,
            "intrinsic_capacity_fraction": 1.0,
            "delivered_service_fraction": 1.0,
            "minimum_operational_service": 0.4,
            "criticality_weight": 6.0,
            "is_critical": False,
            "vulnerability_scale": 1.3,
            "resistance_threshold": 0.15,
            "backup": []
        },
        {
            "asset_id": "R-02",
            "asset_type": "road_segment",
            "name": "Central Avenue",
            "position": {"x": 40.0, "y": 45.0, "z": 0.0},
            "physical_damage": 0.0,
            "nominal_capacity": 1.0,
            "intrinsic_capacity_fraction": 1.0,
            "delivered_service_fraction": 1.0,
            "minimum_operational_service": 0.4,
            "criticality_weight": 5.0,
            "is_critical": False,
            "vulnerability_scale": 1.1,
            "resistance_threshold": 0.2,
            "backup": []
        },
        {
            "asset_id": "R-03",
            "asset_type": "road_segment",
            "name": "Hospital Connector",
            "position": {"x": 42.0, "y": 38.0, "z": 0.0},
            "physical_damage": 0.0,
            "nominal_capacity": 1.0,
            "intrinsic_capacity_fraction": 1.0,
            "delivered_service_fraction": 1.0,
            "minimum_operational_service": 0.5,
            "criticality_weight": 8.0,
            "is_critical": True,
            "vulnerability_scale": 1.0,
            "resistance_threshold": 0.25,
            "backup": []
        },
        {
            "asset_id": "R-04",
            "asset_type": "road_segment",
            "name": "Utility Access Corridor",
            "position": {"x": 18.0, "y": 18.0, "z": 0.0},
            "physical_damage": 0.0,
            "nominal_capacity": 1.0,
            "intrinsic_capacity_fraction": 1.0,
            "delivered_service_fraction": 1.0,
            "minimum_operational_service": 0.4,
            "criticality_weight": 6.0,
            "is_critical": False,
            "vulnerability_scale": 1.2,
            "resistance_threshold": 0.2,
            "backup": []
        },
    ]

    # Additional residential / community demand nodes D-01 .. D-20
    for i in range(1, 21):
        idx = f"D-{i:02d}"
        x = 15.0 + (i % 5) * 15.0
        y = 15.0 + (i // 5) * 18.0
        assets.append({
            "asset_id": idx,
            "asset_type": "road_segment",  # community sector node
            "name": f"Community Zone {i}",
            "position": {"x": x, "y": y, "z": 0.0},
            "physical_damage": 0.0,
            "nominal_capacity": 1.0,
            "intrinsic_capacity_fraction": 1.0,
            "delivered_service_fraction": 1.0,
            "minimum_operational_service": 0.5,
            "criticality_weight": 2.0,
            "is_critical": False,
            "vulnerability_scale": 1.0,
            "resistance_threshold": 0.3,
            "backup": []
        })

    dependencies = [
        # Power to Water & Hospital & Telecom
        {"dependency_id": "DEP-P01-W01-PWR", "source_asset_id": "P-01", "target_asset_id": "W-01", "dependency_type": "electricity", "mode": "hard", "required_fraction": 0.8, "minimum_fraction": 0.5, "latency_ticks": 1, "grace_ticks": 0, "importance": 1.0},
        {"dependency_id": "DEP-P02-W02-PWR", "source_asset_id": "P-02", "target_asset_id": "W-02", "dependency_type": "electricity", "mode": "hard", "required_fraction": 0.8, "minimum_fraction": 0.5, "latency_ticks": 1, "grace_ticks": 0, "importance": 1.0},
        {"dependency_id": "DEP-P01-H01-PWR", "source_asset_id": "P-01", "target_asset_id": "H-01", "dependency_type": "electricity", "mode": "hard", "required_fraction": 0.7, "minimum_fraction": 0.4, "latency_ticks": 1, "grace_ticks": 0, "importance": 1.0},
        {"dependency_id": "DEP-P03-H02-PWR", "source_asset_id": "P-03", "target_asset_id": "H-02", "dependency_type": "electricity", "mode": "hard", "required_fraction": 0.7, "minimum_fraction": 0.4, "latency_ticks": 1, "grace_ticks": 0, "importance": 1.0},
        {"dependency_id": "DEP-P02-T01-PWR", "source_asset_id": "P-02", "target_asset_id": "T-01", "dependency_type": "electricity", "mode": "hard", "required_fraction": 0.6, "minimum_fraction": 0.3, "latency_ticks": 1, "grace_ticks": 0, "importance": 1.0},
        {"dependency_id": "DEP-P02-T02-PWR", "source_asset_id": "P-02", "target_asset_id": "T-02", "dependency_type": "electricity", "mode": "hard", "required_fraction": 0.6, "minimum_fraction": 0.3, "latency_ticks": 1, "grace_ticks": 0, "importance": 1.0},
        {"dependency_id": "DEP-P01-P03-PWR", "source_asset_id": "P-01", "target_asset_id": "P-03", "dependency_type": "electricity", "mode": "soft", "required_fraction": 0.6, "minimum_fraction": 0.2, "latency_ticks": 0, "grace_ticks": 0, "importance": 0.8},
        {"dependency_id": "DEP-P02-P03-PWR", "source_asset_id": "P-02", "target_asset_id": "P-03", "dependency_type": "electricity", "mode": "soft", "required_fraction": 0.6, "minimum_fraction": 0.2, "latency_ticks": 0, "grace_ticks": 0, "importance": 0.8},

        # Water to Hospital
        {"dependency_id": "DEP-W01-H01-WTR", "source_asset_id": "W-01", "target_asset_id": "H-01", "dependency_type": "water", "mode": "hard", "required_fraction": 0.7, "minimum_fraction": 0.4, "latency_ticks": 1, "grace_ticks": 0, "importance": 1.0},
        {"dependency_id": "DEP-W02-H02-WTR", "source_asset_id": "W-02", "target_asset_id": "H-02", "dependency_type": "water", "mode": "hard", "required_fraction": 0.6, "minimum_fraction": 0.3, "latency_ticks": 1, "grace_ticks": 0, "importance": 1.0},
        {"dependency_id": "DEP-W03-W01-WTR", "source_asset_id": "W-03", "target_asset_id": "W-01", "dependency_type": "water", "mode": "soft", "required_fraction": 0.8, "minimum_fraction": 0.3, "latency_ticks": 1, "grace_ticks": 0, "importance": 0.9},

        # Road Access
        {"dependency_id": "DEP-R03-H01-ACC", "source_asset_id": "R-03", "target_asset_id": "H-01", "dependency_type": "access", "mode": "hard", "required_fraction": 0.6, "minimum_fraction": 0.3, "latency_ticks": 0, "grace_ticks": 2, "importance": 1.0},
        {"dependency_id": "DEP-R04-P01-ACC", "source_asset_id": "R-04", "target_asset_id": "P-01", "dependency_type": "access", "mode": "soft", "required_fraction": 0.5, "minimum_fraction": 0.2, "latency_ticks": 0, "grace_ticks": 1, "importance": 0.7},
        {"dependency_id": "DEP-R01-R02-ACC", "source_asset_id": "R-01", "target_asset_id": "R-02", "dependency_type": "access", "mode": "hard", "required_fraction": 0.5, "minimum_fraction": 0.2, "latency_ticks": 0, "grace_ticks": 0, "importance": 0.9},
        {"dependency_id": "DEP-R02-R03-ACC", "source_asset_id": "R-02", "target_asset_id": "R-03", "dependency_type": "access", "mode": "hard", "required_fraction": 0.5, "minimum_fraction": 0.2, "latency_ticks": 0, "grace_ticks": 0, "importance": 0.9},

        # Telecom to Hospital & Emergency coordination
        {"dependency_id": "DEP-T01-H01-COM", "source_asset_id": "T-01", "target_asset_id": "H-01", "dependency_type": "communication", "mode": "soft", "required_fraction": 0.6, "minimum_fraction": 0.3, "latency_ticks": 0, "grace_ticks": 1, "importance": 0.8},
        {"dependency_id": "DEP-T02-H02-COM", "source_asset_id": "T-02", "target_asset_id": "H-02", "dependency_type": "communication", "mode": "soft", "required_fraction": 0.6, "minimum_fraction": 0.3, "latency_ticks": 0, "grace_ticks": 1, "importance": 0.8},
    ]

    # Connect some demand zones to power, water, telecom
    for i in range(1, 11):
        idx = f"D-{i:02d}"
        dependencies.append({
            "dependency_id": f"DEP-P01-{idx}-PWR",
            "source_asset_id": "P-01",
            "target_asset_id": idx,
            "dependency_type": "electricity",
            "mode": "soft",
            "required_fraction": 0.5,
            "minimum_fraction": 0.2,
            "latency_ticks": 1,
            "grace_ticks": 0,
            "importance": 0.5
        })
        dependencies.append({
            "dependency_id": f"DEP-W01-{idx}-WTR",
            "source_asset_id": "W-01",
            "target_asset_id": idx,
            "dependency_type": "water",
            "mode": "soft",
            "required_fraction": 0.5,
            "minimum_fraction": 0.2,
            "latency_ticks": 1,
            "grace_ticks": 0,
            "importance": 0.5
        })

    for i in range(11, 21):
        idx = f"D-{i:02d}"
        dependencies.append({
            "dependency_id": f"DEP-P02-{idx}-PWR",
            "source_asset_id": "P-02",
            "target_asset_id": idx,
            "dependency_type": "electricity",
            "mode": "soft",
            "required_fraction": 0.5,
            "minimum_fraction": 0.2,
            "latency_ticks": 1,
            "grace_ticks": 0,
            "importance": 0.5
        })
        dependencies.append({
            "dependency_id": f"DEP-W02-{idx}-WTR",
            "source_asset_id": "W-02",
            "target_asset_id": idx,
            "dependency_type": "water",
            "mode": "soft",
            "required_fraction": 0.5,
            "minimum_fraction": 0.2,
            "latency_ticks": 1,
            "grace_ticks": 0,
            "importance": 0.5
        })

    district = {
        "project_id": "DISTRICT-V1",
        "name": "Metropolitan Harbor Resilience District",
        "assets": assets,
        "dependencies": dependencies
    }

    scenario = {
        "scenario_id": "FLOOD-BASE-01",
        "name": "Synthetic Riverine Surge Flood",
        "hazard_type": "synthetic_flood",
        "flood_sources": [
            {
                "center_x": 12.0,
                "center_y": 14.0,
                "radius": 22.0,
                "peak_intensity": 0.95,
                "start_tick": 2,
                "peak_tick": 10,
                "end_tick": 45
            },
            {
                "center_x": 38.0,
                "center_y": 36.0,
                "radius": 14.0,
                "peak_intensity": 0.70,
                "start_tick": 8,
                "peak_tick": 18,
                "end_tick": 50
            }
        ],
        "seed": 1947,
        "horizon_ticks": 120,
        "tick_seconds": 60
    }

    out_dir = Path("fixtures/district_v1")
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "district.json", "w") as f:
        json.dump(district, f, indent=2)
    with open(out_dir / "scenario.json", "w") as f:
        json.dump(scenario, f, indent=2)
    print(f"Generated DISTRICT-V1: {len(assets)} assets, {len(dependencies)} dependencies")

if __name__ == "__main__":
    generate_district_v1()
