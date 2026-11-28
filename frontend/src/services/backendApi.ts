/**
 * frontend/src/services/backendApi.ts
 *
 * Universal Canonical Backend API Service for AXYRA SpaceTech.
 * Connects the frontend directly to Django REST Framework backend (/api).
 * Provides typed requests and responses for:
 *   - Incident generation & ingestion (generateIncident, uploadIncident, listIncidents)
 *   - Canonical Causal Analysis (fetchCanonicalAnalysis, analyzeIncident)
 *   - Next Best Evidence (fetchNextBestEvidence)
 *   - Structural Counterfactuals (queryCounterfactual)
 *   - AI Scoring & SHAP Explanations (scoreTelemetryWindow, validateCausalCandidate)
 *   - Scenario Library & Report Export (fetchScenarios, exportReport)
 */

import {
  CanonicalAnalysisResponse,
  NextBestEvidence,
  ConfidenceTier,
  PatternStatus,
  EventRecord,
  MissionCausalNode,
  MissionCausalEdge,
  CounterfactualResult
} from '../types/missionArchitecture';
import { AiEvent, CausalValidationResult } from '../types/caelis';

export class ApiError extends Error {
  status: number;
  endpoint: string;
  detail?: any;

  constructor(message: string, status: number, endpoint: string, detail?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.endpoint = endpoint;
    this.detail = detail;
  }
}

export interface FeatureExplanation {
  key: string;
  name: string;
  contribution: number;
  valueFormatted: string;
  description: string;
}

const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

const rawApiUrl = metaEnv.VITE_API_URL;
const API_BASE_URL = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`)
  : (typeof window !== 'undefined' && window.location.origin
      ? `${window.location.origin}/api`
      : 'http://127.0.0.1:8000/api');

export type { ConfidenceTier, PatternStatus };

export interface BackendEvent extends EventRecord {
  unit?: string;
  source: string;
  confidence?: number;
}

export type CausalNodeData = MissionCausalNode;
export type CausalEdgeData = MissionCausalEdge;

export interface CompetingHypothesisData {
  event_id: string;
  component: string;
  score: number;
  confidence_tier: ConfidenceTier;
  margin_from_top: number;
  rationale: string;
}

export interface MissingEvidenceData {
  source_event_id: string;
  target_event_id: string;
  path: string[];
  missing_components: string[];
  severity: string;
  description: string;
}

export interface UncertainEdgeData {
  edge_id: string;
  source_event_id: string;
  target_event_id: string;
  score: number;
  confidence_tier: ConfidenceTier;
  rationale: string;
}

export interface AnalysisResponse extends CanonicalAnalysisResponse {}

export interface CounterfactualEventDetail {
  event_id: string;
  component: string;
  failure_type: string;
  time_offset_s: number;
  trigger_variable?: string;
  trigger_value?: number;
  status: 'PREVENTED' | 'REMAINING' | 'SHIFTED' | 'OBSERVED' | string;
  description: string;
  prevention_mechanism?: string;
  simulated_time_s?: number;
  shift_seconds?: number;
}

export interface ShiftedEventDetail {
  event_id: string;
  component: string;
  failure_type: string;
  observed_time_s: number;
  simulated_time_s: number;
  time_shift_s: number;
  description: string;
}

export interface MissionImpactDifference {
  prevented_failures_count: number;
  total_failures_count: number;
  subsystems_rescued: string[];
  battery_soc_preserved_percent: number;
  power_saved_watt_hours: number;
  comms_uptime_percent: number;
  mission_status: string;
}

export interface InterventionTimingInfo {
  intervention_time_s: number;
  lead_time_seconds: number;
  effective_window: string;
  target_component: string;
  target_variable?: string;
  action: string;
  description: string;
}

export interface BaselineReachabilityResult {
  method: string;
  prevented_event_ids: string[];
  remaining_event_ids: string[];
  prevented_count: number;
  remaining_count: number;
  summary: string;
}

export interface CounterfactualResponse {
  incident_id: string;
  target_event_id: string;
  simulation_method?: string;
  prevented_event_ids: string[];
  remaining_event_ids: string[];
  prevented_count: number;
  remaining_count: number;
  prevented_events?: CounterfactualEventDetail[];
  remaining_events?: CounterfactualEventDetail[];
  shifted_events?: ShiftedEventDetail[];
  mission_impact_difference?: MissionImpactDifference;
  intervention_timing?: InterventionTimingInfo;
  simulation_confidence?: number;
  confidence_tier?: ConfidenceTier;
  assumptions?: string[];
  baseline_reachability?: BaselineReachabilityResult;
  summary: string;
}

export interface BlastRadiusResponse {
  component: string;
  upstream_candidates: Array<{ component: string; hop_distance: number }>;
  downstream_dependents: string[];
}

export interface IncidentSummary {
  incident_id: string;
  created_at: string;
  events_count: number;
  primary_cause_event_id: string | null;
}

export interface DiagnosticReportResponse {
  incident_id: string;
  exported_at: string;
  format: string;
  summary: string;
  primary_cause_event_id: string;
  events_count: number;
  evidence_trace: string[];
}

// ----------------------------------------------------------------------------
// Core Safe Fetch Helper with explicit error propagation
// ----------------------------------------------------------------------------
async function safeFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = 12000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {})
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new ApiError(`Request timeout (${timeoutMs / 1000}s) on endpoint ${endpoint}`, 408, endpoint);
    }
    throw new ApiError(error.message || `Network error connecting to ${endpoint}`, 0, endpoint, error);
  }
}

// ----------------------------------------------------------------------------
// 1. Generate Incident Telemetry (Synthetic baseline + cascade)
// ----------------------------------------------------------------------------
export async function generateIncident(
  durationSeconds = 600,
  cascadeOffsetS = 300,
  scenarioKey = 'thermal_sensor'
): Promise<{ incident_id: string; events_count: number; events: BackendEvent[] }> {
  const res = await safeFetch('/incidents/generate/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      duration_seconds: durationSeconds,
      cascade_offset_s: cascadeOffsetS,
      scenario_key: scenarioKey
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(
      errData.error || `Failed to generate incident (HTTP ${res.status})`,
      res.status,
      '/incidents/generate/',
      errData
    );
  }

  return await res.json();
}

// ----------------------------------------------------------------------------
// 2. Upload Incident Log (CSV File or JSON Records)
// ----------------------------------------------------------------------------
export async function uploadIncident(
  payload: File | Array<Record<string, any>>
): Promise<{ incident_id: string; events_count: number; events: BackendEvent[] }> {
  let res: Response;
  if (payload instanceof File) {
    const formData = new FormData();
    formData.append('file', payload);
    res = await safeFetch('/incidents/upload/', {
      method: 'POST',
      body: formData
    });
  } else {
    res = await safeFetch('/incidents/upload/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: payload })
    });
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(
      errData.error || `Failed to upload incident (HTTP ${res.status})`,
      res.status,
      '/incidents/upload/',
      errData
    );
  }

  return await res.json();
}

// ----------------------------------------------------------------------------
// 3. List Stored Incidents
// ----------------------------------------------------------------------------
export async function listIncidents(): Promise<IncidentSummary[]> {
  const res = await safeFetch('/incidents/');
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(
      errData.error || `Failed to list incidents (HTTP ${res.status})`,
      res.status,
      '/incidents/',
      errData
    );
  }
  return await res.json();
}

// ----------------------------------------------------------------------------
// 4. Fetch Canonical Analysis (Run Causal Orchestrator)
// ----------------------------------------------------------------------------
export async function fetchCanonicalAnalysis(
  incidentId = 'inc_001',
  scorerType: 'learned' | 'legacy' | 'baseline' = 'learned',
  operatingMode = 'nominal'
): Promise<CanonicalAnalysisResponse> {
  const res = await safeFetch(`/incidents/${incidentId}/analyze/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      incident_id: incidentId,
      scorer_type: scorerType,
      operating_mode: operatingMode
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(
      errData.error || `Analysis failed for incident ${incidentId} (HTTP ${res.status})`,
      res.status,
      `/incidents/${incidentId}/analyze/`,
      errData
    );
  }

  return await res.json();
}

export const analyzeIncident = fetchCanonicalAnalysis;

// ----------------------------------------------------------------------------
// 5. Fetch Next Best Evidence (NBE) Recommendation
// ----------------------------------------------------------------------------
export async function fetchNextBestEvidence(incidentId = 'inc_001'): Promise<NextBestEvidence> {
  const res = await safeFetch(`/incidents/${incidentId}/next-best-evidence/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incident_id: incidentId })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(
      errData.error || `Failed to fetch Next Best Evidence for ${incidentId} (HTTP ${res.status})`,
      res.status,
      `/incidents/${incidentId}/next-best-evidence/`,
      errData
    );
  }

  return await res.json();
}

// ----------------------------------------------------------------------------
// 6. Structural Counterfactual Intervention Query
// ----------------------------------------------------------------------------
export async function queryCounterfactual(params: {
  incidentId?: string;
  targetEventId?: string;
  interventionMinutesEarlier?: number;
  interventionOffsetSec?: number;
  interventionType?: string;
  interventionComponent?: string;
  interventionParameter?: string;
  clampedValue?: number;
  method?: string;
}): Promise<CounterfactualResponse> {
  const {
    incidentId = 'inc_001',
    targetEventId = '',
    interventionMinutesEarlier = 10,
    interventionOffsetSec,
    interventionType,
    interventionComponent,
    interventionParameter,
    clampedValue,
    method = 'structural'
  } = params;

  const res = await safeFetch('/query/counterfactual/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      incident_id: incidentId,
      target_event_id: targetEventId,
      intervention_minutes_earlier: interventionMinutesEarlier,
      intervention_offset_s: interventionOffsetSec,
      intervention_type: interventionType,
      intervention_component: interventionComponent,
      intervention_parameter: interventionParameter,
      clamped_value: clampedValue,
      method
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(
      errData.error || `Counterfactual query failed (HTTP ${res.status})`,
      res.status,
      '/query/counterfactual/',
      errData
    );
  }

  return await res.json();
}

// ----------------------------------------------------------------------------
// 7. Blast Radius Dependency Query
// ----------------------------------------------------------------------------
export async function queryBlastRadius(component: string, maxHops = 3): Promise<BlastRadiusResponse> {
  const res = await safeFetch(`/query/blast-radius/?component=${encodeURIComponent(component)}&max_hops=${maxHops}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(
      errData.error || `Blast radius query failed (HTTP ${res.status})`,
      res.status,
      '/query/blast-radius/',
      errData
    );
  }
  return await res.json();
}

// ----------------------------------------------------------------------------
// 8. AI Ensemble Scoring & SHAP Attribution
// ----------------------------------------------------------------------------
export async function scoreTelemetryWindow(params: {
  values: number[];
  component: string;
  timestamp?: string;
  confidenceThreshold?: number;
  incidentId?: string;
}): Promise<{
  status: string;
  event: BackendEvent;
  feature_explanations: FeatureExplanation[];
  ai_result?: any;
  anomaly_detected?: boolean;
  anomaly_score?: number;
  model_confidence?: number;
}> {
  const res = await safeFetch('/caelis/score/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      values: params.values,
      component: params.component,
      timestamp: params.timestamp,
      confidence_threshold: params.confidenceThreshold ?? 0.5,
      incident_id: params.incidentId ?? 'inc_001'
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(
      errData.error || `AI telemetry scoring failed (HTTP ${res.status})`,
      res.status,
      '/caelis/score/',
      errData
    );
  }

  return await res.json();
}

// ----------------------------------------------------------------------------
// 9. Causal Candidate Validation
// ----------------------------------------------------------------------------
export async function validateCausalCandidate(
  eventId: string,
  incidentId = 'inc_001'
): Promise<CausalValidationResult> {
  const res = await safeFetch('/caelis/validate/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId, incident_id: incidentId })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(
      errData.error || `Causal validation failed for event ${eventId} (HTTP ${res.status})`,
      res.status,
      '/caelis/validate/',
      errData
    );
  }

  return await res.json();
}

// ----------------------------------------------------------------------------
// 10. Scenario Library
// ----------------------------------------------------------------------------
export async function fetchScenarios(): Promise<any[]> {
  const res = await safeFetch('/scenarios/');
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(
      errData.error || `Failed to fetch scenario library (HTTP ${res.status})`,
      res.status,
      '/scenarios/',
      errData
    );
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.scenarios || [];
}

// ----------------------------------------------------------------------------
// 11. Diagnostic Report Export
// ----------------------------------------------------------------------------
export async function exportReport(incidentId = 'inc_001', format = 'json'): Promise<DiagnosticReportResponse> {
  const res = await safeFetch(`/reports/${incidentId}/export/?format=${format}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(
      errData.error || `Report export failed (HTTP ${res.status})`,
      res.status,
      `/reports/${incidentId}/export/`,
      errData
    );
  }
  return await res.json();
}

// ----------------------------------------------------------------------------
// Explicit Offline Reference Fallback (Used only when intentionally running air-gapped demo)
// ----------------------------------------------------------------------------
export function getOfflineReferenceAnalysis(incidentId = 'inc_001'): CanonicalAnalysisResponse {
  return {
    incident_id: incidentId,
    analysis_id: `anl_${incidentId}_ref`,
    status: 'ANALYZED',
    created_at: new Date().toISOString(),
    summary: "Canonical reference CubeSat thermal-to-power cascade analysis.",
    telemetry_window: {
      start_time: '2026-08-24T10:05:00Z',
      end_time: '2026-08-24T10:08:06Z',
      events_count: 6,
      duration_seconds: 600
    },
    detected_events: [],
    hypotheses: [
      {
        id: 'hyp_1',
        rank: 1,
        root_event_id: 'evt-thm-001',
        component: 'thermal_sensor',
        explanation: 'Earliest anomaly with valid downstream dependencies and zero prior causes.',
        posterior: 0.994,
        confidence_tier: 'HIGH CONFIDENCE',
        uncertainty: 0.006,
        margin_from_top: 0.0,
        supporting_evidence: ['Survival heater command triggered by -64.2°C open-circuit reading.'],
        contradicting_evidence: []
      }
    ],
    causal_graph: {
      nodes: [
        {
          event_id: 'evt-thm-001',
          component: 'thermal_sensor',
          timestamp: '2026-08-24T10:05:00Z',
          value: -64.2,
          event_type: 'threshold',
          source: 'ai_pattern_match',
          role: 'primary',
          confidence: 0.994,
          confidence_label: 'high',
          confidence_tier: 'HIGH CONFIDENCE',
          upstream_edge_ids: [],
          is_out_of_distribution: false
        },
        {
          event_id: 'evt-htr-002',
          component: 'heater_controller',
          timestamp: '2026-08-24T10:05:42Z',
          value: 28.4,
          event_type: 'state_change',
          source: 'threshold',
          role: 'propagation',
          confidence: 0.988,
          confidence_label: 'high',
          confidence_tier: 'HIGH CONFIDENCE',
          upstream_edge_ids: ['evt-thm-001'],
          is_out_of_distribution: false
        },
        {
          event_id: 'evt-bat-003',
          component: 'battery_cell_2',
          timestamp: '2026-08-24T10:06:18Z',
          value: 2.78,
          event_type: 'threshold',
          source: 'threshold',
          role: 'propagation',
          confidence: 0.976,
          confidence_label: 'high',
          confidence_tier: 'HIGH CONFIDENCE',
          upstream_edge_ids: ['evt-htr-002'],
          is_out_of_distribution: false
        },
        {
          event_id: 'evt-prt-004',
          component: 'breaker_ss1',
          timestamp: '2026-08-24T10:06:42Z',
          value: 7.80,
          event_type: 'state_change',
          source: 'rule_based',
          role: 'propagation',
          confidence: 0.982,
          confidence_label: 'high',
          confidence_tier: 'HIGH CONFIDENCE',
          upstream_edge_ids: ['evt-bat-003'],
          is_out_of_distribution: false
        },
        {
          event_id: 'evt-bus-005',
          component: 'power_bus_5v',
          timestamp: '2026-08-24T10:07:05Z',
          value: 0.84,
          event_type: 'critical_drop',
          source: 'threshold',
          role: 'secondary',
          confidence: 0.991,
          confidence_label: 'high',
          confidence_tier: 'HIGH CONFIDENCE',
          upstream_edge_ids: ['evt-prt-004'],
          is_out_of_distribution: false
        },
        {
          event_id: 'evt-com-006',
          component: 'sband_transponder',
          timestamp: '2026-08-24T10:08:06Z',
          value: 0.0,
          event_type: 'carrier_loss',
          source: 'threshold',
          role: 'secondary',
          confidence: 0.998,
          confidence_label: 'high',
          confidence_tier: 'HIGH CONFIDENCE',
          upstream_edge_ids: ['evt-bus-005'],
          is_out_of_distribution: false
        }
      ],
      edges: [
        {
          id: 'edge_01',
          source_event_id: 'evt-thm-001',
          target_event_id: 'evt-htr-002',
          source_component: 'thermal_sensor',
          target_component: 'heater_controller',
          dependency_type: 'thermal',
          dependency_strength: 'critical',
          temporal_gap_seconds: 42,
          evidence: 'Survival heater command triggered by -64.2°C false open-circuit reading.',
          s_temporal: 1.0,
          s_dependency: 1.0,
          s_intermediate: 1.0,
          confidence: 0.988,
          confidence_tier: 'HIGH CONFIDENCE'
        },
        {
          id: 'edge_02',
          source_event_id: 'evt-htr-002',
          target_event_id: 'evt-bat-003',
          source_component: 'heater_controller',
          target_component: 'battery_cell_2',
          dependency_type: 'power',
          dependency_strength: 'critical',
          temporal_gap_seconds: 36,
          evidence: 'Continuous 28.4W power dissipation depleted electrochemical cell charge.',
          s_temporal: 1.0,
          s_dependency: 1.0,
          s_intermediate: 1.0,
          confidence: 0.976,
          confidence_tier: 'HIGH CONFIDENCE'
        },
        {
          id: 'edge_03',
          source_event_id: 'evt-bat-003',
          target_event_id: 'evt-prt-004',
          source_component: 'battery_cell_2',
          target_component: 'breaker_ss1',
          dependency_type: 'power',
          dependency_strength: 'critical',
          temporal_gap_seconds: 24,
          evidence: 'Declining cell potential caused DC-DC boost overcurrent surge to 7.8A.',
          s_temporal: 1.0,
          s_dependency: 1.0,
          s_intermediate: 1.0,
          confidence: 0.982,
          confidence_tier: 'HIGH CONFIDENCE'
        },
        {
          id: 'edge_04',
          source_event_id: 'evt-prt-004',
          target_event_id: 'evt-bus-005',
          source_component: 'breaker_ss1',
          target_component: 'power_bus_5v',
          dependency_type: 'power',
          dependency_strength: 'critical',
          temporal_gap_seconds: 23,
          evidence: 'Latching breaker opened input rail to 5V regulator, causing bus collapse to 0.84V.',
          s_temporal: 1.0,
          s_dependency: 1.0,
          s_intermediate: 1.0,
          confidence: 0.991,
          confidence_tier: 'HIGH CONFIDENCE'
        },
        {
          id: 'edge_05',
          source_event_id: 'evt-bus-005',
          target_event_id: 'evt-com-006',
          source_component: 'power_bus_5v',
          target_component: 'sband_transponder',
          dependency_type: 'power',
          dependency_strength: 'critical',
          temporal_gap_seconds: 61,
          evidence: 'Logic brownout terminated transponder carrier transmission to ground station.',
          s_temporal: 1.0,
          s_dependency: 1.0,
          s_intermediate: 1.0,
          confidence: 0.998,
          confidence_tier: 'HIGH CONFIDENCE'
        }
      ]
    },
    cascade: {
      root: 'evt-thm-001',
      root_component: 'thermal_sensor',
      sequence: ['evt-thm-001', 'evt-htr-002', 'evt-bat-003', 'evt-prt-004'],
      terminal_effects: ['evt-bus-005', 'evt-com-006']
    },
    physics: {
      residuals: [
        {
          event_id: 'evt-thm-001',
          component: 'thermal_sensor',
          observed_value: -64.2,
          predicted_value: 20.0,
          residual: -84.2,
          normalized_residual: -105.25,
          anomaly_classification: 'both'
        }
      ]
    },
    next_best_evidence: {
      recommended_observation: 'Command high-rate 10Hz burst sampling of telemetry channel THERM_ADC_RAW_01 on thermal_sensor',
      target_signal: 'THERM_ADC_RAW_01',
      target_component: 'thermal_sensor',
      rationale: 'Disambiguates root cause between primary candidate thermal_sensor and battery. Probing THERM_ADC_RAW_01 discriminates between sensor circuit failure vs physical actuator runaway.',
      hypothesis_ids: ['evt-thm-001'],
      expected_outcomes: [
        {
          outcome: 'THERM_ADC_RAW_01 indicates sensor circuit disconnection',
          favors_hypothesis_id: 'evt-thm-001',
          favors_component: 'thermal_sensor',
          expected_confidence: 0.98,
          description: 'Confirms primary origin at thermal_sensor via analog front-end fault.'
        }
      ],
      expected_information_gain: 0.88,
      telemetry_cost: 'LOW',
      priority: 'HIGH'
    },
    warnings: [],
    provenance: {
      scorer_type: 'learned',
      operating_mode: 'nominal',
      model_version: 'v2.4',
      sovereign_mode: true,
      sha256: 'fb131821cf75664b48f60f0e56ed4891857016643a713e9ddf98a3edc5a5944c'
    },
    nodes: [],
    edges: [],
    primary_cause_event_id: 'evt-thm-001',
    minimum_explanation_event_ids: ['evt-thm-001', 'evt-htr-002', 'evt-bat-003', 'evt-prt-004', 'evt-bus-005', 'evt-com-006'],
    raw_events: []
  };
}

// ----------------------------------------------------------------------------
// Health Check
// ----------------------------------------------------------------------------
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await safeFetch('/health/');
    return res.ok;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// Scenario Lookup by Key
// ----------------------------------------------------------------------------
export async function fetchScenarioByKey(scenarioKey: string): Promise<any> {
  try {
    const scenarios = await fetchScenarios();
    const match = scenarios.find(
      (s: any) => s.key === scenarioKey || s.id === scenarioKey || s.incident_id === scenarioKey
    );
    if (match) return match;
  } catch {
    // fallback
  }
  return { key: scenarioKey, name: scenarioKey, incident_id: scenarioKey };
}

// ----------------------------------------------------------------------------
// Simulate Counterfactual (High-level bridge)
// ----------------------------------------------------------------------------
export async function simulateCounterfactual(params: {
  incident_id: string;
  target_component: string;
  intervention_type: string;
  target_time_offset?: number;
}): Promise<CounterfactualResult> {
  const resp = await queryCounterfactual({
    incidentId: params.incident_id,
    interventionComponent: params.target_component,
    interventionType: params.intervention_type,
    interventionOffsetSec: params.target_time_offset,
    method: 'structural'
  });

  const preventedNodes = resp.prevented_event_ids || [];
  const remainingNodes = resp.remaining_event_ids || [];
  const cascadePrevented = preventedNodes.length > 0;

  return {
    cascade_prevented: cascadePrevented,
    mitigation_summary:
      resp.summary ||
      `Intervention on ${params.target_component} prevented ${preventedNodes.length} downstream failures.`,
    prevented_nodes: preventedNodes,
    remaining_nodes: remainingNodes,
    impact_difference: resp.mission_impact_difference,
    confidence: resp.simulation_confidence ?? 0.94
  };
}

// ----------------------------------------------------------------------------
// 12. Canonical Simulation Dataset & Ingestion APIs (Sections 2, 7, 8, 9, 10)
// ----------------------------------------------------------------------------
export interface SimulationGenerateParams {
  scenario_id: string;
  duration_seconds?: number;
  orbit_altitude_km?: number;
  orbit_altitude?: number;
  noise_level?: number;
  sampling_rate_hz?: number;
  random_seed?: number;
  custom_fault?: any;
  target_subsystem?: string;
  failure_type?: string;
  severity_pct?: number;
  injection_offset_s?: number;
}

export interface SimulationRecord {
  packet_id: string;
  timestamp: string;
  mission_elapsed_time: number;
  subsystem: string;
  channel_id: string;
  signal_name: string;
  value: number;
  unit: string;
  quality: string;
  source_type: string;
  packet_sequence: number;
  expected_value?: number | null;
  metadata?: any;
}

export interface SimulationMetadata {
  simulation_id: string;
  scenario_id: string;
  name: string;
  description: string;
  random_seed: number;
  status: string;
  total_packets: number;
  channels: string[];
  subsystems: string[];
  logs?: string[];
  events?: any[];
  parameters: any;
  created_at: string;
  validation?: any;
}

export interface SimulationTelemetryResponse {
  simulation_id: string;
  scenario_id: string;
  total_packets: number;
  limit: number;
  offset: number;
  returned_packets: number;
  records: SimulationRecord[];
}

export async function generateSimulation(
  params: SimulationGenerateParams
): Promise<SimulationMetadata> {
  const res = await safeFetch('/simulations/generate/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error || `Failed to generate simulation (HTTP ${res.status})`, res.status, '/simulations/generate/', err);
  }
  return await res.json();
}

export async function fetchSimulations(): Promise<{ simulations: any[]; scenario_blueprints: any[] }> {
  const res = await safeFetch('/simulations/');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error || `Failed to list simulations (HTTP ${res.status})`, res.status, '/simulations/', err);
  }
  return await res.json();
}

export async function fetchSimulation(simulationId: string): Promise<SimulationMetadata> {
  const res = await safeFetch(`/simulations/${simulationId}/`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error || `Failed to get simulation (HTTP ${res.status})`, res.status, `/simulations/${simulationId}/`, err);
  }
  return await res.json();
}

export async function fetchSimulationTelemetry(
  simulationId: string,
  params?: { subsystem?: string; channel_id?: string; source_type?: string; limit?: number; offset?: number }
): Promise<SimulationTelemetryResponse> {
  let query = '';
  if (params) {
    const q = new URLSearchParams();
    if (params.subsystem) q.append('subsystem', params.subsystem);
    if (params.channel_id) q.append('channel_id', params.channel_id);
    if (params.source_type) q.append('source_type', params.source_type);
    if (params.limit !== undefined) q.append('limit', String(params.limit));
    if (params.offset !== undefined) q.append('offset', String(params.offset));
    query = `?${q.toString()}`;
  }
  const res = await safeFetch(`/simulations/${simulationId}/telemetry/${query}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error || `Failed to get simulation telemetry (HTTP ${res.status})`, res.status, `/simulations/${simulationId}/telemetry/`, err);
  }
  return await res.json();
}

export async function fetchSimulationEvents(simulationId: string): Promise<{ simulation_id: string; events: any[] }> {
  const res = await safeFetch(`/simulations/${simulationId}/events/`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error || `Failed to get simulation events (HTTP ${res.status})`, res.status, `/simulations/${simulationId}/events/`, err);
  }
  return await res.json();
}

export async function analyzeSimulation(
  simulationId: string,
  scorerType: 'learned' | 'baseline' = 'learned'
): Promise<CanonicalAnalysisResponse> {
  const res = await safeFetch(`/simulations/${simulationId}/analyze/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scorer_type: scorerType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error || `Failed to analyze simulation (HTTP ${res.status})`, res.status, `/simulations/${simulationId}/analyze/`, err);
  }
  return await res.json();
}

export async function validateSimulation(
  simulationId: string
): Promise<{ valid: boolean; errors: string[]; warnings: string[]; stats: any }> {
  const res = await safeFetch(`/simulations/${simulationId}/validate/`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error || `Failed to validate simulation (HTTP ${res.status})`, res.status, `/simulations/${simulationId}/validate/`, err);
  }
  return await res.json();
}

export async function uploadSimulationTelemetry(
  fileOrData: File | { records: any[] }
): Promise<any> {
  let res: Response;
  if (fileOrData instanceof File) {
    const formData = new FormData();
    formData.append('file', fileOrData);
    res = await safeFetch('/simulations/upload/', {
      method: 'POST',
      body: formData,
    });
  } else {
    res = await safeFetch('/simulations/upload/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileOrData),
    });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error || `Failed to upload simulation telemetry (HTTP ${res.status})`, res.status, '/simulations/upload/', err);
  }
  return await res.json();
}

// ----------------------------------------------------------------------------
// Unified Singleton Export
// ----------------------------------------------------------------------------
export const backendApi = {
  healthCheck,
  fetchScenarios,
  fetchScenarioByKey,
  generateIncident,
  uploadIncident,
  listIncidents,
  fetchCanonicalAnalysis,
  analyzeIncident,
  fetchNextBestEvidence,
  queryCounterfactual,
  simulateCounterfactual,
  queryBlastRadius,
  scoreTelemetryWindow,
  validateCausalCandidate,
  exportReport,
  generateSimulation,
  fetchSimulations,
  fetchSimulation,
  fetchSimulationTelemetry,
  fetchSimulationEvents,
  analyzeSimulation,
  validateSimulation,
  uploadSimulationTelemetry,
  getCanonicalDemoAnalysis: getOfflineReferenceAnalysis,
  getOfflineReferenceAnalysis
};

export default backendApi;

