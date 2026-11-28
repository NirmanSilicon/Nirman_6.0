import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";
import { Asset, Dependency, Scenario, AssetRuntimeState, LogicalState } from "../types";

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
}

function getAssetColor(state?: LogicalState): string {
  switch (state) {
    case "operational":
      return "#10b981"; // green
    case "degraded":
      return "#f59e0b"; // amber
    case "unavailable":
      return "#ef4444"; // red
    case "repairing":
      return "#8b5cf6"; // purple
    case "recovered":
      return "#06b6d4"; // cyan
    default:
      return "#64748b"; // slate
  }
}

function getDependencyColor(type: string): string {
  switch (type) {
    case "electricity":
      return "#fbbf24"; // yellow
    case "water":
      return "#38bdf8"; // sky blue
    case "access":
      return "#a855f7"; // purple
    case "communication":
      return "#3b82f6"; // blue
    default:
      return "#94a3b8";
  }
}

function AssetObject({
  asset,
  runtimeState,
  isSelected,
  onSelect,
}: {
  asset: Asset;
  runtimeState?: AssetRuntimeState;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const state = runtimeState?.logical_state || asset.logical_state;
  const isUnavailable = state === "unavailable";
  const isDegraded = state === "degraded";

  const color = getAssetColor(state);

  useFrame(({ clock }) => {
    if (ringRef.current && (isUnavailable || isDegraded)) {
      const t = clock.getElapsedTime();
      const s = 1.0 + Math.sin(t * 4) * 0.2;
      ringRef.current.scale.set(s, s, s);
    }
  });

  const posX = (asset.position.x - 45) * 1.5;
  const posZ = (asset.position.y - 45) * 1.5;

  let geoHeight = 2.0;
  if (asset.asset_type === "hospital") geoHeight = 3.5;
  if (asset.asset_type === "telecom_tower") geoHeight = 5.0;
  if (asset.asset_type === "power_substation") geoHeight = 2.5;

  return (
    <group position={[posX, 0, posZ]} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* Selection Glow / Pulse */}
      {(isSelected || isUnavailable || isDegraded) && (
        <mesh ref={ringRef} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 2.0, 32]} />
          <meshBasicMaterial
            color={isSelected ? "#38bdf8" : color}
            transparent
            opacity={isSelected ? 0.9 : 0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Main 3D Asset Geometry */}
      <mesh ref={meshRef} position={[0, geoHeight / 2, 0]} castShadow receiveShadow>
        {asset.asset_type === "water_pump" ? (
          <cylinderGeometry args={[1.0, 1.2, geoHeight, 16]} />
        ) : asset.asset_type === "telecom_tower" ? (
          <cylinderGeometry args={[0.2, 0.8, geoHeight, 8]} />
        ) : asset.asset_type === "hospital" ? (
          <boxGeometry args={[3.0, geoHeight, 3.0]} />
        ) : (
          <boxGeometry args={[2.0, geoHeight, 2.0]} />
        )}
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.7}
          emissive={isSelected ? "#38bdf8" : color}
          emissiveIntensity={isSelected ? 0.4 : isUnavailable ? 0.6 : 0.2}
        />
      </mesh>

      {/* Floating 3D Label */}
      <Text
        position={[0, geoHeight + 1.2, 0]}
        fontSize={1.0}
        color={isSelected ? "#ffffff" : "#cbd5e1"}
        anchorX="center"
        anchorY="middle"
      >
        {asset.asset_id}
      </Text>
    </group>
  );
}

function DependencyLines({
  assets,
  dependencies,
  activeLayers,
}: {
  assets: Asset[];
  dependencies: Dependency[];
  activeLayers: { power: boolean; water: boolean; access: boolean; telecom: boolean; demand: boolean };
}) {
  const assetMap = useMemo(() => new Map(assets.map(a => [a.asset_id, a])), [assets]);

  const filteredDeps = useMemo(() => {
    return dependencies.filter(dep => {
      if (dep.dependency_type === "electricity" && !activeLayers.power) return false;
      if (dep.dependency_type === "water" && !activeLayers.water) return false;
      if (dep.dependency_type === "access" && !activeLayers.access) return false;
      if (dep.dependency_type === "communication" && !activeLayers.telecom) return false;
      return true;
    });
  }, [dependencies, activeLayers]);

  return (
    <group>
      {filteredDeps.map(dep => {
        const src = assetMap.get(dep.source_asset_id);
        const tgt = assetMap.get(dep.target_asset_id);
        if (!src || !tgt) return null;

        const p1: [number, number, number] = [(src.position.x - 45) * 1.5, 0.4, (src.position.y - 45) * 1.5];
        const p2: [number, number, number] = [(tgt.position.x - 45) * 1.5, 0.4, (tgt.position.y - 45) * 1.5];
        const color = getDependencyColor(dep.dependency_type);

        return (
          <Line
            key={dep.dependency_id}
            points={[p1, p2]}
            color={color}
            lineWidth={2}
            dashed={dep.mode === "soft"}
            dashScale={2}
            dashSize={1}
            gapSize={0.5}
            transparent
            opacity={0.65}
          />
        );
      })}
    </group>
  );
}

function SyntheticHazardZone({ scenario }: { scenario?: Scenario | null }) {
  if (!scenario || !scenario.flood_sources) return null;

  return (
    <group>
      {scenario.flood_sources.map((src, idx) => {
        const posX = (src.center_x - 45) * 1.5;
        const posZ = (src.center_y - 45) * 1.5;
        const rad = src.radius * 1.5;

        return (
          <group key={idx} position={[posX, 0.05, posZ]}>
            {/* Translucent water footprint */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[rad, 32]} />
              <meshBasicMaterial
                color="#0284c7"
                transparent
                opacity={0.35 * src.peak_intensity}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Outline */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[rad - 0.2, rad, 32]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} side={THREE.DoubleSide} />
            </mesh>
            {/* Mandatory Disclaimer Label from Document K / OCR */}
            <Text
              position={[0, 0.6, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={1.2}
              color="#bae6fd"
              anchorX="center"
              anchorY="middle"
            >
              Synthetic hazard intensity — not flood depth.
            </Text>
          </group>
        );
      })}
    </group>
  );
}

export function DigitalTwin({
  assets,
  runtimeStates,
  dependencies,
  scenario,
  selectedAssetId,
  onSelectAsset,
  activeLayers,
}: DigitalTwinProps) {
  const visibleAssets = useMemo(() => {
    return assets.filter(a => {
      if (a.asset_id.startsWith("D-") && !activeLayers.demand) return false;
      if (a.asset_type === "power_substation" && !activeLayers.power) return false;
      if (a.asset_type === "water_pump" && !activeLayers.water) return false;
      if (a.asset_type === "telecom_tower" && !activeLayers.telecom) return false;
      if (a.asset_type === "road_segment" && !a.asset_id.startsWith("D-") && !activeLayers.access) return false;
      return true;
    });
  }, [assets, activeLayers]);

  return (
    <div className="relative w-full h-full bg-[#070b14] rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* 3D Scene */}
      <Canvas
        camera={{ position: [0, 65, 75], fov: 45 }}
        onPointerMissed={() => onSelectAsset("")}
      >
        <color attach="background" args={["#090d16"]} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[30, 60, 40]} intensity={1.2} castShadow />
        <pointLight position={[-30, 40, -30]} intensity={0.5} />

        {/* Tactical Ground Grid */}
        <gridHelper args={[150, 50, "#1e293b", "#0f172a"]} position={[0, 0, 0]} />

        {/* Synthetic Hazard Field */}
        <SyntheticHazardZone scenario={scenario} />

        {/* 3D Dependency Conduits */}
        <DependencyLines
          assets={assets}
          dependencies={dependencies}
          activeLayers={activeLayers}
        />

        {/* 3D Assets */}
        {visibleAssets.map(asset => (
          <AssetObject
            key={asset.asset_id}
            asset={asset}
            runtimeState={runtimeStates[asset.asset_id]}
            isSelected={selectedAssetId === asset.asset_id}
            onSelect={() => onSelectAsset(asset.asset_id)}
          />
        ))}

        <OrbitControls
          maxPolarAngle={Math.PI / 2.1}
          minDistance={15}
          maxDistance={150}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* Floating Legend / Quick Controls */}
      <div className="absolute top-4 left-4 pointer-events-none bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/60 text-xs flex items-center space-x-3 text-slate-300">
        <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span>Operational</span></span>
        <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span><span>Degraded</span></span>
        <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span><span>Unavailable</span></span>
        <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span><span>Repairing</span></span>
      </div>

      <div className="absolute bottom-4 right-4 text-[10px] text-slate-500 bg-slate-950/70 px-2 py-1 rounded border border-slate-800">
        Controls: Left Click to Rotate | Right Click to Pan | Scroll to Zoom
      </div>
    </div>
  );
}
