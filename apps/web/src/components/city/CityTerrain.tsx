import React, { useMemo } from "react";
import * as THREE from "three";

export function CityTerrain() {
  // Ground plane + river canal + parks
  const riverPoints = useMemo(() => {
    // Curving river path running across the city from top-left to bottom-right
    return [
      [-70, 0, -45],
      [-40, 0, -25],
      [-10, 0, -5],
      [15, 0, 15],
      [45, 0, 35],
      [75, 0, 50],
    ];
  }, []);

  return (
    <group>
      {/* Main City Ground Slab */}
      <mesh position={[0, -0.2, 0]} receiveShadow>
        <boxGeometry args={[160, 0.4, 160]} />
        <meshStandardMaterial color="#0d131f" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Urban District Ground Grid Pattern */}
      <gridHelper args={[160, 80, "#1e293b", "#0f172a"]} position={[0, 0.01, 0]} />

      {/* Waterfront Embankments / River Channel */}
      <group position={[0, 0.02, 0]}>
        {/* River bed */}
        <mesh position={[0, -0.05, 5]} rotation={[-Math.PI / 2, 0, -Math.PI / 5.5]}>
          <planeGeometry args={[26, 180]} />
          <meshStandardMaterial color="#08182b" roughness={0.1} metalness={0.8} />
        </mesh>

        {/* Embankment borders */}
        <mesh position={[-7, 0.1, 5]} rotation={[-Math.PI / 2, 0, -Math.PI / 5.5]}>
          <planeGeometry args={[1.5, 180]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
        <mesh position={[7, 0.1, 5]} rotation={[-Math.PI / 2, 0, -Math.PI / 5.5]}>
          <planeGeometry args={[1.5, 180]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
      </group>

      {/* Waterfront Harbor Docks (West Basin) */}
      <mesh position={[-42, 0.08, -18]} receiveShadow>
        <boxGeometry args={[14, 0.2, 10]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>
      <mesh position={[-48, 0.08, -24]} receiveShadow>
        <boxGeometry args={[10, 0.2, 14]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>

      {/* Urban District Parks / Green Belts */}
      <mesh position={[-15, 0.03, 25]} receiveShadow>
        <boxGeometry args={[22, 0.05, 18]} />
        <meshStandardMaterial color="#062e24" roughness={0.9} />
      </mesh>
      <mesh position={[35, 0.03, -30]} receiveShadow>
        <boxGeometry args={[20, 0.05, 20]} />
        <meshStandardMaterial color="#062e24" roughness={0.9} />
      </mesh>
      <mesh position={[50, 0.03, 10]} receiveShadow>
        <boxGeometry args={[16, 0.05, 14]} />
        <meshStandardMaterial color="#062e24" roughness={0.9} />
      </mesh>
    </group>
  );
}
