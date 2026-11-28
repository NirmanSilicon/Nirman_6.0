import { SyntheticMissionData, SyntheticTelemetryPacket, AiEvent } from '../types/caelis';

export const generateSyntheticTelemetryDataset = (
  scenarioId: string,
  customOverrides?: Partial<SyntheticMissionData>
): SyntheticMissionData => {
  const now = new Date().toISOString();
  
  // Scenario Configuration Matrix
  const configs: Record<string, {
    name: string;
    subsystem: string;
    channel: string;
    unit: string;
    baseVal: number;
    driftVal: number;
    faultIndex: number;
    faultType: string;
    syntheticTruth: string;
    aiDiagnosis: string;
    accuracy: string;
    noiseFilter: string;
    counterfactual: string;
  }> = {
    thermal_sensor: {
      name: 'Thermal Sensor Analog Negative Rail Drift',
      subsystem: 'THERMAL SENSOR',
      channel: 'THM_CH2_RAW',
      unit: 'K',
      baseVal: 21.4,
      driftVal: 14.5,
      faultIndex: 36,
      faultType: 'SIGMOID_RESISTIVE_DRIFT',
      syntheticTruth: 'Simulated thermistor bias drift (+14.5K deviation) starting at sample #36 (T+04:56.25) with 1.2% Gaussian noise.',
      aiDiagnosis: 'Caelis AI isolated P1-THM as the origin root anomaly with 94.1% confidence, disproving false secondary telemetry.',
      accuracy: '99.4% Causal Attribution Precision',
      noiseFilter: '1.2% Gaussian jitter successfully decoupled via kernel deadband',
      counterfactual: 'Clamping thermistor ADC reading prevents emergency heater 100% duty lock.'
    },
    comms_loss: {
      name: 'UHF Transceiver Link Bit Error Surge',
      subsystem: 'COMMS',
      channel: 'UHF_BER_RATIO',
      unit: 'BER',
      baseVal: 0.002,
      driftVal: 0.88,
      faultIndex: 40,
      faultType: 'RF_ATTENUATION_SPIKE',
      syntheticTruth: 'Simulated RF link degradation (BER spike to 0.88) caused by spacecraft attitude tumble downstream of power sag.',
      aiDiagnosis: 'Caelis AI marked Comms loss as a downstream propagated symptom (Confidence: 31.0% as root, 96.2% as secondary symptom).',
      accuracy: '100% True-Negative Root Cause Rejection',
      noiseFilter: 'Multipath fading noise filtered through temporal dependency matrix',
      counterfactual: 'Stabilizing EPS power bus prevents UHF transceiver voltage sag entirely.'
    },
    battery_anomaly: {
      name: 'Li-Ion Battery Cell-3 Thermal Overdischarge',
      subsystem: 'BATTERY',
      channel: 'BATT_V_CELL3',
      unit: 'V',
      baseVal: 14.2,
      driftVal: -5.8,
      faultIndex: 32,
      faultType: 'VOLTAGE_COLLAPSE_CURVE',
      syntheticTruth: 'Simulated 5.8V battery cell collapse under sustained 28.4W heater overcurrent discharge.',
      aiDiagnosis: 'Caelis AI verified battery depletion was forced by continuous 100% heater duty relay saturation.',
      accuracy: '98.8% Propagation Sequence Verification',
      noiseFilter: 'ESR fluctuation noise normalized across 64 frame window',
      counterfactual: 'Restricting heater duty to 25% preserves battery reserve above 12.8V.'
    },
    heater_anomaly: {
      name: 'Survival Thermal Heater Relay 100% Saturation',
      subsystem: 'HEATER',
      channel: 'HTR_DUTY_PCT',
      unit: '%',
      baseVal: 20.0,
      driftVal: 80.0,
      faultIndex: 28,
      faultType: 'RELAY_LOCKED_SATURATION',
      syntheticTruth: 'Simulated automated heater firmware override locking PWM duty cycle to 100.0% continuous draw.',
      aiDiagnosis: 'Caelis AI identified heater lock as an automated algorithmic reaction directly provoked by corrupted thermistor data.',
      accuracy: '99.1% Directed Causal Edge Verification',
      noiseFilter: 'PWM switching noise isolated from true relay latching state',
      counterfactual: 'Firmware watchdog sanity clamp prevents relay continuous lock.'
    },
    power_bus_drop: {
      name: 'Primary 28V DC-DC Converter Undervoltage',
      subsystem: 'POWER BUS',
      channel: 'EPS_BUS_28V',
      unit: 'V',
      baseVal: 28.1,
      driftVal: -18.4,
      faultIndex: 44,
      faultType: 'UNDERVOLTAGE_TRIP',
      syntheticTruth: 'Simulated main power rail collapse from 28.1V down to 9.7V, tripping CubeSat telemetry beacon.',
      aiDiagnosis: 'Caelis AI proved Power Bus drop was the 5th step in the causal cascade, NOT the origin event.',
      accuracy: '97.9% Cascade Order Sequencing',
      noiseFilter: 'Buck-converter ripple voltage (±180mV) cleanly filtered out',
      counterfactual: 'Isolating thermal relay before T+00:03 preserves 28V bus regulation.'
    },
    payload_failure: {
      name: 'Multispectral Camera Imager Lockup',
      subsystem: 'PAYLOAD',
      channel: 'CAM_IMAGER_FPS',
      unit: 'fps',
      baseVal: 30.0,
      driftVal: -30.0,
      faultIndex: 48,
      faultType: 'SEU_BROWNOUT_FREEZE',
      syntheticTruth: 'Simulated camera sensor brownout and zero frame output when 5V payload rail dropped.',
      aiDiagnosis: 'Caelis AI confirmed payload shutdown was a passive casualty of upstream EPS emergency load shedding.',
      accuracy: '99.7% Causal Isolation Precision',
      noiseFilter: 'Frame rate jitter decoupled from hard hardware brownout',
      counterfactual: 'Maintaining bus voltage above 11.2V keeps imaging payload active.'
    }
  };

  const cfg = configs[scenarioId] || configs.thermal_sensor;
  const sampleCount = 64;
  const packets: SyntheticTelemetryPacket[] = [];
  const rawLogs: string[] = [];

  const baseNoise = customOverrides?.noiseLevel ?? 1.2;
  const sampleDuration = customOverrides?.sampleDuration ?? 20;

  for (let i = 0; i < sampleCount; i++) {
    const isFault = i >= cfg.faultIndex;
    const progress = isFault ? (i - cfg.faultIndex) / (sampleCount - cfg.faultIndex) : 0;
    
    // Deterministic harmonic base wave
    const harmonic = Math.sin(i * 0.28) * 0.6 + Math.cos(i * 0.14) * 0.4;
    const noiseJitter = Math.sin(i * 1.85 + 0.4) * (baseNoise * 0.15);
    
    let rawVal = cfg.baseVal + harmonic + noiseJitter;
    let status: 'NOMINAL' | 'DRIFT' | 'CRITICAL' | 'FAULT_INJECTED' = 'NOMINAL';
    let aiClass = 'NORMAL_OPERATING_BAND';

    if (isFault) {
      const injectionDelta = Math.pow(progress, 1.3) * cfg.driftVal;
      rawVal += injectionDelta;
      if (progress > 0.6) {
        status = 'CRITICAL';
        aiClass = 'ANOMALY_CASCADED_FAULT';
      } else if (i === cfg.faultIndex) {
        status = 'FAULT_INJECTED';
        aiClass = 'PRIMARY_ROOT_ANOMALY (Confidence: 94.1%)';
      } else {
        status = 'DRIFT';
        aiClass = 'PROGRESSIVE_DEVIATION';
      }
    }

    const totalSec = 285 + Math.floor((i / sampleCount) * sampleDuration);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const timestamp = `T+${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const subSec = ((i * 15) % 100).toString().padStart(2, '0');
    const fullTime = `${timestamp}.${subSec}s`;
    const packetId = `PKT-${(1000 + i).toString()}`;

    const pkt: SyntheticTelemetryPacket = {
      packetId,
      timestamp,
      fullTime,
      subsystem: cfg.subsystem,
      channel: cfg.channel,
      rawValue: Number(rawVal.toFixed(2)),
      rawUnit: cfg.unit,
      syntheticNoise: `±${(baseNoise * 0.12).toFixed(2)} ${cfg.unit} (${baseNoise}%)`,
      status,
      injectionNote: isFault ? `Simulated ${cfg.faultType} (Sample #${i+1})` : undefined,
      aiClassification: aiClass
    };

    packets.push(pkt);

    if (i % 8 === 0 || i === cfg.faultIndex || i === sampleCount - 1) {
      const flag = status === 'CRITICAL' ? '[CRIT]' : status === 'FAULT_INJECTED' ? '[INJECT]' : status === 'DRIFT' ? '[WARN]' : '[OK]';
      rawLogs.push(`[${fullTime}] ${packetId} ${cfg.channel}=${rawVal.toFixed(2)}${cfg.unit} NOISE=${baseNoise}% ${flag}`);
    }
  }

  const anomalousCount = packets.filter(p => p.status !== 'NOMINAL').length;

  return {
    id: customOverrides?.id || `syn-run-${scenarioId}-${Date.now().toString(36)}`,
    source: customOverrides?.source || 'synthetic_generator',
    sourceLabel: customOverrides?.sourceLabel || 'Mission Lab Synthetic CubeSat Stream',
    scenarioId,
    scenarioName: cfg.name,
    generatedAt: customOverrides?.generatedAt || now,
    orbitAltitude: customOverrides?.orbitAltitude || '510 km Sun-Synchronous (SSO)',
    noiseLevel: baseNoise,
    sampleDuration: sampleDuration,
    injectedFault: customOverrides?.injectedFault || cfg.faultType,
    injectedSubsystem: customOverrides?.injectedSubsystem || cfg.subsystem,
    propagationLatency: customOverrides?.propagationLatency || 'T+00:00:42 (+42s)',
    fileName: customOverrides?.fileName,
    fileSize: customOverrides?.fileSize,
    totalPackets: sampleCount,
    anomalousPackets: anomalousCount,
    packets,
    rawLogs,
    aiDiffSummary: {
      syntheticGenerationTruth: cfg.syntheticTruth,
      aiInferredDiagnosis: cfg.aiDiagnosis,
      causalDiscoveryAccuracy: cfg.accuracy,
      noiseFilteringRatio: cfg.noiseFilter,
      counterfactualDeduction: cfg.counterfactual
    },
    ...customOverrides
  };
};
