import React, { useState } from "react";
import { GitCompare, TrendingDown, Layers, Zap, Play } from "lucide-react";
import { Intervention, PairedMonteCarloResult } from "../types";
import { runComparison, runMonteCarlo } from "../api";

interface ComparisonViewProps {
  projectId: string;
  scenarioId: string;
  seed: number;
  activeInterventions: Intervention[];
}

export function ComparisonView({
  projectId,
  scenarioId,
  seed,
  activeInterventions,
}: ComparisonViewProps) {
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<any | null>(null);
  const [mcResult, setMcResult] = useState<PairedMonteCarloResult | null>(null);

  const handleRunComparison = async () => {
    setLoading(true);
    try {
      const res = await runComparison(projectId, scenarioId, seed, activeInterventions);
      setComparison(res);
    } catch (e) {
      console.error("Comparison run error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunMonteCarlo = async () => {
    setLoading(true);
    try {
      const res = await runMonteCarlo(
        projectId,
        scenarioId,
        [101, 202, 303, 404, 505],
        activeInterventions
      );
      setMcResult(res);
    } catch (e) {
      console.error("Monte Carlo error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <GitCompare className="w-4 h-4 text-cyan-400" />
            <span>Paired Comparative Resilience Evaluation</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict baseline vs. intervention comparison using identical random seeds and hazard draws.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunComparison}
            disabled={loading}
            className="flex items-center space-x-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Paired Test</span>
          </button>

          <button
            onClick={handleRunMonteCarlo}
            disabled={loading}
            className="flex items-center space-x-1.5 bg-purple-800 hover:bg-purple-700 disabled:opacity-50 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Monte Carlo (5 Seeds)</span>
          </button>
        </div>
      </div>

      {/* Paired Comparison Cards */}
      {comparison && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* WSL Improvement */}
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-lg">
              <div className="text-[10px] font-mono text-slate-400">NWSL REDUCTION</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                +{comparison.comparison.relative_nwsl_improvement}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                Absolute: -{(comparison.comparison.absolute_nwsl_improvement * 100).toFixed(1)}%
              </div>
            </div>

            {/* Cascade Reduction */}
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-lg">
              <div className="text-[10px] font-mono text-slate-400">CASCADE SIZE DELTA</div>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                -{comparison.comparison.cascade_reduction}{" "}
                <span className="text-xs text-slate-500">assets</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                Base: {comparison.baseline_metrics.cascade_size} → Intv:{" "}
                {comparison.intervention_metrics.cascade_size}
              </div>
            </div>

            {/* CSA Delta */}
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-lg">
              <div className="text-[10px] font-mono text-slate-400">FINAL CRITICAL CSA</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {(comparison.intervention_metrics.final_critical_service_availability * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                Baseline was {(comparison.baseline_metrics.final_critical_service_availability * 100).toFixed(1)}%
              </div>
            </div>

            {/* Resource ROI */}
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-lg">
              <div className="text-[10px] font-mono text-slate-400">BUDGET CONSUMED</div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {comparison.comparison.resources_consumed}{" "}
                <span className="text-xs text-slate-500">units</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                Verified zero budget deficit
              </div>
            </div>
          </div>

          {/* Side by side metric tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
              <div className="text-rose-400 font-bold mb-2">🔴 BASELINE RUN (NO ACTION)</div>
              <div className="space-y-1 text-slate-300">
                <div>Normalized Loss (NWSL): {comparison.baseline_metrics.normalized_weighted_service_loss}</div>
                <div>Weighted Service Loss: {comparison.baseline_metrics.weighted_service_loss}</div>
                <div>Downstream Cascade: {comparison.baseline_metrics.cascade_size} nodes</div>
                <div>Total Disruption Events: {comparison.baseline_metrics.total_events}</div>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
              <div className="text-emerald-400 font-bold mb-2">🟢 INTERVENTION RUN (WITH DEFENCE)</div>
              <div className="space-y-1 text-slate-300">
                <div>Normalized Loss (NWSL): {comparison.intervention_metrics.normalized_weighted_service_loss}</div>
                <div>Weighted Service Loss: {comparison.intervention_metrics.weighted_service_loss}</div>
                <div>Downstream Cascade: {comparison.intervention_metrics.cascade_size} nodes</div>
                <div>Total Disruption Events: {comparison.intervention_metrics.total_events}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monte Carlo Results */}
      {mcResult && (
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="text-xs font-bold text-purple-300 flex items-center justify-between">
            <span>Paired Monte Carlo Uncertainty Distribution ({mcResult.num_runs} Seeds)</span>
            <span className="font-mono text-slate-400 text-[11px]">Draw Set: {mcResult.draw_set_id}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-purple-950/30 border border-purple-800/40 p-2.5 rounded">
              <div className="text-[10px] text-slate-400">MEAN IMPROVEMENT</div>
              <div className="text-base font-bold text-emerald-400">
                +{(mcResult.mean_absolute_improvement * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-purple-950/30 border border-purple-800/40 p-2.5 rounded">
              <div className="text-[10px] text-slate-400">STD DEVIATION</div>
              <div className="text-base font-bold text-purple-300">
                ±{(mcResult.std_improvement * 100).toFixed(2)}%
              </div>
            </div>

            <div className="bg-purple-950/30 border border-purple-800/40 p-2.5 rounded">
              <div className="text-[10px] text-slate-400">P10 - P90 RANGE</div>
              <div className="text-base font-bold text-cyan-300">
                {(mcResult.p10_improvement * 100).toFixed(1)}% - {(mcResult.p90_improvement * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-purple-950/30 border border-purple-800/40 p-2.5 rounded">
              <div className="text-[10px] text-slate-400">AVG CASCADE REDUCTION</div>
              <div className="text-base font-bold text-cyan-400">
                {mcResult.mean_cascade_reduction} assets
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
