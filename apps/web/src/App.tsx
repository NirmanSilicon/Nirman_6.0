import React, { useState, useEffect, useCallback } from "react";
import {
  Globe2,
  Network,
  Waves,
  Shield,
  GitCompare,
  GitCommit,
  Radio,
  Activity,
  Layers,
  ChevronRight,
} from "lucide-react";
import {
  DistrictModel,
  Scenario,
  SimulationEvent,
  RunMetrics,
  RunState,
  Asset,
  Dependency,
  Intervention,
} from "./types";
import {
  fetchProjects,
  fetchProjectGraph,
  fetchScenarios,
  createRun,
  startRun,
  stepRun,
  cancelRun,
  fetchRunMetrics,
  fetchRunSnapshot,
} from "./api";
import { useRunStream } from "./hooks/useRunStream";
import { DigitalTwin } from "./components/DigitalTwin";
import { MissionControl } from "./components/MissionControl";
import { DependencyIntelligence } from "./components/DependencyIntelligence";
import { ScenarioLab } from "./components/ScenarioLab";
import { DefenceRecovery } from "./components/DefenceRecovery";
import { ComparisonView } from "./components/ComparisonView";
import { CausalExplorer } from "./components/CausalExplorer";

type NavTab = "twin" | "dependencies" | "scenarios" | "defence" | "compare" | "audit";

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("twin");
  const [districts, setDistricts] = useState<DistrictModel[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("DISTRICT-V1");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("FLOOD-BASE-01");

  const [assets, setAssets] = useState<Asset[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const [activeInterventions, setActiveInterventions] = useState<Intervention[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<RunMetrics | null>(null);

  const [activeLayers, setActiveLayers] = useState({
    power: true,
    water: true,
    access: true,
    telecom: true,
    demand: true,
  });

  const [runState, setRunState] = useState<RunState>({
    runId: "",
    sequence: 0,
    tick: 0,
    status: "idle",
    assets: {},
    events: [],
    metrics: null,
  });

  // Load initial district and graph data
  const loadDistrictData = useCallback(async (projId: string) => {
    try {
      const graph = await fetchProjectGraph(projId);
      // Map nodes to Asset DTO
      const loadedAssets: Asset[] = graph.nodes.map((n: any) => ({
        asset_id: n.id,
        asset_type: n.type,
        name: n.name,
        position: n.position,
        physical_damage: 0,
        nominal_capacity: 1,
        intrinsic_capacity_fraction: 1,
        delivered_service_fraction: 1,
        minimum_operational_service: 0.6,
        criticality_weight: n.criticality,
        is_critical: n.is_critical,
        backup: [],
        logical_state: "operational",
      }));
      setAssets(loadedAssets);

      const loadedDeps: Dependency[] = graph.edges.map((e: any) => ({
        dependency_id: e.id,
        source_asset_id: e.source,
        target_asset_id: e.target,
        dependency_type: e.type,
        mode: e.mode,
        required_fraction: e.required_fraction,
        minimum_fraction: 0.5,
        latency_ticks: e.latency_ticks,
        grace_ticks: e.grace_ticks,
        importance: 1,
      }));
      setDependencies(loadedDeps);

      // Initialize runtime states
      const initialMap: Record<string, any> = {};
      loadedAssets.forEach((a) => {
        initialMap[a.asset_id] = {
          asset_id: a.asset_id,
          physical_damage: 0,
          intrinsic_capacity: 1,
          delivered_service: 1,
          logical_state: "operational",
          active_backups: [],
          service_history: [1],
        };
      });

      setRunState((prev) => ({
        ...prev,
        tick: 0,
        sequence: 0,
        status: "idle",
        assets: initialMap,
        events: [],
      }));
      setMetrics(null);
    } catch (err) {
      console.error("Failed to load district graph:", err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const prjs = await fetchProjects();
        setDistricts(prjs);
        const scens = await fetchScenarios();
        setScenarios(scens);
        if (prjs.length > 0) {
          setSelectedProjectId(prjs[0].project_id);
          await loadDistrictData(prjs[0].project_id);
        }
        if (scens.length > 0) {
          setSelectedScenarioId(scens[0].scenario_id);
        }
      } catch (e) {
        console.error("Initialization error:", e);
      }
    }
    init();
  }, [loadDistrictData]);

  // Event handler for incoming streamed events
  const handleEvent = useCallback((event: SimulationEvent) => {
    setRunState((prev) => {
      const nextAssets = { ...prev.assets };
      if (event.asset_id && nextAssets[event.asset_id]) {
        const curr = nextAssets[event.asset_id];
        nextAssets[event.asset_id] = {
          ...curr,
          ...(event.new_state ? { logical_state: event.new_state as any } : {}),
          ...(event.evidence?.delivered_service !== undefined
            ? { delivered_service: event.evidence.delivered_service }
            : {}),
          ...(event.evidence?.damage_fraction !== undefined
            ? { physical_damage: event.evidence.damage_fraction }
            : {}),
        };
      }

      return {
        ...prev,
        sequence: event.sequence,
        tick: event.tick,
        assets: nextAssets,
        events: [event, ...prev.events],
      };
    });
  }, []);

  const handleSimComplete = useCallback(async () => {
    setRunState((prev) => ({ ...prev, status: "completed" }));
    if (currentRunId) {
      try {
        const met = await fetchRunMetrics(currentRunId);
        setMetrics(met);
      } catch (err) {
        console.error("Error fetching completed metrics:", err);
      }
    }
  }, [currentRunId]);

  // Hook into live WebSocket stream
  const { isConnected } = useRunStream(currentRunId, handleEvent, handleSimComplete);

  const handleStartRun = async () => {
    try {
      const runRes = await createRun({
        project_id: selectedProjectId,
        scenario_id: selectedScenarioId,
        interventions: activeInterventions,
      });
      setCurrentRunId(runRes.run_id);
      setRunState((prev) => ({
        ...prev,
        runId: runRes.run_id,
        status: "running",
      }));
      await startRun(runRes.run_id, 0.05);
    } catch (e) {
      console.error("Error starting run:", e);
    }
  };

  const handleStepRun = async () => {
    try {
      let runId = currentRunId;
      if (!runId) {
        const runRes = await createRun({
          project_id: selectedProjectId,
          scenario_id: selectedScenarioId,
          interventions: activeInterventions,
        });
        runId = runRes.run_id;
        setCurrentRunId(runId);
      }

      if (runId) {
        const stepData = await stepRun(runId);
        if (stepData) {
          setRunState((prev) => ({
            ...prev,
            tick: stepData.tick,
            status: "running",
            assets: { ...prev.assets, ...stepData.assets },
          }));
          stepData.events.forEach((ev: SimulationEvent) => handleEvent(ev));
        }
      }
    } catch (e) {
      console.error("Error stepping run:", e);
    }
  };

  const handleCancelRun = async () => {
    if (currentRunId) {
      await cancelRun(currentRunId);
      setRunState((prev) => ({ ...prev, status: "cancelled" }));
    }
  };

  const handleReset = async () => {
    if (currentRunId) {
      await cancelRun(currentRunId);
    }
    setCurrentRunId(null);
    await loadDistrictData(selectedProjectId);
  };

  const activeScenario = scenarios.find((s) => s.scenario_id === selectedScenarioId) || null;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b14] text-slate-100 overflow-hidden select-none">
      {/* Top Application Header */}
      <header className="h-14 bg-slate-950/90 border-b border-slate-800 px-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-950">
            <Radio className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-wider text-slate-100 font-mono">
              AFTERSHOCK
            </h1>
            <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest -mt-0.5">
              Resilience Stress-Testing Laboratory
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 text-xs">
          <button
            onClick={() => setActiveTab("twin")}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
              activeTab === "twin"
                ? "bg-cyan-950 border border-cyan-700 text-cyan-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Digital Twin</span>
          </button>

          <button
            onClick={() => setActiveTab("dependencies")}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
              activeTab === "dependencies"
                ? "bg-cyan-950 border border-cyan-700 text-cyan-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Dependencies</span>
          </button>

          <button
            onClick={() => setActiveTab("scenarios")}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
              activeTab === "scenarios"
                ? "bg-cyan-950 border border-cyan-700 text-cyan-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Scenario Lab</span>
          </button>

          <button
            onClick={() => setActiveTab("defence")}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
              activeTab === "defence"
                ? "bg-cyan-950 border border-cyan-700 text-cyan-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Defence & Recovery</span>
          </button>

          <button
            onClick={() => setActiveTab("compare")}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
              activeTab === "compare"
                ? "bg-cyan-950 border border-cyan-700 text-cyan-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Comparison</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
              activeTab === "audit"
                ? "bg-cyan-950 border border-cyan-700 text-cyan-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Causal Audit</span>
          </button>
        </nav>

        {/* Stream Status indicator */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
            <span className="text-[11px] text-slate-400">
              {isConnected ? "WS STREAM ACTIVE" : "REST SYNC"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 overflow-hidden p-4 flex flex-col space-y-4">
        {/* Mission Control Bar */}
        <MissionControl
          districts={districts}
          selectedProjectId={selectedProjectId}
          onSelectProject={(id) => {
            setSelectedProjectId(id);
            loadDistrictData(id);
          }}
          scenarios={scenarios}
          selectedScenarioId={selectedScenarioId}
          onSelectScenario={setSelectedScenarioId}
          runState={runState}
          metrics={metrics}
          onStartRun={handleStartRun}
          onStepRun={handleStepRun}
          onCancelRun={handleCancelRun}
          onReset={handleReset}
          activeLayers={activeLayers}
          onToggleLayer={(layer) =>
            setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
          }
        />

        {/* View Switcher Container */}
        <div className="flex-1 overflow-hidden grid grid-cols-12 gap-4">
          {activeTab === "twin" ? (
            <>
              {/* 3D Scene View (8 cols) */}
              <div className="col-span-12 lg:col-span-8 h-full">
                <DigitalTwin
                  assets={assets}
                  runtimeStates={runState.assets}
                  dependencies={dependencies}
                  scenario={activeScenario}
                  selectedAssetId={selectedAssetId}
                  onSelectAsset={setSelectedAssetId}
                  activeLayers={activeLayers}
                  tick={runState.tick}
                />
              </div>

              {/* Side Causal Explorer & Asset Details (4 cols) */}
              <div className="col-span-12 lg:col-span-4 h-full overflow-hidden">
                <CausalExplorer
                  events={runState.events}
                  assets={assets}
                  selectedAssetId={selectedAssetId}
                  onSelectAsset={setSelectedAssetId}
                />
              </div>
            </>
          ) : activeTab === "dependencies" ? (
            <div className="col-span-12 h-full overflow-y-auto">
              <DependencyIntelligence
                assets={assets}
                dependencies={dependencies}
                selectedAssetId={selectedAssetId}
                onSelectAsset={setSelectedAssetId}
              />
            </div>
          ) : activeTab === "scenarios" ? (
            <div className="col-span-12 h-full overflow-y-auto">
              <ScenarioLab
                projectId={selectedProjectId}
                scenario={activeScenario}
                onSelectCandidateScenario={(cand) => {
                  setScenarios((prev) => [cand, ...prev]);
                  setSelectedScenarioId(cand.scenario_id);
                  setActiveTab("twin");
                }}
              />
            </div>
          ) : activeTab === "defence" ? (
            <div className="col-span-12 h-full overflow-y-auto">
              <DefenceRecovery
                projectId={selectedProjectId}
                onApplyInterventions={(invs) => {
                  setActiveInterventions(invs);
                  setActiveTab("twin");
                }}
              />
            </div>
          ) : activeTab === "compare" ? (
            <div className="col-span-12 h-full overflow-y-auto">
              <ComparisonView
                projectId={selectedProjectId}
                scenarioId={selectedScenarioId}
                seed={activeScenario?.seed || 1947}
                activeInterventions={activeInterventions}
              />
            </div>
          ) : (
            <div className="col-span-12 h-full overflow-y-auto">
              <CausalExplorer
                events={runState.events}
                assets={assets}
                selectedAssetId={selectedAssetId}
                onSelectAsset={setSelectedAssetId}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
