import { TelemetryFragment, CausalEdge, MissionMetadata } from '../types';

export const MISSION_INFO: MissionMetadata = {
  missionId: "AEROSPACE CAS-904X",
  craftClass: "3U CubeSat LEO Bus",
  orbitProfile: "510 km Sun-Synchronous (SSO)",
  incidentTimestamp: "2026-03-14 03:22:18 UTC",
  investigationRef: "DOSSIER-REF #GT-8849-ORBIT",
  classification: "CAS-CRITICAL INVESTIGATION FILE"
};

export const TELEMETRY_FRAGMENTS: TelemetryFragment[] = [
  {
    id: "frag-1",
    subsystemId: "P1-THM",
    subsystemName: "Thermal Sensor",
    timestamp: "T-00:14:02",
    timeOffsetSec: -842,
    alarmCode: "THM_SENS_OOR_LOW",
    alarmTitle: "Analog Thermistor Negative Rail Drift",
    telemetryLine: "ERR 0x0E4: THM_CH2_RAW=-64.2C [FLOOR=-45.0C] DRIFT_RATE=+1.4C/s",
    rawReading: "-64.2°C (ADC Code 0x0012)",
    nominalRange: "-20.0°C to +35.0°C",
    evidenceNote: "Thermistor bias resistance decayed due to solder-joint micro-fracture during eclipse exit. Sensor erroneously reported deep freeze, bypassing the deadband filter.",
    confidence: 0.994,
    isOrigin: true,
    preventedByIntervention: false,
    preventionDetail: "Origin anomaly: early sanity boundary clamp would have flagged telemetry invalidity at T+012s without triggering automated thermal load override.",
    coordinates: {
      incidentX: 12,
      incidentY: 18,
      traceX: 10,
      traceY: 15,
      rotation: -3.5
    }
  },
  {
    id: "frag-2",
    subsystemId: "E2-HTR",
    subsystemName: "Thermal Control Heater",
    timestamp: "T+00:00:42",
    timeOffsetSec: 42,
    alarmCode: "HTR_DUTY_MAX_LOCK",
    alarmTitle: "Emergency Thermal Heater 100% Saturation",
    telemetryLine: "WARN 0x11A: HTR_PWR_RELAY=LOCKED_ON [DUTY=100.0%] RUNTIME=640s",
    rawReading: "100.0% Duty Cycle (28.4W continuous)",
    nominalRange: "15.0% - 35.0% Pulse-Width",
    evidenceNote: "Thermal manager firmware trusted the corrupted sensor reading and engaged survival heating strips continuously. Secondary software watchdog failed to timeout.",
    confidence: 0.988,
    isOrigin: false,
    causalParentId: "frag-1",
    preventedByIntervention: true,
    preventionDetail: "Prevented: Sanity-checked thermistor limits would have commanded heater into 20% safe pulse fallback mode.",
    coordinates: {
      incidentX: 48,
      incidentY: 8,
      traceX: 30,
      traceY: 30,
      rotation: 4.2
    }
  },
  {
    id: "frag-3",
    subsystemId: "B3-BAT",
    subsystemName: "Battery Pack Li-Ion",
    timestamp: "T+00:01:18",
    timeOffsetSec: 78,
    alarmCode: "BAT_CELL2_UV_TRIP",
    alarmTitle: "Battery Cell #2 Under-Voltage Threshold",
    telemetryLine: "CRIT 0x20F: BAT_BANK_A_V=2.78V [MIN=3.10V] DISCHG_RATE=4.2C",
    rawReading: "2.78V per cell (Depth of Discharge > 94%)",
    nominalRange: "3.60V - 4.15V per cell",
    evidenceNote: "Continuous 28.4W heater draw during unilluminated orbital eclipse stripped battery reserves. Cell #2 reached chemical starvation cutoff.",
    confidence: 0.976,
    isOrigin: false,
    causalParentId: "frag-2",
    preventedByIntervention: true,
    preventionDetail: "Prevented: Normal battery discharge rate would have remained under 0.4C, preserving reserve margin through eclipse.",
    coordinates: {
      incidentX: 78,
      incidentY: 22,
      traceX: 50,
      traceY: 48,
      rotation: -2.8
    }
  },
  {
    id: "frag-4",
    subsystemId: "C4-PRT",
    subsystemName: "Protection Circuit",
    timestamp: "T+00:01:42",
    timeOffsetSec: 102,
    alarmCode: "PRT_SOLID_STATE_LATCH",
    alarmTitle: "Over-Current Solid State Breaker Latch",
    telemetryLine: "ERR 0x3A2: SS_FUSE_BANK_1=TRIPPED_OPEN I_PEAK=7.8A [LIMIT=5.0A]",
    rawReading: "TRIPPED / OPEN CIRCUIT (Latching)",
    nominalRange: "CLOSED (I < 4.5A)",
    evidenceNote: "Collapsing battery voltage induced dc-dc boost converter to pull disproportionate current to maintain regulated rails, tripping latching solid-state switch.",
    confidence: 0.982,
    isOrigin: false,
    causalParentId: "frag-3",
    preventedByIntervention: true,
    preventionDetail: "Prevented: Without battery voltage drop, current draws would have peaked at only 2.1A (well below 5.0A trip ceiling).",
    coordinates: {
      incidentX: 20,
      incidentY: 55,
      traceX: 70,
      traceY: 65,
      rotation: 5.1
    }
  },
  {
    id: "frag-5",
    subsystemId: "P5-BUS",
    subsystemName: "5V Main Power Rail",
    timestamp: "T+00:01:65",
    timeOffsetSec: 125,
    alarmCode: "BUS_5V_RAIL_DROPOUT",
    alarmTitle: "Regulated 5V Main Power Bus Collapse",
    telemetryLine: "CRIT 0x44B: V_MAIN_5V=0.84V [REG_TARGET=5.00V] SYS_BROWNOUT=TRUE",
    rawReading: "0.84V (Zero output regulation)",
    nominalRange: "4.95V - 5.05V",
    evidenceNote: "Solid-state breaker isolation severed primary bus input. Downstream capacitors emptied in 34ms, dropping all non-isolated logic subsystems into hard brownout.",
    confidence: 0.991,
    isOrigin: false,
    causalParentId: "frag-4",
    preventedByIntervention: true,
    preventionDetail: "Prevented: Main bus would have remained steady at 5.02V regulated potential.",
    coordinates: {
      incidentX: 52,
      incidentY: 65,
      traceX: 85,
      traceY: 80,
      rotation: -4.0
    }
  },
  {
    id: "frag-6",
    subsystemId: "X6-COM",
    subsystemName: "UHF/S-Band Transponder",
    timestamp: "T+00:01:89",
    timeOffsetSec: 149,
    alarmCode: "TX_CARRIER_LOSS",
    alarmTitle: "Primary Telemetry Carrier Mute & Loss of Signal",
    telemetryLine: "FATAL 0x5F0: RF_CARRIER_MUTE PA_ENABLE=LOW GROUND_STATION_AOS=LOST",
    rawReading: "0 mW (Unmodulated / Carrier Dead)",
    nominalRange: "2000 mW (+33 dBm RF Out)",
    evidenceNote: "Microcontroller supervisory circuit triggered undervoltage shutdown. RF power amplifier lost bias gate, immediately severing beacon to ground stations.",
    confidence: 0.998,
    isOrigin: false,
    causalParentId: "frag-5",
    preventedByIntervention: true,
    preventionDetail: "Prevented: Continuous heartbeat telemetry and ground pass communication would have completed successfully.",
    coordinates: {
      incidentX: 82,
      incidentY: 58,
      traceX: 95,
      traceY: 92,
      rotation: 3.2
    }
  }
];

export const CAUSAL_EDGES: CausalEdge[] = [
  {
    fromId: "frag-1",
    toId: "frag-2",
    relationType: "FALSE_DEMAND_PROPAGATION",
    evidenceSummary: "Thermistor -64°C anomaly commanded thermal heater relay to 100% duty cycle.",
    delayMs: 42000
  },
  {
    fromId: "frag-2",
    toId: "frag-3",
    relationType: "POWER_DEPLETION_CASCADE",
    evidenceSummary: "28.4W continuous heating during eclipse drained Li-ion battery below 2.78V limit.",
    delayMs: 36000
  },
  {
    fromId: "frag-3",
    toId: "frag-4",
    relationType: "CURRENT_SURGE_INDUCTION",
    evidenceSummary: "Low battery voltage forced DC-DC boost stage to draw 7.8A, tripping solid-state breaker.",
    delayMs: 24000
  },
  {
    fromId: "frag-4",
    toId: "frag-5",
    relationType: "BUS_DISCONNECTION",
    evidenceSummary: "Tripped breaker severed input power, collapsing 5V regulated system bus to 0.84V.",
    delayMs: 23000
  },
  {
    fromId: "frag-5",
    toId: "frag-6",
    relationType: "SUPERVISORY_BROWNOUT_MUTE",
    evidenceSummary: "5V drop de-asserted RF transceiver bias, immediately muting ground telemetry.",
    delayMs: 24000
  }
];
