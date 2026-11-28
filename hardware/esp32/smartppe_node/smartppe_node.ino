/*
 * ============================================================================
 * SmartPPE — Warden's Eye: Production-Grade Non-Blocking ESP32 IoT Firmware
 * (`hardware/esp32/smartppe_node/smartppe_node.ino`)
 *
 * Capabilities:
 * 1. 13.56 MHz MFRC522 RFID Reader over 3.3V Hardware VSPI (GPIO 5, 18, 19, 22, 23)
 *    with 50 ms non-blocking polling and 4-second local same-UID debounce.
 * 2. Supplementary Smoke (GPIO 34 / ADC1_CH6) and Flame (GPIO 35 / ADC1_CH7)
 *    5-sample moving-average analog sampling every 500 ms with 20s smoke heater warm-up.
 * 3. Periodic Device Heartbeat (`POST /api/devices/heartbeat`) every 30 seconds.
 * 4. Offline RAM Circular Ring Buffer (20 events) that preserves RFID scans and
 *    hazard alerts when Wi-Fi or the backend is temporarily unreachable and
 *    automatically flushes queued events in FIFO order upon reconnection.
 * ============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include "config.example.h"

MFRC522 mfrc522(PIN_RC522_SS, PIN_RC522_RST);

enum QueuedEventType {
  EVT_RFID_SCAN = 1,
  EVT_SENSOR_ALERT = 2
};

struct OfflineBufferedEvent {
  QueuedEventType type;
  char rfidUid[24];
  char sensorType[12];
  int sensorValue;
  int threshold;
  char alertStatus[12];
  unsigned long ageMs;
};

OfflineBufferedEvent ringBuffer[OFFLINE_RING_BUFFER_CAPACITY];
int bufferHead = 0;
int bufferTail = 0;
int bufferCount = 0;

unsigned long bootTimestampMs = 0;
unsigned long lastRfidPollMs = 0;
unsigned long lastSensorSampleMs = 0;
unsigned long lastHeartbeatMs = 0;
unsigned long lastFlushAttemptMs = 0;

String lastScannedUid = "";
unsigned long lastScannedUidMs = 0;
unsigned long lastSmokeAlertMs = 0;
unsigned long lastFlameAlertMs = 0;

int smokeSamples[5] = {0, 0, 0, 0, 0};
int flameSamples[5] = {0, 0, 0, 0, 0};
int sampleIndex = 0;

void enqueueOfflineEvent(const OfflineBufferedEvent &evt) {
  if (bufferCount >= OFFLINE_RING_BUFFER_CAPACITY) {
    // Drop oldest entry to preserve latest safety event
    bufferHead = (bufferHead + 1) % OFFLINE_RING_BUFFER_CAPACITY;
    bufferCount--;
  }
  ringBuffer[bufferTail] = evt;
  bufferTail = (bufferTail + 1) % OFFLINE_RING_BUFFER_CAPACITY;
  bufferCount++;
  Serial.printf("[OfflineBuffer] Event queued (count=%d/%d)\n", bufferCount, OFFLINE_RING_BUFFER_CAPACITY);
}

bool sendAuthenticatedPost(const String &endpointPath, const String &jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }
  HTTPClient http;
  String url = String(API_BASE_URL) + endpointPath;
  http.begin(url);
  http.setTimeout(3500);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Code", DEVICE_CODE);
  http.addHeader("X-Device-Key", DEVICE_API_KEY);

  int statusCode = http.POST(jsonPayload);
  http.end();
  return (statusCode >= 200 && statusCode < 300) || statusCode == 409;
}

void transmitOrBufferRfidScan(const String &uidHex) {
  String payload = String("{\"deviceCode\":\"") + DEVICE_CODE +
                   "\",\"rfidUid\":\"" + uidHex +
                   "\",\"firmwareVersion\":\"" + FIRMWARE_VERSION + "\"}";
  if (sendAuthenticatedPost("/rfid/scan", payload)) {
    Serial.printf("[RFID] Scan transmitted: %s\n", uidHex.c_str());
    return;
  }
  OfflineBufferedEvent evt;
  evt.type = EVT_RFID_SCAN;
  strncpy(evt.rfidUid, uidHex.c_str(), sizeof(evt.rfidUid) - 1);
  evt.rfidUid[sizeof(evt.rfidUid) - 1] = '\0';
  evt.ageMs = millis();
  enqueueOfflineEvent(evt);
}

void transmitOrBufferSensorAlert(const char *sensorType, int value, int threshold, const char *alertStatus) {
  String payload = String("{\"deviceCode\":\"") + DEVICE_CODE +
                   "\",\"sensorType\":\"" + sensorType +
                   "\",\"sensorValue\":" + String(value) +
                   ",\"threshold\":" + String(threshold) +
                   ",\"alertStatus\":\"" + alertStatus +
                   "\",\"firmwareVersion\":\"" + FIRMWARE_VERSION + "\"}";
  if (sendAuthenticatedPost("/sensors/events", payload)) {
    Serial.printf("[Sensor] %s (%s=%d) transmitted\n", sensorType, alertStatus, value);
    return;
  }
  OfflineBufferedEvent evt;
  evt.type = EVT_SENSOR_ALERT;
  strncpy(evt.sensorType, sensorType, sizeof(evt.sensorType) - 1);
  evt.sensorType[sizeof(evt.sensorType) - 1] = '\0';
  evt.sensorValue = value;
  evt.threshold = threshold;
  strncpy(evt.alertStatus, alertStatus, sizeof(evt.alertStatus) - 1);
  evt.alertStatus[sizeof(evt.alertStatus) - 1] = '\0';
  evt.ageMs = millis();
  enqueueOfflineEvent(evt);
}

void flushOfflineRingBuffer() {
  if (bufferCount == 0 || WiFi.status() != WL_CONNECTED) {
    return;
  }
  OfflineBufferedEvent &front = ringBuffer[bufferHead];
  bool ok = false;
  if (front.type == EVT_RFID_SCAN) {
    String payload = String("{\"deviceCode\":\"") + DEVICE_CODE +
                     "\",\"rfidUid\":\"" + front.rfidUid +
                     "\",\"firmwareVersion\":\"" + FIRMWARE_VERSION + "\"}";
    ok = sendAuthenticatedPost("/rfid/scan", payload);
  } else if (front.type == EVT_SENSOR_ALERT) {
    String payload = String("{\"deviceCode\":\"") + DEVICE_CODE +
                     "\",\"sensorType\":\"" + front.sensorType +
                     "\",\"sensorValue\":" + String(front.sensorValue) +
                     ",\"threshold\":" + String(front.threshold) +
                     ",\"alertStatus\":\"" + front.alertStatus +
                     "\",\"firmwareVersion\":\"" + FIRMWARE_VERSION + "\"}";
    ok = sendAuthenticatedPost("/sensors/events", payload);
  }

  if (ok) {
    bufferHead = (bufferHead + 1) % OFFLINE_RING_BUFFER_CAPACITY;
    bufferCount--;
    Serial.printf("[OfflineBuffer] Flushed 1 buffered event (remaining=%d)\n", bufferCount);
  }
}

void pollRfidReader(unsigned long nowMs) {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  String uidHex = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uidHex += "0";
    uidHex += String(mfrc522.uid.uidByte[i], HEX);
  }
  uidHex.toUpperCase();

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();

  if (uidHex == lastScannedUid && (nowMs - lastScannedUidMs) < LOCAL_RFID_DEBOUNCE_MS) {
    return;
  }
  lastScannedUid = uidHex;
  lastScannedUidMs = nowMs;

  transmitOrBufferRfidScan(uidHex);
}

void sampleSupplementarySensors(unsigned long nowMs) {
  smokeSamples[sampleIndex] = analogRead(PIN_SMOKE_AO);
  flameSamples[sampleIndex] = analogRead(PIN_FLAME_AO);
  sampleIndex = (sampleIndex + 1) % 5;

  int smokeAvg = 0;
  int flameAvg = 0;
  for (int i = 0; i < 5; i++) {
    smokeAvg += smokeSamples[i];
    flameAvg += flameSamples[i];
  }
  smokeAvg /= 5;
  flameAvg /= 5;

  // Supplementary Smoke Sensor (ignore initial 20s heater warm-up)
  if ((nowMs - bootTimestampMs) >= SMOKE_WARMUP_MS) {
    if (smokeAvg >= SMOKE_CRITICAL_THRESHOLD && (nowMs - lastSmokeAlertMs) >= LOCAL_SENSOR_COOLDOWN_MS) {
      lastSmokeAlertMs = nowMs;
      transmitOrBufferSensorAlert("SMOKE", smokeAvg, SMOKE_CRITICAL_THRESHOLD, "CRITICAL");
    } else if (smokeAvg >= SMOKE_WARNING_THRESHOLD && (nowMs - lastSmokeAlertMs) >= LOCAL_SENSOR_COOLDOWN_MS) {
      lastSmokeAlertMs = nowMs;
      transmitOrBufferSensorAlert("SMOKE", smokeAvg, SMOKE_WARNING_THRESHOLD, "WARNING");
    }
  }

  // Supplementary Flame Sensor
  if (flameAvg >= FLAME_CRITICAL_THRESHOLD && (nowMs - lastFlameAlertMs) >= LOCAL_SENSOR_COOLDOWN_MS) {
    lastFlameAlertMs = nowMs;
    transmitOrBufferSensorAlert("FLAME", flameAvg, FLAME_CRITICAL_THRESHOLD, "CRITICAL");
  }
}

void sendDeviceHeartbeat() {
  String payload = String("{\"deviceCode\":\"") + DEVICE_CODE +
                   "\",\"status\":\"ONLINE\",\"firmwareVersion\":\"" + FIRMWARE_VERSION + "\"}";
  if (sendAuthenticatedPost("/devices/heartbeat", payload)) {
    Serial.println("[Heartbeat] ONLINE heartbeat sent.");
  }
}

void setup() {
  Serial.begin(115200);
  bootTimestampMs = millis();

  pinMode(PIN_SMOKE_AO, INPUT);
  pinMode(PIN_FLAME_AO, INPUT);

  // Initialize Verified 3.3V VSPI for MFRC522 (SCK=18, MISO=19, MOSI=23, SS=5)
  SPI.begin(PIN_SPI_SCK, PIN_SPI_MISO, PIN_SPI_MOSI, PIN_RC522_SS);
  mfrc522.PCD_Init();
  Serial.println("[SmartPPE] MFRC522 initialized on 3.3V SPI (GPIO 5, 18, 19, 22, 23).");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("[WiFi] Connecting to %s...\n", WIFI_SSID);
}

void loop() {
  unsigned long nowMs = millis();

  // Loop 1 (Every 50 ms): Non-blocking RC522 RFID Poll
  if ((nowMs - lastRfidPollMs) >= RFID_POLL_INTERVAL_MS) {
    lastRfidPollMs = nowMs;
    pollRfidReader(nowMs);
  }

  // Loop 2 (Every 500 ms): Non-blocking Supplementary Smoke & Flame ADC1 Sampler
  if ((nowMs - lastSensorSampleMs) >= SENSOR_SAMPLE_INTERVAL_MS) {
    lastSensorSampleMs = nowMs;
    sampleSupplementarySensors(nowMs);
  }

  // Loop 3 (Every 30,000 ms): Device Heartbeat
  if ((nowMs - lastHeartbeatMs) >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMs = nowMs;
    sendDeviceHeartbeat();
  }

  // Loop 4 (Every 2,000 ms): Offline Ring Buffer Flush & Wi-Fi Reconnection Check
  if ((nowMs - lastFlushAttemptMs) >= 2000UL) {
    lastFlushAttemptMs = nowMs;
    if (WiFi.status() == WL_CONNECTED) {
      flushOfflineRingBuffer();
    }
  }
}
