/**
 * frontend/src/types/missionArchitecture.ts
 *
 * TypeScript types mirroring the AXYRA backend mission architecture boundary:
 * - Mission Configuration (MissionConfig)
 * - Spacecraft Subsystem Templates (SubsystemTemplate, ComponentDefinition, DependencyDefinition)
 * - Causal Model Specification (CausalModelSpec, CausalScoringWeights)
 * - Universal Event Representation (EventRecord)
 * - Compiled Mission Causal Graph (MissionCausalGraph, MissionCausalNode, MissionCausalEdge)
 */

export type EventType = 'threshold' | 'state_change' | 'alarm' | 'reboot';
export type EventSeverity = 'info' | 'warning' | 'critical';
export type TimingConfidence = 'documented' | 'estimated';
export type CausalRole = 'primary' | 'propagation' | 'secondary' | 'independent' | 'unknown';
export type ConfidenceLabel = 'high' | 'moderate' | 'low' | 'insufficient_evidence';

export type DependencyType =
  | 'thermal'
  | 'control'
  | 'power'
  | 'kinematic'
  | 'software'
  | 'data'
  | 'indirect';

export type DependencyStrength = 'critical' | 'strong' | 'moderate' | 'weak' | 'indirect';

export interface ComponentDefinition {
  component_id: string;
  name: string;
  component_type: string;
  parameter_name: string;
  unit: string;
  nominal_mean: number;
  nominal_std: number;
  sampling_interval_seconds: number;
  description?: string;
}

export interface DependencyDefinition {
  source: string;
  target: string;
  dependency_type: DependencyType;
  dependency_strength: DependencyStrength;
  description?: string;
}

export interface SubsystemTemplate {
  template_id: string;
  name: string;
  craft_class: string;
  description: string;
  components: ComponentDefinition[];
  dependencies: DependencyDefinition[];
}

export interface MissionConfig {
  mission_id: string;
  name: string;
  craft_class: string;
  orbit_profile: string;
  template_id: string;
  duration_seconds: number;
  cascade_offset_seconds: number;
  baseline_noise_sigma: number;
  environment_params?: {
    eclipse_duration_minutes?: number;
    solar_flux_w_m2?: number;
    thermal_sink_k?: number;
    [key: string]: any;
  };
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface CausalScoringWeights {
  w_temporal: number;
  w_dependency: number;
  w_intermediate: number;
}

export interface CausalModelSpec {
  model_id: string;
  name: string;
  scoring_weights: CausalScoringWeights;
  confidence_threshold: number;
  max_hops: number;
  description: string;
}

export type AnomalyClassification =
  | 'statistically_abnormal'
  | 'physically_inconsistent'
  | 'both'
  | 'neither';

export type ConfidenceTier =
  | 'HIGH CONFIDENCE'
  | 'MODERATE CONFIDENCE'
  | 'LOW CONFIDENCE'
  | 'INSUFFICIENT EVIDENCE';

export type PatternStatus =
  | 'KNOWN PATTERN'
  | 'UNKNOWN / OUT-OF-DISTRIBUTION';

export interface EventRecord {
  id: string;
  timestamp: string;
  component: string;
  event_type: EventType;
  value: number | null;
  description: string;
  severity?: EventSeverity;
  timing_confidence?: TimingConfidence;
  parameter?: string;
  subsystem?: string;
  notes?: string;
  raw_status?: string;
  is_anomaly?: boolean;
  feature_vector?: Record<string, number>;
  source?: string;
  predicted_value?: number | null;
  residual?: number | null;
  normalized_residual?: number | null;
  anomaly_classification?: AnomalyClassification;
  is_statistical_anomaly?: boolean;
  is_physical_anomaly?: boolean;
  physics_evidence?: Record<string, any>;
  confidence_tier?: ConfidenceTier;
  is_out_of_distribution?: boolean;
  pattern_status?: PatternStatus;
}

export interface MissionCausalNode {
  event_id: string;
  component: string;
  role: CausalRole;
  confidence: number;
  confidence_label: ConfidenceLabel;
  confidence_tier?: ConfidenceTier;
  is_out_of_distribution?: boolean;
  upstream_edge_ids: string[];
  timestamp?: string;
  timestamp_epoch?: number;
  event_type?: string;
  state_transition?: string;
  telemetry_evidence?: Record<string, any>;
  subsystem?: string;
  metadata?: Record<string, any>;
  value?: number | null;
  source?: string;
  predicted_value?: number | null;
  residual?: number | null;
  normalized_residual?: number | null;
  anomaly_classification?: AnomalyClassification;
  is_statistical_anomaly?: boolean;
  is_physical_anomaly?: boolean;
  physics_evidence?: Record<string, any>;
}

export interface MissionCausalEdge {
  id: string;
  source_event_id: string;
  target_event_id: string;
  dependency_type: string;
  dependency_strength: string;
  temporal_gap_seconds: number;
  evidence: string;
  s_temporal: number;
  s_dependency: number;
  s_intermediate: number;
  confidence: number;
  confidence_tier?: ConfidenceTier;
  is_uncertain?: boolean;
  missing_evidence_notes?: string | null;
  temporal_distance_seconds?: number;
  allowed_propagation_window?: PropagationDelayRange | Record<string, any>;
  source_component?: string;
  target_component?: string;
  physical_consistency?: number;
  predicted_probability?: number | null;
  causal_features?: Record<string, number>;
  hard_constraints_passed?: boolean;
  scorer_type?: 'learned' | 'legacy' | string;
  metadata?: Record<string, any>;
}

export interface CompetingHypothesis {
  event_id: string;
  component: string;
  score: number;
  confidence_tier: ConfidenceTier;
  margin_from_top: number;
  rationale: string;
}

export interface MissingEvidenceRecord {
  source_event_id: string;
  target_event_id: string;
  path: string[];
  missing_components: string[];
  severity: string;
  description: string;
}

export interface UncertainEdgeRecord {
  edge_id: string;
  source_event_id: string;
  target_event_id: string;
  score: number;
  confidence_tier: ConfidenceTier;
  rationale: string;
}

export interface MissionCausalGraph {
  incident_id: string;
  nodes: MissionCausalNode[];
  edges: MissionCausalEdge[];
  primary_cause_event_id: string | null;
  is_ambiguous_root?: boolean;
  confidence_tier?: ConfidenceTier;
  pattern_status?: PatternStatus;
  competing_hypotheses?: CompetingHypothesis[];
  missing_evidence?: MissingEvidenceRecord[];
  uncertain_edges?: UncertainEdgeRecord[];
  independent_events?: string[];
  minimum_explanation_event_ids: string[];
  raw_events: EventRecord[];
  metadata?: Record<string, any>;
}

// --- Temporal Event Graph (TEG) Active Incident Types ---

export interface TemporalEventNode extends MissionCausalNode {
  timestamp: string;
  timestamp_epoch: number;
  event_type: string;
  state_transition: string;
  telemetry_evidence: Record<string, any>;
}

export interface TemporalCausalEdge extends MissionCausalEdge {
  temporal_distance_seconds: number;
  allowed_propagation_window: PropagationDelayRange | Record<string, any>;
  source_component: string;
  target_component: string;
  predicted_probability?: number | null;
  causal_features?: Record<string, number>;
  hard_constraints_passed?: boolean;
  scorer_type?: 'learned' | 'legacy' | string;
}

export interface TemporalEventGraph extends MissionCausalGraph {
  nodes: (TemporalEventNode | MissionCausalNode)[];
  edges: (TemporalCausalEdge | MissionCausalEdge)[];
}

export interface CounterfactualSimulationResult {
  incident_id: string;
  target_event_id: string;
  prevented_event_ids: string[];
  remaining_event_ids: string[];
  prevented_count: number;
  remaining_count: number;
  confidence_tier?: ConfidenceTier;
  summary: string;
}

export const STANDARD_CUBESAT_13_NODE_TEMPLATE_ID = 'cubesat_13_node_standard';

export const DEFAULT_CAUSAL_WEIGHTS: CausalScoringWeights = {
  w_temporal: 0.0475,
  w_dependency: 0.6320,
  w_intermediate: 0.3205,
};

// --- Canonical Subsystem Template Types ---

export interface VariableDefinition {
  parameter_name: string;
  unit: string;
  nominal_mean: number;
  nominal_std: number;
  sampling_interval_seconds: number;
  nominal_min?: number;
  nominal_max?: number;
  description?: string;
}

export interface InterfaceDefinition {
  interface_id: string;
  direction: 'in' | 'out' | 'bidirectional';
  interface_type: 'power' | 'thermal' | 'data' | 'control' | 'software' | 'hardware';
  description?: string;
}

export interface PropagationDelayRange {
  min_seconds: number;
  max_seconds: number;
  typical_seconds: number;
  physics_basis?: string;
}

export interface StructuralRule {
  rule_id: string;
  rule_type: string;
  description: string;
  target_dependency_type?: string;
}

export interface CausalModuleTemplate {
  module_type: string;
  name: string;
  description: string;
  default_component_id: string;
  states: string[];
  measurable_variables: Record<string, VariableDefinition>;
  allowed_interfaces: InterfaceDefinition[];
  dependency_types: string[];
  plausible_propagation_delays: Record<string, PropagationDelayRange>;
  relevant_failure_types: string[];
  structural_rules: StructuralRule[];
  physics_parameters?: Record<string, any>;
}

// --- Mission Configuration Schema Types ---

export interface MissionModuleConfig {
  module_id: string;
  module_type: string;
  name?: string;
  description?: string;
  parameters?: Record<string, any>;
  telemetry_channels?: string[];
  metadata?: Record<string, any>;
}

export interface MissionDependencyConfig {
  source_module_id: string;
  target_module_id: string;
  dependency_type: string;
  weight: number;
  propagation_delay_seconds: number;
  description?: string;
  metadata?: Record<string, any>;
}

export interface MissionRuleConfig {
  rule_id: string;
  rule_type: string;
  target_module_id: string;
  description?: string;
  parameters?: Record<string, any>;
}

export interface MissionConfigSchema {
  mission_id: string;
  spacecraft_name: string;
  orbit_type?: string;
  version?: string;
  modules: MissionModuleConfig[];
  dependencies: MissionDependencyConfig[];
  rules?: MissionRuleConfig[];
  metadata?: Record<string, any>;
}

// --- Canonical Analysis & Next Best Evidence (NBE) Types ---

export interface ExpectedObservationOutcome {
  outcome: string;
  favors_hypothesis_id: string;
  favors_component: string;
  expected_confidence: number;
  description: string;
}

export interface CounterfactualResult {
  cascade_prevented: boolean;
  mitigation_summary: string;
  prevented_nodes: string[];
  remaining_nodes: string[];
  impact_difference?: any;
  confidence?: number;
}

export interface NextBestEvidence {
  recommended_observation: string;
  observation_command?: string;
  target_signal: string;
  target_component: string;
  rationale: string;
  hypothesis_ids: string[];
  expected_outcomes: ExpectedObservationOutcome[];
  expected_information_gain: number;
  information_gain_shannons?: number;
  telemetry_cost: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  priority?: string;
  sampling_cadence?: string;
  observation_window?: string;
}

export interface CanonicalHypothesis {
  id: string;
  rank: number;
  root_event_id: string;
  component: string;
  explanation: string;
  posterior: number;
  confidence_tier: ConfidenceTier;
  uncertainty: number;
  margin_from_top: number;
  supporting_evidence: string[];
  contradicting_evidence: string[];
}

export interface CanonicalAnalysisResponse extends MissionCausalGraph {
  analysis_id?: string;
  mission_id?: string;
  status: 'ANALYZED' | 'NO_EVIDENCE' | 'FAILED' | 'OUT_OF_DISTRIBUTION' | string;
  created_at: string;
  summary: string;
  telemetry_window?: {
    start_time?: string;
    end_time?: string;
    events_count?: number;
    duration_seconds?: number;
  };
  detected_events?: EventRecord[];
  hypotheses?: CanonicalHypothesis[];
  root_causes?: Array<{
    event_id: string;
    component: string;
    confidence: number;
    confidence_tier?: ConfidenceTier;
  }>;
  uncertainty?: {
    is_out_of_distribution?: boolean;
    pattern_status?: PatternStatus;
    competing_hypotheses_count?: number;
    notes?: string;
  };
  causal_graph: {
    nodes: MissionCausalNode[];
    edges: MissionCausalEdge[];
  };
  cascade?: {
    root: string | null;
    root_component?: string;
    sequence: string[];
    terminal_effects: string[];
  };
  physics?: {
    residuals: any[];
    model_expectations?: any[];
  };
  next_best_evidence: NextBestEvidence;
  counterfactual?: any;
  counterfactual_simulation?: CounterfactualResult;
  warnings: string[];
  provenance?: {
    scorer_type?: string;
    operating_mode?: string;
    model_version?: string;
    sovereign_mode?: boolean;
    sha256?: string;
  };
}

