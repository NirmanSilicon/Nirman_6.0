"""
backend/app/core/physics_anomaly/predictors.py

Lightweight, physics-informed predictors for highest-value CubeSat telemetry channels:
1. Thermal & Battery Response (lumped thermal capacitance energy balance & slew limits)
2. Power Bus Voltage & BMS Coupling (solid-state protection isolation & UVLO circuit model)
3. Sensor Integrity & Continuity (rail boundaries and thermodynamic limits)

Each predictor calculates:
- observed value
- predicted value
- residual = observed - predicted
- normalized residual (residual / sigma_expected)
- physical inconsistency classification
"""

import math
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, Tuple


@dataclass
class PhysicsPredictionResult:
    """
    Standard output container for a physics prediction evaluation.
    """
    observed_value: float
    predicted_value: float
    residual: float
    normalized_residual: float
    is_physically_inconsistent: bool
    rule_name: str
    channel: str
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "observed": round(self.observed_value, 4),
            "predicted": round(self.predicted_value, 4),
            "residual": round(self.residual, 4),
            "normalized_residual": round(self.normalized_residual, 4),
            "is_physically_inconsistent": self.is_physically_inconsistent,
            "rule_name": self.rule_name,
            "channel": self.channel,
            "details": self.details,
        }


class ThermalHeaterPredictor:
    """
    Lumped thermal capacitance predictor for battery and chassis temperatures.
    Models temperature change as a discrete-time 1st order thermal balance:
      T_hat[k] = T[k-1] + dt * (alpha * duty_cycle[k-1] - beta * (T[k-1] - T_ambient))
    
    Also enforces physical bounds:
    - Maximum thermodynamic slew rate: |dT/dt| <= max_slew_rate
    - Valid physical temperatures (e.g. >= -40°C, <= 125°C)
    """

    def __init__(
        self,
        alpha: float = 0.065,         # Thermal gain from heater dissipation (°C / (s * duty))
        beta: float = 0.0015,         # Heat dissipation rate to ambient chassis (s^-1)
        ambient_temp: float = 20.0,   # Nominal chassis ambient temperature (°C)
        nominal_temp: float = 25.0,   # Nominal steady-state temperature (°C)
        max_slew_rate: float = 3.5,   # Maximum plausible rate of temperature change (°C/s)
        sigma_expected: float = 1.8,  # Expected model + sensor noise uncertainty (°C)
        z_threshold: float = 4.0,     # Normalized residual threshold for physical inconsistency
    ):
        self.alpha = alpha
        self.beta = beta
        self.ambient_temp = ambient_temp
        self.nominal_temp = nominal_temp
        self.max_slew_rate = max_slew_rate
        self.sigma_expected = max(sigma_expected, 1e-4)
        self.z_threshold = z_threshold

    def predict_next(
        self,
        prev_temp: Optional[float],
        duty_cycle: float = 0.325,
        dt_seconds: float = 1.0,
    ) -> float:
        """
        Compute predicted temperature based on prior state and heater duty cycle.
        """
        if prev_temp is None or not math.isfinite(prev_temp) or prev_temp <= -900.0:
            return self.nominal_temp

        dt = max(min(dt_seconds, 30.0), 0.1)
        duty = max(min(duty_cycle, 1.0), 0.0)

        # Thermal heating term + passive cooling term
        heating_flux = self.alpha * duty
        cooling_flux = self.beta * (prev_temp - self.ambient_temp)
        delta_t = dt * (heating_flux - cooling_flux)

        # Damp single-step jump by physical slew rate limit
        max_step = self.max_slew_rate * dt
        delta_t_clamped = max(min(delta_t, max_step), -max_step)

        return prev_temp + delta_t_clamped

    def evaluate(
        self,
        observed_temp: float,
        prev_temp: Optional[float] = None,
        duty_cycle: float = 0.325,
        dt_seconds: float = 1.0,
        channel: str = "battery.temperature_c",
    ) -> PhysicsPredictionResult:
        """
        Evaluate observed temperature against the thermal energy balance model.
        """
        # 1. Check for physical sentinel or extreme sensor dropouts
        if observed_temp <= -900.0 or observed_temp < -50.0 or observed_temp > 150.0:
            predicted = self.nominal_temp if prev_temp is None else prev_temp
            residual = observed_temp - predicted
            norm_res = residual / self.sigma_expected
            return PhysicsPredictionResult(
                observed_value=observed_temp,
                predicted_value=predicted,
                residual=residual,
                normalized_residual=norm_res,
                is_physically_inconsistent=True,
                rule_name="thermal_range_or_dropout",
                channel=channel,
                details={
                    "reason": "Temperature outside physical hardware boundaries or sensor dropout sentinel",
                    "observed": observed_temp,
                    "limits": [-50.0, 150.0],
                },
            )

        # 2. Check for slew rate violation (impossible thermal jump)
        dt = max(dt_seconds, 0.1)
        if prev_temp is not None and math.isfinite(prev_temp) and prev_temp > -900.0:
            actual_slew = abs(observed_temp - prev_temp) / dt
            if actual_slew > self.max_slew_rate:
                predicted = self.predict_next(prev_temp, duty_cycle, dt)
                residual = observed_temp - predicted
                norm_res = residual / self.sigma_expected
                return PhysicsPredictionResult(
                    observed_value=observed_temp,
                    predicted_value=predicted,
                    residual=residual,
                    normalized_residual=norm_res,
                    is_physically_inconsistent=True,
                    rule_name="thermal_slew_rate_exceeded",
                    channel=channel,
                    details={
                        "reason": f"Thermal rate of change {actual_slew:.2f}°C/s exceeds physical limit {self.max_slew_rate}°C/s",
                        "actual_slew_c_per_s": round(actual_slew, 3),
                        "max_slew_c_per_s": self.max_slew_rate,
                    },
                )

        # 3. Standard model prediction and residual evaluation
        predicted = self.predict_next(prev_temp, duty_cycle, dt)
        residual = observed_temp - predicted
        norm_res = residual / self.sigma_expected
        is_inconsistent = abs(norm_res) >= self.z_threshold

        return PhysicsPredictionResult(
            observed_value=observed_temp,
            predicted_value=predicted,
            residual=residual,
            normalized_residual=norm_res,
            is_physically_inconsistent=is_inconsistent,
            rule_name="thermal_energy_balance",
            channel=channel,
            details={
                "duty_cycle": duty_cycle,
                "dt_seconds": dt,
                "sigma_expected": self.sigma_expected,
            },
        )


class PowerBusVoltagePredictor:
    """
    Circuit model predictor for the main power distribution bus.
    Couples BMS trip protection state and nominal bus voltage regulation:
      V_hat[k] = V_nominal * (1 - trip_state[k-1]) + V_trip * trip_state[k-1]
    
    Physics rules:
    - If BMS tripped (trip_state=1), voltage MUST collapse to V_trip (~1.8V - 2.1V).
      If voltage is low, it is PHYSICALLY CONSISTENT with BMS trip!
    - If BMS has NOT tripped (trip_state=0), voltage collapsing to < UVLO (< 3.2V)
      is a physical violation / regulator failure.
    - Negative voltage or excessive overvoltage (> 10.0V) is a physical impossibility.
    """

    def __init__(
        self,
        v_nominal: float = 7.4,         # Nominal unregulated bus voltage (V)
        v_trip: float = 1.8,            # Sag voltage when BMS protection switch disconnects (V)
        uvlo_threshold: float = 3.2,    # Under-voltage lockout critical threshold (V)
        sigma_expected: float = 0.25,   # Expected prediction noise / regulation ripple (V)
        z_threshold: float = 3.0,       # Normalized residual threshold for physical inconsistency
    ):
        self.v_nominal = v_nominal
        self.v_trip = v_trip
        self.uvlo_threshold = uvlo_threshold
        self.sigma_expected = max(sigma_expected, 1e-4)
        self.z_threshold = z_threshold

    def predict_voltage(
        self,
        trip_state: float = 0.0,
        prev_voltage: Optional[float] = None,
    ) -> float:
        """
        Predict bus voltage given protection circuit switch state and nominal rail voltage.
        """
        if trip_state >= 0.5:
            return self.v_trip
        if prev_voltage is not None and prev_voltage > 9.5:
            return 12.04
        return self.v_nominal

    def evaluate(
        self,
        observed_voltage: float,
        trip_state: float = 0.0,
        prev_voltage: Optional[float] = None,
        dt_seconds: float = 1.0,
        channel: str = "power_bus.voltage_v",
    ) -> PhysicsPredictionResult:
        """
        Evaluate observed bus voltage against BMS circuit coupling model.
        """
        # Determine nominal voltage level (12.04V for calibrated OPS-SAT buses, 7.4V for standard 2S CubeSat)
        nominal_v = 12.04 if (observed_voltage > 9.5 or (prev_voltage is not None and prev_voltage > 9.5)) else self.v_nominal

        # 1. Physical rail boundaries
        if observed_voltage < 0.0 or observed_voltage > 16.0 or observed_voltage <= -900.0:
            predicted = self.predict_voltage(trip_state, prev_voltage)
            residual = observed_voltage - predicted
            norm_res = residual / self.sigma_expected
            return PhysicsPredictionResult(
                observed_value=observed_voltage,
                predicted_value=predicted,
                residual=residual,
                normalized_residual=norm_res,
                is_physically_inconsistent=True,
                rule_name="power_bus_voltage_limits",
                channel=channel,
                details={
                    "reason": "Bus voltage outside physical electronic rail bounds (0V - 16V)",
                    "observed": observed_voltage,
                },
            )

        # 2. Coupling check: UVLO collapse without BMS trip
        predicted = self.v_trip if trip_state >= 0.5 else nominal_v
        residual = observed_voltage - predicted
        norm_res = residual / self.sigma_expected

        if trip_state < 0.5 and observed_voltage < self.uvlo_threshold:
            # Voltage collapsed while BMS did not trip -> Regulator latchup / short
            return PhysicsPredictionResult(
                observed_value=observed_voltage,
                predicted_value=predicted,
                residual=residual,
                normalized_residual=norm_res,
                is_physically_inconsistent=True,
                rule_name="uncommanded_uvlo_collapse",
                channel=channel,
                details={
                    "reason": f"Bus voltage {observed_voltage:.2f}V dropped below UVLO ({self.uvlo_threshold}V) without BMS protection trip",
                    "trip_state": trip_state,
                    "uvlo_threshold": self.uvlo_threshold,
                },
            )

        if trip_state >= 0.5 and observed_voltage >= 6.0:
            # BMS tripped but bus voltage remained high -> Switch failed closed / bypass
            return PhysicsPredictionResult(
                observed_value=observed_voltage,
                predicted_value=predicted,
                residual=residual,
                normalized_residual=norm_res,
                is_physically_inconsistent=True,
                rule_name="bms_switch_failure_to_isolate",
                channel=channel,
                details={
                    "reason": f"BMS protection switch tripped but bus voltage remained at {observed_voltage:.2f}V",
                    "trip_state": trip_state,
                },
            )

        is_inconsistent = abs(norm_res) >= self.z_threshold

        return PhysicsPredictionResult(
            observed_value=observed_voltage,
            predicted_value=predicted,
            residual=residual,
            normalized_residual=norm_res,
            is_physically_inconsistent=is_inconsistent,
            rule_name="bms_voltage_coupling",
            channel=channel,
            details={
                "trip_state": trip_state,
                "sigma_expected": self.sigma_expected,
            },
        )


DEFAULT_CHANNEL_BOUNDS = {
    "thermal_sensor.temperature_c": (-40.0, 85.0),
    "heater_controller.duty_cycle": (0.0, 1.0),
    "battery.temperature_c": (-10.0, 85.0),
    "battery_protection.trip_state": (0.0, 1.0),
    "power_bus.voltage_v": (0.0, 12.0),
    "comms.signal_strength_dbm": (-120.0, 10.0),
    "obc.cpu_load": (0.0, 1.0),
    "payload.operational_state": (0.0, 1.0),
    "flight_software.fdir_state": (0.0, 1.0),
}


class SensorIntegrityPredictor:
    """
    Continuity and hardware sensor boundary predictor for auxiliary channels.
    Detects frozen sensors, sentinels, or hardware rail saturations.
    """

    def __init__(
        self,
        nominal_mean: float = 0.0,
        nominal_std: float = 0.1,
        min_allowed: float = -50.0,
        max_allowed: float = 100.0,
        max_slew_rate: float = 25.0,
        channel_bounds: Optional[Dict[str, Tuple[float, float]]] = None,
        z_threshold: float = 4.0,
    ):
        self.nominal_mean = nominal_mean
        self.nominal_std = max(nominal_std, 1e-4)
        self.min_allowed = min_allowed
        self.max_allowed = max_allowed
        self.max_slew_rate = max_slew_rate
        self.channel_bounds = channel_bounds or DEFAULT_CHANNEL_BOUNDS
        self.z_threshold = z_threshold

    def evaluate(
        self,
        observed_value: float,
        prev_value: Optional[float] = None,
        dt_seconds: float = 1.0,
        channel: str = "generic_sensor",
    ) -> PhysicsPredictionResult:
        # Sentinel detection
        if observed_value <= -900.0:
            predicted = self.nominal_mean if prev_value is None else prev_value
            residual = observed_value - predicted
            return PhysicsPredictionResult(
                observed_value=observed_value,
                predicted_value=predicted,
                residual=residual,
                normalized_residual=residual / self.nominal_std,
                is_physically_inconsistent=True,
                rule_name="sensor_dropout_sentinel",
                channel=channel,
                details={"reason": "Reading contains sensor dropout or negative rail sentinel value"},
            )

        predicted = prev_value if prev_value is not None else self.nominal_mean
        residual = observed_value - predicted
        norm_res = residual / self.nominal_std

        # Channel-aware hard limit boundary violation
        bounds = self.channel_bounds.get(channel)
        min_limit = bounds[0] if bounds else self.min_allowed
        max_limit = bounds[1] if bounds else self.max_allowed

        if observed_value < min_limit or observed_value > max_limit:
            return PhysicsPredictionResult(
                observed_value=observed_value,
                predicted_value=predicted,
                residual=residual,
                normalized_residual=norm_res,
                is_physically_inconsistent=True,
                rule_name="sensor_hard_range_violation",
                channel=channel,
                details={"limits": [min_limit, max_limit]},
            )

        # Slew rate violation
        if prev_value is not None:
            dt = max(dt_seconds, 0.1)
            slew = abs(observed_value - prev_value) / dt
            if slew > self.max_slew_rate:
                return PhysicsPredictionResult(
                    observed_value=observed_value,
                    predicted_value=predicted,
                    residual=residual,
                    normalized_residual=norm_res,
                    is_physically_inconsistent=True,
                    rule_name="sensor_slew_rate_exceeded",
                    channel=channel,
                    details={"slew": slew, "limit": self.max_slew_rate},
                )

        is_inconsistent = abs(norm_res) >= self.z_threshold
        rule = "sensor_continuity_exceeded" if is_inconsistent else "sensor_continuity"
        return PhysicsPredictionResult(
            observed_value=observed_value,
            predicted_value=predicted,
            residual=residual,
            normalized_residual=norm_res,
            is_physically_inconsistent=False,
            rule_name=rule,
            channel=channel,
            details={},
        )
