import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { Scenario } from "../../types";

interface FloodSurfaceProps {
  scenario?: Scenario | null;
  tick: number;
}

export function FloodSurface({ scenario, tick }: FloodSurfaceProps) {
  const waterRef = useRef<THREE.Mesh>(null);
  const surgeRef = useRef<THREE.Mesh>(null);

  // Compute live flood progression from scenario flood sources
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

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (waterRef.current) {
      // Gentle river ripples
      waterRef.current.position.y = 0.08 + Math.sin(t * 1.5) * 0.02;
    }
    if (surgeRef.current) {
      // Rising surge wave motion
      surgeRef.current.position.y = maxFloodHeight + Math.sin(t * 2.0) * 0.04;
    }
  });

  return (
    <group>
      {/* Permanent River Water Surface */}
      <mesh
        ref={waterRef}
        position={[0, 0.08, 5]}
        rotation={[-Math.PI / 2, 0, -Math.PI / 5.5]}
      >
        <planeGeometry args={[25, 180]} />
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.1}
          metalness={0.9}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Dynamic Rising Surge Inundation Field */}
      {maxFloodHeight > 0.15 && (
        <group position={[activeCenter[0], 0, activeCenter[1]]}>
          <mesh
            ref={surgeRef}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[activeRadius, 48]} />
            <meshStandardMaterial
              color="#0369a1"
              roughness={0.15}
              metalness={0.8}
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Surge Perimeter Glow */}
          <mesh position={[0, maxFloodHeight + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[activeRadius - 0.5, activeRadius, 48]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>

          {/* Mandatory Label from Guide */}
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
