"""Tests for ISA-18.2 Alarm Flood Generator & Consolidation Engine.

Follows python-testing and python-patterns standards:
1. Normal baseline data (z ~ 0) produces 0 alarms and reduction_pct == 0.0.
2. A single-step transient spike on a delay_steps=2 sensor is suppressed by suppress_chattering.
3. A multi-sensor cascade produces priority_alarms capped at <= 5, identifies the
   earliest first_triggered_tag accurately, and achieves positive reduction_pct.
4. Integration check on real fault episodes (STATUS == 4 and STATUS == 6) from
   data/processed/tep_3years.parquet.
5. Unit tests for delay resolution, threshold classifications, and priority sorting.
"""

from collections.abc import Sequence
from typing import Any
import numpy as np
import pandas as pd
import pytest

from app.config import ISA_DELAY_STEPS, PARQUET_PATH, SENSOR_COLS, TARGET_FAULTS
from app.services.alarm_engine import (
    AlarmEpisode,
    ConsolidatedAlarmReport,
    RawAlarmEvent,
    RawAlarmResult,
    consolidate_alarm_flood,
    generate_raw_alarms,
    get_delay_steps,
    suppress_chattering,
)
from app.services.tep_loader import compute_normal_baseline, load_tep_parquet


@pytest.fixture(scope="module")
def synthetic_baseline() -> pd.DataFrame:
    """Provide a synthetic baseline for all 52 SENSOR_COLS with mean=100.0, std=10.0."""
    return pd.DataFrame(
        {
            "mean": pd.Series(100.0, index=SENSOR_COLS),
            "std": pd.Series(10.0, index=SENSOR_COLS),
        }
    )


@pytest.fixture(scope="module")
def normal_synthetic_window(synthetic_baseline: pd.DataFrame) -> pd.DataFrame:
    """Provide a 20-step normal window centered at baseline mean with negligible noise."""
    rng = np.random.default_rng(seed=123)
    data: dict[str, np.ndarray] = {}
    for col in SENSOR_COLS:
        mu = synthetic_baseline.loc[col, "mean"]
        sigma = synthetic_baseline.loc[col, "std"]
        # Small noise within +/- 0.5 sigma (z ~ 0, well below sigma_warn 3.0)
        data[col] = mu + rng.uniform(-0.5, 0.5, size=20) * sigma
    return pd.DataFrame(data)


@pytest.fixture(scope="module")
def real_tep_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Module-scoped fixture to load real TEP parquet and compute normal baseline."""
    df = load_tep_parquet(path=PARQUET_PATH, target_faults=TARGET_FAULTS)
    baseline = compute_normal_baseline(df)
    return df, baseline


# -----------------------------------------------------------------------------
# Unit Tests: get_delay_steps & Configuration
# -----------------------------------------------------------------------------


def test_get_delay_steps_resolution() -> None:
    """Verify correct delay step resolution by direct tag, category, and compound fallback."""
    # Direct tag match
    assert get_delay_steps("XMEAS(9)", delay_steps_map={"XMEAS(9)": 3}) == 3

    # Standard TEP categories via default ISA_DELAY_STEPS:
    # Thermal & level dynamics: delay = 2
    assert get_delay_steps("XMEAS(9)", ISA_DELAY_STEPS) == 2  # Reactor temp
    assert get_delay_steps("XMEAS(8)", ISA_DELAY_STEPS) == 2  # Reactor level
    assert get_delay_steps("XMEAS(11)", ISA_DELAY_STEPS) == 2  # Separator temp
    assert get_delay_steps("XMEAS(23)", ISA_DELAY_STEPS) == 2  # Stream 6 Component A

    # Flow & pressure dynamics: delay = 1
    assert get_delay_steps("XMEAS(1)", ISA_DELAY_STEPS) == 1  # A feed flow
    assert get_delay_steps("XMEAS(7)", ISA_DELAY_STEPS) == 1  # Reactor pressure
    assert get_delay_steps("XMV(1)", ISA_DELAY_STEPS) == 1  # D feed valve

    # Compound fallback map
    compound_map = {"temp_level": 2, "flow_pressure": 1}
    assert get_delay_steps("XMEAS(9)", compound_map) == 2
    assert get_delay_steps("XMEAS(1)", compound_map) == 1

    # Fallback to default
    assert get_delay_steps("UNKNOWN_TAG", {}) == 1
    assert get_delay_steps("UNKNOWN_TAG", {"default": 4}) == 4


# -----------------------------------------------------------------------------
# Unit Tests: generate_raw_alarms
# -----------------------------------------------------------------------------


def test_generate_raw_alarms_invalid_inputs(synthetic_baseline: pd.DataFrame) -> None:
    """Verify generate_raw_alarms raises ValueError on invalid parameters."""
    dummy_df = pd.DataFrame({SENSOR_COLS[0]: [100.0]})

    with pytest.raises(ValueError, match="sigma_warn must be positive"):
        generate_raw_alarms(dummy_df, synthetic_baseline, sigma_warn=0.0)

    with pytest.raises(ValueError, match="sigma_crit .* must be strictly greater"):
        generate_raw_alarms(dummy_df, synthetic_baseline, sigma_warn=3.0, sigma_crit=2.5)

    with pytest.raises(ValueError, match="missing required column"):
        bad_baseline = pd.DataFrame({"mean": [100.0]}, index=[SENSOR_COLS[0]])
        generate_raw_alarms(dummy_df, bad_baseline)


def test_generate_raw_alarms_threshold_classification(synthetic_baseline: pd.DataFrame) -> None:
    """Verify correct classification of HIGH, HIGH_HIGH, LOW, and LOW_LOW breaches."""
    # Mean = 100.0, std = 10.0
    # Steps:
    # 0: 100.0 (z = 0.0) -> Normal
    # 1: 135.0 (z = +3.5) -> HIGH
    # 2: 150.0 (z = +5.0) -> HIGH_HIGH
    # 3: 65.0  (z = -3.5) -> LOW
    # 4: 50.0  (z = -5.0) -> LOW_LOW
    tag = "XMEAS(9)"
    df = pd.DataFrame({tag: [100.0, 135.0, 150.0, 65.0, 50.0]})

    result = generate_raw_alarms(df, synthetic_baseline, sigma_warn=3.0, sigma_crit=4.5)
    events, count = result.events, result.raw_alarm_count

    assert count == 4
    assert len(events) == 4

    assert events[0].step == 1
    assert events[0].direction == "HIGH"
    assert events[0].severity == "HIGH"
    assert events[0].z_score == pytest.approx(3.5, abs=0.01)

    assert events[1].step == 2
    assert events[1].direction == "HIGH"
    assert events[1].severity == "HIGH_HIGH"
    assert events[1].z_score == pytest.approx(5.0, abs=0.01)

    assert events[2].step == 3
    assert events[2].direction == "LOW"
    assert events[2].severity == "LOW"
    assert events[2].z_score == pytest.approx(-3.5, abs=0.01)

    assert events[3].step == 4
    assert events[3].direction == "LOW"
    assert events[3].severity == "LOW_LOW"
    assert events[3].z_score == pytest.approx(-5.0, abs=0.01)


# -----------------------------------------------------------------------------
# Core Requirement 1: Normal Baseline Data Produces 0 Alarms & 0.0% Reduction
# -----------------------------------------------------------------------------


def test_consolidate_alarm_flood_normal_baseline(
    normal_synthetic_window: pd.DataFrame,
    synthetic_baseline: pd.DataFrame,
) -> None:
    """Verify normal baseline data produces 0 alarms and reduction_pct == 0.0."""
    report: ConsolidatedAlarmReport = consolidate_alarm_flood(
        window_df=normal_synthetic_window,
        baseline=synthetic_baseline,
        top_k=5,
    )

    assert report["raw_alarm_count"] == 0
    assert report["confirmed_alarm_count"] == 0
    assert report["priority_alarms"] == []
    assert report["first_triggered_tag"] is None
    assert report["reduction_pct"] == 0.0


# -----------------------------------------------------------------------------
# Core Requirement 2: Transient Spike on delay_steps=2 Sensor is Suppressed
# -----------------------------------------------------------------------------


def test_suppress_chattering_single_spike_suppressed() -> None:
    """Verify a single-step transient spike on a delay_steps=2 sensor is suppressed."""
    # XMEAS(9) is reactor temperature, delay_steps = 2 in ISA_DELAY_STEPS
    single_spike = [
        RawAlarmEvent(
            step=5,
            tag="XMEAS(9)",
            direction="HIGH",
            severity="HIGH_HIGH",
            z_score=5.2,
            value=152.0,
        )
    ]

    confirmed = suppress_chattering(single_spike, delay_steps_map=ISA_DELAY_STEPS)
    assert len(confirmed) == 0, "Single-step transient spike must be suppressed when delay_steps=2"

    # Conversely, verify 2 consecutive steps ARE confirmed
    two_step_breach = [
        RawAlarmEvent(
            step=5,
            tag="XMEAS(9)",
            direction="HIGH",
            severity="HIGH",
            z_score=3.8,
            value=138.0,
        ),
        RawAlarmEvent(
            step=6,
            tag="XMEAS(9)",
            direction="HIGH",
            severity="HIGH_HIGH",
            z_score=4.9,
            value=149.0,
        ),
    ]

    confirmed_two = suppress_chattering(two_step_breach, delay_steps_map=ISA_DELAY_STEPS)
    assert len(confirmed_two) == 1
    episode = confirmed_two[0]
    assert episode.tag == "XMEAS(9)"
    assert episode.direction == "HIGH"
    assert episode.severity == "HIGH_HIGH"  # Reached peak severity HIGH_HIGH
    assert episode.first_step == 5
    assert episode.last_step == 6
    assert episode.peak_z == pytest.approx(4.9, abs=0.01)


def test_suppress_chattering_intermittent_chatter_suppressed() -> None:
    """Verify non-consecutive intermittent chatter is completely suppressed."""
    # Steps 0, 2, 4 (separated by normal steps) on delay=2 sensor
    chattering_events = [
        RawAlarmEvent(step=0, tag="XMEAS(9)", direction="HIGH", severity="HIGH", z_score=3.2),
        RawAlarmEvent(step=2, tag="XMEAS(9)", direction="HIGH", severity="HIGH", z_score=3.4),
        RawAlarmEvent(step=4, tag="XMEAS(9)", direction="HIGH", severity="HIGH", z_score=3.1),
    ]

    confirmed = suppress_chattering(chattering_events, delay_steps_map=ISA_DELAY_STEPS)
    assert len(confirmed) == 0, "Non-consecutive chattering pulses must be suppressed"


# -----------------------------------------------------------------------------
# Core Requirement 3: Multi-Sensor Cascade Capped at <= 5 & Earliest Tag Found
# -----------------------------------------------------------------------------


def test_consolidate_alarm_flood_multi_sensor_cascade(
    synthetic_baseline: pd.DataFrame,
) -> None:
    """Verify multi-sensor cascade caps priority alarms at <= 5, identifies earliest

    tag accurately, and achieves positive reduction_pct.
    """
    num_steps = 20
    # Create window where all sensors start at normal mean
    window_dict: dict[str, list[float]] = {
        col: [100.0] * num_steps for col in SENSOR_COLS
    }

    # Simulate cascade across 8 flow/pressure sensors (delay_steps = 1)
    # Triggered successively from step 0 to step 7
    # Sensor 0 (XMEAS(1)) starts at step 0 (earliest onset!)
    cascade_sensors = [
        "XMEAS(1)",  # step 0
        "XMEAS(2)",  # step 1
        "XMEAS(3)",  # step 2
        "XMEAS(4)",  # step 3
        "XMEAS(5)",  # step 4
        "XMEAS(6)",  # step 5
        "XMEAS(7)",  # step 6
        "XMEAS(10)",  # step 7
    ]

    for onset_step, sensor in enumerate(cascade_sensors):
        # Sustained breach from onset_step through the rest of the window
        for s in range(onset_step, num_steps):
            window_dict[sensor][s] = 140.0  # z = (140 - 100) / 10 = +4.0 (HIGH)

    cascade_df = pd.DataFrame(window_dict)

    report = consolidate_alarm_flood(
        window_df=cascade_df,
        baseline=synthetic_baseline,
        top_k=5,
    )

    # 1. Total raw alarms should be sum of all breach steps
    assert report["raw_alarm_count"] > 20

    # 2. Total confirmed alarms = 8 distinct sensor episodes
    assert report["confirmed_alarm_count"] == 8

    # 3. Priority alarms must strictly be capped at top_k (<= 5)
    assert len(report["priority_alarms"]) == 5

    # 4. Earliest first_triggered_tag must accurately be XMEAS(1)
    assert report["first_triggered_tag"] == "XMEAS(1)"
    assert report["priority_alarms"][0]["tag"] == "XMEAS(1)"
    assert report["priority_alarms"][0]["first_step"] == 0

    # 5. Subsequent priority alarms follow chronological onset order
    priority_tags = [p["tag"] for p in report["priority_alarms"]]
    assert priority_tags == [
        "XMEAS(1)",
        "XMEAS(2)",
        "XMEAS(3)",
        "XMEAS(4)",
        "XMEAS(5)",
    ]

    # 6. Reduction percentage must be positive and follow exact formula
    # raw_alarm_count > 20, len(priority_alarms) == 5 -> positive reduction
    expected_reduction = round(
        (report["raw_alarm_count"] - 5) / report["raw_alarm_count"] * 100, 2
    )
    assert report["reduction_pct"] == expected_reduction
    assert report["reduction_pct"] > 50.0


def test_priority_ranking_severity_and_peak_z() -> None:
    """Verify priority ranking prioritizes critical severity and peak z on identical step."""
    # 3 confirmed episodes occurring at step 0:
    # Ep A: Warning (HIGH), peak_z = 3.5
    # Ep B: Critical (HIGH_HIGH), peak_z = 5.0
    # Ep C: Critical (HIGH_HIGH), peak_z = 6.0
    episodes = [
        AlarmEpisode(tag="SENSOR_A", direction="HIGH", severity="HIGH", first_step=0, last_step=2, peak_z=3.5),
        AlarmEpisode(tag="SENSOR_B", direction="HIGH", severity="HIGH_HIGH", first_step=0, last_step=2, peak_z=5.0),
        AlarmEpisode(tag="SENSOR_C", direction="HIGH", severity="HIGH_HIGH", first_step=0, last_step=2, peak_z=6.0),
    ]

    from app.services.alarm_engine import _alarm_sort_key

    sorted_eps = sorted(episodes, key=_alarm_sort_key)
    # Critical should come first, then higher peak_z: SENSOR_C (6.0), SENSOR_B (5.0), SENSOR_A (3.5)
    assert [e.tag for e in sorted_eps] == ["SENSOR_C", "SENSOR_B", "SENSOR_A"]


# -----------------------------------------------------------------------------
# Core Requirement 4: Integration Check on Real TEP Fault Episodes
# -----------------------------------------------------------------------------


@pytest.mark.parametrize("status_code", [4, 6])
def test_consolidate_alarm_flood_real_tep_fault(
    real_tep_data: tuple[pd.DataFrame, pd.DataFrame],
    status_code: int,
) -> None:
    """Integration test verifying alarm consolidation on real TEP fault episodes.

    Tests both:
    - Fault 4: Reactor cooling water inlet temperature step
    - Fault 6: A feed loss (Stream 1 valve closure)
    """
    df, baseline = real_tep_data

    # Extract first episode of this fault
    fault_rows = df[df["STATUS"] == status_code]
    assert not fault_rows.empty, f"No rows found for STATUS == {status_code}"

    first_ep_id = fault_rows["episode_id"].iloc[0]
    ep_df = df[df["episode_id"] == first_ep_id].reset_index(drop=True)

    # Window of the first 30 steps (1.5 hours of fault progression)
    window_size = min(30, len(ep_df))
    fault_window = ep_df.iloc[:window_size].copy()

    report = consolidate_alarm_flood(
        window_df=fault_window,
        baseline=baseline,
        top_k=5,
    )

    # Verify structured report keys and constraints
    assert "raw_alarm_count" in report
    assert "confirmed_alarm_count" in report
    assert "priority_alarms" in report
    assert "first_triggered_tag" in report
    assert "reduction_pct" in report

    assert report["raw_alarm_count"] > 0, "Real fault must produce raw alarm breaches"
    assert report["confirmed_alarm_count"] > 0, "Real fault must produce confirmed alarms"
    assert len(report["priority_alarms"]) <= 5
    assert report["first_triggered_tag"] is not None
    assert report["reduction_pct"] > 0.0

    # Verify each priority alarm has exact required keys and valid types
    for alarm in report["priority_alarms"]:
        assert isinstance(alarm["tag"], str)
        assert alarm["direction"] in ("HIGH", "LOW")
        assert alarm["severity"] in ("HIGH", "LOW", "HIGH_HIGH", "LOW_LOW")
        assert isinstance(alarm["first_step"], int)
        assert isinstance(alarm["peak_z"], float)
        assert alarm["peak_z"] >= 3.0

    # Specifically for Fault 6 (A feed loss in Stream 1):
    # Expect Stream 1 related variables (e.g., XMEAS(1) A feed or XMV(3) A feed valve) to be impacted early
    if status_code == 6:
        early_tags = [p["tag"] for p in report["priority_alarms"]]
        assert any(tag in ("XMEAS(1)", "XMV(3)", "XMEAS(6)", "XMEAS(2)", "XMEAS(3)") for tag in early_tags)
