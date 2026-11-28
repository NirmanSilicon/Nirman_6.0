/**
 * frontend/src/context/AnalysisContext.tsx
 *
 * Unified Reactive Analysis Context for the CAELIS Mission Assurance Platform.
 * Acts as the single source of truth across all workspaces:
 * - Mission Lab
 * - Causal Reconstruction
 * - Caelis AI
 * - Evidence Trace
 * - Incident Report
 * - Spacecraft Replay Simulator
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  CanonicalAnalysisResponse,
  NextBestEvidence,
  CounterfactualResult,
} from '../types/missionArchitecture';
import {
  backendApi,
  ApiError,
  SimulationMetadata,
  SimulationRecord,
  SimulationGenerateParams,
  HealthStatusResponse,
} from '../services/backendApi';

export type AnalysisStatus =
  | 'IDLE'
  | 'LOADING'
  | 'ANALYZED'
  | 'FAILED'
  | 'NO_EVIDENCE'
  | 'OUT_OF_DISTRIBUTION'
  | 'PARTIAL';

export interface ScenarioItem {
  key: string;
  name: string;
  description: string;
  craft_class?: string;
  incident_id?: string;
}

export interface CounterfactualRequestParams {
  target_component: string;
  intervention_type: string;
  target_time_offset?: number;
}

export interface AnalysisContextValue {
  // State
  activeIncidentId: string;
  analysis: CanonicalAnalysisResponse | null;
  status: AnalysisStatus;
  error: string | null;
  backendConnected: boolean;
  backendHealth: HealthStatusResponse | null;
  isBackendChecking: boolean;
  lastUpdated: string | null;
  nextBestEvidence: NextBestEvidence | null;
  isNbeLoading: boolean;
  counterfactualResult: CounterfactualResult | null;
  isCounterfactualLoading: boolean;
  availableScenarios: ScenarioItem[];
  selectedScorer: 'learned' | 'baseline';
  activeScenarioKey: string;
  isReferenceModel: boolean;
  activeSimulation: SimulationMetadata | null;
  activeTelemetry: SimulationRecord[];
  isSimulating: boolean;

  // Actions
  runAnalysis: (incidentId?: string, scorerType?: 'learned' | 'baseline') => Promise<CanonicalAnalysisResponse | null>;
  loadScenario: (scenarioKey: string) => Promise<void>;
  generateSimulation: (params: SimulationGenerateParams) => Promise<SimulationMetadata | null>;
  loadSimulationTelemetry: (simId: string) => Promise<SimulationRecord[]>;
  runCounterfactual: (params: CounterfactualRequestParams) => Promise<CounterfactualResult | null>;
  requestNextBestEvidence: () => Promise<NextBestEvidence | null>;
  setSelectedScorer: (scorer: 'learned' | 'baseline') => void;
  checkBackendHealth: () => Promise<boolean>;
  loadOfflineReference: () => void;
  clearError: () => void;
}

const AnalysisContext = createContext<AnalysisContextValue | undefined>(undefined);

const DEFAULT_INCIDENT_ID = 'canonical_cubesat_demo';

export const AnalysisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeIncidentId, setActiveIncidentId] = useState<string>(DEFAULT_INCIDENT_ID);
  const [activeScenarioKey, setActiveScenarioKey] = useState<string>('cubesat_thermal_runaway');
  const [activeSimulation, setActiveSimulation] = useState<SimulationMetadata | null>(null);
  const [activeTelemetry, setActiveTelemetry] = useState<SimulationRecord[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<CanonicalAnalysisResponse | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [backendHealth, setBackendHealth] = useState<HealthStatusResponse | null>(null);
  const [isBackendChecking, setIsBackendChecking] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [nextBestEvidence, setNextBestEvidence] = useState<NextBestEvidence | null>(null);
  const [isNbeLoading, setIsNbeLoading] = useState<boolean>(false);
  const [counterfactualResult, setCounterfactualResult] = useState<CounterfactualResult | null>(null);
  const [isCounterfactualLoading, setIsCounterfactualLoading] = useState<boolean>(false);
  const [availableScenarios, setAvailableScenarios] = useState<ScenarioItem[]>([]);
  const [selectedScorer, setSelectedScorer] = useState<'learned' | 'baseline'>('learned');
  const [isReferenceModel, setIsReferenceModel] = useState<boolean>(false);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check backend health
  const checkBackendHealth = useCallback(async (): Promise<boolean> => {
    setIsBackendChecking(true);
    try {
      const details = await backendApi.fetchHealthDetails();
      if (details && (details.status === 'healthy' || details.service === 'axyra_caelis_platform')) {
        setBackendConnected(true);
        setBackendHealth(details);
        setIsReferenceModel(false);
        setError(null);

        // Dynamically fetch scenarios from live backend
        try {
          const scenarios = await backendApi.fetchScenarios();
          if (scenarios && scenarios.length > 0) {
            setAvailableScenarios(
              scenarios.map((s) => ({
                key: s.key || s.id || 'unknown',
                name: s.name,
                description: s.description || '',
                craft_class: s.craft_class,
                incident_id: s.incident_id,
              }))
            );
          }
        } catch {
          // ignore scenario lookup error
        }

        return true;
      }
      setBackendConnected(false);
      setBackendHealth(null);
      return false;
    } catch {
      setBackendConnected(false);
      setBackendHealth(null);
      return false;
    } finally {
      setIsBackendChecking(false);
    }
  }, []);

  // Load offline reference demo explicitly (useful for air-gapped demo without running backend)
  const loadOfflineReference = useCallback(() => {
    const refData = backendApi.getCanonicalDemoAnalysis();
    setAnalysis(refData);
    setStatus('ANALYZED');
    setIsReferenceModel(true);
    setLastUpdated(new Date().toISOString());
    if (refData.next_best_evidence) {
      setNextBestEvidence(refData.next_best_evidence);
    }
    if (refData.counterfactual_simulation) {
      setCounterfactualResult(refData.counterfactual_simulation);
    }
    setError(null);
  }, []);

  // Fetch Next Best Evidence
  const requestNextBestEvidence = useCallback(async (): Promise<NextBestEvidence | null> => {
    setIsNbeLoading(true);
    try {
      const nbe = await backendApi.fetchNextBestEvidence(activeIncidentId);
      setNextBestEvidence(nbe);
      return nbe;
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : (err?.message || 'Failed to fetch next best evidence');
      // If backend offline and we have reference analysis, fall back gracefully to reference NBE
      if (analysis?.next_best_evidence) {
        setNextBestEvidence(analysis.next_best_evidence);
        return analysis.next_best_evidence;
      }
      setError(msg);
      return null;
    } finally {
      setIsNbeLoading(false);
    }
  }, [activeIncidentId, analysis]);

  // Run or re-run canonical analysis
  const runAnalysis = useCallback(
    async (
      incidentId?: string,
      scorerType?: 'learned' | 'baseline'
    ): Promise<CanonicalAnalysisResponse | null> => {
      const targetId = incidentId || activeIncidentId;
      const targetScorer = scorerType || selectedScorer;

      setStatus('LOADING');
      setError(null);

      try {
        const result = await backendApi.fetchCanonicalAnalysis(targetId, targetScorer);
        setAnalysis(result);
        setBackendConnected(true);
        setIsReferenceModel(false);
        setLastUpdated(new Date().toISOString());

        // Derive status from result
        if (!result.causal_graph || result.causal_graph.nodes.length === 0) {
          setStatus('NO_EVIDENCE');
        } else if (result.uncertainty?.is_out_of_distribution) {
          setStatus('OUT_OF_DISTRIBUTION');
        } else if (result.root_causes?.some((rc) => rc.confidence_tier === 'INSUFFICIENT EVIDENCE')) {
          setStatus('PARTIAL');
        } else {
          setStatus('ANALYZED');
        }

        // Populate sidecars if present
        if (result.next_best_evidence) {
          setNextBestEvidence(result.next_best_evidence);
        } else {
          // Attempt async fetch of NBE
          backendApi.fetchNextBestEvidence(targetId)
            .then(setNextBestEvidence)
            .catch(() => {});
        }

        if (result.counterfactual_simulation) {
          setCounterfactualResult(result.counterfactual_simulation);
        }

        return result;
      } catch (err: any) {
        const errMsg = err instanceof ApiError ? `${err.message} (HTTP ${err.status})` : (err?.message || 'Analysis failed');
        setError(errMsg);
        setStatus('FAILED');
        setBackendConnected(false);

        // If backend failed and this is the default scenario, provide fallback reference model
        // but keep error state visible to avoid silent failure illusion
        if (targetId === DEFAULT_INCIDENT_ID || targetId === 'inc_001') {
          console.warn('[AnalysisContext] Backend unreachable. Retaining or loading offline reference.');
          const ref = backendApi.getCanonicalDemoAnalysis();
          setAnalysis(ref);
          setIsReferenceModel(true);
          if (ref.next_best_evidence) setNextBestEvidence(ref.next_best_evidence);
          if (ref.counterfactual_simulation) setCounterfactualResult(ref.counterfactual_simulation);
        }
        return null;
      }
    },
    [activeIncidentId, selectedScorer]
  );

  // Load a specific scenario by key
  const loadScenario = useCallback(
    async (scenarioKey: string) => {
      setActiveScenarioKey(scenarioKey);
      setStatus('LOADING');
      setError(null);

      try {
        const scenario = await backendApi.fetchScenarioByKey(scenarioKey);
        const incId = scenario.incident_id || scenarioKey;
        setActiveIncidentId(incId);
        await runAnalysis(incId, selectedScorer);
      } catch (err: any) {
        // If scenarios API not reached, map common keys
        const fallbackIncId = scenarioKey === 'cubesat_thermal_runaway' ? DEFAULT_INCIDENT_ID : scenarioKey;
        setActiveIncidentId(fallbackIncId);
        await runAnalysis(fallbackIncId, selectedScorer);
      }
    },
    [runAnalysis, selectedScorer]
  );

  // Run counterfactual simulation
  const runCounterfactual = useCallback(
    async (params: CounterfactualRequestParams): Promise<CounterfactualResult | null> => {
      setIsCounterfactualLoading(true);
      setError(null);

      try {
        const result = await backendApi.simulateCounterfactual({
          incident_id: activeIncidentId,
          target_component: params.target_component,
          intervention_type: params.intervention_type,
          target_time_offset: params.target_time_offset ?? 0,
        });

        setCounterfactualResult(result);

        // Also update canonical analysis with counterfactual if analysis exists
        setAnalysis((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            counterfactual_simulation: result,
          };
        });

        return result;
      } catch (err: any) {
        const msg = err instanceof ApiError ? err.message : (err?.message || 'Counterfactual simulation failed');
        setError(msg);
        return null;
      } finally {
        setIsCounterfactualLoading(false);
      }
    },
    [activeIncidentId]
  );

  // Generate canonical spacecraft simulation
  const generateSimulation = useCallback(
    async (params: SimulationGenerateParams): Promise<SimulationMetadata | null> => {
      setIsSimulating(true);
      setError(null);
      try {
        const simMeta = await backendApi.generateSimulation(params);
        setActiveSimulation(simMeta);
        setActiveIncidentId(simMeta.simulation_id);
        setActiveScenarioKey(simMeta.scenario_id);
        setBackendConnected(true);

        try {
          const telResp = await backendApi.fetchSimulationTelemetry(simMeta.simulation_id, { limit: 200 });
          setActiveTelemetry(telResp.records);
        } catch {
          // ignore
        }

        return simMeta;
      } catch (err: any) {
        const msg = err instanceof ApiError ? err.message : (err?.message || 'Simulation generation failed');
        setError(msg);
        return null;
      } finally {
        setIsSimulating(false);
      }
    },
    []
  );

  // Load simulation telemetry packets
  const loadSimulationTelemetry = useCallback(
    async (simId: string): Promise<SimulationRecord[]> => {
      try {
        const telResp = await backendApi.fetchSimulationTelemetry(simId, { limit: 500 });
        setActiveTelemetry(telResp.records);
        return telResp.records;
      } catch (err: any) {
        console.warn('Failed to load simulation telemetry', err);
        return [];
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      const isHealthy = await checkBackendHealth();

      // Fetch scenarios list
      try {
        const scenarios = await backendApi.fetchScenarios();
        if (isMounted && scenarios.length > 0) {
          setAvailableScenarios(
            scenarios.map((s) => ({
              key: s.key || s.id || 'unknown',
              name: s.name,
              description: s.description || '',
              craft_class: s.craft_class,
              incident_id: s.incident_id,
            }))
          );
        }
      } catch {
        // Fallback default scenarios
        if (isMounted) {
          setAvailableScenarios([
            {
              key: 'cubesat_thermal_runaway',
              name: 'CubeSat Thermal Runaway & Bus Brownout',
              description: 'Sensor failure leading to heater lock-up and battery cascade',
              craft_class: '3U_CUBESAT',
              incident_id: 'canonical_cubesat_demo',
            },
            {
              key: 'telemetry_dropout_safe_mode',
              name: 'Transponder Carrier Loss & Safe Mode Cascade',
              description: 'RF amplifier transient resulting in automated failsafe transition',
              craft_class: 'SMALLSAT',
              incident_id: 'inc_002',
            },
            {
              key: 'adcs_wheel_desaturation_anomaly',
              name: 'Reaction Wheel Overspeed & Thruster Desat',
              description: 'Momentum accumulation anomaly during eclipse transition',
              craft_class: 'LEO_OBSERVATION',
              incident_id: 'inc_003',
            },
          ]);
        }
      }

      // If backend is healthy, run analysis for default incident
      if (isMounted) {
        if (isHealthy) {
          runAnalysis(DEFAULT_INCIDENT_ID, 'learned');
        } else {
          // Provide sovereign offline reference demo
          console.info('[AnalysisContext] Backend not detected on start. Initializing with Sovereign Reference Model.');
          loadOfflineReference();
        }
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AnalysisContextValue>(
    () => ({
      activeIncidentId,
      analysis,
      status,
      error,
      backendConnected,
      backendHealth,
      isBackendChecking,
      lastUpdated,
      nextBestEvidence,
      isNbeLoading,
      counterfactualResult,
      isCounterfactualLoading,
      availableScenarios,
      selectedScorer,
      activeScenarioKey,
      isReferenceModel,
      activeSimulation,
      activeTelemetry,
      isSimulating,
      runAnalysis,
      loadScenario,
      generateSimulation,
      loadSimulationTelemetry,
      runCounterfactual,
      requestNextBestEvidence,
      setSelectedScorer,
      checkBackendHealth,
      loadOfflineReference,
      clearError,
    }),
    [
      activeIncidentId,
      analysis,
      status,
      error,
      backendConnected,
      backendHealth,
      isBackendChecking,
      lastUpdated,
      nextBestEvidence,
      isNbeLoading,
      counterfactualResult,
      isCounterfactualLoading,
      availableScenarios,
      selectedScorer,
      activeScenarioKey,
      isReferenceModel,
      activeSimulation,
      activeTelemetry,
      isSimulating,
      runAnalysis,
      loadScenario,
      generateSimulation,
      loadSimulationTelemetry,
      runCounterfactual,
      requestNextBestEvidence,
      setSelectedScorer,
      checkBackendHealth,
      loadOfflineReference,
      clearError,
    ]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
};

export const useAnalysis = (): AnalysisContextValue => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};
