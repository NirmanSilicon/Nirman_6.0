"""
Hardware abstraction for Raspberry Pi 4 GPIO and I2S peripherals.
Provides seamless cross-platform execution on Windows / Linux without crashing
when GPIO hardware is absent, while driving real GPIO pins on Raspberry Pi 4.

Supports 2-machine, 2-mic independent LED and buzzer logic:
- Machine 1 (Left / Mic 0):
  - Green Status LED: BCM 5  (Physical Pin 29) - ON when Machine 1 is normal
  - Red Alarm LED:    BCM 6  (Physical Pin 31) - ON when Machine 1 has fault
- Machine 2 (Right / Mic 1):
  - Green Status LED: BCM 17 (Physical Pin 11) - ON when Machine 2 is normal
  - Red Alarm LED:    BCM 27 (Physical Pin 13) - ON when Machine 2 has fault
- Shared Piezo Buzzer:
  - BCM 22 (Physical Pin 15, active_high=False) - ON when either machine alarm debounces
- Dual INMP441 I2S Microphones:
  - BCLK:  BCM 18 (Physical Pin 12)
  - LRCLK: BCM 19 (Physical Pin 35)
  - DOUT:  BCM 20 (Physical Pin 38)
  - Power: 3.3V Rail (Physical Pin 1 or 17)
"""

import logging
from typing import Any

logger = logging.getLogger("machine_whisperer_hardware")

# Raspberry Pi 4 Hardware Pinout Configuration
# Machine 1 (Left / Mic 0 - fan_id_00)
BCM_M1_GREEN = 5        # Physical Pin 29
BCM_M1_RED = 6          # Physical Pin 31

# Machine 2 (Right / Mic 1 - pump_id_00)
BCM_M2_GREEN = 17       # Physical Pin 11
BCM_M2_RED = 27         # Physical Pin 13

# Shared Active-Low Piezo Buzzer
BCM_BUZZER = 22         # Physical Pin 15 (active_high=False)

# Dual INMP441 Stereo I2S Microphones
BCM_I2S_BCLK = 18       # Physical Pin 12
BCM_I2S_LRCLK = 19      # Physical Pin 35
BCM_I2S_DOUT = 20       # Physical Pin 38
I2S_VOLTAGE_RAIL = "3.3V (Physical Pin 1 / 17)"


class RPiHardwareController:
    """Controls independent Green/Red status LEDs for 2 machines and shared active-low Buzzer."""

    def __init__(
        self,
        m1_green_pin: int = BCM_M1_GREEN,
        m1_red_pin: int = BCM_M1_RED,
        m2_green_pin: int = BCM_M2_GREEN,
        m2_red_pin: int = BCM_M2_RED,
        buzzer_pin: int = BCM_BUZZER,
    ):
        self.m1_green_pin = m1_green_pin
        self.m1_red_pin = m1_red_pin
        self.m2_green_pin = m2_green_pin
        self.m2_red_pin = m2_red_pin
        self.buzzer_pin = buzzer_pin

        self.is_real: bool = False
        self.m1_green_led: Any = None
        self.m1_red_led: Any = None
        self.m2_green_led: Any = None
        self.m2_red_led: Any = None
        self.buzzer: Any = None

        # Tracked software states for UI telemetry
        self.m1_green_state: bool = True
        self.m1_red_state: bool = False
        self.m2_green_state: bool = True
        self.m2_red_state: bool = False
        self.buzzer_state: bool = False

        # Legacy compatibility aliases
        self.green_pin = m1_green_pin
        self.red_pin = m1_red_pin
        self.green_state: bool = True
        self.red_state: bool = False

        self._init_hardware()

    def _init_hardware(self):
        """Attempt to bind physical Raspberry Pi GPIO via gpiozero safely."""
        try:
            from gpiozero import Buzzer, LED

            self.m1_green_led = LED(self.m1_green_pin)
            self.m1_red_led = LED(self.m1_red_pin)
            self.m2_green_led = LED(self.m2_green_pin)
            self.m2_red_led = LED(self.m2_red_pin)
            # Active-low buzzer: driving pin LOW activates the buzzer
            self.buzzer = Buzzer(self.buzzer_pin, active_high=False)
            self.is_real = True
            logger.info(
                f"[GPIO] Real Raspberry Pi 4 GPIO initialized: "
                f"M1_Green=BCM {self.m1_green_pin} (Pin 29), "
                f"M1_Red=BCM {self.m1_red_pin} (Pin 31), "
                f"M2_Green=BCM {self.m2_green_pin} (Pin 11), "
                f"M2_Red=BCM {self.m2_red_pin} (Pin 13), "
                f"Buzzer=BCM {self.buzzer_pin} (Pin 15, active-low)"
            )
        except Exception as err:
            self.is_real = False
            self.m1_green_led = None
            self.m1_red_led = None
            self.m2_green_led = None
            self.m2_red_led = None
            self.buzzer = None
            logger.info(f"[GPIO] Safe mock mode active on Windows / non-Pi platform ({err})")

        # Initial nominal state: both machines GREEN, buzzer OFF
        self.set_machine_states(
            m1_abnormal=False,
            m1_alarm=False,
            m2_abnormal=False,
            m2_alarm=False,
        )

    def set_machine_states(
        self,
        m1_abnormal: bool = False,
        m1_alarm: bool = False,
        m2_abnormal: bool = False,
        m2_alarm: bool = False,
        m1_voice: bool = False,
        m2_voice: bool = False,
    ):
        """
        Update independent actuators for Machine 1 and Machine 2:
        - When both motors normal: M1 GREEN, M2 GREEN, Buzzer OFF
        - When damaged sound played into mic 0: M1 RED, M2 GREEN, Buzzer ON when debounced (m1_alarm)
        - When damaged sound played into mic 1: M1 GREEN, M2 RED, Buzzer ON when debounced (m2_alarm)
        - Voice rejection keeps respective machine in GREEN state and buzzer OFF.
        """
        # Machine 1 Green/Red
        self.m1_green_state = (not m1_abnormal) or m1_voice
        self.m1_red_state = m1_abnormal and (not m1_voice)

        # Machine 2 Green/Red
        self.m2_green_state = (not m2_abnormal) or m2_voice
        self.m2_red_state = m2_abnormal and (not m2_voice)

        # Buzzer activates when either machine has an active debounced alarm
        # (voice filtered events never activate buzzer)
        self.buzzer_state = bool(m1_alarm or m2_alarm)

        # Backward compatibility aliases
        self.green_state = self.m1_green_state and self.m2_green_state
        self.red_state = self.m1_red_state or self.m2_red_state

        if self.is_real:
            try:
                if self.m1_green_led:
                    self.m1_green_led.on() if self.m1_green_state else self.m1_green_led.off()
                if self.m1_red_led:
                    self.m1_red_led.on() if self.m1_red_state else self.m1_red_led.off()
                if self.m2_green_led:
                    self.m2_green_led.on() if self.m2_green_state else self.m2_green_led.off()
                if self.m2_red_led:
                    self.m2_red_led.on() if self.m2_red_state else self.m2_red_led.off()
                if self.buzzer:
                    self.buzzer.on() if self.buzzer_state else self.buzzer.off()
            except Exception as e:
                logger.warning(f"[GPIO] Error updating pin outputs: {e}")
        else:
            logger.debug(
                f"[MOCK GPIO] M1(Left)={'RED' if self.m1_red_state else 'GREEN'}, "
                f"M2(Right)={'RED' if self.m2_red_state else 'GREEN'}, "
                f"Buzzer={'ON' if self.buzzer_state else 'OFF'}"
            )

    def set_single_machine_state(
        self,
        mic_or_machine: str | int,
        is_abnormal: bool,
        is_alarm: bool,
        is_voice: bool = False,
        preserve_other: bool = False,
    ):
        """
        Update a single machine / mic while ensuring per-channel independence:
        - When testing mic 0: updates Machine 1 state; if preserve_other is False, ensures Machine 2 is nominal GREEN.
        - When testing mic 1: updates Machine 2 state; if preserve_other is False, ensures Machine 1 is nominal GREEN.
        - Buzzer sounds only when the active machine alarm debounces (voice rejected sounds never buzz).
        """
        is_m1 = str(mic_or_machine).lower().strip() in (
            "0", "mic 0", "mic_0", "mic0", "fan_id_00", "machine_1", "m1", "left", "ch0", "channel 0"
        )
        if is_m1:
            m2_abnormal = self.m2_red_state if preserve_other else False
            m2_alarm = (self.buzzer_state and self.m2_red_state) if preserve_other else False
            self.set_machine_states(
                m1_abnormal=is_abnormal,
                m1_alarm=is_alarm,
                m2_abnormal=m2_abnormal,
                m2_alarm=m2_alarm,
                m1_voice=is_voice,
                m2_voice=False,
            )
        else:
            m1_abnormal = self.m1_red_state if preserve_other else False
            m1_alarm = (self.buzzer_state and self.m1_red_state) if preserve_other else False
            self.set_machine_states(
                m1_abnormal=m1_abnormal,
                m1_alarm=m1_alarm,
                m2_abnormal=is_abnormal,
                m2_alarm=is_alarm,
                m1_voice=False,
                m2_voice=is_voice,
            )

    def set_state(self, is_abnormal: bool, is_voice: bool = False):
        """Backward-compatible single-machine state updater."""
        self.set_machine_states(
            m1_abnormal=is_abnormal,
            m1_alarm=is_abnormal,
            m2_abnormal=False,
            m2_alarm=False,
            m1_voice=is_voice,
            m2_voice=False,
        )

    def get_status(self) -> dict[str, Any]:
        """Return comprehensive hardware pin status for UI telemetry and API."""
        return {
            "platform": "Raspberry Pi 4 (Real GPIO)" if self.is_real else "Windows / Safe Fallback (Mock GPIO)",
            "is_real_gpio": self.is_real,
            "machine_1": {
                "id": "fan_id_00",
                "name": "Machine 1 (Left / Mic 0)",
                "indicator": "RED" if self.m1_red_state else "GREEN",
                "green_led": {
                    "bcm": self.m1_green_pin,
                    "physical_pin": 29,
                    "state": self.m1_green_state,
                    "label": "M1 Green (BCM 5 / Pin 29)",
                },
                "red_led": {
                    "bcm": self.m1_red_pin,
                    "physical_pin": 31,
                    "state": self.m1_red_state,
                    "label": "M1 Red (BCM 6 / Pin 31)",
                },
            },
            "machine_2": {
                "id": "pump_id_00",
                "name": "Machine 2 (Right / Mic 1)",
                "indicator": "RED" if self.m2_red_state else "GREEN",
                "green_led": {
                    "bcm": self.m2_green_pin,
                    "physical_pin": 11,
                    "state": self.m2_green_state,
                    "label": "M2 Green (BCM 17 / Pin 11)",
                },
                "red_led": {
                    "bcm": self.m2_red_pin,
                    "physical_pin": 13,
                    "state": self.m2_red_state,
                    "label": "M2 Red (BCM 27 / Pin 13)",
                },
            },
            "buzzer": {
                "bcm": self.buzzer_pin,
                "physical_pin": 15,
                "active_low": True,
                "state": self.buzzer_state,
                "label": "Active-Low Buzzer (BCM 22 / Pin 15)",
            },
            # Legacy compatibility fields
            "green_led": {
                "bcm": self.m1_green_pin,
                "physical_pin": 29,
                "state": self.m1_green_state and self.m2_green_state,
                "label": "Normal Status (BCM 5 / Pin 29)",
            },
            "red_led": {
                "bcm": self.m1_red_pin,
                "physical_pin": 31,
                "state": self.m1_red_state or self.m2_red_state,
                "label": "Anomaly Alert (BCM 6 / Pin 31)",
            },
            "i2s_microphones": {
                "model": "Dual INMP441 I2S Omnidirectional (Stereo)",
                "voltage": I2S_VOLTAGE_RAIL,
                "channels": {
                    "mic_0": "Channel 0 (Left) -> Machine 1 (fan_id_00)",
                    "mic_1": "Channel 1 (Right) -> Machine 2 (pump_id_00)",
                },
                "bclk_pin": {
                    "bcm": BCM_I2S_BCLK,
                    "physical_pin": 12,
                    "label": "Bit Clock (BCLK)",
                },
                "lrclk_pin": {
                    "bcm": BCM_I2S_LRCLK,
                    "physical_pin": 35,
                    "label": "Word Select / Left-Right (LRCLK/WS)",
                },
                "dout_pin": {
                    "bcm": BCM_I2S_DOUT,
                    "physical_pin": 38,
                    "label": "Serial Data Output (DOUT/SD)",
                },
                "status": "Ready (3.3V Stereo I2S Bus)",
            },
        }

    def cleanup(self):
        """Turn off actuators and release GPIO handles gracefully."""
        if self.is_real:
            try:
                for led in (self.m1_green_led, self.m1_red_led, self.m2_green_led, self.m2_red_led):
                    if led:
                        led.off()
                        led.close()
                if self.buzzer:
                    self.buzzer.off()
                    self.buzzer.close()
                logger.info("[GPIO] Closed all physical GPIO pins.")
            except Exception as e:
                logger.warning(f"[GPIO] Error during cleanup: {e}")


# Global default controller instance for the application
hardware = RPiHardwareController()

