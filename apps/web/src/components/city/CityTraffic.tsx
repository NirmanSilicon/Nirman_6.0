import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CityTrafficProps {
  floodActive: boolean;
  activeRepairs: string[]; // Asset IDs currently under repair
  assetPositions: Record<string, { x: number; y: number }>;
}

export function CityTraffic({ floodActive, activeRepairs, assetPositions }: CityTrafficProps) {
  const carsRef = useRef<THREE.InstancedMesh>(null);
  const emergencyRef = useRef<THREE.Group>(null);

  // Generate paths for 60 civilian vehicles across avenues and boulevards
  const trafficLanes = useMemo(() => {
    const lanes: Array<{
      axis: "x" | "z";
      fixed: number;
      min: number;
      max: number;
      speed: number;
      offset: number;
      dir: number;
    }> = [];

    // East-West lanes
    const zLanes = [-25, 0, 25];
    zLanes.forEach((z, i) => {
      for (let k = 0; k < 10; k++) {
        lanes.push({
          axis: "x",
          fixed: z + (k % 2 === 0 ? 1.8 : -1.8),
          min: -68,
          max: 68,
          speed: 12 + (k % 4) * 3,
          offset: (k * 14) % 136,
          dir: k % 2 === 0 ? 1 : -1,
        });
      }
    });

    // North-South lanes
    const xLanes = [-30, -5, 20, 45];
    xLanes.forEach((x, i) => {
      for (let k = 0; k < 8; k++) {
        lanes.push({
          axis: "z",
          fixed: x + (k % 2 === 0 ? 1.8 : -1.8),
          min: -68,
          max: 68,
          speed: 10 + (k % 3) * 3,
          offset: (k * 18) % 136,
          dir: k % 2 === 0 ? 1 : -1,
        });
      }
    });

    return lanes;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!carsRef.current) return;
    const time = clock.getElapsedTime();

    trafficLanes.forEach((lane, i) => {
      // Slow down or halt traffic if flood is severe in west/center
      const speedMult = floodActive && lane.fixed < 0 ? 0.3 : 1.0;
      const span = lane.max - lane.min;
      let pos = ((lane.offset + time * lane.speed * speedMult) % span);
      if (lane.dir === -1) pos = span - pos;
      const currentCoord = lane.min + pos;

      if (lane.axis === "x") {
        dummy.position.set(currentCoord, 0.25, lane.fixed);
        dummy.rotation.set(0, lane.dir === 1 ? Math.PI / 2 : -Math.PI / 2, 0);
      } else {
        dummy.position.set(lane.fixed, 0.25, currentCoord);
        dummy.rotation.set(0, lane.dir === 1 ? 0 : Math.PI, 0);
      }

      dummy.scale.set(1.4, 0.5, 0.8);
      dummy.updateMatrix();
      carsRef.current?.setMatrixAt(i, dummy.matrix);
    });

    carsRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* Moving Civilian Traffic Instanced Mesh */}
      <instancedMesh
        ref={carsRef}
        args={[undefined, undefined, trafficLanes.length]}
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#f8fafc"
          roughness={0.2}
          metalness={0.8}
          emissive="#38bdf8"
          emissiveIntensity={0.2}
        />
      </instancedMesh>

      {/* Emergency Recovery Vehicles dispatched during active repairs */}
      {activeRepairs.map((assetId, idx) => {
        const targetPos = assetPositions[assetId];
        if (!targetPos) return null;
        const targetX = (targetPos.x - 45) * 1.5;
        const targetZ = (targetPos.y - 45) * 1.5;

        return (
          <group key={assetId} position={[targetX + 3, 0.4, targetZ + 3]}>
            {/* Utility Repair Truck */}
            <mesh castShadow>
              <boxGeometry args={[2.8, 1.2, 1.5]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.4} metalness={0.6} />
            </mesh>
            {/* Flashing Emergency Light Bar */}
            <mesh position={[0, 0.8, 0]}>
              <boxGeometry args={[0.8, 0.2, 1.2]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
            <pointLight position={[0, 1.2, 0]} color="#ef4444" intensity={2} distance={8} />
          </group>
        );
      })}
    </group>
  );
}
