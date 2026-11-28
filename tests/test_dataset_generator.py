"""Unit tests for synthetic industrial dataset generator."""

import json
import pytest
from datetime import datetime
from pathlib import Path

from src.models.dataset_generator import IndustrialSyntheticDataGenerator
from src.models.schemas import (
    GridCarbonAction,
    MicrogridStorageAction,
    ProductionSchedulingAction,
    ErgonomicsShiftAction,
)


def test_generator_weather_and_grid_profiles():
    generator = IndustrialSyntheticDataGenerator()

    # Solar noon
    weather_noon = generator.generate_weather_profile(hour=12)
    assert weather_noon["ghi_w_per_m2"] > 400.0

    # Night
    weather_night = generator.generate_weather_profile(hour=1)
    assert weather_night["ghi_w_per_m2"] == 0.0

    # Grid peak
    grid_peak = generator.generate_grid_carbon_profile(hour=18)
    assert grid_peak["tou_tier"] == "ON_PEAK"
    assert grid_peak["carbon_intensity_gco2_per_kwh"] > 400.0


def test_generator_creates_aligned_schemas(tmp_path):
    generator = IndustrialSyntheticDataGenerator()
    out_dir = tmp_path / "test_synth"

    files = generator.generate_dataset(num_samples=5, output_dir=str(out_dir))

    assert Path(files["grid_carbon"]).exists()
    assert Path(files["microgrid_storage"]).exists()
    assert Path(files["production_scheduling"]).exists()
    assert Path(files["ergonomics_shift"]).exists()

    # Validate that generated completions parse into Pydantic models
    with open(files["grid_carbon"], "r", encoding="utf-8") as f:
        for line in f:
            rec = json.loads(line)
            action_dict = json.loads(rec["completion"])
            action = GridCarbonAction.model_validate(action_dict)
            assert action.grid_draw_limit_kw > 0.0
