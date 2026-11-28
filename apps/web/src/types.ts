/**
 * TypeScript DTOs synchronized with Python Pydantic domain models.
 */

export type AssetType =
  | "power_substation"
  | "water_pump"
  | "hospital"
  | "road_segment"
  | "telecom_tower";

export type LogicalState =
  | "operational"
  | "degraded"
  | "unavailable"
  | "repairing"
  | "recovered";

export type DependencyType =
  | "electricity"
  | "water"
  | "access"
  | "communication";

export type DependencyMode = "hard" | "soft" | "alternative";

export type InterventionType =
  | "protect_asset"
  | "deploy_backup"
  | "temporary_service"
  | "repair_asset"
  | "clear_access";

export interface Position {
  x: number;
  y: number;
  z?: number;
}

export interface BackupResource {
  resource_type: string;
  remaining_inventory: number;
  max_output_per_tick: number;
  conversion_efficiency: number;
  is_active?: boolean;
}

export interface Asset {
  asset_id: string;
  asset_type: AssetType;
  name: string;
  position: Position;
  physical_damage: number;
  nominal_capacity: number;
  intrinsic_capacity_fraction: number;
  delivered_service_fraction: number;
  minimum_operational_service: number;
  criticality_weight: number;
  is_critical?: boolean;
  vulnerability_scale?: number;
  resistance_threshold?: number;
  backup: BackupResource[];
  logical_state: LogicalState;
}

export interface Dependency {
  dependency_id: string;
  source_asset_id: string;
  target_asset_id: string;
  dependency_type: DependencyType;
  mode: DependencyMode;
  required_fraction: number;
  minimum_fraction: number;
  latency_ticks: number;
  grace_ticks: number;
  importance: number;
  alternative_group?: string | null;
}

export interface DistrictModel {
  project_id: string;
  name: string;
  assets: Asset[];
  dependencies: Dependency[];
}

export interface FloodSource {
  center_x: number;
  center_y: number;
  radius: number;
  peak_intensity: number;
  start_tick: number;
  peak_tick: number;
  end_tick: number;
}

export interface Scenario {
  scenario_id: string;
  name: string;
  hazard_type: string;
  flood_sources: FloodSource[];
  seed: number;
  horizon_ticks: number;
  tick_seconds: number;
}

export interface Intervention {
  intervention_id: string;
  type: InterventionType;
  target_asset_id: string;
  start_tick: number;
  duration_ticks: number;
  resource_cost: number;
  effect: Record<string, number>;
}

export interface SimulationEvent {
  event_id: string;
  run_id: string;
  sequence: number;
  tick: number;
  event_type: string;
  asset_id?: string | null;
  dependency_id?: string | null;
  previous_state?: string | null;
  new_state?: string | null;
  cause_code: string;
  parent_event_ids: string[];
  evidence: Record<string, any>;
}

export interface RunMetrics {
  run_id: string;
  weighted_service_loss: number;
  normalized_weighted_service_loss: number;
  cascade_size: number;
  critical_service_availability_timeline: number[];
  final_critical_service_availability: number;
  recovery_time?: number | null;
  recovery_time_censored: boolean;
  resources_consumed: number;
  total_events: number;
}

export interface AssetRuntimeState {
  asset_id: string;
  physical_damage: number;
  intrinsic_capacity: number;
  delivered_service: number;
  logical_state: LogicalState;
  active_backups: BackupResource[];
  service_history: number[];
  is_protected?: boolean;
}

export interface RunState {
  runId: string;
  sequence: number;
  tick: number;
  status: "idle" | "running" | "paused" | "completed" | "cancelled";
  assets: Record<string, AssetRuntimeState>;
  events: SimulationEvent[];
  metrics?: RunMetrics | null;
}

export interface ResourcePool {
  repair_crews: number;
  mobile_generators: number;
  temporary_pumps: number;
  budget_units: number;
}

export interface OptimizationResult {
  solver: string;
  solver_status: string;
  is_optimal: boolean;
  selected_actions: string[];
  interventions: Intervention[];
  total_cost: number;
  resources_used: {
    generators: number;
    crews: number;
    pumps: number;
  };
  greedy_comparison?: {
    status: string;
    selected_actions: string[];
    total_cost: number;
  };
}

export interface ScenarioCandidate {
  candidate_id: string;
  scenario: Scenario;
  impact_nwsl: number;
  cascade_size: number;
  eval_seed: number;
}

export interface PairedMonteCarloResult {
  draw_set_id: string;
  seeds: number[];
  num_runs: number;
  mean_baseline_nwsl: number;
  mean_intervention_nwsl: number;
  mean_absolute_improvement: number;
  std_improvement: number;
  p10_improvement: number;
  p50_improvement: number;
  p90_improvement: number;
  mean_cascade_reduction: number;
  runs: Array<{
    seed: number;
    baseline_nwsl: number;
    intervention_nwsl: number;
    absolute_improvement: number;
    relative_improvement: number;
    cascade_reduction: number;
  }>;
}
