/**
 * CityEnvironment — Sky, Environment Map, Atmospheric Fog
 * Guide Section 7.2: "Use environment maps for sky reflections: an HDRI skybox
 * or procedural sky (Three.js Sky object) for realistic lighting."
 */
import React, { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky, Stars, Environment } from "@react-three/drei";
import * as THREE from "three";

interface CityEnvironmentProps {
  isNightMode: boolean;
  tick: number;
}

export function CityEnvironment({ isNightMode, tick }: CityEnvironmentProps) {
  const sunRef = useRef<THREE.DirectionalLight>(null);

  // Sun elevation: slowly arc across sky based on simulation tick
  const sunAzimuth = (tick % 100) / 100; // 0..1 over 100 ticks
  const sunInclination = isNightMode ? 0.52 : 0.1 + sunAzimuth * 0.3;
  const sunAngle = isNightMode ? 0.0 : 0.3 + sunAzimuth * 0.5;

  return (
    <>
      {isNightMode ? (
        // Night — star field
        <Stars
          radius={200}
          depth={60}
          count={3000}
          factor={3}
          saturation={0.1}
          fade
          speed={0.5}
        />
      ) : (
        // Day — procedural Three.js Sky
        <Sky
          distance={450000}
          sunPosition={[
            Math.cos(sunAngle * Math.PI) * 100,
            Math.sin(sunInclination * Math.PI) * 100,
            -Math.sin(sunAngle * Math.PI) * 50,
          ]}
          inclination={sunInclination}
          azimuth={sunAzimuth}
          rayleigh={isNightMode ? 0 : 1.0}
          turbidity={8}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
      )}

      {/* Soft environment for reflective surfaces */}
      <Environment preset={isNightMode ? "night" : "city"} />
    </>
  );
}
