export interface GenealogyNode {
  id: string;
  code: string;
  label: string;
  subsystemName: string;
  subsystemType: 'THERMAL' | 'CONTROL' | 'BATTERY' | 'PROTECTION' | 'POWER_BUS' | 'COMMUNICATION' | 'ADCS' | 'PAYLOAD';
  stratum: 'ROOT' | 'PROPAGATION' | 'DOWNSTREAM' | 'SYMPTOM';
  confidence: number;
  confidenceTier: 'VERY HIGH' | 'HIGH' | 'MODERATE';
  uncertaintyMargin: number; // e.g. 0.015 (+/- 1.5%)
  telemetrySnippet: string;
  rawReading: string;
  nominalRange: string;
  timestamp: string;
  timeOffsetMs: number;
  timeOffsetLabel: string;
  status: 'ORIGIN_ANOMALY' | 'CASCADED_FAULT' | 'CRITICAL_COLLAPSE' | 'FATAL_LOSS';
  isMinimumCausalPath: boolean;
  physicalState: string;
  evidenceSummary: string;
  rawPacketHex: string;
  xPercent: number; // for SVG / layout positioning
  yPercent: number;
}

export interface GenealogyEdge {
  id: string;
  fromId: string;
  toId: string;
  fromLabel: string;
  toLabel: string;
  dependencyCategory: string; // e.g. "THERMAL / CONTROL"
  dependencyStrength: 'CRITICAL' | 'STRONG' | 'MODERATE';
  dependencyWeight: number; // e.g. 0.94
  temporalGapMs: number;
  temporalGapLabel: string; // e.g. "+084 MS"
  confidence: number; // e.g. 0.91
  supportingEvent: string;
  telemetryProof: string;
  intermediateState: string;
  physicalMechanism: string;
  counterfactualCheck: string;
  isMinimumCausalPath: boolean;
  temporalValidity: {
    passed: boolean;
    measuredGapMs: number;
    minPhysicalGapMs: number;
    speedOfLightConstraint: string;
    precedenceCheck: string;
  };
}

export interface FailureModeScenario {
  id: string;
  code: string;
  title: string;
  subsystem: string;
  severity: 'CRITICAL' | 'FATAL' | 'HIGH';
  incidentTimeRange: string;
  overallConfidence: number;
  uncertainty: string;
  rootSubsystem: string;
  finalSymptomSubsystem: string;
  summary: string;
  nodes: GenealogyNode[];
  edges: GenealogyEdge[];
  minimumCausalSummary: string;
  counterfactualImpact: string;
}

export const RECONSTRUCTION_SCENARIOS: FailureModeScenario[] = [
  {
    id: "fm-01-thermal-bus-collapse",
    code: "FM-THM-904",
    title: "Thermal Sensor Drift → Heater Saturation → Power Bus Brownout",
    subsystem: "THERMAL / EPS",
    severity: "FATAL",
    incidentTimeRange: "12:41:03 → 12:44:09",
    overallConfidence: 0.94,
    uncertainty: "± 0.02 (Bayesian Posterior)",
    rootSubsystem: "Thermal Sensor (P1-THM)",
    finalSymptomSubsystem: "UHF/S-Band Carrier (X6-COM)",
    summary: "Micro-fracture in thermistor solder joint during eclipse induced -64.2°C false reading, locking thermal survival heater to 100% duty, depleting battery below cutoff and tripping solid-state isolation breaker.",
    minimumCausalSummary: "Irreducible Occam's DAG contains 5 verified transitions. Pruned 3 independent telemetry echoes and noise loops.",
    counterfactualImpact: "Enforcing a software boundary clamp at -45°C severs edge P1-THM → E2-HTR, preserving 82% battery capacity and preventing all downstream brownouts.",
    nodes: [
      {
        id: "node-thm",
        code: "P1-THM",
        label: "THERMAL SENSOR",
        subsystemName: "Analog Thermistor Negative Rail",
        subsystemType: "THERMAL",
        stratum: "ROOT",
        confidence: 0.99,
        confidenceTier: "VERY HIGH",
        uncertaintyMargin: 0.008,
        telemetrySnippet: "THM_CH2_RAW = -64.2°C [FLOOR = -45.0°C]",
        rawReading: "-64.2°C (ADC Code 0x0012)",
        nominalRange: "-20.0°C to +35.0°C",
        timestamp: "12:41:03.000",
        timeOffsetMs: 0,
        timeOffsetLabel: "+000 MS",
        status: "ORIGIN_ANOMALY",
        isMinimumCausalPath: true,
        physicalState: "Negative Rail Saturation (-64.2°C)",
        evidenceSummary: "Thermistor bias resistance decayed due to solder-joint micro-fracture during eclipse exit. Erroneously reported deep freeze, bypassing deadband.",
        rawPacketHex: "0x54 0x48 0x4D 0x00 0x12 0xFF 0xAA",
        xPercent: 50,
        yPercent: 10
      },
      {
        id: "node-htr",
        code: "E2-HTR",
        label: "HEATER ACTUATOR",
        subsystemName: "Thermal Control Survival Strip",
        subsystemType: "CONTROL",
        stratum: "PROPAGATION",
        confidence: 0.94,
        confidenceTier: "HIGH",
        uncertaintyMargin: 0.015,
        telemetrySnippet: "HTR_PWR_RELAY = LOCKED_ON [DUTY = 100.0%]",
        rawReading: "100.0% Duty Cycle (28.4W continuous)",
        nominalRange: "15.0% - 35.0% Pulse-Width",
        timestamp: "12:41:03.084",
        timeOffsetMs: 84,
        timeOffsetLabel: "+084 MS",
        status: "CASCADED_FAULT",
        isMinimumCausalPath: true,
        physicalState: "Max Continuous Saturation (28.4W)",
        evidenceSummary: "Thermal manager firmware trusted corrupted reading and engaged survival heating strips continuously. Secondary software watchdog failed to timeout.",
        rawPacketHex: "0x48 0x54 0x52 0x64 0x00 0x1C 0xB2",
        xPercent: 24,
        yPercent: 37
      },
      {
        id: "node-bat",
        code: "B3-BAT",
        label: "BATTERY PACK",
        subsystemName: "Li-Ion 8.4V Storage Cell #2",
        subsystemType: "BATTERY",
        stratum: "PROPAGATION",
        confidence: 0.91,
        confidenceTier: "HIGH",
        uncertaintyMargin: 0.018,
        telemetrySnippet: "BAT_BANK_A_V = 2.78V [MIN = 3.10V]",
        rawReading: "2.78V per cell (Depth of Discharge > 94%)",
        nominalRange: "3.60V - 4.15V per cell",
        timestamp: "12:41:03.190",
        timeOffsetMs: 190,
        timeOffsetLabel: "+190 MS",
        status: "CASCADED_FAULT",
        isMinimumCausalPath: true,
        physicalState: "Under-Voltage Cutoff (2.78V)",
        evidenceSummary: "Continuous 28.4W heater draw during unilluminated orbital eclipse stripped battery reserves. Cell #2 reached chemical starvation cutoff.",
        rawPacketHex: "0x42 0x41 0x54 0x02 0x78 0x04 0xCC",
        xPercent: 76,
        yPercent: 37
      },
      {
        id: "node-prt",
        code: "C4-PRT",
        label: "PROTECTION BREAKER",
        subsystemName: "Solid-State Latching Current Switch",
        subsystemType: "PROTECTION",
        stratum: "DOWNSTREAM",
        confidence: 0.92,
        confidenceTier: "HIGH",
        uncertaintyMargin: 0.014,
        telemetrySnippet: "SS_FUSE_BANK_1 = TRIPPED_OPEN [I_PEAK = 7.8A]",
        rawReading: "TRIPPED / OPEN CIRCUIT (Latching)",
        nominalRange: "CLOSED (I < 4.5A continuous)",
        timestamp: "12:41:03.314",
        timeOffsetMs: 314,
        timeOffsetLabel: "+314 MS",
        status: "CRITICAL_COLLAPSE",
        isMinimumCausalPath: true,
        physicalState: "Solid-State Latch Tripped (7.8A Peak)",
        evidenceSummary: "Collapsing battery voltage induced DC-DC boost converter to pull disproportionate current to maintain regulated rails, tripping latching breaker.",
        rawPacketHex: "0x50 0x52 0x54 0xFF 0x07 0x80 0xDE",
        xPercent: 24,
        yPercent: 64
      },
      {
        id: "node-bus",
        code: "P5-BUS",
        label: "POWER BUS",
        subsystemName: "Regulated 5V Main Power Rail",
        subsystemType: "POWER_BUS",
        stratum: "DOWNSTREAM",
        confidence: 0.95,
        confidenceTier: "VERY HIGH",
        uncertaintyMargin: 0.011,
        telemetrySnippet: "V_MAIN_5V = 0.84V [REG_TARGET = 5.00V]",
        rawReading: "0.84V (Zero regulation / hard dropout)",
        nominalRange: "4.95V - 5.05V regulated",
        timestamp: "12:41:03.480",
        timeOffsetMs: 480,
        timeOffsetLabel: "+480 MS",
        status: "CRITICAL_COLLAPSE",
        isMinimumCausalPath: true,
        physicalState: "Regulated Rail Dropout (0.84V)",
        evidenceSummary: "Solid-state breaker isolation severed primary bus input. Downstream capacitors emptied in 34ms, dropping all non-isolated logic into brownout.",
        rawPacketHex: "0x42 0x55 0x53 0x00 0x84 0x00 0x11",
        xPercent: 76,
        yPercent: 64
      },
      {
        id: "node-com",
        code: "X6-COM",
        label: "FINAL SYMPTOM",
        subsystemName: "UHF/S-Band Carrier Transceiver",
        subsystemType: "COMMUNICATION",
        stratum: "SYMPTOM",
        confidence: 0.98,
        confidenceTier: "VERY HIGH",
        uncertaintyMargin: 0.005,
        telemetrySnippet: "FATAL: RF_CARRIER_MUTE [GROUND AOS = LOST]",
        rawReading: "0 mW (Unmodulated / Carrier Dead)",
        nominalRange: "2000 mW (+33 dBm RF Out)",
        timestamp: "12:44:09.000",
        timeOffsetMs: 620,
        timeOffsetLabel: "+620 MS",
        status: "FATAL_LOSS",
        isMinimumCausalPath: true,
        physicalState: "Carrier Silence / Ground LOS (0 mW)",
        evidenceSummary: "Microcontroller supervisory circuit triggered undervoltage shutdown. RF power amplifier lost bias gate, immediately severing beacon to ground stations.",
        rawPacketHex: "0x43 0x4F 0x4D 0x00 0x00 0xFA 0x00",
        xPercent: 50,
        yPercent: 90
      }
    ],
    edges: [
      {
        id: "edge-thm-htr",
        fromId: "node-thm",
        toId: "node-htr",
        fromLabel: "THERMAL SENSOR",
        toLabel: "HEATER ACTUATOR",
        dependencyCategory: "THERMAL / CONTROL",
        dependencyStrength: "CRITICAL",
        dependencyWeight: 0.94,
        temporalGapMs: 84,
        temporalGapLabel: "+084 MS",
        confidence: 0.91,
        supportingEvent: "HEATER STATE → FORCED 100% DUTY OVERRIDE",
        telemetryProof: "T-17 = INVALID · ADC 0x0012 (-64.2°C)",
        intermediateState: "PID thermal loop saturated; software hysteresis bypass triggered",
        physicalMechanism: "Negative temperature coefficient thermistor rail drift forced firmware to command survival heater relay at full wattage.",
        counterfactualCheck: "If thermistor bounded at -45°C floor → Heater remains in 20% safe pulse fallback mode.",
        isMinimumCausalPath: true,
        temporalValidity: {
          passed: true,
          measuredGapMs: 84,
          minPhysicalGapMs: 5,
          speedOfLightConstraint: "Bus length 0.35m (1.17ns physical limit) << 84ms loop delay",
          precedenceCheck: "T(node-thm)=12:41:03.000 < T(node-htr)=12:41:03.084 (Δt = +84ms > 0)"
        }
      },
      {
        id: "edge-htr-bat",
        fromId: "node-htr",
        toId: "node-bat",
        fromLabel: "HEATER ACTUATOR",
        toLabel: "BATTERY PACK",
        dependencyCategory: "POWER / DRAIN",
        dependencyStrength: "CRITICAL",
        dependencyWeight: 0.96,
        temporalGapMs: 106,
        temporalGapLabel: "+190 MS",
        confidence: 0.94,
        supportingEvent: "BATTERY CELL #2 DISCHARGE RATE → 4.2C (> 0.5C LIMIT)",
        telemetryProof: "HTR_PWR = 28.4W continuous · BAT_V = 2.78V (UV Trip)",
        intermediateState: "Unilluminated orbital eclipse; solar array producing 0.0W",
        physicalMechanism: "Continuous 28.4W Joule heating exhausted electrochemical reserves within 640s of orbital shadow.",
        counterfactualCheck: "If heater throttled to 20% pulse → Battery depth of discharge remains < 42% at eclipse exit.",
        isMinimumCausalPath: true,
        temporalValidity: {
          passed: true,
          measuredGapMs: 106,
          minPhysicalGapMs: 20,
          speedOfLightConstraint: "Direct copper harness coupling; chemical depletion lag observed",
          precedenceCheck: "T(node-htr)=12:41:03.084 < T(node-bat)=12:41:03.190 (Δt = +106ms > 0)"
        }
      },
      {
        id: "edge-bat-prt",
        fromId: "node-bat",
        toId: "node-prt",
        fromLabel: "BATTERY PACK",
        toLabel: "PROTECTION BREAKER",
        dependencyCategory: "ELECTRICAL / CURRENT",
        dependencyStrength: "STRONG",
        dependencyWeight: 0.88,
        temporalGapMs: 124,
        temporalGapLabel: "+314 MS",
        confidence: 0.89,
        supportingEvent: "DC-DC BOOST CURRENT CONVERTER → PEAK 7.8A",
        telemetryProof: "BAT_V = 2.78V → BOOST_I = 7.8A (Threshold = 5.0A)",
        intermediateState: "Constant power regulation: I_in = P_load / V_bat spikes as V_bat drops",
        physicalMechanism: "Switched-mode boost regulator drew inverse proportional current as input voltage plummeted, surpassing breaker limit.",
        counterfactualCheck: "With V_bat > 3.6V → Peak converter current peaks at 2.1A (well below 5.0A trip ceiling).",
        isMinimumCausalPath: true,
        temporalValidity: {
          passed: true,
          measuredGapMs: 124,
          minPhysicalGapMs: 10,
          speedOfLightConstraint: "Analog comparator hysteresis timer (120ms integration time)",
          precedenceCheck: "T(node-bat)=12:41:03.190 < T(node-prt)=12:41:03.314 (Δt = +124ms > 0)"
        }
      },
      {
        id: "edge-prt-bus",
        fromId: "node-prt",
        toId: "node-bus",
        fromLabel: "PROTECTION BREAKER",
        toLabel: "POWER BUS",
        dependencyCategory: "POWER / ISOLATION",
        dependencyStrength: "CRITICAL",
        dependencyWeight: 0.98,
        temporalGapMs: 166,
        temporalGapLabel: "+480 MS",
        confidence: 0.96,
        supportingEvent: "LATCHING MOSFET SWITCH → TRIPPED OPEN",
        telemetryProof: "SS_FUSE_BANK_1 = OPEN · V_MAIN_5V = 0.84V",
        intermediateState: "Decoupling capacitor bank discharge time constant tau = R*C = 34ms",
        physicalMechanism: "Solid-state breaker latched open, instantly uncoupling battery power source from 5V distribution bus.",
        counterfactualCheck: "If breaker remains closed → Bus voltage stays at 5.02V nominal potential.",
        isMinimumCausalPath: true,
        temporalValidity: {
          passed: true,
          measuredGapMs: 166,
          minPhysicalGapMs: 5,
          speedOfLightConstraint: "Direct gate discharge + capacitor depletion timeline",
          precedenceCheck: "T(node-prt)=12:41:03.314 < T(node-bus)=12:41:03.480 (Δt = +166ms > 0)"
        }
      },
      {
        id: "edge-bus-com",
        fromId: "node-bus",
        toId: "node-com",
        fromLabel: "POWER BUS",
        toLabel: "FINAL SYMPTOM",
        dependencyCategory: "LOGIC / SUPERVISORY",
        dependencyStrength: "CRITICAL",
        dependencyWeight: 0.99,
        temporalGapMs: 140,
        temporalGapLabel: "+620 MS",
        confidence: 0.98,
        supportingEvent: "MICROCONTROLLER BROWNOUT RESET → TX_ENABLE = LOW",
        telemetryProof: "V_MAIN_5V < 2.70V (POR Trigger) · RF_OUT = 0.0 mW",
        intermediateState: "Ground station AOS pass window lost; carrier frequency unmodulated",
        physicalMechanism: "Power-on Reset (POR) supervisor de-asserted microcontroller run-pin and disabled RF amplifier gate bias.",
        counterfactualCheck: "If 5V bus maintained → Transceiver completes ground pass with 100% telemetry downlink.",
        isMinimumCausalPath: true,
        temporalValidity: {
          passed: true,
          measuredGapMs: 140,
          minPhysicalGapMs: 2,
          speedOfLightConstraint: "Supervisory IC hardware POR delay circuit",
          precedenceCheck: "T(node-bus)=12:41:03.480 < T(node-com)=12:44:09.000 (Δt = +140ms > 0)"
        }
      },
      {
        id: "edge-thm-bus-alt",
        fromId: "node-thm",
        toId: "node-bus",
        fromLabel: "THERMAL SENSOR",
        toLabel: "POWER BUS",
        dependencyCategory: "DIRECT THERMAL COUPLING",
        dependencyStrength: "MODERATE",
        dependencyWeight: 0.42,
        temporalGapMs: 480,
        temporalGapLabel: "+480 MS",
        confidence: 0.38,
        supportingEvent: "INDIRECT HEAT GRADIENT ON DC-DC CHOPPER",
        telemetryProof: "THERMAL_DISSIPATION = 1.4W across board",
        intermediateState: "Ambient temperature gradient across PCB",
        physicalMechanism: "Minor thermal coefficient shift in DC-DC reference diode (Secondary, non-critical correlation).",
        counterfactualCheck: "Removing thermal gradient does NOT prevent bus drop if battery is exhausted.",
        isMinimumCausalPath: false,
        temporalValidity: {
          passed: true,
          measuredGapMs: 480,
          minPhysicalGapMs: 100,
          speedOfLightConstraint: "Thermal conduction via FR4 substrate",
          precedenceCheck: "T(node-thm) < T(node-bus) (Δt = +480ms > 0)"
        }
      }
    ]
  },
  {
    id: "fm-02-seu-watchdog-spin",
    code: "FM-ADCS-812",
    title: "SEU Bit-Flip → Watchdog Timer Lockup → Reaction Wheel Desat Spin",
    subsystem: "ADCS / OBC",
    severity: "CRITICAL",
    incidentTimeRange: "08:15:22 → 08:18:40",
    overallConfidence: 0.92,
    uncertainty: "± 0.03 (SAA Radiation Pass)",
    rootSubsystem: "On-Board Computer RAM (P1-OBC)",
    finalSymptomSubsystem: "Star Tracker Quaternion Lock (A5-STR)",
    summary: "Single Event Upset during South Atlantic Anomaly passage flipped memory bit in ADCS control loop, freezing watchdog interrupt and causing runaway reaction wheel spin-up.",
    minimumCausalSummary: "Irreducible Occam's DAG contains 4 core nodes from memory SEU to attitude loss.",
    counterfactualImpact: "EDAC scrubbing cycle would have corrected single-bit error within 10ms, preventing watchdog freeze.",
    nodes: [
      {
        id: "node-seu-obc",
        code: "P1-OBC",
        label: "OBC MEMORY BANK",
        subsystemName: "Static RAM Register 0x3F80",
        subsystemType: "CONTROL",
        stratum: "ROOT",
        confidence: 0.98,
        confidenceTier: "VERY HIGH",
        uncertaintyMargin: 0.01,
        telemetrySnippet: "SEU_ERR_FLAG = TRUE [BIT_FLIP @ 0x3F802A]",
        rawReading: "Register Bit 14 Inverted (1 → 0)",
        nominalRange: "EDAC Parity Clean",
        timestamp: "08:15:22.000",
        timeOffsetMs: 0,
        timeOffsetLabel: "+000 MS",
        status: "ORIGIN_ANOMALY",
        isMinimumCausalPath: true,
        physicalState: "Single Event Upset (Heavy Ion Ionization)",
        evidenceSummary: "High-energy proton passage in South Atlantic Anomaly deposited ionization charge, flipping pointer in task scheduler.",
        rawPacketHex: "0x4F 0x42 0x43 0x3F 0x80 0x2A 0xEE",
        xPercent: 50,
        yPercent: 10
      },
      {
        id: "node-seu-wdg",
        code: "W2-WDG",
        label: "WATCHDOG TIMER",
        subsystemName: "Hardware Watchdog Strober",
        subsystemType: "CONTROL",
        stratum: "PROPAGATION",
        confidence: 0.93,
        confidenceTier: "HIGH",
        uncertaintyMargin: 0.02,
        telemetrySnippet: "WDG_STROBE_MISSED = 3 [TIMER_EXPIRE = 250ms]",
        rawReading: "3 Missed Refresh Pulses",
        nominalRange: "Strobe interval < 50ms",
        timestamp: "08:15:22.080",
        timeOffsetMs: 80,
        timeOffsetLabel: "+080 MS",
        status: "CASCADED_FAULT",
        isMinimumCausalPath: true,
        physicalState: "Interrupt Vector Hang (Task Deadlock)",
        evidenceSummary: "Corrupted scheduler pointer branched execution into infinite spinlock, halting regular watchdog kick routines.",
        rawPacketHex: "0x57 0x44 0x47 0x03 0xFA 0x00 0x1A",
        xPercent: 30,
        yPercent: 37
      },
      {
        id: "node-seu-rw",
        code: "R3-RWL",
        label: "REACTION WHEEL",
        subsystemName: "Z-Axis Reaction Wheel Motor",
        subsystemType: "ADCS",
        stratum: "DOWNSTREAM",
        confidence: 0.91,
        confidenceTier: "HIGH",
        uncertaintyMargin: 0.025,
        telemetrySnippet: "RWL_RPM_Z = 6500 [SATURATION_CEILING = 6000]",
        rawReading: "6500 RPM (Max Saturation Limit)",
        nominalRange: "± 2500 RPM Nominal",
        timestamp: "08:15:22.250",
        timeOffsetMs: 250,
        timeOffsetLabel: "+250 MS",
        status: "CRITICAL_COLLAPSE",
        isMinimumCausalPath: true,
        physicalState: "Runaway Torque Drive (Momentum Saturation)",
        evidenceSummary: "Frozen DAC register held full-scale positive torque command on Z-axis brushless DC motor without closed-loop damping.",
        rawPacketHex: "0x52 0x57 0x4C 0x19 0x64 0xFF 0x33",
        xPercent: 70,
        yPercent: 64
      },
      {
        id: "node-seu-str",
        code: "A5-STR",
        label: "FINAL SYMPTOM",
        subsystemName: "Autonomous Star Tracker Head",
        subsystemType: "ADCS",
        stratum: "SYMPTOM",
        confidence: 0.96,
        confidenceTier: "VERY HIGH",
        uncertaintyMargin: 0.008,
        telemetrySnippet: "FATAL: STR_QUAT_LOST [RATE > 12.5 deg/sec]",
        rawReading: "18.4 deg/s Body Angular Rate (Smear)",
        nominalRange: "< 0.5 deg/sec Star Lock Rate",
        timestamp: "08:18:40.000",
        timeOffsetMs: 520,
        timeOffsetLabel: "+520 MS",
        status: "FATAL_LOSS",
        isMinimumCausalPath: true,
        physicalState: "Optical Smear & Attitude Loss (18.4 deg/s)",
        evidenceSummary: "Spacecraft body rate surpassed optical tracking bandwidth, resulting in loss of pointing reference and solar array misalignment.",
        rawPacketHex: "0x53 0x54 0x52 0x00 0x12 0x50 0x99",
        xPercent: 50,
        yPercent: 90
      }
    ],
    edges: [
      {
        id: "edge-obc-wdg",
        fromId: "node-seu-obc",
        toId: "node-seu-wdg",
        fromLabel: "OBC MEMORY BANK",
        toLabel: "WATCHDOG TIMER",
        dependencyCategory: "FIRMWARE / EXECUTION",
        dependencyStrength: "CRITICAL",
        dependencyWeight: 0.95,
        temporalGapMs: 80,
        temporalGapLabel: "+080 MS",
        confidence: 0.93,
        supportingEvent: "TASK SCHEDULER SPINLOCK DETECTED",
        telemetryProof: "PC = 0x3F802A (Invalid Loop) · WDG_PULSE = HALTED",
        intermediateState: "Execution thread trapped in unhandled exception trap",
        physicalMechanism: "Single-bit corruption modified return address register on stack, causing thread starvation for supervisory service.",
        counterfactualCheck: "If memory parity trap triggered → OBC performs safe software warm reset in 12ms.",
        isMinimumCausalPath: true,
        temporalValidity: {
          passed: true,
          measuredGapMs: 80,
          minPhysicalGapMs: 1,
          speedOfLightConstraint: "On-chip bus latency < 10ns",
          precedenceCheck: "T(OBC) < T(WDG) (Δt = +80ms > 0)"
        }
      },
      {
        id: "edge-wdg-rw",
        fromId: "node-seu-wdg",
        toId: "node-seu-rw",
        fromLabel: "WATCHDOG TIMER",
        toLabel: "REACTION WHEEL",
        dependencyCategory: "ACTUATOR / PWM CONTROL",
        dependencyStrength: "CRITICAL",
        dependencyWeight: 0.92,
        temporalGapMs: 170,
        temporalGapLabel: "+250 MS",
        confidence: 0.90,
        supportingEvent: "PWM MOTOR DRIVER LATCHED AT 100% TORQUE",
        telemetryProof: "DAC_OUT = 3.3V (Full Scale) · MOTOR_I = 1.4A",
        intermediateState: "PWM controller failed to receive null-torque timeout packet",
        physicalMechanism: "Hardware bridge maintained static state without watchdog reset pulse, accelerating reaction wheel to maximum speed.",
        counterfactualCheck: "With hardware fail-silent watchdog → Motor bridge disengages in 50ms.",
        isMinimumCausalPath: true,
        temporalValidity: {
          passed: true,
          measuredGapMs: 170,
          minPhysicalGapMs: 15,
          speedOfLightConstraint: "RS-422 differential bus packet timeout",
          precedenceCheck: "T(WDG) < T(RW) (Δt = +170ms > 0)"
        }
      },
      {
        id: "edge-rw-str",
        fromId: "node-seu-rw",
        toId: "node-seu-str",
        fromLabel: "REACTION WHEEL",
        toLabel: "FINAL SYMPTOM",
        dependencyCategory: "DYNAMICS / OPTICS",
        dependencyStrength: "CRITICAL",
        dependencyWeight: 0.97,
        temporalGapMs: 270,
        temporalGapLabel: "+520 MS",
        confidence: 0.95,
        supportingEvent: "ANGULAR MOMENTUM TRANSFERRED TO CRAFT BODY",
        telemetryProof: "OMEGA_Z = 18.4 deg/s · STR_CONF = 0.00",
        intermediateState: "Reaction wheel flywheel reached mechanical bearing limit",
        physicalMechanism: "Wheel saturation dumped angular momentum into bus structure, spinning spacecraft past star tracker slew rate ceiling.",
        counterfactualCheck: "If magnetic torquers activated to desaturate → Body rate capped at 0.2 deg/s.",
        isMinimumCausalPath: true,
        temporalValidity: {
          passed: true,
          measuredGapMs: 270,
          minPhysicalGapMs: 50,
          speedOfLightConstraint: "Rigid body moment of inertia integration",
          precedenceCheck: "T(RW) < T(STR) (Δt = +270ms > 0)"
        }
      }
    ]
  },
  {
    id: "fm-03-shunt-regulator-trip",
    code: "FM-EPS-407",
    title: "Solar Array Shunt Oscillation → High Voltage Transient → Breaker Trip",
    subsystem: "ELECTRICAL POWER",
    severity: "HIGH",
    incidentTimeRange: "17:02:11 → 17:04:30",
    overallConfidence: 0.91,
    uncertainty: "± 0.02 (Solar Array Flash)",
    rootSubsystem: "Sequential Shunt Unit (S1-SSU)",
    finalSymptomSubsystem: "Payload Instrument Rail (L4-PLD)",
    summary: "Thermal shock on solar array deployment caused parasitic capacitance ring in Sequential Shunt Unit, producing 38V spike that triggered secondary over-voltage crowbar.",
    minimumCausalSummary: "Irreducible Occam's DAG contains 4 nodes from SSU ringing to payload brownout.",
    counterfactualImpact: "Adding RC snubber network damps transient Q-factor below 1.2, eliminating over-voltage crowbar trip.",
    nodes: [
      {
        id: "node-ssu",
        code: "S1-SSU",
        label: "SHUNT REGULATOR",
        subsystemName: "Sequential Shunt Unit Stage 3",
        subsystemType: "POWER_BUS",
        stratum: "ROOT",
        confidence: 0.97,
        confidenceTier: "VERY HIGH",
        uncertaintyMargin: 0.012,
        telemetrySnippet: "SSU_RING_FREQ = 142 kHz [V_PEAK = 38.4V]",
        rawReading: "38.4V Transient Ringing Spike",
        nominalRange: "28.0V ± 0.5V Regulated",
        timestamp: "17:02:11.000",
        timeOffsetMs: 0,
        timeOffsetLabel: "+000 MS",
        status: "ORIGIN_ANOMALY",
        isMinimumCausalPath: true,
        physicalState: "Parasitic LC Resonant Ringing (38.4V)",
        evidenceSummary: "Thermal contraction of bypass diodes shifted phase margin into positive feedback loop upon sudden illumination.",
        rawPacketHex: "0x53 0x53 0x55 0x26 0x28 0x00 0x88",
        xPercent: 50,
        yPercent: 10
      },
      {
        id: "node-ssu-ovp",
        code: "O2-OVP",
        label: "CROWBAR CIRCUIT",
        subsystemName: "Over-Voltage Crowbar SCR",
        subsystemType: "PROTECTION",
        stratum: "PROPAGATION",
        confidence: 0.92,
        confidenceTier: "HIGH",
        uncertaintyMargin: 0.018,
        telemetrySnippet: "SCR_CROWBAR_FIRE = TRUE [THRESHOLD = 34.0V]",
        rawReading: "Silicon-Controlled Rectifier Latched ON",
        nominalRange: "High-Z (Unfired)",
        timestamp: "17:02:11.045",
        timeOffsetMs: 45,
        timeOffsetLabel: "+045 MS",
        status: "CASCADED_FAULT",
        isMinimumCausalPath: true,
        physicalState: "Crowbar Clamping Shunt Fired",
        evidenceSummary: "Fast analog zener trigger fired SCR gate within 45 microseconds of voltage exceeding 34.0V ceiling.",
        rawPacketHex: "0x4F 0x56 0x50 0x01 0x22 0x00 0x55",
        xPercent: 30,
        yPercent: 37
      },
      {
        id: "node-ssu-brk",
        code: "B3-BRK",
        label: "PRIMARY ISOLATOR",
        subsystemName: "Upstream Main Breaker Switch",
        subsystemType: "PROTECTION",
        stratum: "DOWNSTREAM",
        confidence: 0.89,
        confidenceTier: "MODERATE",
        uncertaintyMargin: 0.022,
        telemetrySnippet: "BRK_UPSTREAM = OPEN [SHORT_CIRCUIT_I = 14.2A]",
        rawReading: "OPEN / TRIPPED (I > 12.0A)",
        nominalRange: "CLOSED",
        timestamp: "17:02:11.120",
        timeOffsetMs: 120,
        timeOffsetLabel: "+120 MS",
        status: "CRITICAL_COLLAPSE",
        isMinimumCausalPath: true,
        physicalState: "Upstream Breaker Cleared Crowbar Short",
        evidenceSummary: "Direct short created by crowbar circuit pulled heavy current from battery before breaker opened to isolate bus.",
        rawPacketHex: "0x42 0x52 0x4B 0xFF 0x0E 0x20 0x11",
        xPercent: 70,
        yPercent: 64
      },
      {
        id: "node-ssu-pld",
        code: "L4-PLD",
        label: "FINAL SYMPTOM",
        subsystemName: "Hyperspectral Imager Payload",
        subsystemType: "PAYLOAD",
        stratum: "SYMPTOM",
        confidence: 0.95,
        confidenceTier: "VERY HIGH",
        uncertaintyMargin: 0.009,
        telemetrySnippet: "FATAL: PLD_POWER_DROPOUT [DATA_STREAM = CORRUPT]",
        rawReading: "0.0V Rail / Uncommanded Power Cut",
        nominalRange: "28.0V Regulated",
        timestamp: "17:04:30.000",
        timeOffsetMs: 340,
        timeOffsetLabel: "+340 MS",
        status: "FATAL_LOSS",
        isMinimumCausalPath: true,
        physicalState: "Uncommanded Imager Shutdown & Data Loss",
        evidenceSummary: "Payload lost unbuffered primary bus power midway through high-rate downlink session.",
        rawPacketHex: "0x50 0x4C 0x44 0x00 0x00 0xEE 0x77",
        xPercent: 50,
        yPercent: 90
      }
    ],
    edges: [
      {
        id: "edge-ssu-ovp",
        fromId: "node-ssu",
        toId: "node-ssu-ovp",
        fromLabel: "SHUNT REGULATOR",
        toLabel: "CROWBAR CIRCUIT",
        dependencyCategory: "VOLTAGE / TRIGGER",
        dependencyStrength: "CRITICAL",
        dependencyWeight: 0.96,
        temporalGapMs: 45,
        temporalGapLabel: "+045 MS",
        confidence: 0.94,
        supportingEvent: "ZENER DIODE BREAKDOWN OVERRIDE",
        telemetryProof: "V_SSU = 38.4V > 34.0V Trigger Point",
        intermediateState: "Capacitive displacement current through gate junction",
        physicalMechanism: "Over-voltage condition exceeded avalanche breakdown voltage of protective clamp diode.",
        counterfactualCheck: "If snubber installed → Peak voltage remains < 31.0V (Crowbar dormant).",
        isMinimumCausalPath: true,
        temporalValidity: {
          passed: true,
          measuredGapMs: 45,
          minPhysicalGapMs: 1,
          speedOfLightConstraint: "Analog gate firing delay",
          precedenceCheck: "T(SSU) < T(OVP) (Δt = +45ms > 0)"
        }
      },
      {
        id: "edge-ovp-brk",
        fromId: "node-ssu-ovp",
        toId: "node-ssu-brk",
        fromLabel: "CROWBAR CIRCUIT",
        toLabel: "PRIMARY ISOLATOR",
        dependencyCategory: "CURRENT / DRAIN",
        dependencyStrength: "CRITICAL",
        dependencyWeight: 0.91,
        temporalGapMs: 75,
        temporalGapLabel: "+120 MS",
        confidence: 0.89,
        supportingEvent: "CROWBAR LOW-IMPEDANCE SHORT TO GROUND",
        telemetryProof: "I_CROWBAR = 14.2A (Duration = 75ms)",
        intermediateState: "SCR low-resistance forward conduction state",
        physicalMechanism: "Crowbar deliberately created hard short to protect sensitive electronics, forcing upstream breaker to trip.",
        counterfactualCheck: "If crowbar reset circuitry was auto-recovering → Breaker remains closed.",
        isMinimumCausalPath: true,
        temporalValidity: {
          passed: true,
          measuredGapMs: 75,
          minPhysicalGapMs: 10,
          speedOfLightConstraint: "Magnetic trip solenoid integration time",
          precedenceCheck: "T(OVP) < T(BRK) (Δt = +75ms > 0)"
        }
      },
      {
        id: "edge-brk-pld",
        fromId: "node-ssu-brk",
        toId: "node-ssu-pld",
        fromLabel: "PRIMARY ISOLATOR",
        toLabel: "FINAL SYMPTOM",
        dependencyCategory: "POWER / DROPOUT",
        dependencyStrength: "CRITICAL",
        dependencyWeight: 0.98,
        temporalGapMs: 220,
        temporalGapLabel: "+340 MS",
        confidence: 0.95,
        supportingEvent: "PAYLOAD FEEDER LINE DISCONNECTED",
        telemetryProof: "V_PLD_IN = 0.0V · DATA_ERR_COUNT = 9999",
        intermediateState: "Payload DC-DC internal hold-up capacitors discharged",
        physicalMechanism: "Breaker isolation eliminated voltage rail to payload, corrupting active sensor frame memory.",
        counterfactualCheck: "With dedicated supercapacitor backup → Imager completes safe frame save.",
        isMinimumCausalPath: true,
        temporalValidity: {
          passed: true,
          measuredGapMs: 220,
          minPhysicalGapMs: 2,
          speedOfLightConstraint: "Wire harness propagation delay",
          precedenceCheck: "T(BRK) < T(PLD) (Δt = +220ms > 0)"
        }
      }
    ]
  }
];
