import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Asset, Dependency, Scenario, AssetRuntimeState } from "../types";
import { CityTerrain } from "./city/CityTerrain";
import { CityRoads } from "./city/CityRoads";
import { CityBuildings } from "./city/CityBuildings";
import { CityTraffic } from "./city/CityTraffic";
import { FloodSurface } from "./city/FloodSurface";
import { InfrastructureLandmarks } from "./city/InfrastructureLandmarks";
import { HeatmapLayer } from "./city/HeatmapLayer";
import { CityHUD } from "./city/CityHUD";
import { CityEnvironment } from "./city/CityEnvironment";

interface DigitalTwinProps {
  assets: Asset[];
  runtimeStates: Record<string, AssetRuntimeState>;
  dependencies: Dependency[];
  scenario?: Scenario | null;
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string) => void;
  activeLayers: {
    power: boolean;
    water: boolean;
    access: boolean;
    telecom: boolean;
    demand: boolean;
  };
  tick?: number;
}

// Camera Fly-To Animator Component
function CameraController({ targetPos }: { targetPos: [number, number, number] | null }) {
  const { camera } = useThree();

  useFrame(() => {
    if (targetPos) {
      const dest = new THREE.Vector3(targetPos[0], targetPos[1], targetPos[2]);
      camera.position.lerp(dest, 0.05);
    }
  });

  return null;
}

export function DigitalTwin({
  assets,
  runtimeStates,
  dependencies,
  scenario,
  selectedAssetId,
  onSelectAsset,
  activeLayers,
  tick = 0,
}: DigitalTwinProps) {
  const [heatmapMode, setHeatmapMode] = useState<"none" | "service_loss" | "traffic_congestion" | "flood_risk">("none");
  const [isNightMode, setIsNightMode] = useState(true);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number] | null>(null);

  // Asset positions dictionary for vehicle dispatching
  const assetPositions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    assets.forEach((a) => {
      map[a.asset_id] = { x: a.position.x, y: a.position.y };
    });
    return map;
  }, [assets]);

  // Active repairs set
  const activeRepairs = useMemo(() => {
    return Object.keys(runtimeStates).filter(
      (id) => runtimeStates[id]?.logical_state === "repairing"
    );
  }, [runtimeStates]);

  const handleFlyTo = (preset: "overview" | "hospital" | "substation" | "water" | "bridge") => {
    switch (preset) {
      case "overview":
        setCameraTarget([0, 75, 85]);
        break;
      case "hospital":
        // H-01 position: x=45, y=35 -> scene coords: (45-45)*1.5=0, (35-45)*1.5=-15
        setCameraTarget([0, 22, 10]);
        onSelectAsset("H-01");
        break;
      case "substation":
        // P-01 position: x=10, y=15 -> scene coords: (10-45)*1.5=-52.5, (15-45)*1.5=-45
        setCameraTarget([-48, 20, -30]);
        onSelectAsset("P-01");
        break;
      case "water":
        // W-03 position: x=50, y=20 -> scene coords: (50-45)*1.5=7.5, (20-45)*1.5=-37.5
        setCameraTarget([10, 18, -25]);
        onSelectAsset("W-03");
        break;
      case "bridge":
        // R-01 Bridge Access
        setCameraTarget([-5, 16, 22]);
        onSelectAsset("R-01");
        break;
    }
  };

  return (
    <div className="relative w-full h-full bg-[#050811] rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* GIS HUD Overlay (Camera presets, Heatmap switcher, Night mode) */}
      <CityHUD
        heatmapMode={heatmapMode}
        onSelectHeatmap={setHeatmapMode}
        onFlyTo={handleFlyTo}
        isNightMode={isNightMode}
        onToggleNight={() => setIsNightMode(!isNightMode)}
      />

      {/* 3D Scene Canvas */}
      <Canvas
        camera={{ position: [0, 75, 85], fov: 42 }}
        onPointerMissed={() => onSelectAsset("")}
        shadows
      >
        <color attach="background" args={[isNightMode ? "#070b14" : "#cbd5e1"]} />
        <fog attach="fog" args={[isNightMode ? "#070b14" : "#cbd5e1", 80, 220]} />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={isNightMode ? 0.6 : 1.2} />
        <directionalLight
          position={[40, 90, 50]}
          intensity={isNightMode ? 1.4 : 2.0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={250}
          shadow-camera-left={-80}
          shadow-camera-right={80}
          shadow-camera-top={80}
          shadow-camera-bottom={-80}
        />
        <pointLight position={[-40, 45, -40]} color="#38bdf8" intensity={isNightMode ? 0.8 : 0.4} />

        <CameraController targetPos={cameraTarget} />

        {/* 0. Sky, Stars, Environment Map (guide §7.2) */}
        <CityEnvironment isNightMode={isNightMode} tick={tick} />

        {/* 1. Procedural Terrain, River, Parks, and Harbors */}
        <CityTerrain />

        {/* 2. Road Network & Suspension Bridges */}
        <CityRoads />

        {/* 3. Hundreds of Extruded Procedural City Buildings (InstancedMesh) */}
        <CityBuildings />

        {/* 4. Moving Vehicular Traffic & Dispatched Repair Trucks */}
        <CityTraffic
          floodActive={Boolean(scenario)}
          activeRepairs={activeRepairs}
          assetPositions={assetPositions}
        />

        {/* 5. Animated River & Dynamic Rising Surge Flood Surface */}
        <FloodSurface scenario={scenario} tick={tick} />

        {/* 6. Embedded 34 Sector Infrastructure Landmarks */}
        <InfrastructureLandmarks
          assets={assets}
          runtimeStates={runtimeStates}
          selectedAssetId={selectedAssetId}
          onSelectAsset={onSelectAsset}
          activeLayers={activeLayers}
        />

        {/* 7. Draped Continuous Spatial Heatmap Analysis Layer */}
        <HeatmapLayer
          mode={heatmapMode}
          assets={assets}
          runtimeStates={runtimeStates}
        />

        <OrbitControls
          maxPolarAngle={Math.PI / 2.05}
          minDistance={10}
          maxDistance={180}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* Bottom Status Ticker */}
      <div className="absolute bottom-3 left-4 pointer-events-none bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-[11px] font-mono flex items-center space-x-4 text-slate-300">
        <span className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>350+ Buildings Active</span>
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>Traffic Flow Live</span>
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          <span>River Dynamics Live</span>
        </span>
      </div>
    </div>
  );
}
