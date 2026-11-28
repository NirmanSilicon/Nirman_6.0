"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, OrbitControls, Sparkles } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { useRef } from "react";
import * as THREE from "three";

function Core({ reduced }: { reduced: boolean | null }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state, delta) => { if (group.current && !reduced) { group.current.rotation.y += delta * .16; group.current.rotation.x = state.pointer.y * .12; group.current.rotation.z = state.pointer.x * .06; } });
  const nodes: [number, number, number][] = [[-2.4,.65,0],[2.4,.65,0],[-1.8,-1.15,.45],[1.9,-1.1,-.35]];
  return <group ref={group}><Float speed={reduced ? 0 : 1.5} rotationIntensity={.25} floatIntensity={.35}><mesh><icosahedronGeometry args={[1.05, 2]}/><meshStandardMaterial color="#b8ff5a" emissive="#78c936" emissiveIntensity={1.7} wireframe /></mesh><mesh scale={.67}><sphereGeometry args={[1, 32, 32]}/><meshBasicMaterial color="#0d110e" /></mesh></Float>{nodes.map((n,i)=><group key={i} position={n}><mesh><sphereGeometry args={[.16,16,16]}/><meshStandardMaterial color="#d8ff97" emissive="#7dff4d" emissiveIntensity={2}/></mesh><Line points={[[0,0,0],[-n[0],-n[1],-n[2]]]} color="#7fdd47" transparent opacity={.42} lineWidth={1}/></group>)}<Sparkles count={80} scale={6} size={1.8} speed={reduced ? 0 : .35} color="#b8ff5a" /></group>;
}
export default function HeroCore() { const reduced = useReducedMotion(); return <div className="core" aria-label="Interactive security core visualization"><Canvas dpr={[1,1.5]} camera={{position:[0,0,7], fov:48}} fallback={<div className="core-fallback">AGENT X<br/>SECURITY CORE</div>}><ambientLight intensity={.35}/><pointLight position={[2,3,4]} color="#b8ff5a" intensity={32}/><Core reduced={reduced}/><OrbitControls enableZoom={false} enablePan={false} autoRotate={!reduced} autoRotateSpeed={.35}/></Canvas></div>; }
