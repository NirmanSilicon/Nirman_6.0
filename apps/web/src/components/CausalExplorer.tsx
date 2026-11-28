import React, { useState } from "react";
import { GitCommit, ArrowRight, ShieldCheck, AlertOctagon, HelpCircle, ChevronRight } from "lucide-react";
import { SimulationEvent, Asset } from "../types";

interface CausalExplorerProps {
  events: SimulationEvent[];
  assets: Asset[];
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string) => void;
}

export function CausalExplorer({
  events,
  assets,
  selectedAssetId,
  onSelectAsset,
}: CausalExplorerProps) {
  const [filterAsset, setFilterAsset] = useState<string>(selectedAssetId || "");

  const eventsById = new Map<string, SimulationEvent>(events.map((e) => [e.event_id, e]));

  // Reconstruct causal predecessor chains for selected asset or top critical events
  const assetEvents = filterAsset
    ? events.filter((e) => e.asset_id === filterAsset)
    : events.filter((e) =>
        ["direct_damage", "backup_depleted", "asset_degraded", "asset_unavailable"].includes(e.event_type)
      );

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <GitCommit className="w-4 h-4 text-cyan-400" />
            <span>Causal Failure Chain & Provenance</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict root-to-impact event history with machine-readable causes & parent references.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-400">Filter Asset:</label>
          <select
            value={filterAsset}
            onChange={(e) => {
              setFilterAsset(e.target.value);
              onSelectAsset(e.target.value);
            }}
            className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded px-2 py-1 font-mono"
          >
            <option value="">All Critical Events</option>
            {assets.map((a) => (
              <option key={a.asset_id} value={a.asset_id}>
                {a.asset_id} - {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chain Stream */}
      <div className="flex-1 overflow-y-auto space-y-3 mt-4 pr-1">
        {assetEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No disruption events recorded yet. Run a simulation or select another asset.
          </div>
        ) : (
          assetEvents.map((ev) => {
            // Find parent event if present
            const parent = ev.parent_event_ids.length > 0 ? eventsById.get(ev.parent_event_ids[0]) : null;

            return (
              <div
                key={ev.event_id}
                className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 hover:border-slate-700 transition"
              >
                {/* Event Header */}
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-mono font-bold text-cyan-400 flex items-center space-x-1.5">
                    <span className="px-1.5 py-0.2 bg-cyan-950 border border-cyan-800 rounded text-[10px]">
                      {ev.event_id}
                    </span>
                    <span className="text-slate-300">T+{ev.tick}m</span>
                  </span>

                  <span className="font-mono text-[10px] text-slate-500">
                    Seq #{ev.sequence}
                  </span>
                </div>

                {/* Event Title & Cause */}
                <div className="flex items-center space-x-2 text-xs font-medium text-slate-200">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      ev.event_type.includes("damage") || ev.event_type.includes("unavailable")
                        ? "bg-rose-500"
                        : ev.event_type.includes("depleted") || ev.event_type.includes("degraded")
                        ? "bg-amber-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <span>
                    Asset <strong>{ev.asset_id || "District"}</strong>: {ev.event_type.replace(/_/g, " ").toUpperCase()}
                  </span>
                </div>

                <div className="mt-1 text-[11px] text-slate-400">
                  Cause: <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">{ev.cause_code}</code>
                </div>

                {/* Parent Link if causal provenance exists */}
                {parent && (
                  <div className="mt-2 text-[10px] bg-slate-900/80 border border-slate-800 rounded p-1.5 flex items-center space-x-2 text-slate-400">
                    <ArrowRight className="w-3 h-3 text-cyan-500 shrink-0" />
                    <span>
                      Caused by parent <strong>{parent.event_id}</strong> (T+{parent.tick}m): {parent.event_type} on{" "}
                      <strong>{parent.asset_id}</strong>
                    </span>
                  </div>
                )}

                {/* Structured Evidence Payload */}
                {Object.keys(ev.evidence).length > 0 && (
                  <div className="mt-2 text-[10px] font-mono text-slate-400 bg-black/40 rounded p-1.5 border border-slate-800/60 overflow-x-auto">
                    Evidence: {JSON.stringify(ev.evidence)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
