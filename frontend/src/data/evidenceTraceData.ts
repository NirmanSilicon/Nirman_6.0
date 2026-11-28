export interface EvidenceEventRow {
  id: string;
  timestamp: string;
  timeOffsetMs: number;
  event: string;
  telemetrySnippet: string;
  rawReading: string;
  nominalRange: string;
  causalRole: 'PRIMARY' | 'PROPAGATION' | 'CONSEQUENCE';
  subsystem: string;
  subsystemCode: string;
  confidence: number;
  uncertaintyMargin: number;
  failureModeCode: string;
  failureModeTitle: string;
  telemetryGap: {
    hasGap: boolean;
    gapDurationMs: number;
    packetJitterMs: number;
    interpolated: boolean;
    gapFlagReason?: string;
  };
  eventExtractionDetail: {
    sourcePacketHex: string;
    parsingRule: string;
    sensorAddress: string;
    extractionConfidence: number;
    clockSource: string;
    driftCorrectionMs: number;
  };
}

export interface CausalEvidenceLink {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromLabel: string;
  toLabel: string;
  dependency: string; // e.g. "power", "thermal_control", "energy_storage", "fault_isolation"
  strength: 'critical' | 'strong' | 'moderate';
  temporalGapLabel: string; // e.g. "+004 ms", "+084 ms"
  temporalGapMs: number;
  observedIntermediate: string; // e.g. "power bus dropped", "heater continuous ON"
  telemetrySupport: string; // e.g. "12.1 V → 0.0 V", "-240.2°C → 28.4W"
  confidence: number; // e.g. 0.96
  uncertaintyMargin: number; // e.g. 0.015
  whyEngineBelievesThis: {
    physicalProof: string;
    supportingTelemetryDump: string;
    firmwareTraceLog: string;
    firstPrinciplesLaw: string;
    counterfactualFalsification: string;
  };
  timestampAlignment: {
    fromGpsEpoch: string;
    toGpsEpoch: string;
    clockSkewMs: number;
    speedOfLightDelayMs: number;
    precedenceVerified: boolean;
  };
  failureModeClassification: {
    fmeaCode: string;
    standard: 'ECSS-Q-ST-30-02C' | 'NASA-STD-8729.1';
    severity: 'CATASTROPHIC' | 'CRITICAL' | 'MAJOR';
    criticalityRank: number;
  };
}

export interface CompetingHypothesisSummary {
  eventId: string;
  component: string;
  score: number;
  confidenceTier: 'HIGH CONFIDENCE' | 'MODERATE CONFIDENCE' | 'LOW CONFIDENCE' | 'INSUFFICIENT EVIDENCE';
  marginFromTop: number;
  rationale: string;
}

export interface MissingEvidenceItem {
  sourceEventId: string;
  targetEventId: string;
  missingComponents: string[];
  severity: string;
  description: string;
}

export interface EvidenceTraceScenario {
  id: string;
  code: string;
  title: string;
  incidentTimeRange: string;
  overallConfidence: number;
  confidenceTier?: 'HIGH CONFIDENCE' | 'MODERATE CONFIDENCE' | 'LOW CONFIDENCE' | 'INSUFFICIENT EVIDENCE';
  patternStatus?: 'KNOWN PATTERN' | 'UNKNOWN / OUT-OF-DISTRIBUTION';
  isAmbiguousRoot?: boolean;
  competingHypotheses?: CompetingHypothesisSummary[];
  missingEvidence?: MissingEvidenceItem[];
  events: EvidenceEventRow[];
  links: CausalEvidenceLink[];
}

export const EVIDENCE_TRACE_SCENARIOS: EvidenceTraceScenario[] = [
  {
    id: "thermal_sensor_t17",
    code: "FM-THM-904",
    title: "Thermal Sensor T-17 Runaway & Bus Collapse",
    incidentTimeRange: "12:41:03 → 12:44:09 UTC",
    overallConfidence: 0.96,
    confidenceTier: "HIGH CONFIDENCE",
    patternStatus: "KNOWN PATTERN",
    isAmbiguousRoot: false,
    competingHypotheses: [
      {
        eventId: "evt-1",
        component: "Thermal Sensor T-17",
        score: 0.98,
        confidenceTier: "HIGH CONFIDENCE",
        marginFromTop: 0.0,
        rationale: "Decisive physical open-circuit anomaly with 0.35 lead margin over subsequent heater trigger"
      },
      {
        eventId: "evt-2",
        component: "Heater Controller",
        score: 0.63,
        confidenceTier: "MODERATE CONFIDENCE",
        marginFromTop: 0.35,
        rationale: "Secondary reaction driven directly by unconstrained PID saturation loop"
      }
    ],
    missingEvidence: [],
    events: [
      {
        id: "evt-1",
        timestamp: "12:41:03",
        timeOffsetMs: 0,
        event: "T-17 invalid",
        telemetrySnippet: "-240.2°C (ADC open-circuit: 0x0012)",
        rawReading: "-240.2°C",
        nominalRange: "-15.0°C to +45.0°C",
        causalRole: "PRIMARY",
        subsystem: "Thermal Management System",
        subsystemCode: "THM-SEN-17",
        confidence: 0.98,
        uncertaintyMargin: 0.01,
        failureModeCode: "FM-THM-904-A",
        failureModeTitle: "Thermistor Solder Fatigue Open-Circuit",
        telemetryGap: {
          hasGap: false,
          gapDurationMs: 0,
          packetJitterMs: 1.2,
          interpolated: false
        },
        eventExtractionDetail: {
          sourcePacketHex: "0x54 0x48 0x4D 0x00 0x12 0xFF 0xAA",
          parsingRule: "ECSS_TM_FRAME_TYPE_03 (Payload Housekeeping)",
          sensorAddress: "I2C_BUS_1:0x48 [RTD_BAY_3]",
          extractionConfidence: 0.99,
          clockSource: "GPS Master PPS (NavIC Lock)",
          driftCorrectionMs: 0.04
        }
      },
      {
        id: "evt-2",
        timestamp: "12:41:08",
        timeOffsetMs: 84,
        event: "Heater disabled / Continuous Override ON",
        telemetrySnippet: "CMD_HTR_OVERRIDE=ON (Duty 100% / 28.4W)",
        rawReading: "28.4W (Full Saturation)",
        nominalRange: "0.0W to 4.2W (Pulsed)",
        causalRole: "PROPAGATION",
        subsystem: "Thermal Control Unit",
        subsystemCode: "THM-CTRL-01",
        confidence: 0.97,
        uncertaintyMargin: 0.015,
        failureModeCode: "FM-THM-802-C",
        failureModeTitle: "Survival Heater Unbounded Saturation",
        telemetryGap: {
          hasGap: true,
          gapDurationMs: 38,
          packetJitterMs: 4.8,
          interpolated: true,
          gapFlagReason: "Minor ground station antenna handover delay (+38ms gap filled via Kalman filter)"
        },
        eventExtractionDetail: {
          sourcePacketHex: "0x48 0x54 0x52 0x64 0x00 0x1C 0xB2",
          parsingRule: "ECSS_TM_FRAME_TYPE_01 (OBC Telemetry)",
          sensorAddress: "SPI_BUS_0:0x12 [HTR_DRIVER_L99]",
          extractionConfidence: 0.98,
          clockSource: "GPS Master PPS",
          driftCorrectionMs: -0.02
        }
      },
      {
        id: "evt-3",
        timestamp: "12:42:21",
        timeOffsetMs: 274,
        event: "Battery +8°C / Cell Starvation Under-Voltage",
        telemetrySnippet: "V_CELL2=2.78V, Temp=38.4°C (+8°C ΔT)",
        rawReading: "2.78V / 38.4°C",
        nominalRange: "3.60V to 4.20V / <25.0°C",
        causalRole: "PROPAGATION",
        subsystem: "Electrical Power System",
        subsystemCode: "EPS-BAT-02",
        confidence: 0.95,
        uncertaintyMargin: 0.02,
        failureModeCode: "FM-EPS-301-B",
        failureModeTitle: "Cell Chemical Starvation & Thermal Runaway",
        telemetryGap: {
          hasGap: false,
          gapDurationMs: 0,
          packetJitterMs: 0.8,
          interpolated: false
        },
        eventExtractionDetail: {
          sourcePacketHex: "0x42 0x41 0x54 0x02 0x78 0x04 0xCC",
          parsingRule: "ECSS_TM_FRAME_TYPE_02 (Battery Gauge ADC)",
          sensorAddress: "SMBUS:0x16 [BQ40Z80_GAUGE]",
          extractionConfidence: 0.97,
          clockSource: "GPS Master PPS",
          driftCorrectionMs: 0.01
        }
      },
      {
        id: "evt-4",
        timestamp: "12:44:03",
        timeOffsetMs: 588,
        event: "Bus 0V / Solid-State Breaker Trip",
        telemetrySnippet: "V_BUS_PRI=0.04V, I_LATCH=7.8A (TRIP)",
        rawReading: "0.04V (Nominal 12.0V)",
        nominalRange: "11.8V to 12.4V",
        causalRole: "CONSEQUENCE",
        subsystem: "Power Distribution Unit",
        subsystemCode: "EPS-BUS-MAIN",
        confidence: 0.99,
        uncertaintyMargin: 0.005,
        failureModeCode: "FM-EPS-407-A",
        failureModeTitle: "Main Regulated Bus Latch-Up Isolation",
        telemetryGap: {
          hasGap: false,
          gapDurationMs: 0,
          packetJitterMs: 0.5,
          interpolated: false
        },
        eventExtractionDetail: {
          sourcePacketHex: "0x42 0x55 0x53 0x00 0x84 0x00 0x11",
          parsingRule: "ECSS_TM_FRAME_TYPE_01 (High-Rate PDU)",
          sensorAddress: "ANALOG_PIN_A0 [VOLTAGE_DIVIDER_BUS]",
          extractionConfidence: 0.99,
          clockSource: "GPS Master PPS",
          driftCorrectionMs: 0.00
        }
      },
      {
        id: "evt-5",
        timestamp: "12:44:07",
        timeOffsetMs: 629,
        event: "Comms unavailable / Beacon Carrier Lost",
        telemetrySnippet: "TX_PWR=0mW, RSSI=LOST, Carrier Drop",
        rawReading: "0 mW (Unmodulated)",
        nominalRange: "2000 mW (2W RF)",
        causalRole: "CONSEQUENCE",
        subsystem: "Communications Subsystem",
        subsystemCode: "COM-TX-S01",
        confidence: 0.96,
        uncertaintyMargin: 0.018,
        failureModeCode: "FM-COM-102-D",
        failureModeTitle: "RF Power Amplifier Gate Bias Collapse",
        telemetryGap: {
          hasGap: true,
          gapDurationMs: 120,
          packetJitterMs: 14.5,
          interpolated: false,
          gapFlagReason: "Total telemetry drop across ground station tracking aperture due to zero RF output"
        },
        eventExtractionDetail: {
          sourcePacketHex: "0x43 0x4F 0x4D 0x00 0x00 0xFA 0x00",
          parsingRule: "GROUND_STATION_INGEST (S-Band Ground Terminals)",
          sensorAddress: "EXT_RF_DISCRIMINATOR [GS_SVALBARD]",
          extractionConfidence: 0.96,
          clockSource: "Ground Terminal UTC NTP",
          driftCorrectionMs: 0.12
        }
      }
    ],
    links: [
      {
        id: "link-pwr-com",
        fromNodeId: "evt-4",
        toNodeId: "evt-5",
        fromLabel: "POWER BUS",
        toLabel: "COMMS",
        dependency: "power",
        strength: "critical",
        temporalGapLabel: "+004 ms",
        temporalGapMs: 4,
        observedIntermediate: "power bus dropped",
        telemetrySupport: "12.1 V → 0.0 V",
        confidence: 0.96,
        uncertaintyMargin: 0.015,
        whyEngineBelievesThis: {
          physicalProof: "S-Band Transceiver GaN power amplifier is directly powered from the unregulated 12V bus without battery backup buffers. When bus rail decayed below 4.5V at 12:44:03.412 UTC, gate bias voltage dropped below depletion threshold (V_gs < -2.1V), causing RF oscillation shutoff in exactly 3.84 milliseconds.",
          supportingTelemetryDump: "PDU_RAIL_12V: 12.10V (t=0ms) → 8.42V (t=+1.2ms) → 1.14V (t=+2.8ms) → 0.04V (t=+4.0ms). TX_PA_CURRENT: 1.42A → 0.00A.",
          firmwareTraceLog: "[12:44:03.414] WATCHDOG_UVLO: Microcontroller supervisory IC TPS3823 triggered active-low RESET on COM_MCU.",
          firstPrinciplesLaw: "Kirchhoff's Voltage Law & Semiconductor Transconductance Cutoff: I_drain = g_m * (V_gs - V_th)^2 = 0 when V_dd drops below minimum rail.",
          counterfactualFalsification: "If COMMS transmitter had experienced internal synthesizer failure instead of bus dropout, the telemetry power converter would have remained drawing 180mA idle current. Observed current was identically 0.0mA."
        },
        timestampAlignment: {
          fromGpsEpoch: "2026-08-31T12:44:03.412Z",
          toGpsEpoch: "2026-08-31T12:44:03.416Z",
          clockSkewMs: 0.02,
          speedOfLightDelayMs: 0.0004,
          precedenceVerified: true
        },
        failureModeClassification: {
          fmeaCode: "FMEA-EPS-COM-04",
          standard: "ECSS-Q-ST-30-02C",
          severity: "CATASTROPHIC",
          criticalityRank: 1
        }
      },
      {
        id: "link-thm-htr",
        fromNodeId: "evt-1",
        toNodeId: "evt-2",
        fromLabel: "T-17 SENSOR",
        toLabel: "HEATER CONTROLLER",
        dependency: "thermal_control",
        strength: "critical",
        temporalGapLabel: "+084 ms",
        temporalGapMs: 84,
        observedIntermediate: "heater forced 100% duty cycle",
        telemetrySupport: "-240.2°C → 28.4W",
        confidence: 0.98,
        uncertaintyMargin: 0.01,
        whyEngineBelievesThis: {
          physicalProof: "Firmware loop in THM-MCU executes thermal safety routine every 50ms. Reading -240.2°C triggered extreme survival heating branch without sensor deadband filtering.",
          supportingTelemetryDump: "THM_STATE: NOMINAL_CRUISE → EMERGENCY_HEATING_ACTIVE. PWM_CHANNEL_1: 0% → 100% (28.4W continuous draw).",
          firmwareTraceLog: "[12:41:03.084] THM_ERR: RTD_BAY_3 below lower abort limit (-50C). Forcing survival strip heaters A & B.",
          firstPrinciplesLaw: "Firmware Control Theory: Proportional-Integral saturation when error signal e(t) = T_setpoint - T_meas exceeds +260 Kelvin.",
          counterfactualFalsification: "Had sensor failed high (+150°C), heater would have remained disabled. The 100% continuous ON state strictly correlates with negative temperature rail saturation."
        },
        timestampAlignment: {
          fromGpsEpoch: "2026-08-31T12:41:03.000Z",
          toGpsEpoch: "2026-08-31T12:41:03.084Z",
          clockSkewMs: 0.01,
          speedOfLightDelayMs: 0.0001,
          precedenceVerified: true
        },
        failureModeClassification: {
          fmeaCode: "FMEA-THM-CTRL-01",
          standard: "NASA-STD-8729.1",
          severity: "CRITICAL",
          criticalityRank: 2
        }
      },
      {
        id: "link-htr-bat",
        fromNodeId: "evt-2",
        toNodeId: "evt-3",
        fromLabel: "HEATER CONTROLLER",
        toLabel: "BATTERY CELL #2",
        dependency: "energy_storage",
        strength: "strong",
        temporalGapLabel: "+190 ms",
        temporalGapMs: 190,
        observedIntermediate: "deep discharge starvation",
        telemetrySupport: "28.4W → 2.78V",
        confidence: 0.95,
        uncertaintyMargin: 0.02,
        whyEngineBelievesThis: {
          physicalProof: "CubeSat 3U power budget allocates maximum 6.0W in eclipse. 28.4W heater continuous load drained the 45Wh Li-Ion pack in 78 seconds, causing Cell #2 to collapse first due to thermal proximity (+8°C ΔT).",
          supportingTelemetryDump: "BAT_SOC: 88% → 12% in 72s. CELL_2_V: 3.82V → 2.78V. PACK_TEMP: 22.4°C → 38.4°C.",
          firmwareTraceLog: "[12:42:21.190] EPS_WARN: Cell #2 voltage below safety threshold (3.00V). Cell imbalance ΔV = 420mV.",
          firstPrinciplesLaw: "First Law of Thermodynamics & Peukert's Law: High C-rate discharge (2.4C) accelerates voltage sag and I^2*R internal Joule heating.",
          counterfactualFalsification: "Zero other high-power consumers (reaction wheels, payload) were active during this eclipse interval. Only the 28.4W heater explains the rapid SOC decline."
        },
        timestampAlignment: {
          fromGpsEpoch: "2026-08-31T12:41:08.000Z",
          toGpsEpoch: "2026-08-31T12:42:21.000Z",
          clockSkewMs: 0.03,
          speedOfLightDelayMs: 0.0002,
          precedenceVerified: true
        },
        failureModeClassification: {
          fmeaCode: "FMEA-EPS-BAT-02",
          standard: "ECSS-Q-ST-30-02C",
          severity: "CRITICAL",
          criticalityRank: 2
        }
      },
      {
        id: "link-bat-prt",
        fromNodeId: "evt-3",
        toNodeId: "evt-4",
        fromLabel: "BATTERY CELL #2",
        toLabel: "POWER BUS",
        dependency: "fault_isolation",
        strength: "critical",
        temporalGapLabel: "+314 ms",
        temporalGapMs: 314,
        observedIntermediate: "DC-DC boost overcurrent latch trip",
        telemetrySupport: "2.78V → 7.8A trip",
        confidence: 0.99,
        uncertaintyMargin: 0.008,
        whyEngineBelievesThis: {
          physicalProof: "To maintain 12.0V rail as battery voltage decayed to 2.78V, the boost regulator drew compensatory current (P = V * I). Current exceeded 7.5A solid-state circuit breaker setpoint, tripping isolation FET.",
          supportingTelemetryDump: "BOOST_INPUT_CURR: 3.1A → 7.82A. FET_GATE_CTRL: HIGH (ON) → LOW (TRIPPED/LATCHED).",
          firmwareTraceLog: "[12:44:03.000] HARDWARE_INTERRUPT: PDU_OCP_LATCH_TRIP pin pulled LOW. Main bus disconnected.",
          firstPrinciplesLaw: "Conservation of Power: P_out = η * P_in => I_in = (V_out * I_out) / (η * V_in). As V_in -> 2.78V, I_in spikes exponentially.",
          counterfactualFalsification: "If an external short circuit had caused the 7.8A trip, the bus voltage would have collapsed before the battery voltage. Here, battery voltage decayed minutes before the current trip."
        },
        timestampAlignment: {
          fromGpsEpoch: "2026-08-31T12:42:21.000Z",
          toGpsEpoch: "2026-08-31T12:44:03.000Z",
          clockSkewMs: 0.01,
          speedOfLightDelayMs: 0.0001,
          precedenceVerified: true
        },
        failureModeClassification: {
          fmeaCode: "FMEA-PDU-PROT-01",
          standard: "NASA-STD-8729.1",
          severity: "CATASTROPHIC",
          criticalityRank: 1
        }
      }
    ]
  },
  {
    id: "seu_adcs_scheduler",
    code: "FM-ADCS-812",
    title: "ADCS Scheduler SEU Bitflip & Tumbling Cascade",
    incidentTimeRange: "08:14:22 → 08:17:40 UTC",
    overallConfidence: 0.94,
    confidenceTier: "HIGH CONFIDENCE",
    patternStatus: "KNOWN PATTERN",
    isAmbiguousRoot: false,
    competingHypotheses: [
      {
        eventId: "evt-seu-1",
        component: "On-Board Computer",
        score: 0.97,
        confidenceTier: "HIGH CONFIDENCE",
        marginFromTop: 0.0,
        rationale: "FreeRTOS task control block single-bit corruption verified by EDAC log"
      },
      {
        eventId: "evt-seu-2",
        component: "Watchdog Timer",
        score: 0.72,
        confidenceTier: "MODERATE CONFIDENCE",
        marginFromTop: 0.25,
        rationale: "Downstream supervisor timeout resulting from locked scheduling loop"
      }
    ],
    missingEvidence: [],
    events: [
      {
        id: "evt-seu-1",
        timestamp: "08:14:22",
        timeOffsetMs: 0,
        event: "OBC Scheduler SEU Bitflip",
        telemetrySnippet: "TASK_ID=0x3F (Vector Corrupted)",
        rawReading: "0x3F802AEE",
        nominalRange: "0x00000000",
        causalRole: "PRIMARY",
        subsystem: "On-Board Computer",
        subsystemCode: "OBC-CPU-01",
        confidence: 0.97,
        uncertaintyMargin: 0.015,
        failureModeCode: "FM-OBC-109-A",
        failureModeTitle: "Single Event Upset in FreeRTOS Task Control Block",
        telemetryGap: {
          hasGap: false,
          gapDurationMs: 0,
          packetJitterMs: 0.4,
          interpolated: false
        },
        eventExtractionDetail: {
          sourcePacketHex: "0x4F 0x42 0x43 0x3F 0x80 0x2A 0xEE",
          parsingRule: "OBC_MEM_DUMP_FRAME",
          sensorAddress: "SRAM_ADDR:0x20004180",
          extractionConfidence: 0.98,
          clockSource: "Internal TCXO Oscillator",
          driftCorrectionMs: 0.01
        }
      },
      {
        id: "evt-seu-2",
        timestamp: "08:14:32",
        timeOffsetMs: 140,
        event: "Watchdog task deadlock & spinlock",
        telemetrySnippet: "WDG_CTR=0 (Hang / No Kick in 10s)",
        rawReading: "Task Deadlock",
        nominalRange: "WDG Kick every 1.0s",
        causalRole: "PROPAGATION",
        subsystem: "OBC Firmware Watchdog",
        subsystemCode: "OBC-WDG-01",
        confidence: 0.96,
        uncertaintyMargin: 0.02,
        failureModeCode: "FM-OBC-204-B",
        failureModeTitle: "Watchdog Routine starvation",
        telemetryGap: {
          hasGap: false,
          gapDurationMs: 0,
          packetJitterMs: 0.6,
          interpolated: false
        },
        eventExtractionDetail: {
          sourcePacketHex: "0x57 0x44 0x47 0x03 0xFA 0x00 0x1A",
          parsingRule: "OBC_HEALTH_HEARTBEAT",
          sensorAddress: "WATCHDOG_REGISTER:0x40003004",
          extractionConfidence: 0.97,
          clockSource: "Internal TCXO",
          driftCorrectionMs: 0.02
        }
      },
      {
        id: "evt-seu-3",
        timestamp: "08:15:10",
        timeOffsetMs: 380,
        event: "Reaction wheel Z runaway saturation",
        telemetrySnippet: "RW_Z_RPM=6200 (Max Saturation / 100%)",
        rawReading: "+6200 RPM",
        nominalRange: "-3500 to +3500 RPM",
        causalRole: "PROPAGATION",
        subsystem: "Attitude Determination & Control",
        subsystemCode: "ADCS-RWL-Z",
        confidence: 0.95,
        uncertaintyMargin: 0.022,
        failureModeCode: "FM-ADCS-403-A",
        failureModeTitle: "Reaction Wheel Open-Loop Torque Runaway",
        telemetryGap: {
          hasGap: false,
          gapDurationMs: 0,
          packetJitterMs: 1.0,
          interpolated: false
        },
        eventExtractionDetail: {
          sourcePacketHex: "0x52 0x57 0x4C 0x19 0x64 0xFF 0x33",
          parsingRule: "ADCS_FAST_TELEMETRY",
          sensorAddress: "CAN_BUS_0:0x220 [RW_Z_MOTOR]",
          extractionConfidence: 0.96,
          clockSource: "GPS PPS",
          driftCorrectionMs: -0.01
        }
      },
      {
        id: "evt-seu-4",
        timestamp: "08:17:40",
        timeOffsetMs: 820,
        event: "Star tracker blinding & attitude loss",
        telemetrySnippet: "ANGULAR_RATE=18.4 deg/s (TUMBLING)",
        rawReading: "18.4 deg/s",
        nominalRange: "< 0.05 deg/s",
        causalRole: "CONSEQUENCE",
        subsystem: "Optical Star Tracker",
        subsystemCode: "ADCS-STR-01",
        confidence: 0.98,
        uncertaintyMargin: 0.01,
        failureModeCode: "FM-ADCS-702-C",
        failureModeTitle: "Loss of Attitude Reference & Solar Pointing",
        telemetryGap: {
          hasGap: true,
          gapDurationMs: 440,
          packetJitterMs: 22.0,
          interpolated: true,
          gapFlagReason: "Ground antenna tracking lost lock due to rapid tumbling Doppler shift"
        },
        eventExtractionDetail: {
          sourcePacketHex: "0x53 0x54 0x52 0x00 0x12 0x50 0x99",
          parsingRule: "GROUND_STATION_DOPPLER_TRACK",
          sensorAddress: "TRACKER_OPTICAL_HEAD:0x04",
          extractionConfidence: 0.95,
          clockSource: "Ground UTC",
          driftCorrectionMs: 0.08
        }
      }
    ],
    links: [
      {
        id: "link-seu-obc-rw",
        fromNodeId: "evt-seu-2",
        toNodeId: "evt-seu-3",
        fromLabel: "WATCHDOG HALT",
        toLabel: "REACTION WHEEL Z",
        dependency: "control_loop",
        strength: "critical",
        temporalGapLabel: "+092 ms",
        temporalGapMs: 92,
        observedIntermediate: "DAC torque register held high",
        telemetrySupport: "Freeze at 100% PWM",
        confidence: 0.95,
        uncertaintyMargin: 0.02,
        whyEngineBelievesThis: {
          physicalProof: "When the scheduler hung in spinlock, DAC output DMA buffer was never cleared, maintaining max positive command on brushless DC driver.",
          supportingTelemetryDump: "DAC_CH0_VOLT: 3.30V constant. MOTOR_CURRENT: 0.85A continuous.",
          firmwareTraceLog: "[08:14:32.100] ADCS_TASK: Suspended by unhandled fault ISR.",
          firstPrinciplesLaw: "Control System Open-Loop Dynamics: Constant torque input on rotating flywheel yields linear momentum accumulation dL/dt = Tau_cmd.",
          counterfactualFalsification: "Zero aerodynamic or magnetic torque external torques could produce 18.4 deg/s in LEO without internal reaction wheel momentum dump."
        },
        timestampAlignment: {
          fromGpsEpoch: "2026-08-31T08:14:32.000Z",
          toGpsEpoch: "2026-08-31T08:15:10.000Z",
          clockSkewMs: 0.02,
          speedOfLightDelayMs: 0.0001,
          precedenceVerified: true
        },
        failureModeClassification: {
          fmeaCode: "FMEA-ADCS-RW-02",
          standard: "ECSS-Q-ST-30-02C",
          severity: "CRITICAL",
          criticalityRank: 2
        }
      },
      {
        id: "link-seu-rw-str",
        fromNodeId: "evt-seu-3",
        toNodeId: "evt-seu-4",
        fromLabel: "REACTION WHEEL Z",
        toLabel: "STAR TRACKER",
        dependency: "kinematics",
        strength: "critical",
        temporalGapLabel: "+440 ms",
        temporalGapMs: 440,
        observedIntermediate: "body slew rate exceeded optical FOV",
        telemetrySupport: "0.02 deg/s → 18.4 deg/s",
        confidence: 0.98,
        uncertaintyMargin: 0.01,
        whyEngineBelievesThis: {
          physicalProof: "Reaction wheel reached 6200 RPM max bearing velocity at 08:15:10. Conservation of angular momentum transferred kinetic energy to spacecraft chassis, causing optical star streaking.",
          supportingTelemetryDump: "STR_MATCH_COUNT: 18 stars (t=0s) → 3 stars (t=+20s) → 0 stars (t=+45s / LOST_LOCK).",
          firmwareTraceLog: "[08:16:02.000] STR_ALARM: Star pattern matching lost due to image motion blur exceeding 2.0 deg/s threshold.",
          firstPrinciplesLaw: "Euler's Rotational Equations: I_sc * d(omega)/dt + omega x (I_sc * omega + I_rw * omega_rw) = 0.",
          counterfactualFalsification: "Star tracker optics remained intact and illuminated; only the dynamic motion blur caused loss of tracking."
        },
        timestampAlignment: {
          fromGpsEpoch: "2026-08-31T08:15:10.000Z",
          toGpsEpoch: "2026-08-31T08:17:40.000Z",
          clockSkewMs: 0.01,
          speedOfLightDelayMs: 0.0002,
          precedenceVerified: true
        },
        failureModeClassification: {
          fmeaCode: "FMEA-ADCS-STR-01",
          standard: "NASA-STD-8729.1",
          severity: "CRITICAL",
          criticalityRank: 1
        }
      }
    ]
  },
  {
    id: "unseen_plasma_inrush",
    code: "FM-OOD-991",
    title: "Auroral Plasma Arc & Competing Inrush (Out-of-Distribution)",
    incidentTimeRange: "03:19:12 → 03:22:04 UTC",
    overallConfidence: 0.52,
    confidenceTier: "LOW CONFIDENCE",
    patternStatus: "UNKNOWN / OUT-OF-DISTRIBUTION",
    isAmbiguousRoot: true,
    competingHypotheses: [
      {
        eventId: "evt-ood-1",
        component: "Solar Array Grounding Harness",
        score: 0.56,
        confidenceTier: "LOW CONFIDENCE",
        marginFromTop: 0.0,
        rationale: "Hypothesis A: Surface dielectric arcing across solar array substrate during auroral passage (Ensemble Disagreement σ=0.34)"
      },
      {
        eventId: "evt-ood-2",
        component: "PDU Main Rail Capacitor Bank",
        score: 0.52,
        confidenceTier: "LOW CONFIDENCE",
        marginFromTop: 0.04,
        rationale: "Hypothesis B: Inrush transient / internal capacitor dielectric breakdown within 38ms margin; insufficient evidence to disambiguate"
      }
    ],
    missingEvidence: [
      {
        sourceEventId: "evt-ood-1",
        targetEventId: "evt-ood-3",
        missingComponents: ["Array Current Shunt Monitor", "Harness Thermocouple"],
        severity: "HIGH",
        description: "Intermediate telemetry packet missing during 850ms plasma discharge transient. Direct physical causal edge unconfirmed."
      }
    ],
    events: [
      {
        id: "evt-ood-1",
        timestamp: "03:19:12",
        timeOffsetMs: 0,
        event: "Array Grounding Arc Transient",
        telemetrySnippet: "HV_BIAS_ANOMALY (V_plasma = -1120V)",
        rawReading: "-1120V",
        nominalRange: "-50V to +50V",
        causalRole: "PRIMARY",
        subsystem: "Electrical Power System",
        subsystemCode: "EPS-HARN-01",
        confidence: 0.56,
        uncertaintyMargin: 0.18,
        failureModeCode: "FM-OOD-ARC-01",
        failureModeTitle: "Spacecraft High-Voltage Plasma Dielectric Discharge",
        telemetryGap: {
          hasGap: true,
          gapDurationMs: 850,
          packetJitterMs: 140.0,
          interpolated: false,
          gapFlagReason: "RF blackout during local plasma sheet transit"
        },
        eventExtractionDetail: {
          sourcePacketHex: "0xFF 0xEE 0x00 0x1A 0x88",
          parsingRule: "RAW_UNFILTERED_BUFFER",
          sensorAddress: "HV_PROBE:0x09",
          extractionConfidence: 0.55,
          clockSource: "Estimated Local Epoch",
          driftCorrectionMs: 12.4
        }
      },
      {
        id: "evt-ood-2",
        timestamp: "03:19:12",
        timeOffsetMs: 38,
        event: "PDU Rail Inrush Collapse",
        telemetrySnippet: "RAIL_V=2.1V (Rapid Sag, 38ms from Arc)",
        rawReading: "2.1V",
        nominalRange: "11.5V to 12.5V",
        causalRole: "PRIMARY",
        subsystem: "Power Distribution Unit",
        subsystemCode: "EPS-PDU-01",
        confidence: 0.52,
        uncertaintyMargin: 0.16,
        failureModeCode: "FM-OOD-CAP-02",
        failureModeTitle: "Capacitor Bank Inrush Breakdown (Competing Candidate)",
        telemetryGap: {
          hasGap: false,
          gapDurationMs: 0,
          packetJitterMs: 4.0,
          interpolated: false
        },
        eventExtractionDetail: {
          sourcePacketHex: "0x12 0x34 0x56 0x78",
          parsingRule: "PDU_FAST_SAMPLE",
          sensorAddress: "PDU_ADC:0x01",
          extractionConfidence: 0.60,
          clockSource: "GPS Master",
          driftCorrectionMs: 0.02
        }
      },
      {
        id: "evt-ood-3",
        timestamp: "03:19:18",
        timeOffsetMs: 5800,
        event: "Avionics Bus Reset (Consequence)",
        telemetrySnippet: "SYSTEM_RESTART (Cold Reboot)",
        rawReading: "RESET_PIN_ACTIVE",
        nominalRange: "RUNNING",
        causalRole: "CONSEQUENCE",
        subsystem: "Command & Data Handling",
        subsystemCode: "OBC-MAIN-01",
        confidence: 0.90,
        uncertaintyMargin: 0.05,
        failureModeCode: "FM-CDH-RST-01",
        failureModeTitle: "Supervisory Power Reset",
        telemetryGap: {
          hasGap: false,
          gapDurationMs: 0,
          packetJitterMs: 1.0,
          interpolated: false
        },
        eventExtractionDetail: {
          sourcePacketHex: "0x00 0x01 0x02",
          parsingRule: "SUPERVISOR_BOOT",
          sensorAddress: "RESET_CTRL:0x00",
          extractionConfidence: 0.95,
          clockSource: "Boot Clock",
          driftCorrectionMs: 0.0
        }
      }
    ],
    links: [
      {
        id: "link-ood-arc-pdu",
        fromNodeId: "evt-ood-1",
        toNodeId: "evt-ood-2",
        fromLabel: "PLASMA ARC",
        toLabel: "PDU RAIL SAG",
        dependency: "power",
        strength: "moderate",
        temporalGapLabel: "+038 ms",
        temporalGapMs: 38,
        observedIntermediate: "unobserved (packet drop during ESD)",
        telemetrySupport: "-1120V → 2.1V",
        confidence: 0.54,
        uncertaintyMargin: 0.22,
        whyEngineBelievesThis: {
          physicalProof: "Temporal gap of 38ms is consistent with harness propagation, but high ensemble disagreement (σ=0.34) and missing intermediate current telemetry prevent definitive single attribution.",
          supportingTelemetryDump: "HV_PROBE: -1120V. PDU_V: 2.1V. ARRAY_I: [TELEMETRY_GAP].",
          firmwareTraceLog: "[03:19:12.038] PDU_ALERT: Rail undervoltage trip. Cause ambiguous between external arc vs internal capacitor inrush.",
          firstPrinciplesLaw: "Transmission Line & Dielectric Breakdown: V(x, t) = V_0 * e^(-alpha*x) * cos(omega*t - beta*x).",
          counterfactualFalsification: "Neither hypothesis can be ruled out: clamping the external arc without capacitor isolation may still leave the rail compromised."
        },
        timestampAlignment: {
          fromGpsEpoch: "2026-08-31T03:19:12.000Z",
          toGpsEpoch: "2026-08-31T03:19:12.038Z",
          clockSkewMs: 12.0,
          speedOfLightDelayMs: 0.0001,
          precedenceVerified: false
        },
        failureModeClassification: {
          fmeaCode: "FMEA-OOD-01",
          standard: "NASA-STD-8729.1",
          severity: "CRITICAL",
          criticalityRank: 1
        }
      }
    ]
  }
];
