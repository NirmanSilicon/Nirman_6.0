export interface CascadeStep {
  id: string;
  stepIndex: number;
  subsystemCode: string;
  subsystemName: string;
  observedStatus: 'FAULT_ORIGIN' | 'CASCADED_FAILURE' | 'COLLAPSE';
  observedReading: string;
  observedImpact: string;
  timeOffsetLabel: string;
  // Counterfactual state when prevented vs not prevented
  preventedByIntervention: boolean;
  counterfactualState: 'PREVENTED' | 'UNRESOLVED_RISK' | 'DEGRADED';
  counterfactualReading: string;
  counterfactualImpact: string;
  attenuationFactor: number; // e.g. 1.0 = fully prevented, 0.0 = completely failed
}

export interface InterventionOption {
  id: string;
  targetNodeId: string;
  targetNodeLabel: string;
  interventionType: string;
  earliestDetectableOffsetSec: number; // e.g. 10s
  recommendedDetectionLabel: string; // e.g. "10 seconds"
  description: string;
  mechanism: string;
  riskTradeoff: string;
  effectiveTimeWindow: string; // e.g. "T-10s to T-45s"
  preventedFailuresCount: number; // e.g. 5
  totalFailuresCount: number; // e.g. 6
  earliestEffectiveInterventionLabel: string; // e.g. "T−10s"
  powerSavedWattHours: number;
  batterySocPreservedPercent: number;
  steps: CascadeStep[];
  telemetrySimulationSeries: {
    timeSec: number;
    timeLabel: string;
    observedTemperature: number;
    counterfactualTemperature: number;
    observedBusVoltage: number;
    counterfactualBusVoltage: number;
    observedBatterySoc: number;
    counterfactualBatterySoc: number;
  }[];
}

export interface CounterfactualScenario {
  id: string;
  title: string;
  craftName: string;
  incidentRef: string;
  defaultFailureId: string;
  interventions: InterventionOption[];
}

export const COUNTERFACTUAL_SCENARIOS: CounterfactualScenario[] = [
  {
    id: "thermal_sensor_t17",
    title: "Thermal Sensor T-17 Runaway Cascade",
    craftName: "PROXIMA-3U",
    incidentRef: "ANOMALY-THM-8849",
    defaultFailureId: "interv-t17-10s",
    interventions: [
      {
        id: "interv-t17-10s",
        targetNodeId: "T-17",
        targetNodeLabel: "Thermal Sensor T-17",
        interventionType: "Sanity Bound & Plausibility Filter",
        earliestDetectableOffsetSec: 10,
        recommendedDetectionLabel: "10 seconds",
        description: "Enforce digital bounds checking in flight software. Discard RTD readings below physical orbital floor (-50°C) as sensor open-circuit faults.",
        mechanism: "Clamps control loop to safe passive heating mode (5% PWM) upon detecting impossible -240.2°C temperature reading.",
        riskTradeoff: "Zero hardware risk. Consumes <12 bytes ROM in flight firmware.",
        effectiveTimeWindow: "T-10s before survival heater command dispatch",
        preventedFailuresCount: 5,
        totalFailuresCount: 6,
        earliestEffectiveInterventionLabel: "T−10s",
        powerSavedWattHours: 24.6,
        batterySocPreservedPercent: 88,
        steps: [
          {
            id: "step-1",
            stepIndex: 1,
            subsystemCode: "T-17",
            subsystemName: "THERMAL SENSOR",
            observedStatus: "FAULT_ORIGIN",
            observedReading: "-240.2°C (ADC open)",
            observedImpact: "Sensor reading trusted by OBC without bounds sanity",
            timeOffsetLabel: "+000 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "FLAGGED INVALID (Fallback to Model)",
            counterfactualImpact: "Sensor flagged open; firmware switches to thermal model estimate (+12.4°C)",
            attenuationFactor: 1.0
          },
          {
            id: "step-2",
            stepIndex: 2,
            subsystemCode: "HEATER",
            subsystemName: "SURVIVAL HEATER",
            observedStatus: "CASCADED_FAILURE",
            observedReading: "28.4W continuous ON",
            observedImpact: "Continuous 100% duty cycle drains entire bus reserves",
            timeOffsetLabel: "+084 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "0.0W (Standby Nominal)",
            counterfactualImpact: "Heater remains disabled during eclipse; 0.0W load",
            attenuationFactor: 1.0
          },
          {
            id: "step-3",
            stepIndex: 3,
            subsystemCode: "BATTERY",
            subsystemName: "BATTERY PACK",
            observedStatus: "CASCADED_FAILURE",
            observedReading: "2.78V starvation (+8°C ΔT)",
            observedImpact: "Cell #2 deep discharge trips internal impedance warning",
            timeOffsetLabel: "+274 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "3.92V / 88% SoC (Healthy)",
            counterfactualImpact: "Battery retains 88% capacity throughout entire eclipse transit",
            attenuationFactor: 1.0
          },
          {
            id: "step-4",
            stepIndex: 4,
            subsystemCode: "PROTECTION",
            subsystemName: "PDU PROTECTION",
            observedStatus: "CASCADED_FAILURE",
            observedReading: "7.8A trip / Latch open",
            observedImpact: "Solid-state breaker trips due to boost converter overcurrent",
            timeOffsetLabel: "+588 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "0.42A (Latch CLOSED/ARMED)",
            counterfactualImpact: "Breaker remains closed; nominal power delivery",
            attenuationFactor: 1.0
          },
          {
            id: "step-5",
            stepIndex: 5,
            subsystemCode: "POWER",
            subsystemName: "MAIN POWER BUS",
            observedStatus: "COLLAPSE",
            observedReading: "0.04V regulated dropout",
            observedImpact: "Total brownout of regulated rails and instrument bus",
            timeOffsetLabel: "+602 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "12.04V Regulated Nominal",
            counterfactualImpact: "Bus stays fully energized and within ±1% regulation",
            attenuationFactor: 1.0
          },
          {
            id: "step-6",
            stepIndex: 6,
            subsystemCode: "COMMS",
            subsystemName: "COMMS BEACON",
            observedStatus: "COLLAPSE",
            observedReading: "0 mW (Carrier Drop)",
            observedImpact: "Loss of contact with ground stations worldwide",
            timeOffsetLabel: "+629 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "2000 mW (Carrier Active)",
            counterfactualImpact: "S-Band beacon transmits real-time telemetry continuously",
            attenuationFactor: 1.0
          },
          {
            id: "step-7",
            stepIndex: 7,
            subsystemCode: "PAYLOAD",
            subsystemName: "IMAGING PAYLOAD",
            observedStatus: "COLLAPSE",
            observedReading: "Unscheduled Abort",
            observedImpact: "Instrument shutdown in middle of hyperspectral ground swath",
            timeOffsetLabel: "+640 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "Operational / Standby",
            counterfactualImpact: "Instrument survives eclipse and completes target acquisition on sunlit pass",
            attenuationFactor: 1.0
          }
        ],
        telemetrySimulationSeries: [
          { timeSec: -20, timeLabel: "T-20s", observedTemperature: 18, counterfactualTemperature: 18, observedBusVoltage: 12.1, counterfactualBusVoltage: 12.1, observedBatterySoc: 92, counterfactualBatterySoc: 92 },
          { timeSec: -10, timeLabel: "T-10s", observedTemperature: 16, counterfactualTemperature: 16, observedBusVoltage: 12.1, counterfactualBusVoltage: 12.1, observedBatterySoc: 90, counterfactualBatterySoc: 90 },
          { timeSec: 0, timeLabel: "T+0s", observedTemperature: -240, counterfactualTemperature: 15, observedBusVoltage: 12.0, counterfactualBusVoltage: 12.1, observedBatterySoc: 88, counterfactualBatterySoc: 89 },
          { timeSec: 30, timeLabel: "T+30s", observedTemperature: -240, counterfactualTemperature: 14, observedBusVoltage: 11.4, counterfactualBusVoltage: 12.1, observedBatterySoc: 64, counterfactualBatterySoc: 88 },
          { timeSec: 60, timeLabel: "T+60s", observedTemperature: -240, counterfactualTemperature: 14, observedBusVoltage: 9.2, counterfactualBusVoltage: 12.0, observedBatterySoc: 32, counterfactualBatterySoc: 88 },
          { timeSec: 90, timeLabel: "T+90s", observedTemperature: -240, counterfactualTemperature: 13, observedBusVoltage: 2.8, counterfactualBusVoltage: 12.0, observedBatterySoc: 11, counterfactualBatterySoc: 87 },
          { timeSec: 120, timeLabel: "T+120s", observedTemperature: -240, counterfactualTemperature: 13, observedBusVoltage: 0.04, counterfactualBusVoltage: 12.0, observedBatterySoc: 0, counterfactualBatterySoc: 87 }
        ]
      },
      {
        id: "interv-htr-30s",
        targetNodeId: "HEATER",
        targetNodeLabel: "Survival Heater Duty Cycle",
        interventionType: "Heater Energy Limiter / Hardware Watchdog",
        earliestDetectableOffsetSec: 30,
        recommendedDetectionLabel: "30 seconds",
        description: "Impose a mandatory 3-minute hard ceiling on continuous survival heating before requiring operator or ground telecommand re-authorization.",
        mechanism: "Hardware timer opens relay after 180s continuous 28.4W draw, halting battery starvation.",
        riskTradeoff: "Protects battery and bus rails, but craft bay temperatures may dip 4°C below target during long eclipses.",
        effectiveTimeWindow: "T+0s to T+45s",
        preventedFailuresCount: 4,
        totalFailuresCount: 6,
        earliestEffectiveInterventionLabel: "T+30s",
        powerSavedWattHours: 18.2,
        batterySocPreservedPercent: 62,
        steps: [
          {
            id: "step-1",
            stepIndex: 1,
            subsystemCode: "T-17",
            subsystemName: "THERMAL SENSOR",
            observedStatus: "FAULT_ORIGIN",
            observedReading: "-240.2°C (ADC open)",
            observedImpact: "Sensor remains failed open circuit",
            timeOffsetLabel: "+000 MS",
            preventedByIntervention: false,
            counterfactualState: "UNRESOLVED_RISK",
            counterfactualReading: "-240.2°C (Failed Sensor)",
            counterfactualImpact: "Sensor remains corrupted, but downstream impact is truncated",
            attenuationFactor: 0.0
          },
          {
            id: "step-2",
            stepIndex: 2,
            subsystemCode: "HEATER",
            subsystemName: "SURVIVAL HEATER",
            observedStatus: "CASCADED_FAILURE",
            observedReading: "28.4W continuous ON",
            observedImpact: "Truncated at 30 seconds via timer cutoff",
            timeOffsetLabel: "+084 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "Cutoff after 30s limit",
            counterfactualImpact: "Relay trips automatically to protect bus",
            attenuationFactor: 0.8
          },
          {
            id: "step-3",
            stepIndex: 3,
            subsystemCode: "BATTERY",
            subsystemName: "BATTERY PACK",
            observedStatus: "CASCADED_FAILURE",
            observedReading: "2.78V starvation",
            observedImpact: "Discharge arrested at 3.65V (62% SoC)",
            timeOffsetLabel: "+274 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "3.65V (62% SoC Safe)",
            counterfactualImpact: "Battery safely retains over 60% capacity",
            attenuationFactor: 1.0
          },
          {
            id: "step-4",
            stepIndex: 4,
            subsystemCode: "PROTECTION",
            subsystemName: "PDU PROTECTION",
            observedStatus: "CASCADED_FAILURE",
            observedReading: "7.8A trip",
            observedImpact: "Peak current never exceeds 3.8A",
            timeOffsetLabel: "+588 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "3.8A (Below 7.5A Trip)",
            counterfactualImpact: "Breaker remains healthy and untripped",
            attenuationFactor: 1.0
          },
          {
            id: "step-5",
            stepIndex: 5,
            subsystemCode: "POWER",
            subsystemName: "MAIN POWER BUS",
            observedStatus: "COLLAPSE",
            observedReading: "0.04V regulated dropout",
            observedImpact: "Bus stays active",
            timeOffsetLabel: "+602 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "11.95V (Regulated)",
            counterfactualImpact: "Bus remains operational throughout orbit",
            attenuationFactor: 1.0
          },
          {
            id: "step-6",
            stepIndex: 6,
            subsystemCode: "COMMS",
            subsystemName: "COMMS BEACON",
            observedStatus: "COLLAPSE",
            observedReading: "0 mW (Carrier Drop)",
            observedImpact: "Transmitter maintains 2W output",
            timeOffsetLabel: "+629 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "2000 mW (Online)",
            counterfactualImpact: "Ground stations maintain lock",
            attenuationFactor: 1.0
          },
          {
            id: "step-7",
            stepIndex: 7,
            subsystemCode: "PAYLOAD",
            subsystemName: "IMAGING PAYLOAD",
            observedStatus: "COLLAPSE",
            observedReading: "Unscheduled Abort",
            observedImpact: "Payload temporarily throttled to conserve power",
            timeOffsetLabel: "+640 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "Throttled Mode",
            counterfactualImpact: "Safe standby mode preserved",
            attenuationFactor: 0.7
          }
        ],
        telemetrySimulationSeries: [
          { timeSec: -20, timeLabel: "T-20s", observedTemperature: 18, counterfactualTemperature: 18, observedBusVoltage: 12.1, counterfactualBusVoltage: 12.1, observedBatterySoc: 92, counterfactualBatterySoc: 92 },
          { timeSec: 0, timeLabel: "T+0s", observedTemperature: -240, counterfactualTemperature: -240, observedBusVoltage: 12.0, counterfactualBusVoltage: 12.0, observedBatterySoc: 88, counterfactualBatterySoc: 88 },
          { timeSec: 30, timeLabel: "T+30s", observedTemperature: -240, counterfactualTemperature: 12, observedBusVoltage: 11.4, counterfactualBusVoltage: 12.0, observedBatterySoc: 64, counterfactualBatterySoc: 78 },
          { timeSec: 60, timeLabel: "T+60s", observedTemperature: -240, counterfactualTemperature: 10, observedBusVoltage: 9.2, counterfactualBusVoltage: 11.9, observedBatterySoc: 32, counterfactualBatterySoc: 74 },
          { timeSec: 90, timeLabel: "T+90s", observedTemperature: -240, counterfactualTemperature: 9, observedBusVoltage: 2.8, counterfactualBusVoltage: 11.9, observedBatterySoc: 11, counterfactualBatterySoc: 70 },
          { timeSec: 120, timeLabel: "T+120s", observedTemperature: -240, counterfactualTemperature: 9, observedBusVoltage: 0.04, counterfactualBusVoltage: 11.9, observedBatterySoc: 0, counterfactualBatterySoc: 68 }
        ]
      }
    ]
  },
  {
    id: "seu_adcs_scheduler",
    title: "ADCS Scheduler SEU Bitflip Cascade",
    craftName: "PROXIMA-3U",
    incidentRef: "ANOMALY-ADCS-7712",
    defaultFailureId: "interv-seu-10s",
    interventions: [
      {
        id: "interv-seu-10s",
        targetNodeId: "OBC-SEU",
        targetNodeLabel: "OBC Task Scheduler SEU",
        interventionType: "ECC Memory Scrubbing & Watchdog Preemption",
        earliestDetectableOffsetSec: 10,
        recommendedDetectionLabel: "10 seconds",
        description: "Perform cyclic 100ms scrubbing of FreeRTOS task control blocks with Single-Error-Correction/Double-Error-Detection (SECDED).",
        mechanism: "Hardware memory controller auto-corrects single bit error in scheduler pointer before thread deadlock occurs.",
        riskTradeoff: "Increases CPU utilization by 1.2%. Zero thermal or power impact.",
        effectiveTimeWindow: "T-10s to T-05s before task hang",
        preventedFailuresCount: 5,
        totalFailuresCount: 5,
        earliestEffectiveInterventionLabel: "T−08s",
        powerSavedWattHours: 8.4,
        batterySocPreservedPercent: 95,
        steps: [
          {
            id: "step-seu-1",
            stepIndex: 1,
            subsystemCode: "OBC-SEU",
            subsystemName: "SCHEDULER SEU",
            observedStatus: "FAULT_ORIGIN",
            observedReading: "0x3F802AEE (Corrupted)",
            observedImpact: "Corrupted thread pointer caused scheduler spinlock",
            timeOffsetLabel: "+000 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "SECDED AUTO-CORRECTED",
            counterfactualImpact: "Single bit error corrected in 12ns; scheduler uninterrupted",
            attenuationFactor: 1.0
          },
          {
            id: "step-seu-2",
            stepIndex: 2,
            subsystemCode: "WATCHDOG",
            subsystemName: "FIRMWARE WATCHDOG",
            observedStatus: "CASCADED_FAILURE",
            observedReading: "Watchdog starved (10s)",
            observedImpact: "Deadlock prevented regular kick routine",
            timeOffsetLabel: "+140 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "Kick Received (Nominal)",
            counterfactualImpact: "Watchdog counter refreshed on schedule",
            attenuationFactor: 1.0
          },
          {
            id: "step-seu-3",
            stepIndex: 3,
            subsystemCode: "REACTION WHEEL",
            subsystemName: "Z-AXIS REACTION WHEEL",
            observedStatus: "CASCADED_FAILURE",
            observedReading: "6200 RPM Runaway",
            observedImpact: "DAC commanded full positive torque continuously",
            timeOffsetLabel: "+380 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "+120 RPM (Closed-Loop)",
            counterfactualImpact: "ADCS closed loop maintains precise attitude control",
            attenuationFactor: 1.0
          },
          {
            id: "step-seu-4",
            stepIndex: 4,
            subsystemCode: "STAR TRACKER",
            subsystemName: "OPTICAL STAR TRACKER",
            observedStatus: "COLLAPSE",
            observedReading: "18.4 deg/s Tumbling",
            observedImpact: "Optical streaking caused total loss of attitude reference",
            timeOffsetLabel: "+820 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "0.01 deg/s (Locked)",
            counterfactualImpact: "18 guide stars tracked with arcsecond accuracy",
            attenuationFactor: 1.0
          },
          {
            id: "step-seu-5",
            stepIndex: 5,
            subsystemCode: "SOLAR POINTING",
            subsystemName: "SOLAR ARRAY TRACKING",
            observedStatus: "COLLAPSE",
            observedReading: "Array Misaligned (-90°)",
            observedImpact: "Loss of power generation upon exiting eclipse",
            timeOffsetLabel: "+940 MS",
            preventedByIntervention: true,
            counterfactualState: "PREVENTED",
            counterfactualReading: "Optimal Sun Vector (90°)",
            counterfactualImpact: "Solar arrays generate 48W peak power on sun acquisition",
            attenuationFactor: 1.0
          }
        ],
        telemetrySimulationSeries: [
          { timeSec: -20, timeLabel: "T-20s", observedTemperature: 20, counterfactualTemperature: 20, observedBusVoltage: 12.1, counterfactualBusVoltage: 12.1, observedBatterySoc: 90, counterfactualBatterySoc: 90 },
          { timeSec: 0, timeLabel: "T+0s", observedTemperature: 20, counterfactualTemperature: 20, observedBusVoltage: 12.1, counterfactualBusVoltage: 12.1, observedBatterySoc: 90, counterfactualBatterySoc: 90 },
          { timeSec: 30, timeLabel: "T+30s", observedTemperature: 21, counterfactualTemperature: 20, observedBusVoltage: 11.8, counterfactualBusVoltage: 12.1, observedBatterySoc: 85, counterfactualBatterySoc: 90 },
          { timeSec: 60, timeLabel: "T+60s", observedTemperature: 23, counterfactualTemperature: 20, observedBusVoltage: 11.2, counterfactualBusVoltage: 12.1, observedBatterySoc: 78, counterfactualBatterySoc: 89 },
          { timeSec: 90, timeLabel: "T+90s", observedTemperature: 26, counterfactualTemperature: 20, observedBusVoltage: 10.4, counterfactualBusVoltage: 12.0, observedBatterySoc: 65, counterfactualBatterySoc: 89 }
        ]
      }
    ]
  }
];
