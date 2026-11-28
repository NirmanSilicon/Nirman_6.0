# VIBRAFORCE – Cost-Aware IoT Solar Panel Tracker

A single-axis solar tracker built from low-cost parts, with a live monitoring website. Two light sensors tell an ESP32 where the light is strongest, a servo turns the solar panel toward it, and the readings appear on an OLED display and on this web dashboard.

## What the website shows

| Reading | Source | Blynk pin |
|---|---|---|
| Left light (raw ADC) | LDR on GPIO34 | V0 |
| Right light (raw ADC) | LDR on GPIO35 | V1 |
| Servo angle (degrees) | SG90 servo on GPIO18 | V2 |
| Panel voltage (V) | Voltage sensor on GPIO32 | V3 |
| Tracking status | ESP32 tracking logic | V4 |

The page also has an animated view of the panel turning toward the sun, live charts for voltage, left vs right light and servo angle, a system table and an About section.

LDR values are raw ADC readings (0–4095), not lux.

## How it works

1. **Sense:** two LDRs measure light on the left and right of the panel.
2. **Decide:** the ESP32 compares the two readings and moves only when the gap is large enough.
3. **Move:** the SG90 servo turns the panel toward the brighter side.
4. **Report:** readings are sent to the OLED and to Blynk, and the website reads them from Blynk every second.

```
ESP32  →  Blynk cloud  →  index.html (website)
```

## Hardware

- ESP32 DevKit (ESP32-WROOM-32), powered over USB
- 6 V solar panel
- SG90 servo motor
- 2 × LDR with 2 × 10 kΩ resistors
- Voltage sensor module
- SSD1306 OLED display (128×64, I²C)

## Setup

1. Make sure your Blynk datastreams V0–V4 exist and the ESP32 is online and sending data.
2. Open `index.html` and set your Blynk auth token near the top of the script:
   ```js
   const BLYNK_TOKEN = "YOUR_AUTH_TOKEN";
   ```
3. Open the file in a browser, or host it (GitHub Pages or Netlify).
4. The badge at the top reads **Live from ESP32** when the connection works. If the token is empty or Blynk can't be reached, the page shows simulated **Demo data** instead.

## Notes and limits

- The auth token is visible in the page source. Regenerate it in Blynk Console if you share the page publicly.
- The page shows panel voltage, light levels and servo position only. It does not measure current, power, temperature or the servo's own energy use, so it makes no efficiency or net-energy-saving claims.

## Team

Team Leader - Dharmendra Das
Team Member 1 - Pooja Pratyusha
Team Member 2 - Ipsita Das
Team Member 3 - Tanmay Kumar Pradhan
Team Member 4 - Arnab Kumar Mishra
