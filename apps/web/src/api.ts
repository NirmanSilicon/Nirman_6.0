/**
 * API client communicating with AFTERSHOCK FastAPI backend.
 */
import {
  DistrictModel,
  Scenario,
  SimulationEvent,
  RunMetrics,
  Intervention,
  ResourcePool,
  OptimizationResult,
  ScenarioCandidate,
  PairedMonteCarloResult,
} from "./types";

const API_BASE = "/api/v1";

export async function fetchProjects(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function fetchProjectGraph(projectId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/graph`);
  if (!res.ok) throw new Error("Failed to fetch project graph");
  return res.json();
}

export async function fetchScenarios(): Promise<Scenario[]> {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error("Failed to fetch scenarios");
  return res.json();
}

export async function createRun(params: {
  project_id: string;
  scenario_id: string;
  seed?: number;
  interventions?: Intervention[];
  run_id?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to create run");
  return res.json();
}

export async function startRun(runId: string, tickDelay: number = 0.05): Promise<any> {
  const res = await fetch(`${API_BASE}/runs/${runId}/start?tick_delay=${tickDelay}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to start run");
  return res.json();
}

export async function stepRun(runId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/runs/${runId}/step`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to step run");
  return res.json();
}

export async function cancelRun(runId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/runs/${runId}/cancel`, {
    method: "POST",
  });
  return res.json();
}

export async function fetchRunEvents(
  runId: string,
  fromSeq?: number,
  toSeq?: number
): Promise<SimulationEvent[]> {
  let url = `${API_BASE}/runs/${runId}/events`;
  const params = new URLSearchParams();
  if (fromSeq !== undefined) params.append("from_sequence", fromSeq.toString());
  if (toSeq !== undefined) params.append("to_sequence", toSeq.toString());
  if (params.toString()) url += `?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch run events");
  return res.json();
}

export async function fetchRunSnapshot(runId: string, tick?: number): Promise<any> {
  let url = `${API_BASE}/runs/${runId}/snapshot`;
  if (tick !== undefined) url += `?tick=${tick}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch snapshot");
  return res.json();
}

export async function fetchRunMetrics(runId: string): Promise<RunMetrics> {
  const res = await fetch(`${API_BASE}/runs/${runId}/metrics`);
  if (!res.ok) throw new Error("Failed to fetch metrics");
  return res.json();
}

export async function fetchCausalChain(runId: string, assetId?: string): Promise<any> {
  let url = `${API_BASE}/runs/${runId}/causal-chain`;
  if (assetId) url += `?asset_id=${assetId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch causal chain");
  return res.json();
}

export async function optimizeDefence(
  projectId: string,
  resources: ResourcePool
): Promise<OptimizationResult> {
  const res = await fetch(`${API_BASE}/optimization/defence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: projectId, resources }),
  });
  if (!res.ok) throw new Error("Failed to run defence optimization");
  return res.json();
}

export async function optimizeRecovery(
  projectId: string,
  resources: ResourcePool
): Promise<any> {
  const res = await fetch(`${API_BASE}/optimization/recovery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: projectId, resources }),
  });
  if (!res.ok) throw new Error("Failed to run recovery optimization");
  return res.json();
}

export async function searchScenarios(
  projectId: string,
  scenarioId: string,
  budget: number = 6,
  seed: number = 42
): Promise<{ search_seed: number; candidates: ScenarioCandidate[] }> {
  const res = await fetch(`${API_BASE}/scenario-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: projectId,
      scenario_id: scenarioId,
      search_budget: budget,
      seed,
    }),
  });
  if (!res.ok) throw new Error("Failed to search scenarios");
  return res.json();
}

export async function runComparison(
  projectId: string,
  scenarioId: string,
  seed: number,
  interventions: Intervention[]
): Promise<any> {
  const res = await fetch(`${API_BASE}/comparisons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: projectId,
      scenario_id: scenarioId,
      seed,
      interventions,
    }),
  });
  if (!res.ok) throw new Error("Failed to run comparison");
  return res.json();
}

export async function runMonteCarlo(
  projectId: string,
  scenarioId: string,
  seeds: number[],
  interventions: Intervention[]
): Promise<PairedMonteCarloResult> {
  const res = await fetch(`${API_BASE}/monte-carlo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: projectId,
      scenario_id: scenarioId,
      seeds,
      interventions,
    }),
  });
  if (!res.ok) throw new Error("Failed to run Monte Carlo");
  return res.json();
}
