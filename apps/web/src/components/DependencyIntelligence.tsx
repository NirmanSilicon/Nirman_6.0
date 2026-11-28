import React from "react";
import { Network, Zap, Droplet, Truck, Radio, ArrowUpRight } from "lucide-react";
import { Asset, Dependency } from "../types";

interface DependencyIntelligenceProps {
  assets: Asset[];
  dependencies: Dependency[];
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string) => void;
}

export function DependencyIntelligence({
  assets,
  dependencies,
  selectedAssetId,
  onSelectAsset,
}: DependencyIntelligenceProps) {
  const assetMap = new Map(assets.map((a) => [a.asset_id, a]));

  const incomingDeps = selectedAssetId
    ? dependencies.filter((d) => d.target_asset_id === selectedAssetId)
    : [];

  const outgoingDeps = selectedAssetId
    ? dependencies.filter((d) => d.source_asset_id === selectedAssetId)
    : [];

  const selectedAsset = selectedAssetId ? assetMap.get(selectedAssetId) : null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <Network className="w-4 h-4 text-cyan-400" />
            <span>Multilayer Directed Dependency Intelligence</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            NetworkX MultiDiGraph relations: parallel typed edges (electricity, water, access, telecom).
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Total Nodes: {assets.length} | Edges: {dependencies.length}
        </div>
      </div>

      {selectedAsset ? (
        <div className="space-y-4">
          <div className="bg-slate-950/70 border border-cyan-900/60 rounded-lg p-3.5 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-cyan-300 font-mono">
                {selectedAsset.asset_id} - {selectedAsset.name}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Sector: {selectedAsset.asset_type.replace(/_/g, " ").toUpperCase()} | Criticality:{" "}
                {selectedAsset.criticality_weight}
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Min Service: {(selectedAsset.minimum_operational_service * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Upstream & Downstream split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upstream Suppliers */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="text-xs font-bold text-amber-400">
                Upstream Dependencies (Suppliers: {incomingDeps.length})
              </div>
              {incomingDeps.length === 0 ? (
                <div className="text-xs text-slate-500 py-3">No incoming dependencies (Root Source)</div>
              ) : (
                incomingDeps.map((dep) => (
                  <div
                    key={dep.dependency_id}
                    onClick={() => onSelectAsset(dep.source_asset_id)}
                    className="p-2 bg-slate-900/80 border border-slate-800 rounded cursor-pointer hover:border-slate-700 text-xs flex items-center justify-between font-mono"
                  >
                    <div>
                      <span className="text-cyan-400 font-bold">{dep.source_asset_id}</span>
                      <span className="text-slate-400 ml-1.5">({dep.dependency_type})</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 uppercase">
                      {dep.mode} | Latency: {dep.latency_ticks}m
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Downstream Beneficiaries */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="text-xs font-bold text-emerald-400">
                Downstream Dependents (Beneficiaries: {outgoingDeps.length})
              </div>
              {outgoingDeps.length === 0 ? (
                <div className="text-xs text-slate-500 py-3">No outgoing dependents (Terminal Node)</div>
              ) : (
                outgoingDeps.map((dep) => (
                  <div
                    key={dep.dependency_id}
                    onClick={() => onSelectAsset(dep.target_asset_id)}
                    className="p-2 bg-slate-900/80 border border-slate-800 rounded cursor-pointer hover:border-slate-700 text-xs flex items-center justify-between font-mono"
                  >
                    <div>
                      <span className="text-cyan-400 font-bold">{dep.target_asset_id}</span>
                      <span className="text-slate-400 ml-1.5">({dep.dependency_type})</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 uppercase">
                      Req: {(dep.required_fraction * 100).toFixed(0)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-slate-500 text-xs">
          Select an asset in the 3D Digital Twin or list to inspect its directed supplier and dependent relations.
        </div>
      )}
    </div>
  );
}
