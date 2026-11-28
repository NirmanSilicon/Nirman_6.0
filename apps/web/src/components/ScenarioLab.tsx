import React, { useState } from "react";
import { Waves, Flame, Crosshair, Search, Zap } from "lucide-react";
import { Scenario, ScenarioCandidate } from "../types";
import { searchScenarios } from "../api";

interface ScenarioLabProps {
  projectId: string;
  scenario: Scenario | null;
  onSelectCandidateScenario: (candidate: Scenario) => void;
}

export function ScenarioLab({
  projectId,
  scenario,
  onSelectCandidateScenario,
}: ScenarioLabProps) {
  const [budget, setBudget] = useState(6);
  const [seed, setSeed] = useState(42);
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<ScenarioCandidate[]>([]);

  const handleSearch = async () => {
    if (!scenario) return;
    setSearching(true);
    try {
      const res = await searchScenarios(projectId, scenario.scenario_id, budget, seed);
      setCandidates(res.candidates);
    } catch (e) {
      console.error("Scenario search error:", e);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <Waves className="w-4 h-4 text-sky-400" />
            <span>Scenario Lab & Stress-Test Search</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Discover structural vulnerabilities through reproducible parametric scenario search.
          </p>
        </div>
      </div>

      {/* Current Scenario Info */}
      {scenario && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
          <div className="font-bold text-slate-200 flex items-center space-x-2">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Scenario: {scenario.name}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px] text-slate-400">
            <div>Hazard: {scenario.hazard_type}</div>
            <div>Horizon: {scenario.horizon_ticks} min</div>
            <div>Flood Sources: {scenario.flood_sources.length}</div>
            <div>Base Seed: {scenario.seed}</div>
          </div>
        </div>
      )}

      {/* Search Agent Configuration */}
      <div className="bg-slate-950/80 border border-sky-900/50 rounded-lg p-4 space-y-3">
        <div className="text-xs font-bold text-sky-300 flex items-center space-x-1.5">
          <Search className="w-3.5 h-3.5" />
          <span>Automated Stress-Test Search Agent</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">SEARCH BUDGET</label>
            <input
              type="number"
              min={1}
              max={20}
              value={budget}
              onChange={(e) => setBudget(parseInt(e.target.value) || 1)}
              className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">SEARCH SEED</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={searching}
              className="w-full bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white font-medium text-xs px-4 py-1.5 rounded transition shadow-md flex items-center justify-center space-x-2"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{searching ? "Searching..." : "Search High-Impact Scenarios"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Candidates Leaderboard */}
      {candidates.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-300">
            Discovered Stress-Test Candidates (Ranked by Impact NWSL)
          </div>

          <div className="space-y-2">
            {candidates.map((cand, idx) => (
              <div
                key={cand.candidate_id}
                className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-lg p-3 text-xs flex items-center justify-between transition"
              >
                <div>
                  <span className="font-mono font-bold text-rose-400 mr-2">#{idx + 1} {cand.candidate_id}</span>
                  <span className="text-slate-300">{cand.scenario.name}</span>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    Impact: {(cand.impact_nwsl * 100).toFixed(1)}% NWSL | Cascade: {cand.cascade_size} assets
                  </div>
                </div>

                <button
                  onClick={() => onSelectCandidateScenario(cand.scenario)}
                  className="bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs px-3 py-1 rounded border border-slate-700 font-medium"
                >
                  Load Candidate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
