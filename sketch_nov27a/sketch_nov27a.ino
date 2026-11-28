
#include <Wire.h>
#include <Adafruit_BMP280.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_INA219.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <math.h>
#include "caelis_edge_model.h"

// =====================================================
// CAELIS | AXYRA
// Spacecraft-inspired telemetry simulation testbed
// ESP32 DevKit V1
// =====================================================

// ---------------- PIN CONFIGURATION -------------------
#define PIN_SDA     21
#define PIN_SCL     22
#define PIN_DS18B20 4

// ---------------- SENSOR OBJECTS ---------------------
Adafruit_BMP280 bmp;
Adafruit_MPU6050 mpu;
Adafruit_INA219 ina219;

OneWire oneWire(PIN_DS18B20);
DallasTemperature ds18b20(&oneWire);

// Advisory edge model only. It emits telemetry; it never changes hardware state.
caelis_edge::EdgeModelBank rawEdgeModel;
caelis_edge::EdgeModelBank simulatedEdgeModel;

// ---------------- SENSOR STATUS ---------------------
bool bmpReady = false;
bool mpuReady = false;
bool inaReady = false;
bool dsReady  = false;

// ---------------- SCENARIO ENUM --------------------
enum Scenario {
  NOMINAL,
  ECLIPSE,
  ATTITUDE,
  VIBRATION,
  THERMAL,
  POWER,
  SENSOR_FAULT,
  COMBINED
};

Scenario scenario = NOMINAL;

// ---------------- SCENARIO NAME -------------------
const char* getScenarioName() {
  switch (scenario) {
    case NOMINAL:      return "NOMINAL";
    case ECLIPSE:      return "ECLIPSE";
    case ATTITUDE:     return "ATTITUDE";
    case VIBRATION:    return "VIBRATION";
    case THERMAL:      return "THERMAL";
    case POWER:         return "POWER";
    case SENSOR_FAULT: return "SENSOR_FAULT";
    case COMBINED:     return "COMBINED";
  }
  return "UNKNOWN";
}

// ---------------- COMMAND HANDLER -------------------
void readCommand() {
  while (Serial.available()) {
    char c = Serial.read();

    switch (c) {
      case 'N':
      case 'n':
        scenario = NOMINAL;
        break;

      case 'E':
      case 'e':
        scenario = ECLIPSE;
        break;

      case 'M':
      case 'm':
        scenario = ATTITUDE;
        break;

      case 'V':
      case 'v':
        scenario = VIBRATION;
        break;

      case 'T':
      case 't':
        scenario = THERMAL;
        break;

      case 'P':
      case 'p':
        scenario = POWER;
        break;

      case 'F':
      case 'f':
        scenario = SENSOR_FAULT;
        break;

      case 'A':
      case 'a':
        scenario = COMBINED;
        break;

      case 'R':
      case 'r':
        rawEdgeModel.reset();
        simulatedEdgeModel.reset();
        Serial.println("# EDGE BASELINE RESET");
        break;
    }
  }
}

// ---------------- JSON FLOAT OUTPUT -----------------
void printJSONFloat(float value) {
  if (isnan(value) || isinf(value)) {
    Serial.print("null");
  } else {
    Serial.print(value, 4);
  }
}

void printEdgeResult(const caelis_edge::EdgeResult& result) {
  Serial.print("{\"ready\":");
  Serial.print(result.ready ? "true" : "false");
  Serial.print(",\"score\":");
  if (result.ready) printJSONFloat(result.probability); else Serial.print("null");
  Serial.print(",\"status\":\"");
  Serial.print(caelis_edge::statusName(result.status));
  Serial.print("\"}");
}

void printEdgeBank(const caelis_edge::EdgeBankResult& report) {
  Serial.print("{\"model\":\"CAELIS_EDGE_TREE_V1\"");
  Serial.print(",\"advisory_only\":true");
  Serial.print(",\"overall_status\":\"");
  Serial.print(caelis_edge::statusName(report.overall));
  Serial.print("\",\"channels\":{");
  Serial.print("\"thermal\":"); printEdgeResult(report.thermal);
  Serial.print(",\"power\":"); printEdgeResult(report.power);
  Serial.print(",\"current\":"); printEdgeResult(report.current);
  Serial.print(",\"rotation\":"); printEdgeResult(report.rotation);
  Serial.print(",\"vibration\":"); printEdgeResult(report.vibration);
  Serial.print("}}");
}

// ---------------- INITIALIZATION -------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(100000);
  Wire.setTimeOut(100);

  // BMP280
  bmpReady = bmp.begin(0x76);
  if (!bmpReady) {
    bmpReady = bmp.begin(0x77);
  }

  // MPU6050
  mpuReady = mpu.begin(0x68);
  if (!mpuReady) {
    mpuReady = mpu.begin(0x69);
  }

  if (mpuReady) {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  }

  // INA219
  inaReady = ina219.begin();

  // DS18B20
  ds18b20.begin();
  dsReady = ds18b20.getDeviceCount() > 0;

  Serial.println("# CAELIS AXYRA");
  Serial.println("# SPACE TELEMETRY TESTBED");
  Serial.println("# EDGE AI: CAELIS_EDGE_TREE_V1 READY (ADVISORY ONLY)");
  Serial.println("# EDGE AI: 20 baseline + 12 rolling samples before scoring");
  Serial.println("# COMMANDS:");
  Serial.println("# N = NOMINAL");
  Serial.println("# E = ECLIPSE");
  Serial.println("# M = ATTITUDE");
  Serial.println("# V = VIBRATION");
  Serial.println("# T = THERMAL");
  Serial.println("# P = POWER");
  Serial.println("# F = SENSOR_FAULT");
  Serial.println("# A = COMBINED");
  Serial.println("# R = RESET EDGE BASELINE");
}

// ---------------- MAIN LOOP -------------------------
void loop() {

  readCommand();

  unsigned long timestamp = millis();

  // =================================================
  // 1. ACQUIRE REAL SENSOR DATA
  // =================================================

  float bmpTempRaw = NAN;
  float pressureRaw = NAN;

  if (bmpReady) {
    bmpTempRaw = bmp.readTemperature();
    pressureRaw = bmp.readPressure() / 100.0F;
  }

  float axRaw = NAN;
  float ayRaw = NAN;
  float azRaw = NAN;

  float gxRaw = NAN;
  float gyRaw = NAN;
  float gzRaw = NAN;

  if (mpuReady) {
    sensors_event_t a, g, t;
    mpu.getEvent(&a, &g, &t);

    axRaw = a.acceleration.x;
    ayRaw = a.acceleration.y;
    azRaw = a.acceleration.z;

    gxRaw = g.gyro.x;
    gyRaw = g.gyro.y;
    gzRaw = g.gyro.z;
  }

  float voltageRaw = NAN;
  float currentRaw = NAN;
  float powerRaw = NAN;

  if (inaReady) {
    voltageRaw = ina219.getBusVoltage_V();
    currentRaw = ina219.getCurrent_mA();
    powerRaw = voltageRaw * currentRaw;
  }

  float probeTempRaw = NAN;

  if (dsReady) {
    ds18b20.requestTemperatures();

    float temp = ds18b20.getTempCByIndex(0);

    if (temp != DEVICE_DISCONNECTED_C &&
        temp > -55.0 &&
        temp < 125.0) {
      probeTempRaw = temp;
    }
  }

  // =================================================
  // 2. CREATE SIMULATED TELEMETRY COPY
  // =================================================

  float tempSim = bmpTempRaw;
  float pressureSim = pressureRaw;

  float axSim = axRaw;
  float aySim = ayRaw;
  float azSim = azRaw;

  float gxSim = gxRaw;
  float gySim = gyRaw;
  float gzSim = gzRaw;

  float voltageSim = voltageRaw;
  float currentSim = currentRaw;
  float powerSim = powerRaw;

  float probeTempSim = probeTempRaw;

  // =================================================
  // 3. MISSION-INSPIRED SCENARIO SIMULATION
  // =================================================

  float timeSec = timestamp / 1000.0;

  // Slowly varying thermal pattern
  float thermalWave =
    8.0 * sin(timeSec / 20.0);

  // Simulated vibration pattern
  float vibX =
    3.0 * sin(timeSec * 8.0);

  float vibY =
    2.5 * sin(timeSec * 11.0);

  float vibZ =
    2.0 * cos(timeSec * 9.0);

  // Attitude manoeuvre proxy
  float attitudeWave =
    1.5 * sin(timeSec / 3.0);

  switch (scenario) {

    case NOMINAL:
      break;

    // -----------------------------------------------
    // ECLIPSE: simulated power-generation condition
    // -----------------------------------------------
    case ECLIPSE:

      if (!isnan(voltageSim))
        voltageSim -= 0.8;

      if (!isnan(currentSim))
        currentSim *= 0.95;

      if (!isnan(voltageSim) && !isnan(currentSim))
        powerSim = voltageSim * currentSim;

      break;

    // -----------------------------------------------
    // ATTITUDE: simulated motion / rotational event
    // -----------------------------------------------
    case ATTITUDE:

      if (!isnan(axSim))
        axSim += attitudeWave;

      if (!isnan(aySim))
        aySim += 0.8 * cos(timeSec / 3.0);

      if (!isnan(gzSim))
        gzSim += 1.0 * sin(timeSec / 2.0);

      break;

    // -----------------------------------------------
    // VIBRATION
    // -----------------------------------------------
    case VIBRATION:

      if (!isnan(axSim))
        axSim += vibX;

      if (!isnan(aySim))
        aySim += vibY;

      if (!isnan(azSim))
        azSim += vibZ;

      break;

    // -----------------------------------------------
    // THERMAL EVENT
    // -----------------------------------------------
    case THERMAL:

      if (!isnan(tempSim))
        tempSim += thermalWave + 10.0;

      if (!isnan(probeTempSim))
        probeTempSim += thermalWave + 12.0;

      break;

    // -----------------------------------------------
    // POWER DEVIATION
    // -----------------------------------------------
    case POWER:

      if (!isnan(voltageSim))
        voltageSim -= 1.2;

      if (!isnan(currentSim))
        currentSim += 120.0;

      if (!isnan(voltageSim) && !isnan(currentSim))
        powerSim = voltageSim * currentSim;

      break;

    // -----------------------------------------------
    // SENSOR DEGRADATION
    // Simulated pressure-channel drift
    // -----------------------------------------------
    case SENSOR_FAULT:

      if (!isnan(pressureSim))
        pressureSim += timeSec * 0.03;

      break;

    // -----------------------------------------------
    // COMBINED
    // -----------------------------------------------
    case COMBINED:

      if (!isnan(tempSim))
        tempSim += thermalWave + 10.0;

      if (!isnan(probeTempSim))
        probeTempSim += thermalWave + 12.0;

      if (!isnan(axSim))
        axSim += vibX;

      if (!isnan(aySim))
        aySim += vibY;

      if (!isnan(azSim))
        azSim += vibZ;

      if (!isnan(voltageSim))
        voltageSim -= 1.2;

      if (!isnan(currentSim))
        currentSim += 120.0;

      if (!isnan(voltageSim) && !isnan(currentSim))
        powerSim = voltageSim * currentSim;

      if (!isnan(pressureSim))
        pressureSim += timeSec * 0.03;

      break;
  }

  // =================================================
  // 4. LOCAL CAELIS EDGE MODEL (ADVISORY ONLY)
  // The model uses rolling normalized windows; it does not command hardware.
  // =================================================
  const float gyroRawMagnitude = (!isnan(gxRaw) && !isnan(gyRaw) && !isnan(gzRaw))
    ? sqrtf(gxRaw * gxRaw + gyRaw * gyRaw + gzRaw * gzRaw) : NAN;
  const float accelRawMagnitude = (!isnan(axRaw) && !isnan(ayRaw) && !isnan(azRaw))
    ? sqrtf(axRaw * axRaw + ayRaw * ayRaw + azRaw * azRaw) : NAN;
  const float gyroSimMagnitude = (!isnan(gxSim) && !isnan(gySim) && !isnan(gzSim))
    ? sqrtf(gxSim * gxSim + gySim * gySim + gzSim * gzSim) : NAN;
  const float accelSimMagnitude = (!isnan(axSim) && !isnan(aySim) && !isnan(azSim))
    ? sqrtf(axSim * axSim + aySim * aySim + azSim * azSim) : NAN;
  // Prefer the battery probe; use the healthy BMP280 as a lab thermal fallback.
  const float rawThermalInput = dsReady ? probeTempRaw : bmpTempRaw;
  const bool rawThermalValid = dsReady ? !isnan(probeTempRaw) : (bmpReady && !isnan(bmpTempRaw));
  const float simulatedThermalInput = !isnan(probeTempSim) ? probeTempSim : tempSim;
  const bool simulatedThermalValid = !isnan(simulatedThermalInput);

  const caelis_edge::EdgeBankResult rawEdgeReport = rawEdgeModel.update(
    rawThermalInput, rawThermalValid, voltageRaw, inaReady, currentRaw, inaReady,
    gyroRawMagnitude, mpuReady, accelRawMagnitude, mpuReady
  );
  const caelis_edge::EdgeBankResult simulatedEdgeReport = simulatedEdgeModel.update(
    simulatedThermalInput, simulatedThermalValid, voltageSim, !isnan(voltageSim), currentSim, !isnan(currentSim),
    gyroSimMagnitude, !isnan(gyroSimMagnitude), accelSimMagnitude, !isnan(accelSimMagnitude)
  );

  // =================================================
  // 4. ANOMALY LABEL
  // =================================================

  int anomaly =
    (scenario == NOMINAL) ? 0 : 1;

  // =================================================
  // 5. JSON TELEMETRY OUTPUT
  // =================================================

  Serial.print("{");

  Serial.print("\"timestamp_ms\":");
  Serial.print(timestamp);

  Serial.print(",\"scenario\":\"");
  Serial.print(getScenarioName());
  Serial.print("\"");

  Serial.print(",\"anomaly\":");
  Serial.print(anomaly);

  Serial.print(",\"edge_ai\":{\"raw\":");
  printEdgeBank(rawEdgeReport);
  Serial.print(",\"simulated\":");
  printEdgeBank(simulatedEdgeReport);
  Serial.print("}");

  // ---------------- SENSOR HEALTH -------------------

  Serial.print(",\"sensor_health\":{");

  Serial.print("\"bmp280\":");
  Serial.print(bmpReady ? "true" : "false");

  Serial.print(",\"mpu6050\":");
  Serial.print(mpuReady ? "true" : "false");

  Serial.print(",\"ina219\":");
  Serial.print(inaReady ? "true" : "false");

  Serial.print(",\"ds18b20\":");
  Serial.print(dsReady ? "true" : "false");

  Serial.print("}");

  // ---------------- RAW TELEMETRY ------------------

  Serial.print(",\"raw\":{");

  Serial.print("\"bmp_temp_c\":");
  printJSONFloat(bmpTempRaw);

  Serial.print(",\"pressure_hpa\":");
  printJSONFloat(pressureRaw);

  Serial.print(",\"acc_x\":");
  printJSONFloat(axRaw);

  Serial.print(",\"acc_y\":");
  printJSONFloat(ayRaw);

  Serial.print(",\"acc_z\":");
  printJSONFloat(azRaw);

  Serial.print(",\"gyro_x\":");
  printJSONFloat(gxRaw);

  Serial.print(",\"gyro_y\":");
  printJSONFloat(gyRaw);

  Serial.print(",\"gyro_z\":");
  printJSONFloat(gzRaw);

  Serial.print(",\"voltage_v\":");
  printJSONFloat(voltageRaw);

  Serial.print(",\"current_ma\":");
  printJSONFloat(currentRaw);

  Serial.print(",\"power_mw\":");
  printJSONFloat(powerRaw);

  Serial.print(",\"probe_temp_c\":");
  printJSONFloat(probeTempRaw);

  Serial.print("}");

  // ---------------- SIMULATED TELEMETRY ------------

  Serial.print(",\"simulated\":{");

  Serial.print("\"bmp_temp_c\":");
  printJSONFloat(tempSim);

  Serial.print(",\"pressure_hpa\":");
  printJSONFloat(pressureSim);

  Serial.print(",\"acc_x\":");
  printJSONFloat(axSim);

  Serial.print(",\"acc_y\":");
  printJSONFloat(aySim);

  Serial.print(",\"acc_z\":");
  printJSONFloat(azSim);

  Serial.print(",\"gyro_x\":");
  printJSONFloat(gxSim);

  Serial.print(",\"gyro_y\":");
  printJSONFloat(gySim);

  Serial.print(",\"gyro_z\":");
  printJSONFloat(gzSim);

  Serial.print(",\"voltage_v\":");
  printJSONFloat(voltageSim);

  Serial.print(",\"current_ma\":");
  printJSONFloat(currentSim);

  Serial.print(",\"power_mw\":");
  printJSONFloat(powerSim);

  Serial.print(",\"probe_temp_c\":");
  printJSONFloat(probeTempSim);

  Serial.print("}");

  Serial.println("}");

  // =================================================
  // 6. SAMPLE INTERVAL
  // =================================================

  delay(1000);
}
