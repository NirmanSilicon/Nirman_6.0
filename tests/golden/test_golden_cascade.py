"""Golden test for deterministic cascading failure on DISTRICT-MINI."""
import json
from pathlib import Path
from packages.domain.models import DistrictModel, Scenario
from packages.simulation.kernel import Simulator


def test_golden_three_node_cascade():
    """
    Golden cascade test:
    DISTRICT-MINI has P-01 -> W-01 -> H-01.
    P-01 is exposed to flood at tick 1, suffers physical damage and fails.
    W-01 loses power, activates its backup battery (inventory 12.0, output 1.0/tick).
    Backup depletes, W-01 degrades/fails.
    H-01 subsequently loses water service and degrades.
    """
    mini_dir = Path("fixtures/district_mini")
    with open(mini_dir / "district.json") as f:
        dist_data = json.load(f)
    with open(mini_dir / "scenario.json") as f:
        scen_data = json.load(f)

    district = DistrictModel(**dist_data)
    scenario = Scenario(**scen_data)

    sim = Simulator(district=district, scenario=scenario, seed=1947)
    results = sim.run_all()

    assert len(results) == scenario.horizon_ticks

    events = sim.all_events
    event_types = [e.event_type for e in events]

    assert "hazard_exposure" in event_types
    assert "direct_damage" in event_types
    assert "backup_activated" in event_types
    assert "backup_depleted" in event_types

    # Find pump events
    w01_backup_acts = [e for e in events if e.asset_id == "W-01" and e.event_type == "backup_activated"]
    w01_backup_deps = [e for e in events if e.asset_id == "W-01" and e.event_type == "backup_depleted"]
    h01_degraded = [e for e in events if e.asset_id == "H-01" and e.event_type in ("asset_degraded", "asset_unavailable")]

    assert len(w01_backup_acts) > 0, "Pump North must activate backup power"
    assert len(w01_backup_deps) > 0, "Pump North backup must deplete after 12 ticks"
    assert len(h01_degraded) > 0, "Hospital must degrade after upstream water pump failure"

    depleted_tick = w01_backup_deps[0].tick
    hospital_degraded_tick = h01_degraded[0].tick

    assert hospital_degraded_tick >= depleted_tick, "Hospital degradation must occur after or at backup depletion"


def test_simulation_reproducibility():
    """Identical seed and inputs produce identical canonical event stream."""
    mini_dir = Path("fixtures/district_mini")
    with open(mini_dir / "district.json") as f:
        dist_data = json.load(f)
    with open(mini_dir / "scenario.json") as f:
        scen_data = json.load(f)

    district = DistrictModel(**dist_data)
    scenario = Scenario(**scen_data)

    sim1 = Simulator(district=district, scenario=scenario, seed=731)
    sim1.run_all()

    sim2 = Simulator(district=district, scenario=scenario, seed=731)
    sim2.run_all()

    assert len(sim1.all_events) == len(sim2.all_events)
    for e1, e2 in zip(sim1.all_events, sim2.all_events):
        assert e1.sequence == e2.sequence
        assert e1.tick == e2.tick
        assert e1.event_type == e2.event_type
        assert e1.asset_id == e2.asset_id
        assert e1.cause_code == e2.cause_code
