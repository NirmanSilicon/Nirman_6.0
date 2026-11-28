import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { Scenario } from "../../types";

interface FloodSurfaceProps {
  scenario?: Scenario | null;
  tick: number;
}

// GLSL Water Vertex Shader — wave displacement
const waterVertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave1 = sin(pos.x * 0.4 + uTime * 1.8) * 0.12;
    float wave2 = sin(pos.y * 0.6 + uTime * 2.3 + 1.0) * 0.07;
    float wave3 = cos(pos.x * 0.3 + pos.y * 0.2 + uTime * 1.1) * 0.05;
    vWave = wave1 + wave2 + wave3;
    pos.z += vWave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// GLSL Water Fragment Shader — Fresnel + deep water color
const waterFragmentShader = `
  uniform float uTime;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    // Animated UV for subtle surface shimmer
    vec2 uv = vUv * 8.0;
    float shimmer = sin(uv.x + uTime * 2.0) * 0.5 + 0.5;
    shimmer *= cos(uv.y * 0.9 + uTime * 1.5) * 0.5 + 0.5;

    // Fresnel-like edge highlight
    float edgeFresnel = abs(vWave) * 3.0;

    vec3 color = mix(uDeepColor, uShallowColor, shimmer * 0.5 + edgeFresnel * 0.4);

    // Foam crests on wave peaks
    float foam = smoothstep(0.1, 0.22, abs(vWave));
    color = mix(color, vec3(0.75, 0.9, 1.0), foam * 0.35);

    gl_FragColor = vec4(color, uOpacity);
  }
`;

// GLSL Surge Fragment Shader — inundation flood zone
const surgeFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    vec2 centered = vUv - 0.5;
    float dist = length(centered);

    // Radial pulse rings from flood center
    float ring = sin(dist * 18.0 - uTime * 3.5) * 0.5 + 0.5;
    ring *= smoothstep(0.5, 0.0, dist); // fade at edges

    vec3 deepFlood = vec3(0.01, 0.2, 0.55);
    vec3 shallowFlood = vec3(0.1, 0.5, 0.9);
    vec3 color = mix(deepFlood, shallowFlood, ring * 0.6);

    float alpha = (0.45 + ring * 0.2) * uIntensity * smoothstep(0.5, 0.1, dist);
    gl_FragColor = vec4(color, alpha);
  }
`;

export function FloodSurface({ scenario, tick }: FloodSurfaceProps) {
  const waterRef = useRef<THREE.Mesh>(null);
  const surgeRef = useRef<THREE.Mesh>(null);

  // Flood state from scenario
  let maxFloodHeight = 0.05;
  let activeCenter: [number, number] = [0, 0];
  let activeRadius = 15;

  if (scenario && scenario.flood_sources.length > 0) {
    const src = scenario.flood_sources[0];
    activeCenter = [(src.center_x - 45) * 1.5, (src.center_y - 45) * 1.5];
    activeRadius = src.radius * 1.5;

    if (tick >= src.start_tick && tick <= src.end_tick) {
      if (tick <= src.peak_tick) {
        const factor = (tick - src.start_tick) / Math.max(1, src.peak_tick - src.start_tick);
        maxFloodHeight = 0.1 + factor * src.peak_intensity * 1.6;
      } else {
        const factor = 1.0 - (tick - src.peak_tick) / Math.max(1, src.end_tick - src.peak_tick);
        maxFloodHeight = 0.1 + Math.max(0, factor) * src.peak_intensity * 1.6;
      }
    } else if (tick > src.end_tick) {
      maxFloodHeight = 0.1;
    }
  }

  const floodIntensity = Math.min(1.0, Math.max(0, (maxFloodHeight - 0.15) / 1.5));

  // ShaderMaterial uniforms — river water
  const riverUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color("#012d60") },
      uShallowColor: { value: new THREE.Color("#0ea5e9") },
      uOpacity: { value: 0.82 },
    }),
    []
  );

  // ShaderMaterial uniforms — flood surge
  const surgeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: floodIntensity },
    }),
    [floodIntensity]
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    riverUniforms.uTime.value = t;
    surgeUniforms.uTime.value = t;
    surgeUniforms.uIntensity.value = floodIntensity;

    if (waterRef.current) {
      waterRef.current.position.y = 0.08 + Math.sin(t * 1.4) * 0.015;
    }
    if (surgeRef.current) {
      surgeRef.current.position.y = maxFloodHeight + Math.sin(t * 2.2) * 0.04;
    }
  });

  return (
    <group>
      {/* River — GLSL Animated Wave Shader */}
      <mesh
        ref={waterRef}
        position={[0, 0.08, 5]}
        rotation={[-Math.PI / 2, 0, -Math.PI / 5.5]}
      >
        <planeGeometry args={[25, 180, 32, 32]} />
        <shaderMaterial
          vertexShader={waterVertexShader}
          fragmentShader={waterFragmentShader}
          uniforms={riverUniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Dynamic Flood Surge — GLSL radial inundation */}
      {maxFloodHeight > 0.15 && (
        <group position={[activeCenter[0], 0, activeCenter[1]]}>
          <mesh
            ref={surgeRef}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[activeRadius, 64]} />
            <shaderMaterial
              vertexShader={`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
              fragmentShader={surgeFragmentShader}
              uniforms={surgeUniforms}
              transparent
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Surge Perimeter Glow Ring */}
          <mesh position={[0, maxFloodHeight + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[activeRadius - 0.5, activeRadius + 0.5, 64]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.75} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>

          {/* Flood Label */}
          <Text
            position={[0, maxFloodHeight + 0.8, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={1.4}
            color="#bae6fd"
            anchorX="center"
            anchorY="middle"
          >
            Synthetic hazard intensity — not flood depth.
          </Text>
        </group>
      )}
    </group>
  );
}
