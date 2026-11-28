export type FeatureVector = {
  feat_mean: number;
  feat_std: number;
  feat_min: number;
  feat_max: number;
  feat_range: number;
  feat_rate_of_change: number;
  feat_skewness: number;
  feat_predicted?: number;
  feat_residual?: number;
  feat_residual_normalized?: number;
  feat_is_physically_inconsistent?: number;
};

export type AiEvent = {
  id: string;
  component: string;
  timestamp: string;
  event_type: string;
  value: number | null;
  source: "ai_pattern_match";
  confidence: number;
  confidence_tier?: "HIGH CONFIDENCE" | "MODERATE CONFIDENCE" | "LOW CONFIDENCE" | "INSUFFICIENT EVIDENCE";
  is_anomaly: boolean;
  feature_vector: FeatureVector;
  anomaly_classification?: "nominal" | "statistical_only" | "physical_only" | "both";
  is_physical_anomaly?: boolean;
  is_out_of_distribution?: boolean;
  pattern_status?: "KNOWN PATTERN" | "UNKNOWN / OUT-OF-DISTRIBUTION";
  ensemble_disagreement?: number;
  ood_rationale?: string;
};

export type CausalValidationResult = {
  status:
    | "pending"
    | "validated"
    | "downgraded"
    | "rejected"
    | "insufficient_evidence";

  role: "primary" | "propagation" | "secondary" | "independent" | null;

  confidence: number;
  temporalValidity: boolean;
  dependencySupport: "critical" | "strong" | "moderate" | "weak" | "none";
  intermediateEvents: number;
  explanation: string;
};

export interface AnalyzeWindowRequest {
  scenarioId: string;
  windowStart: string;
  windowEnd: string;
}

export type SyntheticPacketStatus = 'NOMINAL' | 'DRIFT' | 'CRITICAL' | 'FAULT_INJECTED';

export interface SyntheticTelemetryPacket {
  packetId: string;
  timestamp: string;
  fullTime: string;
  subsystem: string;
  channel: string;
  rawValue: number;
  rawUnit: string;
  syntheticNoise: string;
  status: SyntheticPacketStatus;
  injectionNote?: string;
  aiClassification: string;
}

export interface SyntheticMissionData {
  id: string;
  source: 'synthetic_generator' | 'fault_injection' | 'imported_file' | 'scenario_preset';
  sourceLabel: string;
  scenarioId: string;
  scenarioName: string;
  generatedAt: string;
  orbitAltitude: string;
  noiseLevel: number;
  sampleDuration: number;
  injectedFault?: string;
  injectedSubsystem?: string;
  propagationLatency?: string;
  fileName?: string;
  fileSize?: string;
  totalPackets: number;
  anomalousPackets: number;
  packets: SyntheticTelemetryPacket[];
  rawLogs: string[];
  aiDiffSummary: {
    syntheticGenerationTruth: string;
    aiInferredDiagnosis: string;
    causalDiscoveryAccuracy: string;
    noiseFilteringRatio: string;
    counterfactualDeduction: string;
  };
}
