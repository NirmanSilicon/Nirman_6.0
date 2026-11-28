import React from "react";
import {
  Play,
  Square,
  StepForward,
  RotateCcw,
  Activity,
  AlertTriangle,
  ShieldAlert,
  Server,
  Zap,
  Droplet,
  Radio,
  Truck,
  HeartPulse,
} from "lucide-react";
import { RunState, RunMetrics, Scenario, DistrictModel } from "../types";

interface MissionControlProps {
  districts: DistrictModel[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  scenarios: Scenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  runState: RunState;
  metrics?: RunMetrics | null;
  onStartRun: () => void;
  onStepRun: () => void;
  onCancelRun: () => void;
  onReset: () => void;
  activeLayers: {
    power: boolean;
    water: boolean;
    access: boolean;
    telecom: boolean;
    demand: boolean;
  };
  onToggleLayer: (layer: keyof MissionControlProps["activeLayers"]) => void;
}

export function MissionControl({
  districts,
  selectedProjectId,
  onSelectProject,
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  runState,
  metrics,
  onStartRun,
  onStepRun,
  onCancelRun,
  onReset,
  activeLayers,
  onToggleLayer,
}: MissionControlProps) {
  // Aggregate live asset counters
  const totalAssets = Object.keys(runState.assets).length;
  let opCount = 0;
  let degCount = 0;
  let unavailCount = 0;

  Object.values(runState.assets).forEach((a) => {
    if (a.logical_state === "operational" || a.logical_state === "recovered") opCount++;
    else if (a.logical_state === "degraded") degCount++;
    else if (a.logical_state === "unavailable") unavailCount++;
  });

  return (
    <div className="flex flex-col space-y-4">
      {/* Top Banner: Mandatory Prototype Security Posture Disclaimer */}
      <div className="bg-amber-950/40 border border-amber-600/50 rounded-lg p-2.5 flex items-center justify-between text-xs text-amber-200">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>PROTOTYPE NOTICE:</strong> AFTERSHOCK is a synthetic resilience simulation prototype.
            It is not connected to operational infrastructure and should not be used to control or target real facilities.
          </span>
        </div>
        <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-300 font-mono">
          SYNTHETIC VERIFIED
        </span>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* District & Scenario Selector */}
        <div className="flex items-center space-x-3">
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">DISTRICT</label>
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-cyan-500 font-medium"
            >
              {districts.map((d) => (
                <option key={d.project_id} value={d.project_id}>
                  {d.name} ({d.project_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">SCENARIO</label>
            <select
              value={selectedScenarioId}
              onChange={(e) => onSelectScenario(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-cyan-500 font-medium"
            >
              {scenarios.map((s) => (
                <option key={s.scenario_id} value={s.scenario_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Execution Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onStartRun}
            disabled={runState.status === "running"}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium text-xs px-3.5 py-2 rounded-lg transition shadow-md"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Start Sim</span>
          </button>

          <button
            onClick={onStepRun}
            disabled={runState.status === "running"}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-medium text-xs px-3 py-2 rounded-lg border border-slate-700 transition"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span>Step Tick</span>
          </button>

          <button
            onClick={onCancelRun}
            disabled={runState.status !== "running"}
            className="flex items-center space-x-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 disabled:opacity-40 text-rose-200 font-medium text-xs px-3 py-2 rounded-lg transition"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Halt</span>
          </button>

          <button
            onClick={onReset}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs px-3 py-2 rounded-lg border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Layer Filters */}
        <div className="flex items-center space-x-1 text-xs">
          <span className="text-[10px] font-mono text-slate-400 mr-1">LAYERS:</span>
          <button
            onClick={() => onToggleLayer("power")}
            className={`px-2.5 py-1 rounded text-xs flex items-center space-x-1 border transition ${
              activeLayers.power
                ? "bg-amber-950/60 border-amber-600 text-amber-300"
                : "bg-slate-900/60 border-slate-800 text-slate-500"
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Power</span>
          </button>
          <button
            onClick={() => onToggleLayer("water")}
            className={`px-2.5 py-1 rounded text-xs flex items-center space-x-1 border transition ${
              activeLayers.water
                ? "bg-sky-950/60 border-sky-600 text-sky-300"
                : "bg-slate-900/60 border-slate-800 text-slate-500"
            }`}
          >
            <Droplet className="w-3 h-3" />
            <span>Water</span>
          </button>
          <button
            onClick={() => onToggleLayer("access")}
            className={`px-2.5 py-1 rounded text-xs flex items-center space-x-1 border transition ${
              activeLayers.access
                ? "bg-purple-950/60 border-purple-600 text-purple-300"
                : "bg-slate-900/60 border-slate-800 text-slate-500"
            }`}
          >
            <Truck className="w-3 h-3" />
            <span>Roads</span>
          </button>
          <button
            onClick={() => onToggleLayer("telecom")}
            className={`px-2.5 py-1 rounded text-xs flex items-center space-x-1 border transition ${
              activeLayers.telecom
                ? "bg-blue-950/60 border-blue-600 text-blue-300"
                : "bg-slate-900/60 border-slate-800 text-slate-500"
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Telecom</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Tick & Status */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-slate-400">SIMULATION TICK</div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
              {runState.tick} <span className="text-xs text-slate-500">min</span>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${
                runState.status === "running"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-700"
                  : runState.status === "completed"
                  ? "bg-blue-950 text-blue-400 border border-blue-700"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {runState.status}
            </span>
          </div>
        </div>

        {/* Asset State Split */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] font-mono text-slate-400">NETWORK HEALTH</div>
          <div className="flex items-center space-x-2 mt-1 text-xs font-mono font-semibold">
            <span className="text-emerald-400">{opCount} OP</span>
            <span className="text-slate-600">/</span>
            <span className="text-amber-400">{degCount} DEG</span>
            <span className="text-slate-600">/</span>
            <span className="text-rose-400">{unavailCount} UNA</span>
          </div>
        </div>

        {/* NWSL (Normalized Weighted Service Loss) */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] font-mono text-slate-400">NORM SERVICE LOSS (NWSL)</div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
            {metrics ? (metrics.normalized_weighted_service_loss * 100).toFixed(1) + "%" : "0.0%"}
          </div>
        </div>

        {/* Cascade Impact */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] font-mono text-slate-400">CASCADE SIZE</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
            {metrics ? metrics.cascade_size : 0} <span className="text-xs text-slate-500">assets</span>
          </div>
        </div>

        {/* Critical Service Availability */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] font-mono text-slate-400">CRITICAL AVAILABILITY</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
            {metrics ? (metrics.final_critical_service_availability * 100).toFixed(1) + "%" : "100.0%"}
          </div>
        </div>
      </div>
    </div>
  );
}
