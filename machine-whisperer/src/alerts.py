import time

try:
    from gpiozero import Buzzer, LED
    ON_PI = True
except (ImportError, Exception):
    ON_PI = False


class AlertController:
    """Controls per-machine LEDs and a shared active-low buzzer on Raspberry Pi (auto-mocks on Windows)."""

    def __init__(self, machine_pins: dict[str, int] | None = None, buzzer_pin: int = 22):
        # Default BCM pins: Machine 1 (fan_id_00) = BCM 6, Machine 2 (pump_id_00) = BCM 27
        # Active-low Buzzer = BCM 22 (Pin 15)
        self.machine_pins = machine_pins or {
            "fan_id_00": 6,
            "pump_id_00": 27,
            "motor_a": 6,
            "motor_b": 27,
        }
        self.buzzer_pin = buzzer_pin
        self.leds = {}
        self.buzzer = None

        if ON_PI:
            for name, pin in self.machine_pins.items():
                if pin not in [l.pin.number for l in self.leds.values()]:
                    self.leds[name] = LED(pin)
                else:
                    # Reuse existing LED object if two machine aliases share a pin
                    existing = next(l for l in self.leds.values() if l.pin.number == pin)
                    self.leds[name] = existing
            # Active-low buzzer: driving pin LOW sounds the buzzer
            self.buzzer = Buzzer(self.buzzer_pin, active_high=False)
            print(f"[GPIO] Initialized on Raspberry Pi (buzzer=GPIO {self.buzzer_pin}, active_high=False)")
        else:
            print("[GPIO] Running in Windows mock mode (no physical pins driven)")

    def set_alarm(self, machine: str, active: bool):
        """Turn a machine's alert LED on/off and beep the buzzer if active."""
        if ON_PI:
            led = self.leds.get(machine)
            if led:
                led.on() if active else led.off()
            if self.buzzer:
                if active:
                    self.buzzer.beep(on_time=0.2, off_time=0.2, n=2, background=True)
                else:
                    self.buzzer.off()
        else:
            state = "ON (LED + BUZZER)" if active else "OFF"
            pin = self.machine_pins.get(machine, "N/A")
            print(f"  [MOCK GPIO] {machine} (pin {pin}) -> {state}")

    def cleanup(self):
        if ON_PI:
            for led in set(self.leds.values()):
                led.off()
                led.close()
            if self.buzzer:
                self.buzzer.off()
                self.buzzer.close()


if __name__ == "__main__":
    ctrl = AlertController()
    ctrl.set_alarm("fan_id_00", True)
    time.sleep(0.5)
    ctrl.set_alarm("fan_id_00", False)
    ctrl.cleanup()