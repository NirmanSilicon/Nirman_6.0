/*
 * ============================================================================
 * SmartPPE — Warden's Eye: ESP32 Node Configuration Template (`config.example.h`)
 * Copy to `config.h` before flashing in Arduino IDE / PlatformIO.
 * NEVER commit real Wi-Fi passwords or X-Device-Key secrets to Git.
 * ============================================================================
 */

#ifndef SMARTPPE_ESP32_CONFIG_H
#define SMARTPPE_ESP32_CONFIG_H

// --- 1. Wi-Fi & Local Backend Configuration ---
#define WIFI_SSID             "REPLACE_WITH_2_4GHZ_WIFI_OR_HOTSPOT_SSID"
#define WIFI_PASSWORD         "REPLACE_WITH_WIFI_PASSWORD"
#define API_BASE_URL          "http://192.168.1.100:5000/api"

// --- 2. Registered ESP32 Device Identity & One-Time X-Device-Key ---
#define DEVICE_CODE           "ESP32_001"
#define DEVICE_API_KEY        "REPLACE_WITH_ONE_TIME_X_DEVICE_KEY_FROM_ADMIN_PORTAL"
#define FIRMWARE_VERSION      "1.0.0"

// --- 3. Verified MFRC522 (13.56 MHz RFID) 3.3V SPI Pinout ---
// WARNING: Connect RC522 VCC strictly to ESP32 3V3 (NEVER 5V!).
#define PIN_RC522_RST         22
#define PIN_RC522_SS          5
#define PIN_SPI_SCK           18
#define PIN_SPI_MISO          19
#define PIN_SPI_MOSI          23

// --- 4. Supplementary Prototype Smoke & Flame Sensor ADC1 Pins ---
// WARNING: Must use ADC1 pins (GPIO 32-39) when Wi-Fi is active on ESP32.
// Ensure analog outputs are stepped down to <= 3.3V before ESP32 GPIO pins.
#define PIN_SMOKE_AO          34
#define PIN_FLAME_AO          35

// --- 5. Thresholds & Non-Blocking Scheduler Intervals (Milliseconds) ---
#define SMOKE_WARNING_THRESHOLD   1800
#define SMOKE_CRITICAL_THRESHOLD  2600
#define FLAME_CRITICAL_THRESHOLD  1500

#define RFID_POLL_INTERVAL_MS         50UL
#define SENSOR_SAMPLE_INTERVAL_MS     500UL
#define HEARTBEAT_INTERVAL_MS         30000UL
#define SMOKE_WARMUP_MS               20000UL
#define LOCAL_RFID_DEBOUNCE_MS        4000UL
#define LOCAL_SENSOR_COOLDOWN_MS      10000UL
#define OFFLINE_RING_BUFFER_CAPACITY  20

#endif
