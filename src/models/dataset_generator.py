"""Synthetic + public-schema dataset generator for VidyutSync 4 LLM models.

Supports realistic schemas from:
- Electricity Maps / WattTime (carbon intensity & power breakdown)
- NREL NSRDB / NASA POWER / ERA5 (solar GHI, wind speed, ambient weather)
- Open Power System Data (TOU tariffs and demand curves)
- ERP Work Orders & Industrial Machine Curves (5-axis CNCs, vacuum carburizing ovens, assembly robots)
"""

import argparse
import json
import math
import os
import random
from datetime import datetime, timedelta
from pathlib import Path

from src.models.schemas import (
    GridCarbonAction,
    MicrogridStorageAction,
    ProductionSchedulingAction,
    ErgonomicsShiftAction,
    MachineScheduleDecision,
    MachineState,
    ShiftType,
)
from src.models.templates import (
    GRID_CARBON_SYSTEM_PROMPT,
    MICROGRID_STORAGE_SYSTEM_PROMPT,
    PRODUCTION_SCHEDULING_SYSTEM_PROMPT,
    ERGONOMICS_SHIFT_SYSTEM_PROMPT,
    format_prompt,
)
from src.models.reward_scorer import DecPOMDPRewardScorer


class IndustrialSyntheticDataGenerator:
    """Generates aligned industrial energy, production, and ergonomic datasets."""

    def __init__(self, seed: int = 42):
        random.seed(seed)
        self.reward_scorer = DecPOMDPRewardScorer()

    def generate_weather_profile(self, hour: int) -> dict:
        """Simulates NREL NSRDB / NASA POWER hourly solar and weather telemetry."""
        # Solar diurnal curve: peaks at solar noon (~12:00-13:00)
        if 6 <= hour <= 18:
            solar_elevation = math.sin((hour - 6) / 12 * math.pi)
            cloud_cover = random.uniform(0.0, 0.4)
            ghi = max(0.0, 950.0 * solar_elevation * (1.0 - cloud_cover))
            dni = ghi * random.uniform(0.7, 0.95)
        else:
            ghi = 0.0
            dni = 0.0

        temp_c = 16.0 + 12.0 * math.sin((hour - 8) / 24 * 2 * math.pi) + random.uniform(-2, 2)
        wind_speed_mps = max(0.5, 4.5 + 3.0 * random.gauss(0, 1))

        return {
            "ghi_w_per_m2": round(ghi, 2),
            "dni_w_per_m2": round(dni, 2),
            "wind_speed_mps": round(wind_speed_mps, 2),
            "temperature_ambient_c": round(temp_c, 2),
            "relative_humidity_pct": round(random.uniform(40.0, 75.0), 1),
        }

    def generate_grid_carbon_profile(self, hour: int) -> dict:
        """Simulates Electricity Maps / WattTime carbon intensity and TOU tariffs."""
        # Morning and evening peaks in fossil-heavy grids
        is_peak = (8 <= hour <= 11) or (17 <= hour <= 21)
        is_mid_peak = (12 <= hour <= 16)

        if is_peak:
            ci = random.uniform(450.0, 680.0)
            tariff = random.uniform(0.28, 0.42)
            tier = "ON_PEAK"
        elif is_mid_peak:
            ci = random.uniform(280.0, 420.0)  # solar depression
            tariff = random.uniform(0.18, 0.26)
            tier = "MID_PEAK"
        else:
            ci = random.uniform(120.0, 260.0)  # wind-heavy night or early morning
            tariff = random.uniform(0.08, 0.15)
            tier = "OFF_PEAK"

        forecast_4h = [
            round(max(80.0, ci + random.uniform(-60.0, 60.0)), 1)
            for _ in range(4)
        ]

        return {
            "carbon_intensity_gco2_per_kwh": round(ci, 1),
            "forecast_carbon_intensity_next_4h": forecast_4h,
            "tou_tariff_usd_kwh": round(tariff, 4),
            "tou_tier": tier,
            "demand_charge_usd_kw": 18.5,
            "renewable_pct": round(random.uniform(20.0, 80.0), 1),
        }

    def generate_shift_context(self, hour: int, minute: int) -> dict:
        """Determines shift type and handover status."""
        total_minutes = hour * 60 + minute

        # Day: 06:00 (360) - 14:00 (840)
        # Swing: 14:00 (840) - 22:00 (1320)
        # Night: 22:00 (1320) - 06:00 (360)
        handover_windows = [
            (345, 375),   # 05:45 - 06:15
            (825, 855),   # 13:45 - 14:15
            (1305, 1335), # 21:45 - 22:15
        ]

        is_handover = any(start <= total_minutes <= end for start, end in handover_windows)

        if 360 <= total_minutes < 840:
            shift = ShiftType.DAY
            mins_to_handover = max(0, 840 - total_minutes)
        elif 840 <= total_minutes < 1320:
            shift = ShiftType.SWING
            mins_to_handover = max(0, 1320 - total_minutes)
        else:
            shift = ShiftType.NIGHT
            mins_to_handover = (360 - total_minutes) % 1440

        return {
            "shift_type": shift,
            "is_handover": is_handover,
            "minutes_to_handover": mins_to_handover,
        }

    def create_sample_pair(self, current_dt: datetime) -> dict:
        """Synthesizes a complete aligned observation and ground-truth action set."""
        hour = current_dt.hour
        minute = current_dt.minute

        weather = self.generate_weather_profile(hour)
        grid = self.generate_grid_carbon_profile(hour)
        shift_ctx = self.generate_shift_context(hour, minute)

        # Solar PV power (e.g., 200 kW peak plant)
        pv_gen_kw = max(0.0, weather["ghi_w_per_m2"] * 0.22 * random.uniform(0.9, 1.0))

        # Battery SoC (randomly sampled with bias toward 40-80%)
        bess_soc = random.uniform(25.0, 90.0)
        has_grid_guarantee = random.random() < 0.25

        # 1. Grid & Carbon Agent Input & Ground Truth Action
        grid_input = {
            "timestamp": current_dt.isoformat(),
            "current_carbon_intensity_gco2": grid["carbon_intensity_gco2_per_kwh"],
            "forecast_carbon_intensity_next_4h": grid["forecast_carbon_intensity_next_4h"],
            "current_tou_tariff_usd_kwh": grid["tou_tariff_usd_kwh"],
            "demand_charge_peak_usd_kw": grid["demand_charge_usd_kw"],
            "current_grid_draw_kw": random.uniform(250.0, 750.0),
            "weather_ensemble_condition": "Sunny" if weather["ghi_w_per_m2"] > 400 else "Cloudy",
        }

        is_high_cost = grid["tou_tier"] == "ON_PEAK" or grid["carbon_intensity_gco2_per_kwh"] > 450
        min_forecast = min(grid["forecast_carbon_intensity_next_4h"])
        clean_window_rec = min_forecast < (grid["carbon_intensity_gco2_per_kwh"] * 0.75)

        grid_action = GridCarbonAction(
            dynamic_pricing_threshold_usd_kwh=round(0.24 if is_high_cost else 0.14, 3),
            grid_draw_limit_kw=round(450.0 if is_high_cost else 950.0, 1),
            curtailment_advisory_active=is_high_cost,
            carbon_window_recommended=clean_window_rec,
            clean_window_start_minutes_ahead=60 if clean_window_rec else 0,
            clean_window_duration_minutes=120 if clean_window_rec else 0,
            confidence_score=0.92,
            reasoning="Peak tariff and elevated CI detected; curtailing non-critical grid draw."
            if is_high_cost else "Grid is clean with low TOU rate; maximizing manufacturing throughput.",
        )

        # 2. Microgrid Storage Agent Input & Ground Truth Action
        regen_kw = round(random.uniform(5.0, 35.0), 1)
        storage_input = {
            "timestamp": current_dt.isoformat(),
            "solar_irradiance_ghi": weather["ghi_w_per_m2"],
            "wind_speed_mps": weather["wind_speed_mps"],
            "pv_generation_kw": round(pv_gen_kw, 1),
            "bess_soc_pct": round(bess_soc, 1),
            "bess_health_soh_pct": 98.2,
            "regenerative_braking_kw": regen_kw,
            "grid_guarantee_present": has_grid_guarantee,
        }

        # BESS logic adhering to 30% reserve floor
        if is_high_cost and bess_soc > 35.0:
            # Discharge to shave peak
            bess_setpoint = -min(200.0, (bess_soc - 30.0) * 10.0)
            target_soc = max(30.0, bess_soc - 15.0)
        elif pv_gen_kw > 100.0 and bess_soc < 90.0:
            # Charge from excess solar
            bess_setpoint = min(150.0, pv_gen_kw * 0.7)
            target_soc = min(95.0, bess_soc + 10.0)
        else:
            bess_setpoint = 0.0
            target_soc = bess_soc

        storage_action = MicrogridStorageAction(
            bess_charge_discharge_kw=round(bess_setpoint, 1),
            target_soc_pct=round(target_soc, 1),
            island_mode_command=False,
            local_buffer_discharge_rate_kw=round(regen_kw * 0.8, 1),
            reserve_override_requested=False,
            reasoning=f"SoC is {bess_soc:.1f}%. Discharging {abs(bess_setpoint)}kW to buffer plant peak."
            if bess_setpoint < 0 else f"Charging BESS from renewable surplus; preserving 30% reserve floor.",
        )

        # 3. Production Scheduling Agent Input & Ground Truth Action
        orders = [
            {
                "order_id": f"WO-{random.randint(1000, 9999)}",
                "machine_id": "CNC_MILL_5AXIS_01",
                "part_type": "Aero_Titanium_Impeller",
                "duration_minutes": 90,
                "deadline_utc": (current_dt + timedelta(minutes=random.randint(120, 360))).isoformat(),
                "nominal_power_kw": 42.0,
            },
            {
                "order_id": f"WO-{random.randint(1000, 9999)}",
                "machine_id": "VACUUM_OVEN_01",
                "part_type": "Gearbox_Carburizing_Batch",
                "duration_minutes": 180,
                "deadline_utc": (current_dt + timedelta(minutes=random.randint(240, 480))).isoformat(),
                "nominal_power_kw": 110.0,
                "preheat_required": True,
            },
        ]

        oven_temp = 850.0 + random.uniform(-10, 10)
        prod_input = {
            "timestamp": current_dt.isoformat(),
            "active_orders": orders,
            "thermal_oven_temp_c": round(oven_temp, 1),
            "oven_thermal_decay_rate_c_per_hr": 45.0,
            "upcoming_batch_deadlines_minutes": [120, 240],
            "grid_draw_headroom_kw": grid_action.grid_draw_limit_kw,
        }

        # Schedule decisions: prevent tardiness, throttle CNC if high cost, hold oven
        decisions = [
            MachineScheduleDecision(
                machine_id="CNC_MILL_5AXIS_01",
                job_id=orders[0]["order_id"],
                action=MachineState.THROTTLED if is_high_cost else MachineState.RUNNING,
                spindle_speed_pct=75.0 if is_high_cost else 100.0,
                ramp_rate_pct_per_min=10.0,
                preheat_lookahead_minutes=0,
                deadline_slack_minutes=75,
                thermal_hold_override=False,
            ),
            MachineScheduleDecision(
                machine_id="VACUUM_OVEN_01",
                job_id=orders[1]["order_id"],
                action=MachineState.RUNNING,
                spindle_speed_pct=100.0,
                ramp_rate_pct_per_min=5.0,
                preheat_lookahead_minutes=30 if clean_window_rec else 0,
                deadline_slack_minutes=120,
                thermal_hold_override=True,  # Never allow thermal decay scrap
            ),
        ]

        total_sched_kw = sum(
            o["nominal_power_kw"] * (0.75 if d.action == MachineState.THROTTLED else 1.0)
            for o, d in zip(orders, decisions)
        )

        prod_action = ProductionSchedulingAction(
            decisions=decisions,
            total_scheduled_load_kw=round(total_sched_kw, 1),
            lookahead_preheating_active=clean_window_rec,
            batch_tardiness_risk=False,
            reasoning="Maintained thermal oven to prevent decay; throttled CNC spindle to 75% to shave tariff spike.",
        )

        # 4. Ergonomics & Shift Agent Input & Ground Truth Action
        ambient_noise = 78.0 if hour >= 6 and hour <= 21 else 66.0
        ergo_input = {
            "timestamp": current_dt.isoformat(),
            "current_shift": shift_ctx["shift_type"].value,
            "minutes_to_shift_handover": shift_ctx["minutes_to_handover"],
            "factory_ambient_temp_c": weather["temperature_ambient_c"] + 2.0,
            "current_ambient_noise_db": ambient_noise,
            "worker_comfort_min_temp_c": 18.0,
            "worker_comfort_max_temp_c": 26.0,
            "active_worker_count": 18 if shift_ctx["shift_type"] == ShiftType.DAY else 8,
        }

        ergo_action = ErgonomicsShiftAction(
            ventilation_fan_speed_pct=65.0 if weather["temperature_ambient_c"] > 24 else 40.0,
            workstation_temp_target_c=21.5,
            shift_buffer_minutes=20 if shift_ctx["is_handover"] else 10,
            noise_throttling_active=(shift_ctx["shift_type"] == ShiftType.NIGHT or shift_ctx["is_handover"]),
            high_thermal_restriction_active=shift_ctx["is_handover"],
            active_shift_profile=shift_ctx["shift_type"],
            reasoning="Enforcing quiet buffer during handover/night shift and stabilizing thermal comfort band.",
        )

        return {
            "timestamp": current_dt.isoformat(),
            "grid_carbon": {
                "input": grid_input,
                "action": grid_action.model_dump(),
                "prompt": format_prompt(GRID_CARBON_SYSTEM_PROMPT, grid_input),
                "completion": json.dumps(grid_action.model_dump(), default=str),
            },
            "microgrid_storage": {
                "input": storage_input,
                "action": storage_action.model_dump(),
                "prompt": format_prompt(MICROGRID_STORAGE_SYSTEM_PROMPT, storage_input),
                "completion": json.dumps(storage_action.model_dump(), default=str),
            },
            "production_scheduling": {
                "input": prod_input,
                "action": prod_action.model_dump(),
                "prompt": format_prompt(PRODUCTION_SCHEDULING_SYSTEM_PROMPT, prod_input),
                "completion": json.dumps(prod_action.model_dump(), default=str),
            },
            "ergonomics_shift": {
                "input": ergo_input,
                "action": ergo_action.model_dump(),
                "prompt": format_prompt(ERGONOMICS_SHIFT_SYSTEM_PROMPT, ergo_input),
                "completion": json.dumps(ergo_action.model_dump(), default=str),
            },
        }

    def generate_dataset(self, num_samples: int = 500, output_dir: str = "data/synthetic") -> dict[str, str]:
        """Generates training datasets for all 4 agents."""
        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)

        files = {
            "grid_carbon": out_path / "grid_carbon_train.jsonl",
            "microgrid_storage": out_path / "microgrid_storage_train.jsonl",
            "production_scheduling": out_path / "production_scheduling_train.jsonl",
            "ergonomics_shift": out_path / "ergonomics_shift_train.jsonl",
            "joint_trajectories": out_path / "joint_trajectories.jsonl",
        }

        file_handles = {k: open(v, "w", encoding="utf-8") for k, v in files.items()}

        base_dt = datetime(2026, 6, 1, 0, 0, 0)

        for i in range(num_samples):
            # Advance in 15-minute industrial interval increments
            sample_dt = base_dt + timedelta(minutes=15 * i)
            sample = self.create_sample_pair(sample_dt)

            for agent in ["grid_carbon", "microgrid_storage", "production_scheduling", "ergonomics_shift"]:
                agent_data = sample[agent]
                row = {
                    "id": f"{agent}_{i}",
                    "timestamp": sample["timestamp"],
                    "prompt": agent_data["prompt"],
                    "completion": agent_data["completion"],
                    "input": agent_data["input"],
                    "action": agent_data["action"],
                }
                file_handles[agent].write(json.dumps(row) + "\n")

            file_handles["joint_trajectories"].write(json.dumps(sample) + "\n")

        for fh in file_handles.values():
            fh.close()

        return {k: str(v) for k, v in files.items()}


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic industrial datasets for VidyutSync LLMs")
    parser.add_argument("--samples", type=int, default=300, help="Number of 15-min interval samples")
    parser.add_argument("--output_dir", type=str, default="data/synthetic", help="Destination directory")
    args = parser.parse_args()

    generator = IndustrialSyntheticDataGenerator()
    generated = generator.generate_dataset(num_samples=args.samples, output_dir=args.output_dir)
    print(f"Generated {args.samples} synthetic samples per agent:")
    for k, v in generated.items():
        print(f"  - {k}: {v}")


if __name__ == "__main__":
    main()
