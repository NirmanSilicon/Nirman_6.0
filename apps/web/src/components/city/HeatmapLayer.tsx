import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Asset, AssetRuntimeState } from "../../types";

interface HeatmapLayerProps {
  mode: "none" | "service_loss" | "traffic_congestion" | "flood_risk";
  assets: Asset[];
  runtimeStates: Record<string, AssetRuntimeState>;
}

// GLSL Heatmap Fragment Shader — guide Section 7.2 "Heatmap Overlay"
const heatmapVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const heatmapFragmentShader = `
  uniform float uValue;    // 0.0 (cool) .. 1.0 (hot)
  uniform float uTime;
  uniform int uMode;       // 0=service_loss, 1=traffic, 2=flood
  varying vec2 vUv;

  vec3 heatColor(float t) {
    // Classic heat ramp: blue -> cyan -> green -> yellow -> red
    vec3 c0 = vec3(0.0, 0.0, 0.5);
    vec3 c1 = vec3(0.0, 0.8, 0.9);
    vec3 c2 = vec3(0.0, 0.9, 0.0);
    vec3 c3 = vec3(1.0, 0.8, 0.0);
    vec3 c4 = vec3(1.0, 0.0, 0.0);
    if (t < 0.25) return mix(c0, c1, t * 4.0);
    if (t < 0.5)  return mix(c1, c2, (t - 0.25) * 4.0);
    if (t < 0.75) return mix(c2, c3, (t - 0.5) * 4.0);
    return mix(c3, c4, (t - 0.75) * 4.0);
  }

  vec3 trafficColor(float t) {
    // Green -> yellow -> orange -> red for congestion
    vec3 free    = vec3(0.1, 0.9, 0.2);
    vec3 slow    = vec3(1.0, 0.85, 0.0);
    vec3 heavy   = vec3(1.0, 0.4, 0.0);
    vec3 stopped = vec3(0.9, 0.05, 0.05);
    if (t < 0.33) return mix(free, slow, t * 3.0);
    if (t < 0.66) return mix(slow, heavy, (t - 0.33) * 3.0);
    return mix(heavy, stopped, (t - 0.66) * 3.0);
  }

  vec3 floodColor(float t) {
    return mix(vec3(0.4, 0.8, 1.0), vec3(0.0, 0.1, 0.5), t);
  }

  void main() {
    vec2 centered = vUv - 0.5;
    float dist = length(centered) * 2.0;

    // Radial falloff
    float falloff = smoothstep(1.0, 0.0, dist);
    if (falloff < 0.01) discard;

    // Pulsing ring for active heatmap
    float pulse = sin(dist * 10.0 - uTime * 2.0) * 0.5 + 0.5;
    float intensity = uValue * falloff * (0.7 + pulse * 0.3);

    vec3 color;
    if (uMode == 1) color = trafficColor(uValue);
    else if (uMode == 2) color = floodColor(uValue);
    else color = heatColor(uValue);

    float alpha = intensity * 0.55;
    gl_FragColor = vec4(color, alpha);
  }
`;

function HeatCell({
  posX,
  posZ,
  value,
  mode,
  radius,
  timeRef,
}: {
  posX: number;
  posZ: number;
  value: number;
  mode: number;
  radius: number;
  timeRef: React.MutableRefObject<number>;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uValue: { value },
      uTime: { value: 0 },
      uMode: { value: mode },
    }),
    [value, mode]
  );

  useFrame(() => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = timeRef.current;
      matRef.current.uniforms.uValue.value = value;
    }
  });

  return (
    <mesh position={[posX, 0.3, posZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={heatmapVertexShader}
        fragmentShader={heatmapFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

export function HeatmapLayer({ mode, assets, runtimeStates }: HeatmapLayerProps) {
  const timeRef = useRef(0);

  useFrame(({ clock }) => {
    timeRef.current = clock.getElapsedTime();
  });

  if (mode === "none") return null;

  const modeIndex = mode === "service_loss" ? 0 : mode === "traffic_congestion" ? 1 : 2;

  return (
    <group>
      {assets.map((asset) => {
        const rstate = runtimeStates[asset.asset_id];
        const deficit = rstate ? Math.max(0, 1.0 - rstate.delivered_service) : 0;

        if (deficit <= 0.05 && mode === "service_loss") return null;

        const posX = (asset.position.x - 45) * 1.5;
        const posZ = (asset.position.y - 45) * 1.5;

        let value =
          mode === "service_loss"
            ? deficit
            : mode === "traffic_congestion"
            ? 0.4 + Math.random() * 0.4
            : 0.3 + deficit * 0.7;

        const radius = 9 + value * 16;

        return (
          <HeatCell
            key={asset.asset_id}
            posX={posX}
            posZ={posZ}
            value={value}
            mode={modeIndex}
            radius={radius}
            timeRef={timeRef}
          />
        );
      })}
    </group>
  );
}
