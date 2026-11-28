"""Inference engine and action schema parser for the 4 specialized LLM models."""

import json
import logging
import re
from typing import Any
from src.config import settings
from src.models.schemas import (
    GridCarbonInput,
    GridCarbonAction,
    MicrogridStorageInput,
    MicrogridStorageAction,
    ProductionSchedulingInput,
    ProductionSchedulingAction,
    MachineScheduleDecision,
    MachineState,
    ErgonomicsShiftInput,
    ErgonomicsShiftAction,
    ShiftType,
)
from src.models.templates import (
    GRID_CARBON_SYSTEM_PROMPT,
    MICROGRID_STORAGE_SYSTEM_PROMPT,
    PRODUCTION_SCHEDULING_SYSTEM_PROMPT,
    ERGONOMICS_SHIFT_SYSTEM_PROMPT,
    format_prompt,
)

logger = logging.getLogger("VidyutSync.Inference")


def extract_json_payload(raw_text: str) -> dict[str, Any]:
    """Extracts JSON from text, stripping markdown backticks or extra preamble."""
    raw_text = raw_text.strip()
    # Check for markdown code blocks
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_text, re.DOTALL)
    if match:
        return json.loads(match.group(1))

    # Check for raw JSON object
    match = re.search(r"(\{.*\})", raw_text, re.DOTALL)
    if match:
        return json.loads(match.group(1))

    return json.loads(raw_text)


class AgentInferenceEngine:
    """Provides inference for the 4 specialized Dec-POMDP agents."""

    def __init__(self, use_mock: bool | None = None, device: str | None = None):
        self.use_mock = use_mock if use_mock is not None else settings.USE_MOCK_LLM
        self.device = device if device is not None else settings.LLM_DEVICE
        self._loaded_models = {}
        self._tokenizers = {}

        if not self.use_mock:
            logger.info("Initializing HuggingFace neural models...")
            # We lazy-load on demand

    def infer_grid_carbon(self, state_input: GridCarbonInput) -> GridCarbonAction:
        """Inference for Grid & Carbon Agent."""
        if self.use_mock:
            return self._mock_infer_grid_carbon(state_input)

        prompt = format_prompt(GRID_CARBON_SYSTEM_PROMPT, state_input.model_dump())
        raw_output = self._call_llm("grid_carbon", prompt)
        try:
            payload = extract_json_payload(raw_output)
            return GridCarbonAction.model_validate(payload)
        except Exception as e:
            logger.warning(f"GridCarbon LLM parsing failed: {e}. Falling back to safe rule.")
            return self._mock_infer_grid_carbon(state_input)

    def infer_microgrid_storage(self, state_input: MicrogridStorageInput) -> MicrogridStorageAction:
        """Inference for Micro-Grid & Storage Agent."""
        if self.use_mock:
            return self._mock_infer_microgrid_storage(state_input)

        prompt = format_prompt(MICROGRID_STORAGE_SYSTEM_PROMPT, state_input.model_dump())
        raw_output = self._call_llm("microgrid_storage", prompt)
        try:
            payload = extract_json_payload(raw_output)
            return MicrogridStorageAction.model_validate(payload)
        except Exception as e:
            logger.warning(f"MicrogridStorage LLM parsing failed: {e}. Falling back to safe rule.")
            return self._mock_infer_microgrid_storage(state_input)

    def infer_production_scheduling(self, state_input: ProductionSchedulingInput) -> ProductionSchedulingAction:
        """Inference for Production Scheduling Agent."""
        if self.use_mock:
            return self._mock_infer_production_scheduling(state_input)

        prompt = format_prompt(PRODUCTION_SCHEDULING_SYSTEM_PROMPT, state_input.model_dump())
        raw_output = self._call_llm("production_scheduling", prompt)
        try:
            payload = extract_json_payload(raw_output)
            return ProductionSchedulingAction.model_validate(payload)
        except Exception as e:
            logger.warning(f"ProductionScheduling LLM parsing failed: {e}. Falling back to safe rule.")
            return self._mock_infer_production_scheduling(state_input)

    def infer_ergonomics_shift(self, state_input: ErgonomicsShiftInput) -> ErgonomicsShiftAction:
        """Inference for Ergonomics & Shift Agent."""
        if self.use_mock:
            return self._mock_infer_ergonomics_shift(state_input)

        prompt = format_prompt(ERGONOMICS_SHIFT_SYSTEM_PROMPT, state_input.model_dump())
        raw_output = self._call_llm("ergonomics_shift", prompt)
        try:
            payload = extract_json_payload(raw_output)
            return ErgonomicsShiftAction.model_validate(payload)
        except Exception as e:
            logger.warning(f"ErgonomicsShift LLM parsing failed: {e}. Falling back to safe rule.")
            return self._mock_infer_ergonomics_shift(state_input)

    def _call_llm(self, agent_name: str, prompt: str) -> str:
        """Executes actual HuggingFace generation pipeline."""
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch

        if agent_name not in self._loaded_models:
            model_path_attr = f"{agent_name.upper()}_MODEL_PATH"
            model_path = getattr(settings, model_path_attr, settings.BASE_MODEL_NAME)
            logger.info(f"Loading weights for {agent_name} from {model_path}...")
            try:
                tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
                model = AutoModelForCausalLM.from_pretrained(
                    model_path,
                    torch_dtype=torch.float32,
                    trust_remote_code=True,
                )
            except Exception:
                logger.info(f"Local adapter not found, loading base model {settings.BASE_MODEL_NAME}")
                tokenizer = AutoTokenizer.from_pretrained(settings.BASE_MODEL_NAME, trust_remote_code=True)
                model = AutoModelForCausalLM.from_pretrained(
                    settings.BASE_MODEL_NAME,
                    torch_dtype=torch.float32,
                    trust_remote_code=True,
                )

            self._tokenizers[agent_name] = tokenizer
            self._loaded_models[agent_name] = model

        tokenizer = self._tokenizers[agent_name]
        model = self._loaded_models[agent_name]

        inputs = tokenizer(prompt, return_tensors="pt")
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=settings.LLM_MAX_NEW_TOKENS,
                temperature=settings.LLM_TEMPERATURE,
                do_sample=(settings.LLM_TEMPERATURE > 0),
                pad_token_id=tokenizer.eos_token_id,
            )

        gen_tokens = outputs[0][inputs["input_ids"].shape[1]:]
        return tokenizer.decode(gen_tokens, skip_special_tokens=True)

    # --- Fast, deterministic rule-guided mock generators ---
    def _mock_infer_grid_carbon(self, state: GridCarbonInput) -> GridCarbonAction:
        is_high_ci = state.current_carbon_intensity_gco2 > 400.0 or state.current_tou_tariff_usd_kwh > 0.25
        min_forecast = min(state.forecast_carbon_intensity_next_4h) if state.forecast_carbon_intensity_next_4h else 300.0
        clean_window = min_forecast < (state.current_carbon_intensity_gco2 * 0.8)

        return GridCarbonAction(
            dynamic_pricing_threshold_usd_kwh=round(0.25 if is_high_ci else 0.14, 3),
            grid_draw_limit_kw=round(500.0 if is_high_ci else 1100.0, 1),
            curtailment_advisory_active=is_high_ci,
            carbon_window_recommended=clean_window,
            clean_window_start_minutes_ahead=45 if clean_window else 0,
            clean_window_duration_minutes=90 if clean_window else 0,
            confidence_score=0.95,
            reasoning="High grid carbon/tariff: advisory curtailment active." if is_high_ci
            else "Standard grid baseline: ample clean headroom available.",
        )

    def _mock_infer_microgrid_storage(self, state: MicrogridStorageInput) -> MicrogridStorageAction:
        # Respect 30% reserve floor strictly
        if state.bess_soc_pct <= 30.0 and not state.grid_guarantee_present:
            # Cannot discharge
            setpoint = 0.0
            target_soc = max(30.0, state.bess_soc_pct)
            reason = "BESS is at or below 30% reserve floor; discharge disabled to safeguard microgrid resiliency."
        elif state.pv_generation_kw > 80.0 and state.bess_soc_pct < 95.0:
            # Absorb solar
            setpoint = min(settings.BESS_MAX_CHARGE_RATE_KW, state.pv_generation_kw * 0.6)
            target_soc = min(100.0, state.bess_soc_pct + 10.0)
            reason = f"Surplus solar PV generation ({state.pv_generation_kw}kW); charging BESS."
        elif state.bess_soc_pct > 35.0:
            # Shave load
            setpoint = -min(settings.BESS_MAX_DISCHARGE_RATE_KW, (state.bess_soc_pct - 30.0) * 12.0)
            target_soc = max(30.0, state.bess_soc_pct - 10.0)
            reason = f"Discharging {abs(setpoint):.1f}kW from BESS while maintaining >30% reserve."
        else:
            setpoint = 0.0
            target_soc = state.bess_soc_pct
            reason = "Holding BESS state."

        return MicrogridStorageAction(
            bess_charge_discharge_kw=round(setpoint, 1),
            target_soc_pct=round(target_soc, 1),
            island_mode_command=False,
            local_buffer_discharge_rate_kw=round(state.regenerative_braking_kw * 0.85, 1),
            reserve_override_requested=False,
            reasoning=reason,
        )

    def _mock_infer_production_scheduling(self, state: ProductionSchedulingInput) -> ProductionSchedulingAction:
        decisions = []
        total_kw = 0.0

        for order in state.active_orders:
            # Thermal oven: always maintain temperature to prevent cooling decay scrap
            if "OVEN" in order.machine_id.upper() or order.preheat_required:
                decisions.append(
                    MachineScheduleDecision(
                        machine_id=order.machine_id,
                        job_id=order.order_id,
                        action=MachineState.RUNNING,
                        spindle_speed_pct=100.0,
                        ramp_rate_pct_per_min=5.0,
                        preheat_lookahead_minutes=20,
                        deadline_slack_minutes=90,
                        thermal_hold_override=True,
                    )
                )
                total_kw += order.nominal_power_kw
            else:
                # CNC machines: throttle or run depending on power headroom
                is_constrained = state.grid_draw_headroom_kw < 600.0
                spindle = 75.0 if is_constrained else 100.0
                action = MachineState.THROTTLED if is_constrained else MachineState.RUNNING
                decisions.append(
                    MachineScheduleDecision(
                        machine_id=order.machine_id,
                        job_id=order.order_id,
                        action=action,
                        spindle_speed_pct=spindle,
                        ramp_rate_pct_per_min=10.0,
                        preheat_lookahead_minutes=0,
                        deadline_slack_minutes=60,
                        thermal_hold_override=False,
                    )
                )
                total_kw += order.nominal_power_kw * (spindle / 100.0)

        return ProductionSchedulingAction(
            decisions=decisions,
            total_scheduled_load_kw=round(total_kw, 1),
            lookahead_preheating_active=False,
            batch_tardiness_risk=False,
            reasoning="Protected oven thermal hold against decay scrap; scheduled CNCs within power envelope.",
        )

    def _mock_infer_ergonomics_shift(self, state: ErgonomicsShiftInput) -> ErgonomicsShiftAction:
        is_night_or_handover = (state.current_shift == ShiftType.NIGHT) or (state.minutes_to_shift_handover <= 30)
        target_temp = 21.5

        return ErgonomicsShiftAction(
            ventilation_fan_speed_pct=60.0 if state.factory_ambient_temp_c > 24.0 else 35.0,
            workstation_temp_target_c=target_temp,
            shift_buffer_minutes=20 if is_night_or_handover else 10,
            noise_throttling_active=is_night_or_handover,
            high_thermal_restriction_active=(state.minutes_to_shift_handover <= 15),
            active_shift_profile=state.current_shift,
            reasoning="Regulating OSHA thermal comfort band; restricting noisy ops during handover/night shift.",
        )
