#pragma once

// Generated from CAELIS's harmonized telemetry corpus by
// ai_model/export_esp32_edge_model.py.  This is an advisory edge detector;
// it never controls relays, heaters, radios, or any other actuator.

#include <Arduino.h>
#include <math.h>

namespace caelis_edge {

constexpr uint8_t FEATURE_COUNT = 7;
constexpr uint8_t WINDOW_SIZE = 12;
constexpr uint8_t CALIBRATION_SAMPLES = 20;
constexpr uint8_t TREE_NODES = 53;

enum EdgeStatus : uint8_t { EDGE_CALIBRATING, EDGE_NOMINAL, EDGE_WATCH, EDGE_WARNING, EDGE_CRITICAL };

struct EdgeFeatures {
  float values[FEATURE_COUNT];
};

struct EdgeResult {
  bool ready;
  float probability;
  EdgeStatus status;
};

// Compact distilled CAELIS classifier: max_depth=5, min_samples_leaf=80,
// trained with class balancing and fixed random_state=42.
static const int8_t TREE_LEFT[TREE_NODES] = {
  1,2,3,4,-1,-1,7,-1,-1,10,11,12,-1,-1,15,-1,-1,18,19,-1,-1,22,-1,-1,25,26,27,28,-1,-1,31,-1,-1,34,35,-1,-1,38,-1,-1,41,42,-1,44,-1,-1,47,48,-1,-1,51,-1,-1
};
static const int8_t TREE_RIGHT[TREE_NODES] = {
  24,9,6,5,-1,-1,8,-1,-1,17,14,13,-1,-1,16,-1,-1,21,20,-1,-1,23,-1,-1,40,33,30,29,-1,-1,32,-1,-1,37,36,-1,-1,39,-1,-1,46,43,-1,45,-1,-1,50,49,-1,-1,52,-1,-1
};
static const int8_t TREE_FEATURE[TREE_NODES] = {
  2,5,3,1,-1,-1,6,-1,-1,5,5,0,-1,-1,2,-1,-1,2,6,-1,-1,6,-1,-1,5,0,6,0,-1,-1,2,-1,-1,6,1,-1,-1,0,-1,-1,0,2,-1,1,-1,-1,6,5,-1,-1,2,-1,-1
};
static const float TREE_THRESHOLD[TREE_NODES] = {
  0.000207116449f,-0.622366428f,-0.0883807512f,-2.41756904f,0,0,0.178995421f,0,0,0.782037914f,-0.548483253f,0.516041756f,0,0,-0.0000553232821f,0,0,-0.00134750304f,0.445896477f,0,0,-3.27251136f,0,0,-0.281776056f,0.0531626884f,-0.640023857f,-0.491519168f,0,0,0.438501135f,0,0,0.229392134f,-0.330543637f,0,0,0.285153762f,0,0,-0.541025162f,0.553940892f,0,-0.478241324f,0,0,0.481165648f,-0.255831435f,0,0,1.1525628f,0,0
};
static const float TREE_PROBABILITY[TREE_NODES] = {
  0.5f,0.622053919f,0.993648626f,0.685666549f,1.0f,0.391907012f,0.999845734f,1.0f,0.985597237f,0.438213912f,0.167321024f,0.000166565776f,0.0f,0.0032941656f,0.362689336f,0.274368367f,0.988385396f,0.789631829f,0.385224472f,0.229117334f,0.647399453f,1.0f,1.0f,1.0f,0.133798627f,0.06367863f,0.100260573f,0.0275267715f,0.0939788461f,0.0f,0.161653018f,0.0401669065f,0.203995548f,0.0231600887f,0.00366025667f,0.0f,0.0284435216f,0.0487828822f,0.103683118f,0.022384231f,0.316110287f,0.971167607f,0.893119865f,0.99464223f,0.981659901f,1.0f,0.217141231f,0.381389292f,0.0385455543f,0.500393379f,0.095978921f,0.0718887066f,0.403887558f
};

inline const char* statusName(EdgeStatus status) {
  switch (status) {
    case EDGE_CALIBRATING: return "CALIBRATING";
    case EDGE_NOMINAL: return "NOMINAL";
    case EDGE_WATCH: return "WATCH";
    case EDGE_WARNING: return "WARNING";
    case EDGE_CRITICAL: return "CRITICAL";
  }
  return "UNKNOWN";
}

inline float classify(const EdgeFeatures& features) {
  int8_t node = 0;
  while (TREE_FEATURE[node] >= 0) {
    const int8_t feature = TREE_FEATURE[node];
    node = features.values[feature] <= TREE_THRESHOLD[node] ? TREE_LEFT[node] : TREE_RIGHT[node];
  }
  return TREE_PROBABILITY[node];
}

class RollingEdgeChannel {
 public:
  explicit RollingEdgeChannel(float standardDeviationFloor) : stdFloor(standardDeviationFloor) { reset(); }

  void reset() {
    calibrationCount = 0;
    baselineMean = 0.0f;
    baselineM2 = 0.0f;
    baselineStd = stdFloor;
    sampleCount = 0;
    writeIndex = 0;
    hasPrevious = false;
  }

  EdgeResult update(float observation, bool physicalCritical = false) {
    if (!isfinite(observation)) return {false, -1.0f, EDGE_CALIBRATING};
    if (calibrationCount < CALIBRATION_SAMPLES) {
      calibrationCount++;
      const float delta = observation - baselineMean;
      baselineMean += delta / calibrationCount;
      baselineM2 += delta * (observation - baselineMean);
      if (calibrationCount > 1) baselineStd = max(stdFloor, sqrtf(baselineM2 / (calibrationCount - 1)));
      return {false, -1.0f, EDGE_CALIBRATING};
    }

    const float normalized = (observation - baselineMean) / max(stdFloor, baselineStd);
    samples[writeIndex] = normalized;
    writeIndex = (writeIndex + 1) % WINDOW_SIZE;
    if (sampleCount < WINDOW_SIZE) sampleCount++;
    if (sampleCount < WINDOW_SIZE) return {false, -1.0f, EDGE_CALIBRATING};

    EdgeFeatures features = extractFeatures();
    // The corpus classifier has no dedicated zero-variance nominal leaf. A
    // perfectly stable, post-baseline sensor window is therefore explicitly
    // treated as nominal. Hardware-limit rules below still take precedence.
    const bool stableWindow = features.values[1] < 0.05f && features.values[4] < 0.10f && features.values[5] < 0.05f;
    const float probability = stableWindow ? 0.05f : classify(features);
    EdgeStatus status = probability >= 0.90f ? EDGE_CRITICAL : probability >= 0.75f ? EDGE_WARNING : probability >= 0.50f ? EDGE_WATCH : EDGE_NOMINAL;
    if (physicalCritical) status = EDGE_CRITICAL;
    return {true, probability, status};
  }

 private:
  EdgeFeatures extractFeatures() const {
    float mean = 0.0f, minimum = samples[0], maximum = samples[0], sumSquares = 0.0f;
    for (uint8_t i = 0; i < WINDOW_SIZE; i++) {
      mean += samples[i];
      minimum = min(minimum, samples[i]);
      maximum = max(maximum, samples[i]);
    }
    mean /= WINDOW_SIZE;
    float rate = 0.0f, thirdMoment = 0.0f;
    for (uint8_t i = 0; i < WINDOW_SIZE; i++) {
      const float centered = samples[i] - mean;
      sumSquares += centered * centered;
      thirdMoment += centered * centered * centered;
      if (i > 0) rate += fabsf(samples[i] - samples[i - 1]);
    }
    const float standardDeviation = sqrtf(sumSquares / WINDOW_SIZE);
    const float skewness = standardDeviation > 0.0001f ? (thirdMoment / WINDOW_SIZE) / (standardDeviation * standardDeviation * standardDeviation) : 0.0f;
    return {{mean, standardDeviation, minimum, maximum, maximum - minimum, rate / (WINDOW_SIZE - 1), skewness}};
  }

  float stdFloor, baselineMean, baselineM2, baselineStd;
  float samples[WINDOW_SIZE];
  uint8_t calibrationCount, sampleCount, writeIndex;
  bool hasPrevious;
};

struct EdgeBankResult {
  EdgeResult thermal, power, current, rotation, vibration;
  EdgeStatus overall;
};

class EdgeModelBank {
 public:
  EdgeModelBank() : thermal(0.15f), power(0.01f), current(3.0f), rotation(0.02f), vibration(0.05f) {}

  void reset() { thermal.reset(); power.reset(); current.reset(); rotation.reset(); vibration.reset(); }

  EdgeBankResult update(float temperatureC, bool tempValid, float voltageV, bool voltageValid,
                        float currentMa, bool currentValid, float gyroRadS, bool gyroValid,
                        float accelMagnitude, bool accelValid) {
    EdgeResult t = tempValid ? thermal.update(temperatureC, temperatureC > 60.0f || temperatureC < -40.0f) : EdgeResult{false, -1.0f, EDGE_CALIBRATING};
    EdgeResult p = voltageValid ? power.update(voltageV, voltageV < 2.9f || voltageV > 3.6f) : EdgeResult{false, -1.0f, EDGE_CALIBRATING};
    EdgeResult c = currentValid ? current.update(currentMa, fabsf(currentMa) > 500.0f) : EdgeResult{false, -1.0f, EDGE_CALIBRATING};
    EdgeResult r = gyroValid ? rotation.update(gyroRadS, gyroRadS > 4.0f) : EdgeResult{false, -1.0f, EDGE_CALIBRATING};
    EdgeResult v = accelValid ? vibration.update(accelMagnitude, fabsf(accelMagnitude - 9.80665f) > 12.0f) : EdgeResult{false, -1.0f, EDGE_CALIBRATING};
    EdgeStatus overall = EDGE_CALIBRATING;
    EdgeResult all[] = {t, p, c, r, v};
    for (const EdgeResult& result : all) {
      if (result.ready && (overall == EDGE_CALIBRATING || result.status > overall)) overall = result.status;
    }
    return {t, p, c, r, v, overall};
  }

 private:
  RollingEdgeChannel thermal, power, current, rotation, vibration;
};

}  // namespace caelis_edge
