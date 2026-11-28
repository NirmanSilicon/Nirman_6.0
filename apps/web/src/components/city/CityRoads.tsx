import React, { useMemo } from "react";
import * as THREE from "three";

export function CityRoads() {
  // Road segments: centerlines, widths, orientations
  const roads = useMemo(() => {
    return [
      // Major East-West Arterials
      { pos: [0, 0.05, -50], size: [150, 0.02, 6] },
      { pos: [0, 0.05, -25], size: [150, 0.02, 8] },
      { pos: [0, 0.05, 0], size: [150, 0.02, 10] },    // Central Blvd
      { pos: [0, 0.05, 25], size: [150, 0.02, 8] },
      { pos: [0, 0.05, 50], size: [150, 0.02, 6] },

      // Major North-South Avenues
      { pos: [-55, 0.05, 0], size: [6, 0.02, 150] },
      { pos: [-30, 0.05, 0], size: [8, 0.02, 150] },
      { pos: [-5, 0.05, 0], size: [10, 0.02, 150] },   // Grand Avenue
      { pos: [20, 0.05, 0], size: [8, 0.02, 150] },
      { pos: [45, 0.05, 0], size: [8, 0.02, 150] },
      { pos: [65, 0.05, 0], size: [6, 0.02, 150] },
    ];
  }, []);

  return (
    <group>
      {/* Road Pavements */}
      {roads.map((r, i) => (
        <mesh key={i} position={r.pos as any} receiveShadow>
          <boxGeometry args={r.size as any} />
          <meshStandardMaterial color="#1a202c" roughness={0.7} metalness={0.1} />
        </mesh>
      ))}

      {/* Bridge Crossing Structure over River (R-01 Bridge Access) */}
      <group position={[-5, 1.2, 7]}>
        {/* Bridge deck */}
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[10, 0.5, 34]} />
          <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.5} />
        </mesh>

        {/* Bridge piers in river */}
        <mesh position={[-4, -1.0, -8]} castShadow>
          <cylinderGeometry args={[0.7, 0.9, 2.5, 16]} />
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </mesh>
        <mesh position={[4, -1.0, -8]} castShadow>
          <cylinderGeometry args={[0.7, 0.9, 2.5, 16]} />
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </mesh>
        <mesh position={[-4, -1.0, 8]} castShadow>
          <cylinderGeometry args={[0.7, 0.9, 2.5, 16]} />
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </mesh>
        <mesh position={[4, -1.0, 8]} castShadow>
          <cylinderGeometry args={[0.7, 0.9, 2.5, 16]} />
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </mesh>

        {/* Truss / Suspension arches */}
        <mesh position={[-4.8, 1.6, 0]}>
          <boxGeometry args={[0.3, 2.5, 30]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[4.8, 1.6, 0]}>
          <boxGeometry args={[0.3, 2.5, 30]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Second Bridge over River (Eastern Bypass) */}
      <group position={[45, 1.2, 35]}>
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[8, 0.5, 30]} />
          <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[-3.5, 1.2, 0]}>
          <boxGeometry args={[0.3, 1.8, 28]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[3.5, 1.2, 0]}>
          <boxGeometry args={[0.3, 1.8, 28]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}
