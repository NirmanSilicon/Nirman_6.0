import React from "react";
import { Camera, Eye, Layers, Compass, BarChart3, Sun, Moon } from "lucide-react";

interface CityHUDProps {
  heatmapMode: "none" | "service_loss" | "traffic_congestion" | "flood_risk";
  onSelectHeatmap: (mode: "none" | "service_loss" | "traffic_congestion" | "flood_risk") => void;
  onFlyTo: (preset: "overview" | "hospital" | "substation" | "water" | "bridge") => void;
  isNightMode: boolean;
  onToggleNight: () => void;
}

export function CityHUD({
  heatmapMode,
  onSelectHeatmap,
  onFlyTo,
  isNightMode,
  onToggleNight,
}: CityHUDProps) {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2 pointer-events-auto">
      {/* Camera Bookmarks Deck */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-2.5 rounded-xl shadow-2xl space-y-1.5 text-xs text-slate-200">
        <div className="text-[10px] font-mono text-cyan-400 font-bold flex items-center space-x-1 mb-1">
          <Camera className="w-3.5 h-3.5" />
          <span>GIS CAMERA BOOKMARKS</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
          <button
            onClick={() => onFlyTo("overview")}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-left border border-slate-700/60 transition"
          >
            Overview
          </button>
          <button
            onClick={() => onFlyTo("hospital")}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-left border border-slate-700/60 transition text-rose-300"
          >
            Hospital H-01
          </button>
          <button
            onClick={() => onFlyTo("substation")}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-left border border-slate-700/60 transition text-amber-300"
          >
            Substation P-01
          </button>
          <button
            onClick={() => onFlyTo("water")}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-left border border-slate-700/60 transition text-sky-300"
          >
            Water Facility
          </button>
          <button
            onClick={() => onFlyTo("bridge")}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-left border border-slate-700/60 transition text-purple-300 col-span-2"
          >
            River Bridge R-01
          </button>
        </div>
      </div>

      {/* Spatial Heatmap Analysis Layers */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-2.5 rounded-xl shadow-2xl space-y-1.5 text-xs text-slate-200">
        <div className="text-[10px] font-mono text-cyan-400 font-bold flex items-center space-x-1 mb-1">
          <Layers className="w-3.5 h-3.5" />
          <span>ANALYSIS HEATMAP OVERLAY</span>
        </div>
        <div className="flex flex-col space-y-1 font-mono text-[11px]">
          {[
            { id: "none", label: "Off (Standard 3D City)" },
            { id: "service_loss", label: "Service Loss Heatmap" },
            { id: "flood_risk", label: "Flood Risk Inundation" },
            { id: "traffic_congestion", label: "Traffic Congestion" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectHeatmap(item.id as any)}
              className={`px-2 py-1 rounded text-left border transition ${
                heatmapMode === item.id
                  ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-bold"
                  : "bg-slate-800/80 border-slate-700/60 hover:bg-slate-700 text-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tactical Environment Toggle */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-2 rounded-xl shadow-2xl flex items-center justify-between text-xs text-slate-300">
        <span className="font-mono text-[10px] text-slate-400">Tactical Mode</span>
        <button
          onClick={onToggleNight}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
        >
          {isNightMode ? <Moon className="w-3.5 h-3.5 text-cyan-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
        </button>
      </div>
    </div>
  );
}
