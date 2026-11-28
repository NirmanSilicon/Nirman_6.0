import React, { useState } from "react";
import { Shield, Wrench, Cpu, CheckCircle2, AlertCircle } from "lucide-react";
import { ResourcePool, OptimizationResult, Intervention } from "../types";
import { optimizeDefence, optimizeRecovery } from "../api";

interface DefenceRecoveryProps {
  projectId: string;
  onApplyInterventions: (interventions: Intervention[]) => void;
}

export function DefenceRecovery({ projectId, onApplyInterventions }: DefenceRecoveryProps) {
  const [resources, setResources] = useState<ResourcePool>({
    budget_units: 10,
    mobile_generators: 2,
    temporary_pumps: 1,
    repair_crews: 2,
  });

  const [loading, setLoading] = useState(false);
  const [optResult, setOptResult] = useState<OptimizationResult | null>(null);
  const [recoverySchedule, setRecoverySchedule] = useState<any[] | null>(null);

  const handleOptimizeDefence = async () => {
    setLoading(true);
    try {
      const res = await optimizeDefence(projectId, resources);
      setOptResult(res);
      onApplyInterventions(res.interventions);
    } catch (e) {
      console.error("Optimization error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeRecovery = async () => {
    setLoading(true);
    try {
      const res = await optimizeRecovery(projectId, resources);
      setRecoverySchedule(res.schedule);
    } catch (e) {
      console.error("Recovery schedule error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>Resource-Constrained Optimization (Google OR-Tools CP-SAT)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Integer-constrained solver for pre-disaster hardening and post-disaster repair crew dispatch.
          </p>
        </div>

        {optResult && (
          <div className="flex items-center space-x-2">
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                optResult.is_optimal
                  ? "bg-emerald-950 text-emerald-300 border-emerald-600"
                  : "bg-amber-950 text-amber-300 border-amber-600"
              }`}
            >
              STATUS: {optResult.solver_status}
            </span>
          </div>
        )}
      </div>

      {/* Resource Constraints Config */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
        <div>
          <label className="text-[10px] font-mono text-slate-400 block mb-1">BUDGET UNITS</label>
          <input
            type="number"
            min={1}
            max={50}
            value={resources.budget_units}
            onChange={(e) => setResources({ ...resources, budget_units: parseInt(e.target.value) || 0 })}
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono text-slate-400 block mb-1">MOBILE GENERATORS</label>
          <input
            type="number"
            min={0}
            max={10}
            value={resources.mobile_generators}
            onChange={(e) => setResources({ ...resources, mobile_generators: parseInt(e.target.value) || 0 })}
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono text-slate-400 block mb-1">TEMPORARY PUMPS</label>
          <input
            type="number"
            min={0}
            max={10}
            value={resources.temporary_pumps}
            onChange={(e) => setResources({ ...resources, temporary_pumps: parseInt(e.target.value) || 0 })}
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono text-slate-400 block mb-1">REPAIR CREWS</label>
          <input
            type="number"
            min={0}
            max={10}
            value={resources.repair_crews}
            onChange={(e) => setResources({ ...resources, repair_crews: parseInt(e.target.value) || 0 })}
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono"
          />
        </div>
      </div>

      {/* Solver Actions */}
      <div className="flex items-center space-x-3">
        <button
          onClick={handleOptimizeDefence}
          disabled={loading}
          className="flex items-center space-x-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium text-xs px-4 py-2 rounded-lg transition shadow-md"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Solve Pre-Disaster Hardening (CP-SAT)</span>
        </button>

        <button
          onClick={handleOptimizeRecovery}
          disabled={loading}
          className="flex items-center space-x-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white font-medium text-xs px-4 py-2 rounded-lg transition shadow-md"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Solve Recovery Schedule (CP-SAT)</span>
        </button>
      </div>

      {/* Results Deck */}
      {optResult && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-300">
            Selected Interventions (Cost: {optResult.total_cost}/{resources.budget_units} Units, Gen:{" "}
            {optResult.resources_used.generators}/{resources.mobile_generators}, Crews:{" "}
            {optResult.resources_used.crews}/{resources.repair_crews})
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {optResult.interventions.map((inv) => (
              <div
                key={inv.intervention_id}
                className="bg-slate-950/80 border border-emerald-900/60 rounded-lg p-3 text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-mono font-bold text-emerald-400">{inv.target_asset_id}</span>
                  <span className="text-slate-400 ml-2">Type: {inv.type}</span>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Effect: {JSON.stringify(inv.effect)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono text-[10px]">
                    Cost: {inv.resource_cost}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {optResult.greedy_comparison && (
            <div className="bg-slate-950/40 border border-slate-800 p-2.5 rounded text-[11px] text-slate-400 flex items-center justify-between">
              <span>
                Baseline Comparison: Greedy heuristic chose {optResult.greedy_comparison.selected_actions.length}{" "}
                actions (Cost: {optResult.greedy_comparison.total_cost})
              </span>
              <span className="font-mono text-cyan-400">
                CP-SAT guarantee: {optResult.is_optimal ? "Global Optimum" : "Feasible Bound"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Recovery Schedule Table */}
      {recoverySchedule && (
        <div className="space-y-2 mt-4 pt-4 border-t border-slate-800">
          <div className="text-xs font-bold text-slate-300">Optimized Crew Restoration Schedule</div>
          <div className="space-y-1.5">
            {recoverySchedule.map((item, i) => (
              <div
                key={i}
                className="bg-slate-950/70 border border-indigo-900/50 rounded p-2 text-xs flex items-center justify-between font-mono"
              >
                <span className="text-indigo-300 font-bold">Crew assigned to: {item.asset_id}</span>
                <span className="text-slate-400">
                  Starts at T+{item.start_tick}m | Duration: {item.duration_ticks}m
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
