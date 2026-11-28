import { AiEvent, CausalValidationResult } from "../types/caelis";

export const mockAiEvents: Record<string, AiEvent> = {
  "thermal_sensor": {
    id: "evt_therm_01",
    component: "THERMAL SENSOR",
    timestamp: "2026-08-24T10:05:00Z",
    event_type: "THRESHOLD",
    value: 2.545,
    source: "ai_pattern_match",
    confidence: 0.941,
    is_anomaly: true,
    feature_vector: {
      feat_mean: 2.545,
      feat_std: 2.11,
      feat_min: 0.11,
      feat_max: 5.20,
      feat_range: 5.09,
      feat_rate_of_change: 2.02,
      feat_skewness: 0.31
    }
  },
  "comms_loss": {
    id: "evt_comms_01",
    component: "COMMS",
    timestamp: "2026-08-24T10:07:26Z",
    event_type: "LOSS",
    value: 0.0,
    source: "ai_pattern_match",
    confidence: 0.31,
    is_anomaly: false,
    feature_vector: {
      feat_mean: 0.5,
      feat_std: 0.1,
      feat_min: 0.0,
      feat_max: 1.0,
      feat_range: 1.0,
      feat_rate_of_change: -0.9,
      feat_skewness: -0.1
    }
  },
  "battery_anomaly": {
    id: "evt_batt_01",
    component: "BATTERY",
    timestamp: "2026-08-24T10:06:35Z",
    event_type: "CRITICAL",
    value: 12.1,
    source: "ai_pattern_match",
    confidence: 0.97,
    is_anomaly: true,
    feature_vector: {
      feat_mean: 14.2,
      feat_std: 3.5,
      feat_min: 11.0,
      feat_max: 28.0,
      feat_range: 17.0,
      feat_rate_of_change: -5.4,
      feat_skewness: 0.8
    }
  },
  "heater_anomaly": {
    id: "evt_heat_01",
    component: "HEATER",
    timestamp: "2026-08-24T10:05:08Z",
    event_type: "STATE CHANGE",
    value: 1.0,
    source: "ai_pattern_match",
    confidence: 0.88,
    is_anomaly: true,
    feature_vector: {
      feat_mean: 0.8,
      feat_std: 0.4,
      feat_min: 0.0,
      feat_max: 1.0,
      feat_range: 1.0,
      feat_rate_of_change: 1.0,
      feat_skewness: 0.5
    }
  },
  "power_bus_drop": {
    id: "evt_pwr_01",
    component: "POWER BUS",
    timestamp: "2026-08-24T10:07:23Z",
    event_type: "CRITICAL",
    value: 4.2,
    source: "ai_pattern_match",
    confidence: 0.99,
    is_anomaly: true,
    feature_vector: {
      feat_mean: 24.0,
      feat_std: 12.5,
      feat_min: 4.2,
      feat_max: 28.5,
      feat_range: 24.3,
      feat_rate_of_change: -20.1,
      feat_skewness: -1.2
    }
  },
  "payload_failure": {
    id: "evt_pay_01",
    component: "PAYLOAD",
    timestamp: "2026-08-24T10:07:28Z",
    event_type: "OFFLINE",
    value: 0.0,
    source: "ai_pattern_match",
    confidence: 0.82,
    is_anomaly: true,
    feature_vector: {
      feat_mean: 0.2,
      feat_std: 0.1,
      feat_min: 0.0,
      feat_max: 1.0,
      feat_range: 1.0,
      feat_rate_of_change: -1.0,
      feat_skewness: -0.2
    }
  },
  "nominal_window": {
    id: "evt_nom_01",
    component: "THERMAL SENSOR",
    timestamp: "2026-08-24T09:00:00Z",
    event_type: "NOMINAL",
    value: 20.5,
    source: "ai_pattern_match",
    confidence: 0.196,
    is_anomaly: false,
    feature_vector: {
      feat_mean: 20.4,
      feat_std: 0.1,
      feat_min: 20.2,
      feat_max: 20.6,
      feat_range: 0.4,
      feat_rate_of_change: 0.01,
      feat_skewness: 0.02
    }
  }
};

export const mockValidationResults: Record<string, CausalValidationResult> = {
  "evt_therm_01": {
    status: "validated",
    role: "primary",
    confidence: 0.91,
    temporalValidity: true,
    dependencySupport: "critical",
    intermediateEvents: 3,
    explanation: "Earliest relevant anomaly with valid downstream dependencies and supporting intermediate telemetry."
  },
  "evt_comms_01": {
    status: "insufficient_evidence",
    role: "independent",
    confidence: 0,
    temporalValidity: false,
    dependencySupport: "none",
    intermediateEvents: 0,
    explanation: "No valid dependency path connects this event to the primary cascade."
  },
  "evt_batt_01": {
    status: "validated",
    role: "propagation",
    confidence: 0.89,
    temporalValidity: true,
    dependencySupport: "strong",
    intermediateEvents: 2,
    explanation: "Secondary failure induced by extreme thermal conditions disrupting battery cell management."
  },
  "evt_heat_01": {
    status: "validated",
    role: "propagation",
    confidence: 0.85,
    temporalValidity: true,
    dependencySupport: "moderate",
    intermediateEvents: 1,
    explanation: "Unexpected state change caused by faulty control logic derived from thermal sensor."
  },
  "evt_pwr_01": {
    status: "validated",
    role: "secondary",
    confidence: 0.95,
    temporalValidity: true,
    dependencySupport: "critical",
    intermediateEvents: 4,
    explanation: "Cascade resulting from battery failure propagating to the main power bus."
  },
  "evt_pay_01": {
    status: "validated",
    role: "secondary",
    confidence: 0.92,
    temporalValidity: true,
    dependencySupport: "strong",
    intermediateEvents: 1,
    explanation: "Payload shutdown triggered by main power bus voltage drop."
  },
  "evt_nom_01": {
    status: "rejected",
    role: null,
    confidence: 0,
    temporalValidity: false,
    dependencySupport: "none",
    intermediateEvents: 0,
    explanation: "Event corresponds to nominal operating conditions. No causal anomalies detected."
  }
};

export const mockEventStream = [
  { time: "T+000", component: "THERMAL SENSOR", event: "ANOMALY", id: "evt_therm_01" },
  { time: "T+008", component: "HEATER", event: "STATE CHANGE", id: "evt_heat_01" },
  { time: "T+095", component: "BATTERY", event: "THRESHOLD", id: "evt_batt_01" },
  { time: "T+140", component: "BATTERY", event: "CRITICAL", id: "evt_batt_01" },
  { time: "T+142", component: "PROTECTION", event: "TRIPPED", id: "evt_batt_01" },
  { time: "T+143", component: "POWER BUS", event: "CRITICAL", id: "evt_pwr_01" },
  { time: "T+146", component: "COMMS", event: "LOSS", id: "evt_comms_01" },
  { time: "T+148", component: "PAYLOAD", event: "OFFLINE", id: "evt_pay_01" }
];
