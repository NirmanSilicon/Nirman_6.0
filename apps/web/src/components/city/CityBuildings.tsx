import React, { useLayoutEffect, useRef, useMemo } from "react";
import * as THREE from "three";

export function CityBuildings() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const rooftopsRef = useRef<THREE.InstancedMesh>(null);

  // Generate procedural building block layout avoiding roads and river
  const buildings = useMemo(() => {
    const list: Array<{ x: number; z: number; w: number; d: number; h: number; color: THREE.Color }> = [];

    // Fictional seed generator for deterministic city reproduction
    let seed = 42;
    function rand() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    const roadX = [-55, -30, -5, 20, 45, 65];
    const roadZ = [-50, -25, 0, 25, 50];

    function isNearRoad(x: number, z: number, margin: number = 5.5) {
      for (const rx of roadX) {
        if (Math.abs(x - rx) < margin) return true;
      }
      for (const rz of roadZ) {
        if (Math.abs(z - rz) < margin) return true;
      }
      return false;
    }

    function isNearRiver(x: number, z: number, margin: number = 14) {
      // River runs roughly along diagonal x * 0.5 - z - 5 = 0
      const riverDist = Math.abs((x * 0.5) - z - 5) / 1.12;
      return riverDist < margin;
    }

    // Grid through city blocks
    for (let x = -65; x <= 65; x += 6.5) {
      for (let z = -65; z <= 65; z += 6.5) {
        if (isNearRoad(x, z) || isNearRiver(x, z)) continue;

        // Skip green park areas
        if (x > -26 && x < -4 && z > 16 && z < 34) continue;
        if (x > 25 && x < 45 && z > -40 && z < -20) continue;

        // Dist from city center
        const distFromCenter = Math.hypot(x, z);

        // Determine building archetype & height based on district zoning
        let h = 8 + rand() * 12;
        let w = 4.0 + rand() * 1.5;
        let d = 4.0 + rand() * 1.5;
        let col = new THREE.Color("#1e293b"); // default slate

        if (distFromCenter < 28) {
          // Downtown Financial District Skyscraper
          h = 24 + rand() * 32;
          w = 4.8 + rand() * 1.8;
          d = 4.8 + rand() * 1.8;
          const glassTones = ["#1e3a5f", "#1e293b", "#0f2b48", "#243c5a", "#1a365d"];
          col = new THREE.Color(glassTones[Math.floor(rand() * glassTones.length)]);
        } else if (x > 15 && z < 0) {
          // Commercial Tech Corridor
          h = 16 + rand() * 20;
          w = 4.2 + rand() * 1.5;
          d = 4.2 + rand() * 1.5;
          col = new THREE.Color("#243347");
        } else if (x < -20 && z < -10) {
          // Industrial / Port Logistics District
          h = 7 + rand() * 8;
          w = 5.5 + rand() * 1.5;
          d = 5.5 + rand() * 1.5;
          col = new THREE.Color("#282e3a");
        } else {
          // Residential / Mixed Urban
          h = 10 + rand() * 14;
          w = 4.0 + rand() * 1.2;
          d = 4.0 + rand() * 1.2;
          col = new THREE.Color("#1a2233");
        }

        list.push({ x, z, w, d, h, color: col });
      }
    }

    return list;
  }, []);

  useLayoutEffect(() => {
    if (!meshRef.current || !rooftopsRef.current) return;

    const dummy = new THREE.Object3D();
    const roofDummy = new THREE.Object3D();

    buildings.forEach((b, i) => {
      // Set building transform
      dummy.position.set(b.x, b.h / 2, b.z);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);
      meshRef.current?.setColorAt(i, b.color);

      // Rooftop HVAC unit / antenna base
      roofDummy.position.set(b.x, b.h + 0.4, b.z);
      roofDummy.scale.set(b.w * 0.4, 0.8, b.d * 0.4);
      roofDummy.updateMatrix();
      rooftopsRef.current?.setMatrixAt(i, roofDummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;

    rooftopsRef.current.instanceMatrix.needsUpdate = true;
  }, [buildings]);

  return (
    <group>
      {/* Dense City Buildings InstancedMesh */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, buildings.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          roughness={0.4}
          metalness={0.6}
        />
      </instancedMesh>

      {/* Rooftop Structures (HVAC / Helipads / Antennas) */}
      <instancedMesh
        ref={rooftopsRef}
        args={[undefined, undefined, buildings.length]}
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.4} />
      </instancedMesh>
    </group>
  );
}
