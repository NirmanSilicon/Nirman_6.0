/**
 * RootWhisper Multi-Node Precision AgriTech Platform
 * ============================================================================
 * Production Firmware for ESP32 DevKit V1 Physiological Monitoring Nodes
 * 
 * Target Specimen Nodes:
 * - TULSI_01       (Ocimum tenuiflorum)
 * - HIBISCUS_01    (Hibiscus rosa-sinensis)
 * - MONEYPLANT_01  (Epipremnum aureum)
 * 
 * Hardware Sensor Suite:
 * 1. Capacitive Soil Moisture Sensor v1.2  -> Analog Input (GPIO 36 / ADC1_CH0)
 * 2. Melexis MLX90614 Non-Contact IR      -> I2C 0x5A (SDA: GPIO 21, SCL: GPIO 22)
 * 3. Aosong AHT25 Temp & Humidity         -> I2C 0x38 (SDA: GPIO 21, SCL: GPIO 22)
 * 4. ROHM BH1750 Ambient Light Intensity  -> I2C 0x23 (SDA: GPIO 21, SCL: GPIO 22)
 * 
 * Protocol: HTTP POST application/json to /api/v1/telemetry
 * Frequency: 5-minute sampling interval (300 seconds)
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <ArduinoJson.h>

// ============================================================================
// NODE CONFIGURATION
// ============================================================================
// Select EXACT node identity for this physical unit:
// #define NODE_ID "TULSI_01"
// #define NODE_ID "HIBISCUS_01"
#define NODE_ID "TULSI_01"

#define FIRMWARE_VERSION "2.4.0-esp32"
#define SAMPLING_INTERVAL_MS 300000 // 5 minutes

// Wi-Fi Credentials (Configure for target agricultural network)
const char* WIFI_SSID     = "ROOTWHISPER_AGRI_WIFI";
const char* WIFI_PASSWORD = "BotanicalIntelligence2026";

// RootWhisper FastAPI Backend Endpoint
// Replace SERVER_HOST with your FastAPI host IP (e.g. 10.114.140.231 or DNS)
const char* SERVER_HOST   = "10.114.140.231";
const int   SERVER_PORT   = 8000;
const char* TELEMETRY_URL = "http://10.114.140.231:8000/api/v1/telemetry";

// Pinout Definitions (ESP32 DevKit V1)
#define PIN_SOIL_ADC       36 // GPIO 36 (ADC1_CHANNEL_0)
#define PIN_I2C_SDA        21 // Default I2C SDA
#define PIN_I2C_SCL        22 // Default I2C SCL
#define PIN_STATUS_LED      2 // Onboard Blue LED for telemetry heartbeat

// Sensor I2C Bus Addresses
#define I2C_ADDR_MLX90614  0x5A
#define I2C_ADDR_AHT25     0x38
#define I2C_ADDR_BH1750    0x23

// Soil Probe Voltage Thresholds (12-bit ADC: 0 - 4095)
#define SOIL_ADC_MIN_VALID  800  // Saturated water submerged bound
#define SOIL_ADC_MAX_VALID 3600  // Open air dry probe bound

// Timing State
unsigned long lastSampleTime = 0;
unsigned long bootTime = 0;

// ============================================================================
// I2C DIAGNOSTIC SCANNER
// ============================================================================
bool checkI2CDevice(uint8_t address) {
  Wire.beginTransmission(address);
  return (Wire.endTransmission() == 0);
}

// ============================================================================
// SENSOR DRIVERS (DIRECT REGISTER IMPLEMENTATION)
// ============================================================================

// 1. Melexis MLX90614 IR Thermometer (Object Temperature Register 0x07)
bool readMLX90614(float &leafTemp) {
  if (!checkI2CDevice(I2C_ADDR_MLX90614)) return false;

  Wire.beginTransmission(I2C_ADDR_MLX90614);
  Wire.write(0x07); // RAM Access: TOBJ1 (Target / Leaf Temperature)
  if (Wire.endTransmission(false) != 0) return false;

  Wire.requestFrom((uint8_t)I2C_ADDR_MLX90614, (uint8_t)3);
  if (Wire.available() < 3) return false;

  uint8_t lsb = Wire.read();
  uint8_t msb = Wire.read();
  uint8_t pec = Wire.read(); // CRC-8 PEC byte

  // Raw data to Kelvin: TempK = raw * 0.02
  uint16_t raw = (uint16_t)msb << 8 | lsb;
  float tempK = raw * 0.02;
  float tempC = tempK - 273.15;

  // Sanity range check (-10°C to 65°C for biological plant foliage)
  if (tempC < -10.0 || tempC > 65.0) return false;

  leafTemp = tempC;
  return true;
}

// 2. Aosong AHT25 Digital Humidity & Temperature Sensor
bool readAHT25(float &ambientTemp, float &ambientRh) {
  if (!checkI2CDevice(I2C_ADDR_AHT25)) return false;

  // Trigger measurement command: 0xAC, 0x33, 0x00
  Wire.beginTransmission(I2C_ADDR_AHT25);
  Wire.write(0xAC);
  Wire.write(0x33);
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) return false;

  delay(80); // Wait for conversion completion

  Wire.requestFrom((uint8_t)I2C_ADDR_AHT25, (uint8_t)6);
  if (Wire.available() < 6) return false;

  uint8_t state = Wire.read();
  if ((state & 0x80) != 0) return false; // Sensor busy

  uint32_t rawHumidity = ((uint32_t)Wire.read() << 12) | ((uint32_t)Wire.read() << 4);
  uint8_t byte3 = Wire.read();
  rawHumidity |= (byte3 >> 4);

  uint32_t rawTemp = (((uint32_t)byte3 & 0x0F) << 16) | ((uint32_t)Wire.read() << 8) | Wire.read();

  // Convert per AHT25 datasheet formulas:
  ambientRh = ((float)rawHumidity * 100.0) / 1048576.0;
  ambientTemp = (((float)rawTemp * 200.0) / 1048576.0) - 50.0;

  if (ambientRh < 0.0 || ambientRh > 100.0 || ambientTemp < -10.0 || ambientTemp > 65.0) return false;

  return true;
}

// 3. ROHM BH1750 Digital Light Sensor
bool readBH1750(float &lightLux) {
  if (!checkI2CDevice(I2C_ADDR_BH1750)) return false;

  // Continuous High-Resolution Mode (0x10)
  Wire.beginTransmission(I2C_ADDR_BH1750);
  Wire.write(0x10);
  if (Wire.endTransmission() != 0) return false;

  delay(120); // Measurement time (max 180ms)

  Wire.requestFrom((uint8_t)I2C_ADDR_BH1750, (uint8_t)2);
  if (Wire.available() < 2) return false;

  uint16_t raw = (Wire.read() << 8) | Wire.read();
  lightLux = raw / 1.2; // Convert to Lux per datasheet

  if (lightLux < 0.0) return false;
  return true;
}

// 4. Capacitive Soil Probe on ADC1_CH0
int readSoilMoistureADC() {
  analogReadResolution(12); // 12-bit ADC (0 - 4095)
  analogSetAttenuation(ADC_11db); // Full-scale voltage ~3.3V

  // Take 10 samples and compute median for signal stability
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(PIN_SOIL_ADC);
    delay(5);
  }
  return (int)(sum / 10);
}

// ============================================================================
// WI-FI CONNECTION MANAGER
// ============================================================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[WiFi] Connecting to SSID: %s...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected! IP: %s | RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("\n[WiFi] Connection timed out. Will retry on next sampling cycle.");
  }
}

// ============================================================================
// TELEMETRY SAMPLING & DISPATCH
// ============================================================================
void sampleAndTransmitTelemetry() {
  digitalWrite(PIN_STATUS_LED, HIGH);

  float leafTemp = 0.0;
  float ambientTemp = 0.0;
  float ambientRh = 0.0;
  float lightLux = 0.0;

  bool mlxOk   = readMLX90614(leafTemp);
  bool ahtOk   = readAHT25(ambientTemp, ambientRh);
  bool bh1750Ok = readBH1750(lightLux);
  int soilRaw   = readSoilMoistureADC();
  bool soilOk   = (soilRaw >= SOIL_ADC_MIN_VALID && soilRaw <= SOIL_ADC_MAX_VALID);

  int wifiRssi = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : -99;
  unsigned long uptimeSec = (millis() - bootTime) / 1000;

  // Build JSON Document
  StaticJsonDocument<768> doc;
  doc["device_id"] = NODE_ID;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["is_simulated"] = false;

  JsonObject readings = doc.createNestedObject("readings");
  readings["soil_moisture_raw"] = soilRaw;
  readings["leaf_temp_c"] = mlxOk ? round(leafTemp * 10.0) / 10.0 : -99.0;
  readings["ambient_temp_c"] = ahtOk ? round(ambientTemp * 10.0) / 10.0 : -99.0;
  readings["ambient_humidity_pct"] = ahtOk ? round(ambientRh * 10.0) / 10.0 : -99.0;
  readings["light_lux"] = bh1750Ok ? round(lightLux) : -99.0;

  JsonObject diagnostics = doc.createNestedObject("diagnostics");
  diagnostics["wifi_rssi"] = wifiRssi;
  diagnostics["mlx_connected"] = mlxOk;
  diagnostics["aht_connected"] = ahtOk;
  diagnostics["bh1750_connected"] = bh1750Ok;
  diagnostics["soil_sensor_valid"] = soilOk;
  diagnostics["uptime_seconds"] = uptimeSec;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.println("\n[Telemetry] Outgoing Payload:");
  Serial.println(jsonPayload);

  // Dispatch HTTP POST if Wi-Fi connected
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(TELEMETRY_URL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(8000);

    int httpCode = http.POST(jsonPayload);
    if (httpCode > 0) {
      String response = http.getString();
      Serial.printf("[HTTP] Ingestion response (%d): %s\n", httpCode, response.c_str());
    } else {
      Serial.printf("[HTTP] POST error: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  } else {
    Serial.println("[HTTP] Wi-Fi offline. Ingestion packet deferred.");
  }

  digitalWrite(PIN_STATUS_LED, LOW);
}

// ============================================================================
// ARDUINO SETUP & MAIN LOOP
// ============================================================================
void setup() {
  Serial.begin(115200);
  pinMode(PIN_STATUS_LED, OUTPUT);
  bootTime = millis();

  Serial.println("\n========================================================");
  Serial.printf(" ROOTWHISPER NODE INITIALIZATION: %s\n", NODE_ID);
  Serial.printf(" Firmware Version: %s\n", FIRMWARE_VERSION);
  Serial.println("========================================================");

  // Initialize I2C Bus
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL, 100000); // 100 kHz standard mode

  // Sensor diagnostics scan
  Serial.println("[I2C Scan] Checking connected sensors...");
  Serial.printf(" - MLX90614 (0x5A): %s\n", checkI2CDevice(I2C_ADDR_MLX90614) ? "FOUND (Leaf IR)" : "NOT FOUND");
  Serial.printf(" - AHT25    (0x38): %s\n", checkI2CDevice(I2C_ADDR_AHT25) ? "FOUND (Ambient)" : "NOT FOUND");
  Serial.printf(" - BH1750   (0x23): %s\n", checkI2CDevice(I2C_ADDR_BH1750) ? "FOUND (Light)" : "NOT FOUND");

  // Initial Wi-Fi connection
  connectWiFi();

  // First sample immediately on startup
  sampleAndTransmitTelemetry();
  lastSampleTime = millis();
}

void loop() {
  unsigned long now = millis();

  // Periodically re-check Wi-Fi connection
  if (WiFi.status() != WL_CONNECTED && (now - lastSampleTime > 15000)) {
    connectWiFi();
  }

  // Periodic sampling interval (every 5 minutes)
  if (now - lastSampleTime >= SAMPLING_INTERVAL_MS) {
    lastSampleTime = now;
    sampleAndTransmitTelemetry();
  }

  delay(100);
}

