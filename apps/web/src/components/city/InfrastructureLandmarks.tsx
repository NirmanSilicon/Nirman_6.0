import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { Asset, AssetRuntimeState, LogicalState } from "../../types";

interface InfrastructureLandmarksProps {
  assets: Asset[];
  runtimeStates: Record<string, AssetRuntimeState>;
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
      return "#10b981"; // emerald
    case "degraded":
      return "#f59e0b"; // amber
    case "unavailable":
      return "#ef4444"; // rose
    case "repairing":
      return "#8b5cf6"; // purple
    case "recovered":
      return "#06b6d4"; // cyan
    default:
      return "#64748b";
  }
}

// 1. Procedural Hospital Complex Model
function HospitalModel({ color, isUnavailable }: { color: string; isUnavailable: boolean }) {
  return (
    <group>
      {/* Main Hospital Bed Tower */}
      <mesh position={[0, 4.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.5, 9.0, 5.0]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Emergency Wing */}
      <mesh position={[4.0, 2.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 4.0, 4.5]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
      </mesh>

      {/* Diagnostics / Surgical Wing */}
      <mesh position={[-3.8, 2.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 5.0, 4.2]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
      </mesh>

      {/* Rooftop Helipad */}
      <mesh position={[0, 9.1, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 0.2, 16]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      <mesh position={[0, 9.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.8, 16]} />
        <meshBasicMaterial color="#facc15" side={THREE.DoubleSide} />
      </mesh>

      {/* Illuminated Red Medical Cross on Facade */}
      <group position={[0, 6.0, 2.55]}>
        <mesh>
          <boxGeometry args={[0.5, 1.8, 0.1]} />
          <meshBasicMaterial color={isUnavailable ? "#64748b" : "#ef4444"} />
        </mesh>
        <mesh>
          <boxGeometry args={[1.8, 0.5, 0.1]} />
          <meshBasicMaterial color={isUnavailable ? "#64748b" : "#ef4444"} />
        </mesh>
      </group>
    </group>
  );
}

// 2. Procedural Power Substation Model
function PowerSubstationModel({ color, isOperational }: { color: string; isOperational: boolean }) {
  return (
    <group>
      {/* Gravel Substation Yard */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[8.0, 0.2, 7.0]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>

      {/* Transformer Core 1 */}
      <mesh position={[-2.2, 1.5, -1.0]} castShadow>
        <boxGeometry args={[2.2, 3.0, 2.2]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Transformer Core 2 */}
      <mesh position={[2.2, 1.5, -1.0]} castShadow>
        <boxGeometry args={[2.2, 3.0, 2.2]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Insulator Bushings & High Voltage Bushing Tops */}
      <mesh position={[-2.2, 3.4, -1.0]}>
        <cylinderGeometry args={[0.15, 0.25, 1.2, 8]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[2.2, 3.4, -1.0]}>
        <cylinderGeometry args={[0.15, 0.25, 1.2, 8]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Steel Transmission Gantry Arch */}
      <mesh position={[0, 3.5, 2.0]}>
        <boxGeometry args={[6.5, 0.3, 0.3]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
      </mesh>
      <mesh position={[-3.0, 1.8, 2.0]}>
        <boxGeometry args={[0.3, 3.6, 0.3]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
      </mesh>
      <mesh position={[3.0, 1.8, 2.0]}>
        <boxGeometry args={[0.3, 3.6, 0.3]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
      </mesh>

      {/* Substation Control House */}
      <mesh position={[0, 1.0, -2.0]} castShadow>
        <boxGeometry args={[2.4, 2.0, 1.8]} />
        <meshStandardMaterial color="#64748b" roughness={0.7} />
      </mesh>
    </group>
  );
}

// 3. Procedural Water Treatment Facility Model
function WaterPumpModel({ color }: { color: string }) {
  return (
    <group>
      {/* Concrete Tank Apron */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[8.0, 0.2, 6.5]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>

      {/* Circular Clarifier Tank 1 */}
      <mesh position={[-2.2, 1.5, 0]} castShadow>
        <cylinderGeometry args={[2.0, 2.0, 3.0, 24]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.2} metalness={0.5} opacity={0.9} transparent />
      </mesh>

      {/* Circular Clarifier Tank 2 */}
      <mesh position={[2.2, 1.5, 0]} castShadow>
        <cylinderGeometry args={[2.0, 2.0, 3.0, 24]} />
        <meshStandardMaterial color="#0284c7" roughness={0.2} metalness={0.6} />
      </mesh>

      {/* Intake / Exhaust Pipe Manifold */}
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[4.0, 0.4, 0.4]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

// 4. Procedural Telecom Tower Model
function TelecomTowerModel({ color }: { color: string }) {
  return (
    <group>
      {/* Tower Lattice Spire */}
      <mesh position={[0, 7.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 1.4, 15.0, 4]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} wireframe />
      </mesh>

      {/* Microwave Drum 1 */}
      <mesh position={[0.7, 10.0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.6, 0.6, 0.4, 16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>

      {/* Microwave Drum 2 */}
      <mesh position={[-0.7, 12.0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>

      {/* Blinking Top Aviation Warning Light */}
      <mesh position={[0, 15.2, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

// 5. Procedural Road/Bridge Segment Model
function RoadSegmentModel({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.5, 0.4, 4.5]} />
        <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Road center dash */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.4, 0.05, 3.0]} />
        <meshBasicMaterial color="#facc15" />
      </mesh>
    </group>
  );
}

export function InfrastructureLandmarks({
  assets,
  runtimeStates,
  selectedAssetId,
  onSelectAsset,
  activeLayers,
}: InfrastructureLandmarksProps) {
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const s = 1.0 + Math.sin(clock.getElapsedTime() * 4) * 0.25;
      pulseRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group>
      {assets.map((asset) => {
        // Filter by layer
        if (asset.asset_id.startsWith("D-") && !activeLayers.demand) return null;
        if (asset.asset_type === "power_substation" && !activeLayers.power) return null;
        if (asset.asset_type === "water_pump" && !activeLayers.water) return null;
        if (asset.asset_type === "telecom_tower" && !activeLayers.telecom) return null;
        if (asset.asset_type === "road_segment" && !asset.asset_id.startsWith("D-") && !activeLayers.access) return null;

        const rstate = runtimeStates[asset.asset_id];
        const state = rstate?.logical_state || asset.logical_state;
        const color = getAssetColor(state);
        const isSelected = selectedAssetId === asset.asset_id;
        const isDamaged = state === "degraded" || state === "unavailable";

        const posX = (asset.position.x - 45) * 1.5;
        const posZ = (asset.position.y - 45) * 1.5;

        let heightOffset = 6.0;
        if (asset.asset_type === "hospital") heightOffset = 11.0;
        if (asset.asset_type === "telecom_tower") heightOffset = 17.0;
        if (asset.asset_type === "power_substation") heightOffset = 5.5;

        return (
          <group
            key={asset.asset_id}
            position={[posX, 0, posZ]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectAsset(asset.asset_id);
            }}
          >
            {/* Base Status Ring */}
            <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[3.2, 3.8, 32]} />
              <meshBasicMaterial
                color={isSelected ? "#38bdf8" : color}
                transparent
                opacity={isSelected ? 0.9 : 0.6}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Pulsing Alert Ring for Damaged Assets */}
            {isDamaged && (
              <mesh
                ref={isSelected ? pulseRef : undefined}
                position={[0, 0.2, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <ringGeometry args={[4.0, 4.8, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Sector-Specific Detailed Model */}
            {asset.asset_type === "hospital" ? (
              <HospitalModel color={color} isUnavailable={state === "unavailable"} />
            ) : asset.asset_type === "power_substation" ? (
              <PowerSubstationModel color={color} isOperational={state === "operational"} />
            ) : asset.asset_type === "water_pump" ? (
              <WaterPumpModel color={color} />
            ) : asset.asset_type === "telecom_tower" ? (
              <TelecomTowerModel color={color} />
            ) : (
              <RoadSegmentModel color={color} />
            )}

            {/* Floating HUD Label */}
            <group position={[0, heightOffset, 0]}>
              <Text
                fontSize={1.2}
                color={isSelected ? "#ffffff" : isDamaged ? "#fca5a5" : "#e2e8f0"}
                anchorX="center"
                anchorY="middle"
              >
                {asset.asset_id}
              </Text>
              <Text
                position={[0, -1.0, 0]}
                fontSize={0.8}
                color={isDamaged ? "#f87171" : "#38bdf8"}
                anchorX="center"
                anchorY="middle"
              >
                {rstate ? `${Math.round(rstate.delivered_service * 100)}% SVC` : "100% SVC"}
              </Text>
            </group>
          </group>
        );
      })}
    </group>
  );
}
