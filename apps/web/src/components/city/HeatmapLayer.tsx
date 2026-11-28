import React, { useMemo } from "react";
import * as THREE from "three";
import { Asset, AssetRuntimeState } from "../../types";

interface HeatmapLayerProps {
  mode: "none" | "service_loss" | "traffic_congestion" | "flood_risk";
  assets: Asset[];
  runtimeStates: Record<string, AssetRuntimeState>;
}

export function HeatmapLayer({ mode, assets, runtimeStates }: HeatmapLayerProps) {
  if (mode === "none") return null;

  // Draped continuous scalar analysis mesh over the city
  return (
    <group position={[0, 0.28, 0]}>
      {assets.map((asset) => {
        const rstate = runtimeStates[asset.asset_id];
        const deficit = rstate ? Math.max(0, 1.0 - rstate.delivered_service) : 0;
        if (deficit <= 0.05 && mode === "service_loss") return null;

        const posX = (asset.position.x - 45) * 1.5;
        const posZ = (asset.position.y - 45) * 1.5;
        const intensity = mode === "service_loss" ? deficit : 0.6;
        const radius = 10 + deficit * 15;

        let color = "#ef4444"; // red for severe loss
        if (deficit < 0.4) color = "#f59e0b"; // amber for moderate
        if (mode === "traffic_congestion") color = "#f97316";
        if (mode === "flood_risk") color = "#0284c7";

        return (
          <mesh
            key={asset.asset_id}
            position={[posX, 0, posZ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[radius, 32]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.35 * intensity}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
