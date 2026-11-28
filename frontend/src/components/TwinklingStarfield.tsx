import React, { useState, useEffect, useRef } from 'react';
import { InteractiveMoon } from './InteractiveMoon';

interface Star {
  id: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  size: number;
  type: 'diamond' | 'crosshair' | 'compass' | 'dot' | 'fourpoint';
  delay: string;
  duration: string;
  opacity: number;
}

// Clean, diverse stars distributed aesthetically across the canvas without any data
const STARS_COLLECTION: Star[] = [
  // Top-Left Cluster
  { id: 's1', x: 3, y: 3, size: 14, type: 'compass', delay: '0s', duration: '2.4s', opacity: 0.85 },
  { id: 's2', x: 7, y: 9, size: 8, type: 'diamond', delay: '0.6s', duration: '3.1s', opacity: 0.7 },
  { id: 's3', x: 12, y: 4, size: 5, type: 'dot', delay: '1.2s', duration: '2.0s', opacity: 0.6 },
  { id: 's4', x: 2.5, y: 16, size: 10, type: 'crosshair', delay: '1.8s', duration: '3.4s', opacity: 0.75 },
  { id: 's5', x: 9, y: 23, size: 6, type: 'fourpoint', delay: '0.4s', duration: '2.7s', opacity: 0.65 },

  // Top-Right Cluster
  { id: 's6', x: 93, y: 3, size: 16, type: 'fourpoint', delay: '0.3s', duration: '2.5s', opacity: 0.85 },
  { id: 's7', x: 87, y: 8, size: 9, type: 'diamond', delay: '0.9s', duration: '2.9s', opacity: 0.7 },
  { id: 's8', x: 96, y: 15, size: 7, type: 'dot', delay: '1.5s', duration: '2.2s', opacity: 0.6 },
  { id: 's9', x: 81, y: 4, size: 5, type: 'dot', delay: '0.2s', duration: '1.9s', opacity: 0.55 },
  { id: 's10', x: 89, y: 21, size: 11, type: 'compass', delay: '1.1s', duration: '3.3s', opacity: 0.75 },

  // Mid-Left Margin
  { id: 's11', x: 2.5, y: 38, size: 12, type: 'diamond', delay: '0.8s', duration: '2.6s', opacity: 0.8 },
  { id: 's12', x: 5.5, y: 45, size: 7, type: 'fourpoint', delay: '1.4s', duration: '3.0s', opacity: 0.65 },
  { id: 's13', x: 1.5, y: 53, size: 9, type: 'crosshair', delay: '0.5s', duration: '2.8s', opacity: 0.7 },
  { id: 's14', x: 6.5, y: 61, size: 5, type: 'dot', delay: '1.7s', duration: '2.1s', opacity: 0.55 },

  // Mid-Right Margin
  { id: 's15', x: 94.5, y: 36, size: 13, type: 'compass', delay: '1.0s', duration: '2.9s', opacity: 0.8 },
  { id: 's16', x: 89.5, y: 46, size: 8, type: 'diamond', delay: '0.3s', duration: '3.2s', opacity: 0.65 },
  { id: 's17', x: 96.5, y: 55, size: 6, type: 'dot', delay: '1.6s', duration: '2.3s', opacity: 0.6 },
  { id: 's18', x: 91, y: 63, size: 10, type: 'fourpoint', delay: '0.7s', duration: '2.7s', opacity: 0.75 },

  // Lower Left Cluster
  { id: 's19', x: 4, y: 77, size: 14, type: 'fourpoint', delay: '0.5s', duration: '2.8s', opacity: 0.8 },
  { id: 's20', x: 8.5, y: 85, size: 8, type: 'diamond', delay: '1.3s', duration: '3.1s', opacity: 0.7 },
  { id: 's21', x: 2, y: 92, size: 6, type: 'dot', delay: '0.1s', duration: '2.0s', opacity: 0.6 },
  { id: 's22', x: 12, y: 95, size: 9, type: 'crosshair', delay: '1.9s', duration: '3.3s', opacity: 0.65 },

  // Lower Right Cluster
  { id: 's23', x: 91, y: 79, size: 15, type: 'compass', delay: '0.4s', duration: '2.6s', opacity: 0.85 },
  { id: 's24', x: 96, y: 87, size: 9, type: 'diamond', delay: '1.0s', duration: '3.0s', opacity: 0.7 },
  { id: 's25', x: 85, y: 92, size: 6, type: 'dot', delay: '1.4s', duration: '2.4s', opacity: 0.6 },
  { id: 's26', x: 93, y: 96, size: 11, type: 'fourpoint', delay: '0.7s', duration: '2.9s', opacity: 0.75 }
];

interface GlowWave {
  id: number;
  birth: number;
}

interface SparkEvent {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
  angle: number;
  intensity: number;
  createdAt: number;
}

const DEEP_SPACE_MICRO_STARS = [
  { id: 'ds1', x: 5, y: 12, size: 2, delay: '0.2s', duration: '3.1s', color: '#FAF6EE', opacity: 0.65 },
  { id: 'ds2', x: 15, y: 8, size: 2.5, delay: '1.1s', duration: '2.8s', color: '#E5C76B', opacity: 0.8 },
  { id: 'ds3', x: 22, y: 19, size: 1.8, delay: '0.7s', duration: '3.5s', color: '#38BDF8', opacity: 0.7 },
  { id: 'ds4', x: 31, y: 7, size: 3, delay: '1.8s', duration: '2.4s', color: '#FAF6EE', opacity: 0.85 },
  { id: 'ds5', x: 44, y: 14, size: 2, delay: '0.4s', duration: '4.0s', color: '#E5C76B', opacity: 0.6 },
  { id: 'ds6', x: 58, y: 6, size: 2.2, delay: '2.1s', duration: '3.2s', color: '#FAF6EE', opacity: 0.75 },
  { id: 'ds7', x: 67, y: 18, size: 2.8, delay: '0.9s', duration: '2.9s', color: '#38BDF8', opacity: 0.8 },
  { id: 'ds8', x: 74, y: 11, size: 1.5, delay: '1.4s', duration: '3.6s', color: '#FAF6EE', opacity: 0.6 },
  { id: 'ds9', x: 84, y: 16, size: 3, delay: '0.1s', duration: '2.5s', color: '#E5C76B', opacity: 0.9 },
  { id: 'ds10', x: 92, y: 10, size: 2, delay: '1.7s', duration: '3.0s', color: '#FAF6EE', opacity: 0.7 },
  { id: 'ds11', x: 8, y: 32, size: 2.5, delay: '0.8s', duration: '2.7s', color: '#38BDF8', opacity: 0.75 },
  { id: 'ds12', x: 19, y: 41, size: 1.8, delay: '1.3s', duration: '3.8s', color: '#FAF6EE', opacity: 0.6 },
  { id: 'ds13', x: 27, y: 29, size: 2.8, delay: '0.5s', duration: '2.9s', color: '#E5C76B', opacity: 0.85 },
  { id: 'ds14', x: 38, y: 36, size: 2, delay: '1.9s', duration: '3.3s', color: '#FAF6EE', opacity: 0.65 },
  { id: 'ds15', x: 52, y: 28, size: 3, delay: '0.3s', duration: '2.6s', color: '#E63956', opacity: 0.8 },
  { id: 'ds16', x: 63, y: 39, size: 1.6, delay: '2.0s', duration: '3.7s', color: '#FAF6EE', opacity: 0.55 },
  { id: 'ds17', x: 71, y: 31, size: 2.4, delay: '0.6s', duration: '3.1s', color: '#38BDF8', opacity: 0.8 },
  { id: 'ds18', x: 83, y: 35, size: 2, delay: '1.5s', duration: '2.8s', color: '#FAF6EE', opacity: 0.7 },
  { id: 'ds19', x: 95, y: 27, size: 2.8, delay: '0.2s', duration: '3.4s', color: '#E5C76B', opacity: 0.85 },
  { id: 'ds20', x: 4, y: 56, size: 2, delay: '1.0s', duration: '3.0s', color: '#FAF6EE', opacity: 0.65 },
  { id: 'ds21', x: 14, y: 64, size: 2.6, delay: '0.4s', duration: '2.8s', color: '#E5C76B', opacity: 0.8 },
  { id: 'ds22', x: 25, y: 52, size: 1.8, delay: '1.6s', duration: '3.5s', color: '#38BDF8', opacity: 0.7 },
  { id: 'ds23', x: 34, y: 68, size: 3, delay: '0.8s', duration: '2.5s', color: '#FAF6EE', opacity: 0.9 },
  { id: 'ds24', x: 47, y: 58, size: 2.2, delay: '2.2s', duration: '3.3s', color: '#E5C76B', opacity: 0.75 },
  { id: 'ds25', x: 59, y: 66, size: 1.5, delay: '0.7s', duration: '3.9s', color: '#FAF6EE', opacity: 0.55 },
  { id: 'ds26', x: 68, y: 54, size: 2.8, delay: '1.2s', duration: '2.7s', color: '#38BDF8', opacity: 0.85 },
  { id: 'ds27', x: 79, y: 62, size: 2, delay: '0.5s', duration: '3.2s', color: '#FAF6EE', opacity: 0.7 },
  { id: 'ds28', x: 88, y: 58, size: 2.5, delay: '1.7s', duration: '2.9s', color: '#E5C76B', opacity: 0.8 },
  { id: 'ds29', x: 97, y: 69, size: 2, delay: '0.3s', duration: '3.6s', color: '#FAF6EE', opacity: 0.65 },
  { id: 'ds30', x: 6, y: 84, size: 2.8, delay: '1.4s', duration: '2.6s', color: '#38BDF8', opacity: 0.85 },
  { id: 'ds31', x: 18, y: 76, size: 2, delay: '0.9s', duration: '3.4s', color: '#FAF6EE', opacity: 0.7 },
  { id: 'ds32', x: 29, y: 88, size: 3, delay: '0.1s', duration: '2.7s', color: '#E5C76B', opacity: 0.9 },
  { id: 'ds33', x: 42, y: 82, size: 1.8, delay: '1.8s', duration: '3.8s', color: '#FAF6EE', opacity: 0.6 },
  { id: 'ds34', x: 55, y: 91, size: 2.5, delay: '0.6s', duration: '3.0s', color: '#38BDF8', opacity: 0.8 },
  { id: 'ds35', x: 65, y: 81, size: 2, delay: '2.0s', duration: '3.2s', color: '#FAF6EE', opacity: 0.7 },
  { id: 'ds36', x: 76, y: 86, size: 2.8, delay: '0.4s', duration: '2.8s', color: '#E5C76B', opacity: 0.85 },
  { id: 'ds37', x: 87, y: 79, size: 2, delay: '1.3s', duration: '3.5s', color: '#FAF6EE', opacity: 0.65 },
  { id: 'ds38', x: 95, y: 91, size: 3.2, delay: '0.7s', duration: '2.4s', color: '#38BDF8', opacity: 0.9 },
];

interface TwinklingStarfieldProps {
  theme?: 'light' | 'dark';
  showSatellites?: boolean;
}

export const TwinklingStarfield: React.FC<TwinklingStarfieldProps> = ({ 
  theme = 'light',
  showSatellites = true
}) => {
  const isDark = theme === 'dark';
  // Earth rotation state
  const [earthAngle, setEarthAngle] = useState(0);

  // Satellite 1 (Alpha - Recon Probe) DOM container & state ref
  const sat1Ref = useRef<HTMLDivElement>(null);
  const sat1State = useRef({
    t: 0,
    x: 75,
    y: 25,
    heading: 0,
    isHovered: false,
    glowIntensity: 0,
  });

  // Satellite 2 (Beta - Deep-Space Relay Probe) DOM container & state ref
  const sat2Ref = useRef<HTMLDivElement>(null);
  const sat2State = useRef({
    t: 2.8,
    x: 28,
    y: 65,
    heading: 180,
    isHovered: false,
    glowIntensity: 0,
  });

  // Common interactive simulation refs
  const simCommon = useRef({
    mouseScreenX: 50,
    mouseScreenY: 50,
    mouseNear: false,
    lastSparkTime: 0,
    orbitBlend: 0,
    targetOrbitBlend: 0,
  });

  // React state for reactive visuals
  const [sat1Glow, setSat1Glow] = useState(false);
  const [sat1Hovered, setSat1Hovered] = useState(false);
  const [sat1Waves, setSat1Waves] = useState<GlowWave[]>([]);

  const [sat2Glow, setSat2Glow] = useState(false);
  const [sat2Hovered, setSat2Hovered] = useState(false);
  const [sat2Waves, setSat2Waves] = useState<GlowWave[]>([]);

  // Active Spark Events between satellites
  const [activeSpark, setActiveSpark] = useState<SparkEvent | null>(null);

  // Main 60 FPS continuous animation loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let isVisible = true;

    // Set up observer for the main container
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isVisible = entry.isIntersecting;
      });
    }, { threshold: 0 });
    
    // Find a top level wrapper to observe (or document body)
    const container = document.querySelector('.bg-deep-space-dark') || document.body;
    if (container) observer.observe(container);

    const updateFrame = (now: number) => {
      animationFrameId = requestAnimationFrame(updateFrame);
      if (!isVisible) return; // Skip heavy calculations when out of view

      const dt = Math.min((now - lastTime) / 1000, 0.05); // capped delta time
      lastTime = now;

      const c = simCommon.current;
      const s1 = sat1State.current;
      const s2 = sat2State.current;

      // 1. Update Corner Earth rotation
      setEarthAngle((prev) => (prev + dt * 16) % 360);

      // Check Large Earth Position in Case Closed section for orbital lock
      const earthCenterEl = document.getElementById('large-earth-center');
      let earthScreenX = 50;
      let earthScreenY = 50;
      let isEarthNearby = false;

      const winW = window.innerWidth || 1200;
      const winH = window.innerHeight || 800;

      if (earthCenterEl) {
        const rect = earthCenterEl.getBoundingClientRect();
        earthScreenX = ((rect.left + rect.width / 2) / winW) * 100;
        earthScreenY = ((rect.top + rect.height / 2) / winH) * 100;

        // If Large Earth is inside or entering viewport
        if (earthScreenY > -25 && earthScreenY < 125) {
          isEarthNearby = true;
        }
      }

      c.targetOrbitBlend = isEarthNearby ? 1.0 : 0.0;
      // Smooth gradual transition rate (entering or leaving orbit)
      const blendRate = isEarthNearby ? 0.045 : 0.035;
      c.orbitBlend += (c.targetOrbitBlend - c.orbitBlend) * Math.min(1, blendRate * 60 * dt);

      // 2. Physics & Trajectory for Satellite 1 (Probe Alpha)
      const speed1 = s1.isHovered ? 0.38 : (s1.glowIntensity > 0 ? 0.46 : 0.28);
      s1.t += dt * speed1;

      if (s1.glowIntensity > 0) {
        s1.glowIntensity = Math.max(0, s1.glowIntensity - dt * 0.35);
        if (s1.glowIntensity === 0 && sat1Glow) setSat1Glow(false);
      }

      // Orbital Path 1 (Wide figure-8 sweep across upper-mid canvas)
      const wander1X = 50 + Math.cos(s1.t * 0.65) * 38 + Math.sin(s1.t * 1.3) * 6;
      const wander1Y = 32 + Math.sin(s1.t * 0.65) * 18 + Math.cos(s1.t * 1.3) * 6;

      // Large Earth Orbit 1: Inner Low-to-Mid Earth Orbit (~275px inner ring, tilt +24deg)
      const orbit1Angle = s1.t * 0.68 + 0.8;
      const rx1 = (275 / winW) * 100;
      const ry1 = (92 / winH) * 100;
      const tilt1 = (24 * Math.PI) / 180;
      const unrot1X = rx1 * Math.cos(orbit1Angle);
      const unrot1Y = ry1 * Math.sin(orbit1Angle);
      const earthOrb1X = earthScreenX + (unrot1X * Math.cos(tilt1) - unrot1Y * Math.sin(tilt1));
      const earthOrb1Y = earthScreenY + (unrot1X * Math.sin(tilt1) + unrot1Y * Math.cos(tilt1));

      let dest1X = wander1X * (1 - c.orbitBlend) + earthOrb1X * c.orbitBlend;
      let dest1Y = wander1Y * (1 - c.orbitBlend) + earthOrb1Y * c.orbitBlend;

      if (c.mouseNear) {
        const dx1 = c.mouseScreenX - dest1X;
        const dy1 = c.mouseScreenY - dest1Y;
        const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        if (dist1 < 32) {
          const pull = (1 - dist1 / 32) * 11;
          dest1X += (dx1 / (dist1 + 0.1)) * pull;
          dest1Y += (dy1 / (dist1 + 0.1)) * pull;
        }
      }

      // Mutual Collision Avoidance: Gentle repulsion if satellites ever get within 10vw
      const satDxCurrent = s1.x - s2.x;
      const satDyCurrent = s1.y - s2.y;
      const currentSatDist = Math.hypot(satDxCurrent, satDyCurrent);
      if (currentSatDist > 0 && currentSatDist < 10) {
        const pushForce = (1 - currentSatDist / 10) * 4;
        dest1X += (satDxCurrent / currentSatDist) * pushForce;
        dest1Y += (satDyCurrent / currentSatDist) * pushForce;
      }

      const lerp1 = s1.isHovered ? 0.08 : 0.05;
      const prev1X = s1.x;
      const prev1Y = s1.y;
      s1.x += (dest1X - s1.x) * (lerp1 * 60 * dt);
      s1.y += (dest1Y - s1.y) * (lerp1 * 60 * dt);

      const move1Dx = s1.x - prev1X;
      const move1Dy = s1.y - prev1Y;
      const target1Angle = (Math.atan2(move1Dy, move1Dx) * 180) / Math.PI;

      let angle1Diff = target1Angle - s1.heading;
      while (angle1Diff < -180) angle1Diff += 360;
      while (angle1Diff > 180) angle1Diff -= 360;
      s1.heading += angle1Diff * Math.min(1, 0.12 * 60 * dt);

      if (sat1Ref.current) {
        const scale1 = 1 + s1.glowIntensity * 0.25 + (s1.isHovered ? 0.15 : 0);
        sat1Ref.current.style.transform = `translate3d(${s1.x}vw, ${s1.y}vh, 0) translate(-50%, -50%) rotate(${s1.heading}deg) scale(${scale1})`;
      }

      // 3. Physics & Trajectory for Satellite 2 (Probe Beta - Deep-Space Relay)
      const speed2 = s2.isHovered ? 0.36 : (s2.glowIntensity > 0 ? 0.44 : 0.25);
      s2.t += dt * speed2;

      if (s2.glowIntensity > 0) {
        s2.glowIntensity = Math.max(0, s2.glowIntensity - dt * 0.35);
        if (s2.glowIntensity === 0 && sat2Glow) setSat2Glow(false);
      }

      // Orbital Path 2 (Inclined counter-harmonic trajectory)
      const wander2X = 50 + Math.sin(s2.t * 0.52 + 1.2) * 40 - Math.cos(s2.t * 1.04) * 8;
      const wander2Y = 48 + Math.cos(s2.t * 0.52 + 0.8) * 22 + Math.sin(s2.t * 1.04) * 7;

      // Large Earth Orbit 2: Outer High-MEO / GEO Orbit (~420px outer ring, tilt -48deg - strictly separated from Orbit 1)
      const orbit2Angle = s2.t * 0.48 + 3.14;
      const rx2 = (420 / winW) * 100;
      const ry2 = (175 / winH) * 100;
      const tilt2 = (-48 * Math.PI) / 180;
      const unrot2X = rx2 * Math.cos(orbit2Angle);
      const unrot2Y = ry2 * Math.sin(orbit2Angle);
      const earthOrb2X = earthScreenX + (unrot2X * Math.cos(tilt2) - unrot2Y * Math.sin(tilt2));
      const earthOrb2Y = earthScreenY + (unrot2X * Math.sin(tilt2) + unrot2Y * Math.cos(tilt2));

      let dest2X = wander2X * (1 - c.orbitBlend) + earthOrb2X * c.orbitBlend;
      let dest2Y = wander2Y * (1 - c.orbitBlend) + earthOrb2Y * c.orbitBlend;

      if (c.mouseNear) {
        const dx2 = c.mouseScreenX - dest2X;
        const dy2 = c.mouseScreenY - dest2Y;
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (dist2 < 32) {
          const pull = (1 - dist2 / 32) * 11;
          dest2X += (dx2 / (dist2 + 0.1)) * pull;
          dest2Y += (dy2 / (dist2 + 0.1)) * pull;
        }
      }

      // Mutual Collision Avoidance: Counter-repulsion for Satellite 2
      if (currentSatDist > 0 && currentSatDist < 10) {
        const pushForce = (1 - currentSatDist / 10) * 4;
        dest2X -= (satDxCurrent / currentSatDist) * pushForce;
        dest2Y -= (satDyCurrent / currentSatDist) * pushForce;
      }

      const lerp2 = s2.isHovered ? 0.08 : 0.05;
      const prev2X = s2.x;
      const prev2Y = s2.y;
      s2.x += (dest2X - s2.x) * (lerp2 * 60 * dt);
      s2.y += (dest2Y - s2.y) * (lerp2 * 60 * dt);

      const move2Dx = s2.x - prev2X;
      const move2Dy = s2.y - prev2Y;
      const target2Angle = (Math.atan2(move2Dy, move2Dx) * 180) / Math.PI;

      let angle2Diff = target2Angle - s2.heading;
      while (angle2Diff < -180) angle2Diff += 360;
      while (angle2Diff > 180) angle2Diff -= 360;
      s2.heading += angle2Diff * Math.min(1, 0.12 * 60 * dt);

      if (sat2Ref.current) {
        const scale2 = 1 + s2.glowIntensity * 0.25 + (s2.isHovered ? 0.15 : 0);
        sat2Ref.current.style.transform = `translate3d(${s2.x}vw, ${s2.y}vh, 0) translate(-50%, -50%) rotate(${s2.heading}deg) scale(${scale2})`;
      }

      // 4. Proximity Detection & Spark Control
      // STRICT RULE: When revolving around Earth (c.orbitBlend > 0.01), NO sparks or collision effects EVER trigger!
      if (c.orbitBlend > 0.01) {
        // Clear any active spark immediately when in Earth orbit mode
        if (activeSpark) {
          setActiveSpark(null);
        }
      } else {
        const satDx = s1.x - s2.x;
        const satDy = s1.y - s2.y;
        const satDist = Math.sqrt(satDx * satDx + satDy * satDy);

        // Infrequent distant comms ping only in free-wander space (never in Earth orbit)
        const nowMs = Date.now();
        const sparkCooldownMs = 18000;
        
        if (satDist < 12 && nowMs - c.lastSparkTime > sparkCooldownMs) {
          c.lastSparkTime = nowMs;

          const midX = (s1.x + s2.x) / 2;
          const midY = (s1.y + s2.y) / 2;
          const arcAngle = (Math.atan2(satDy, satDx) * 180) / Math.PI;

          const newSpark: SparkEvent = {
            id: nowMs,
            x1: s1.x,
            y1: s1.y,
            x2: s2.x,
            y2: s2.y,
            midX,
            midY,
            angle: arcAngle,
            intensity: 1 - Math.min(1, satDist / 12),
            createdAt: nowMs,
          };

          setActiveSpark(newSpark);

          // Flash transponder beacon on both satellites
          s1.glowIntensity = Math.max(s1.glowIntensity, 0.35);
          s2.glowIntensity = Math.max(s2.glowIntensity, 0.35);

          // Automatically clear spark after animation completes
          setTimeout(() => {
            setActiveSpark((prev) => (prev?.id === newSpark.id ? null : prev));
          }, 800);
        }
      }
    };

    animationFrameId = requestAnimationFrame(updateFrame);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, [sat1Glow, sat2Glow]);

  // Track mouse coordinates for interactive gravitation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const px = (e.clientX / window.innerWidth) * 100;
      const py = (e.clientY / window.innerHeight) * 100;
      simCommon.current.mouseScreenX = px;
      simCommon.current.mouseScreenY = py;
      simCommon.current.mouseNear = true;
    };

    const handleMouseLeave = () => {
      simCommon.current.mouseNear = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Click Satellite 1: Does NOT stop; surges glow & shockwave ripples
  const handleSat1Click = (e: React.MouseEvent) => {
    e.stopPropagation();
    sat1State.current.glowIntensity = 1.0;
    setSat1Glow(true);

    const newWave: GlowWave = { id: Date.now() + Math.random(), birth: Date.now() };
    setSat1Waves((prev) => [...prev.slice(-3), newWave]);
    setTimeout(() => {
      setSat1Waves((prev) => prev.filter((w) => Date.now() - w.birth < 2200));
    }, 2300);
  };

  // Click Satellite 2: Does NOT stop; surges glow & shockwave ripples
  const handleSat2Click = (e: React.MouseEvent) => {
    e.stopPropagation();
    sat2State.current.glowIntensity = 1.0;
    setSat2Glow(true);

    const newWave: GlowWave = { id: Date.now() + Math.random(), birth: Date.now() };
    setSat2Waves((prev) => [...prev.slice(-3), newWave]);
    setTimeout(() => {
      setSat2Waves((prev) => prev.filter((w) => Date.now() - w.birth < 2200));
    }, 2300);
  };

  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none ${isDark ? "z-0" : "z-10"} select-none`}>
      
      {/* ========================================================================= */}
      {/* 0. DARK MODE CELESTIAL SPACE NIGHT SKY GRID & COORDINATES OVERLAY         */}
      {/* ========================================================================= */}
      {isDark && (
        <div className="absolute inset-0 pointer-events-none transition-opacity duration-700 opacity-90">
          {/* Subtle Deep-Space Cosmic Gradient Fill */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(13, 27, 42, 0.6) 0%, rgba(8, 11, 17, 0.9) 70%, #06080E 100%)'
            }}
          />

          {/* 2D Celestial Astrolabe & Navigational Coordinate Grid (Pure SVG) */}
          <svg className="absolute inset-0 w-full h-full opacity-40">
            <defs>
              <pattern id="celestialGrid" width="160" height="160" patternUnits="userSpaceOnUse">
                <circle cx="80" cy="80" r="79" fill="none" stroke="#94A3B8" strokeWidth="0.5" strokeDasharray="1 7" opacity="0.4" />
                <line x1="80" y1="0" x2="80" y2="160" stroke="#94A3B8" strokeWidth="0.4" strokeDasharray="2 6" opacity="0.3" />
                <line x1="0" y1="80" x2="160" y2="80" stroke="#94A3B8" strokeWidth="0.4" strokeDasharray="2 6" opacity="0.3" />
                <circle cx="80" cy="80" r="1.5" fill="#E5C76B" opacity="0.5" />
              </pattern>
            </defs>
            
            {/* Tiled Celestial Grid Pattern */}
            <rect width="100%" height="100%" fill="url(#celestialGrid)" />

            {/* Giant Horizon Astrolabe Rings */}
            <circle cx="50%" cy="45%" r="380" fill="none" stroke="#38BDF8" strokeWidth="0.75" strokeDasharray="3 8" opacity="0.25" />
            <circle cx="50%" cy="45%" r="620" fill="none" stroke="#E5C76B" strokeWidth="0.6" strokeDasharray="2 10" opacity="0.2" />

            {/* Constellation Vector Link Segments */}
            <line x1="3%" y1="3%" x2="7%" y2="9%" stroke="#E5C76B" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.45" />
            <line x1="7%" y1="9%" x2="2.5%" y2="16%" stroke="#E5C76B" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.4" />
            <line x1="93%" y1="3%" x2="87%" y2="8%" stroke="#38BDF8" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.45" />
            <line x1="87%" y1="8%" x2="89%" y2="21%" stroke="#38BDF8" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.4" />
            <line x1="91%" y1="79%" x2="96%" y2="87%" stroke="#E5C76B" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.45" />
            <line x1="4%" y1="77%" x2="8.5%" y2="85%" stroke="#38BDF8" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.4" />
          </svg>



          {/* Additional Micro-Starfield (38+ Softly Breathing Micro-Stars) */}
          {DEEP_SPACE_MICRO_STARS.map((mStar) => (
            <div
              key={mStar.id}
              style={{
                left: `${mStar.x}%`,
                top: `${mStar.y}%`,
                width: `${mStar.size}px`,
                height: `${mStar.size}px`,
                backgroundColor: mStar.color,
                animationDelay: mStar.delay,
                animationDuration: mStar.duration,
                boxShadow: `0 0 5px ${mStar.color}`,
                opacity: mStar.opacity
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full animate-star-twinkle pointer-events-none"
            />
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CLEAN TWINKLING STARS (NO DATA, PURE CELESTIAL BACKGROUND) */}
      {/* ========================================================================= */}
      {STARS_COLLECTION.map((star) => {
        const glowClass = isDark 
          ? (star.type === 'compass' 
              ? 'animate-star-glow-gold' 
              : star.type === 'fourpoint' 
                ? 'animate-star-glow-crimson' 
                : 'animate-star-glow-cyan')
          : 'animate-star-twinkle';

        return (
          <div
            key={star.id}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              animationDelay: star.delay,
              animationDuration: star.duration,
              opacity: isDark ? Math.min(1, star.opacity + 0.15) : star.opacity
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none ${glowClass}`}
          >
            {star.type === 'compass' && (
              <svg
                width={star.size * (isDark ? 1.15 : 1)}
                height={star.size * (isDark ? 1.15 : 1)}
                viewBox="0 0 24 24"
                className={isDark ? "text-[#E5C76B] drop-shadow-[0_0_10px_rgba(229,199,107,0.9)]" : "text-[#C5A945] drop-shadow-[0_0_3px_rgba(156,122,40,0.35)]"}
                fill="currentColor"
              >
                <path d="M12 0L14 9L23 12L14 15L12 24L10 15L1 12L10 9Z" />
                <circle cx="12" cy="12" r="2.2" fill={isDark ? "#FFFFFF" : "#FAF6EE"} />
              </svg>
            )}

            {star.type === 'fourpoint' && (
              <svg
                width={star.size * (isDark ? 1.15 : 1)}
                height={star.size * (isDark ? 1.15 : 1)}
                viewBox="0 0 20 20"
                className={isDark ? "text-[#E63956] drop-shadow-[0_0_10px_rgba(230,57,86,0.9)]" : "text-[#DC143C]/75 drop-shadow-[0_0_3px_rgba(201,29,55,0.3)]"}
                fill="currentColor"
              >
                <polygon points="10,0 12,8 20,10 12,12 10,20 8,12 0,10 8,8" />
                <circle cx="10" cy="10" r="1.5" fill={isDark ? "#FFFFFF" : "#FAF6EE"} />
              </svg>
            )}

            {star.type === 'diamond' && (
              <svg
                width={star.size * (isDark ? 1.1 : 1)}
                height={star.size * (isDark ? 1.1 : 1)}
                viewBox="0 0 20 20"
                className={isDark ? "text-[#38BDF8] drop-shadow-[0_0_8px_rgba(56,189,248,0.85)]" : "text-[#C5A945]/80"}
                fill="currentColor"
              >
                <polygon points="10,1 19,10 10,19 1,10" />
                <circle cx="10" cy="10" r="1.5" fill={isDark ? "#FFFFFF" : "#FAF6EE"} />
              </svg>
            )}

            {star.type === 'crosshair' && (
              <svg
                width={star.size}
                height={star.size}
                viewBox="0 0 20 20"
                className={isDark ? "text-[#94A3B8] drop-shadow-[0_0_5px_rgba(148,163,184,0.6)]" : "text-[#625A50]"}
                stroke="currentColor"
                strokeWidth="1.2"
                fill="none"
              >
                <circle cx="10" cy="10" r="4" />
                <line x1="10" y1="2" x2="10" y2="18" />
                <line x1="2" y1="10" x2="18" y2="10" />
              </svg>
            )}

            {star.type === 'dot' && (
              <div
                style={{ width: star.size, height: star.size }}
                className={isDark 
                  ? "rounded-full bg-[#E5C76B] border border-[#FFFFFF] shadow-[0_0_8px_rgba(229,199,107,0.9)]" 
                  : "rounded-full bg-[#C5A945]/70 border border-[#FAF6EE]/50 shadow-[0_0_4px_rgba(156,122,40,0.4)]"}
              />
            )}
          </div>
        );
      })}

      {/* ========================================================================= */}
      {/* 2. SMALL REVOLVING EARTH GLOBE IN TOP-RIGHT CORNER WITH ORBITING SATELLITE */}
      {/* ========================================================================= */}
      <div className="absolute top-16 right-4 sm:right-8 w-24 h-24 pointer-events-none opacity-85 hover:opacity-100 transition-opacity">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <defs>
            <radialGradient id="cornerEarthAtmosphereTop" cx="50%" cy="50%" r="50%">
              <stop offset="65%" stopColor={isDark ? "#0E2439" : "#25323A"} />
              <stop offset="90%" stopColor={isDark ? "#08131E" : "#1A2228"} />
              <stop offset="100%" stopColor={isDark ? "#38BDF8" : "#C5A945"} stopOpacity={isDark ? "0.9" : "0.7"} />
            </radialGradient>
            <clipPath id="earthClipTop">
              <circle cx="50" cy="50" r="22" />
            </clipPath>
          </defs>

          {/* Faint Orbital Path Ring */}
          <ellipse
            cx="50"
            cy="50"
            rx="36"
            ry="18"
            fill="none"
            stroke={isDark ? "#38BDF8" : "#C5A945"}
            strokeWidth="0.8"
            strokeDasharray="2 3"
            className={isDark ? "opacity-70" : "opacity-50"}
            transform="rotate(-25, 50, 50)"
          />

          {/* Earth Atmosphere Outer Ring */}
          <circle 
            cx="50" 
            cy="50" 
            r="24" 
            fill="none" 
            stroke={isDark ? "#38BDF8" : "#C5A945"} 
            strokeWidth={isDark ? "1" : "0.75"} 
            strokeDasharray="3 2" 
            className={isDark ? "opacity-80 drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]" : "opacity-40"} 
          />
          
          {/* Earth Sphere Body */}
          <circle 
            cx="50" 
            cy="50" 
            r="22" 
            fill="url(#cornerEarthAtmosphereTop)" 
            stroke={isDark ? "#38BDF8" : "#1A1A1A"} 
            strokeWidth={isDark ? "1" : "1.5"} 
          />

          {/* Revolving Continents & Longitude Lines */}
          <g clipPath="url(#earthClipTop)">
            {[-40, -20, 0, 20, 40].map((offset, i) => {
              const dynX = 50 + Math.sin(((earthAngle + offset * 4) * Math.PI) / 180) * 19;
              return (
                <ellipse
                  key={i}
                  cx={dynX}
                  cy="50"
                  rx="6"
                  ry="21"
                  fill="none"
                  stroke={isDark ? "#38BDF8" : "#C5A945"}
                  strokeWidth="0.6"
                  strokeDasharray="1 2"
                  className={isDark ? "opacity-50" : "opacity-40"}
                />
              );
            })}
            <line 
              x1="28" 
              y1="50" 
              x2="72" 
              y2="50" 
              stroke={isDark ? "#E63956" : "#DC143C"} 
              strokeWidth="0.8" 
              className={isDark ? "opacity-90" : "opacity-70"} 
            />
            
            <path
              d={`M ${40 + (earthAngle % 60)},42 Q ${48 + (earthAngle % 60)},36 ${56 + (earthAngle % 60)},45 Q ${62 + (earthAngle % 60)},56 ${50 + (earthAngle % 60)},60 Z`}
              fill={isDark ? "#1E3A2F" : "#3D4B3C"}
              stroke={isDark ? "#34D399" : "#586E56"}
              strokeWidth="0.5"
              className="opacity-75"
            />
            <path
              d={`M ${20 + (earthAngle % 60)},48 Q ${30 + (earthAngle % 60)},40 ${38 + (earthAngle % 60)},52 Q ${32 + (earthAngle % 60)},66 ${22 + (earthAngle % 60)},60 Z`}
              fill={isDark ? "#1E3A2F" : "#3D4B3C"}
              stroke={isDark ? "#34D399" : "#586E56"}
              strokeWidth="0.5"
              className="opacity-75"
            />
          </g>

          {/* Lunar Orbit Track Ring */}
          <ellipse
            cx="50"
            cy="50"
            rx="46"
            ry="24"
            fill="none"
            stroke={isDark ? "#FAF6EE" : "#1A1A1A"}
            strokeWidth="0.6"
            strokeDasharray="2 4"
            className={isDark ? "opacity-50" : "opacity-35"}
            transform="rotate(18, 50, 50)"
          />

          {/* Small Satellite Orbiting Top-Right Earth */}
          {(() => {
            const rad = ((earthAngle * 1.8) * Math.PI) / 180;
            const tilt = (-25 * Math.PI) / 180;
            const unRotX = 36 * Math.cos(rad);
            const unRotY = 18 * Math.sin(rad);
            const sx = 50 + (unRotX * Math.cos(tilt) - unRotY * Math.sin(tilt));
            const sy = 50 + (unRotX * Math.sin(tilt) + unRotY * Math.cos(tilt));

            return (
              <g transform={`translate(${sx}, ${sy}) scale(0.65)`}>
                <rect x="-8" y="-2" width="5" height="4" rx="0.5" fill="#1D4A66" stroke="#FAF6EE" strokeWidth="0.5" />
                <rect x="3" y="-2" width="5" height="4" rx="0.5" fill="#1D4A66" stroke="#FAF6EE" strokeWidth="0.5" />
                <rect x="-3" y="-3" width="6" height="6" rx="0.5" fill="#C5A945" stroke="#1A1A1A" strokeWidth="0.8" />
                <circle cx="0" cy="0" r="1.2" fill="#DC143C" className="animate-pulse" />
                <line x1="0" y1="0" x2="-4" y2="-4" stroke="#FAF6EE" strokeWidth="0.6" />
              </g>
            );
          })()}

          {/* Orbiting Luna (Earth's Moon) */}
          {(() => {
            const moonRad = ((earthAngle * 0.45 + 120) * Math.PI) / 180;
            const moonTilt = (18 * Math.PI) / 180;
            const unRotX = 46 * Math.cos(moonRad);
            const unRotY = 24 * Math.sin(moonRad);
            const mx = 50 + (unRotX * Math.cos(moonTilt) - unRotY * Math.sin(moonTilt));
            const my = 50 + (unRotX * Math.sin(moonTilt) + unRotY * Math.cos(moonTilt));
            const moonSpin = (earthAngle * 1.5) % 360;

            return (
              <g transform={`translate(${mx}, ${my}) scale(0.55)`}>
                <circle cx="0" cy="0" r="4.5" fill="#D6CEBF" />
                {/* Rotating lunar mare craters */}
                <ellipse 
                  cx={-1 + Math.sin((moonSpin * Math.PI) / 180) * 2} 
                  cy="0" 
                  rx="1.8" 
                  ry="1.4" 
                  fill="#686153" 
                  opacity="0.8" 
                />
                <circle 
                  cx={1.5 + Math.cos((moonSpin * Math.PI) / 180) * 1.5} 
                  cy="1" 
                  r="1" 
                  fill="#544D42" 
                  opacity="0.8" 
                />
                {/* Crescent terminator */}
                <path d="M 0,-4.5 A 4.5 4.5 0 0 1 0,4.5 Q -2,0 0,-4.5 Z" fill="#1A1A1A" opacity="0.5" />
              </g>
            );
          })()}
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* 3. SMALL REVOLVING EARTH GLOBE IN BOTTOM-LEFT CORNER */}
      {/* ========================================================================= */}
      <div className="absolute bottom-12 left-4 sm:left-8 w-20 h-20 pointer-events-none opacity-80 hover:opacity-100 transition-opacity">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <defs>
            <clipPath id="earthClipBottom">
              <circle cx="50" cy="50" r="18" />
            </clipPath>
          </defs>

          <ellipse
            cx="50"
            cy="50"
            rx="30"
            ry="14"
            fill="none"
            stroke="#C5A945"
            strokeWidth="0.75"
            strokeDasharray="2 3"
            className="opacity-40"
            transform="rotate(35, 50, 50)"
          />

          <circle cx="50" cy="50" r="18" fill="url(#cornerEarthAtmosphereTop)" stroke="#1A1A1A" strokeWidth="1.2" />

          <g clipPath="url(#earthClipBottom)">
            {[-30, 0, 30].map((offset, i) => {
              const dynX = 50 + Math.sin((((earthAngle * 0.8) + offset * 5) * Math.PI) / 180) * 15;
              return (
                <ellipse
                  key={i}
                  cx={dynX}
                  cy="50"
                  rx="5"
                  ry="17"
                  fill="none"
                  stroke="#C5A945"
                  strokeWidth="0.5"
                  strokeDasharray="1 2"
                  className="opacity-40"
                />
              );
            })}
            <line x1="32" y1="50" x2="68" y2="50" stroke="#DC143C" strokeWidth="0.7" className="opacity-70" />
            <path
              d={`M ${35 + (earthAngle % 50)},44 Q ${42 + (earthAngle % 50)},38 ${48 + (earthAngle % 50)},48 Q ${52 + (earthAngle % 50)},58 ${44 + (earthAngle % 50)},60 Z`}
              fill="#3D4B3C"
              stroke="#586E56"
              strokeWidth="0.5"
              className="opacity-75"
            />
          </g>

          {(() => {
            const rad = ((-earthAngle * 1.5) * Math.PI) / 180;
            const tilt = (35 * Math.PI) / 180;
            const unRotX = 30 * Math.cos(rad);
            const unRotY = 14 * Math.sin(rad);
            const sx = 50 + (unRotX * Math.cos(tilt) - unRotY * Math.sin(tilt));
            const sy = 50 + (unRotX * Math.sin(tilt) + unRotY * Math.cos(tilt));

            return (
              <g transform={`translate(${sx}, ${sy}) scale(0.55)`}>
                <rect x="-7" y="-2" width="4.5" height="3.5" rx="0.5" fill="#1D4A66" stroke="#FAF6EE" strokeWidth="0.5" />
                <rect x="2.5" y="-2" width="4.5" height="3.5" rx="0.5" fill="#1D4A66" stroke="#FAF6EE" strokeWidth="0.5" />
                <rect x="-2.5" y="-2.5" width="5" height="5" rx="0.5" fill="#C5A945" stroke="#1A1A1A" strokeWidth="0.7" />
                <circle cx="0" cy="0" r="1" fill="#DC143C" />
              </g>
            );
          })()}
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* 4. INFREQUENT ELECTRIC SPARK ANIMATION WHEN SATELLITES PASS CLOSELY */}
      {/* ========================================================================= */}
      {showSatellites && (
        <>
          {activeSpark && (
        <div 
          className="fixed inset-0 pointer-events-none z-40 overflow-visible"
        >
          {/* 1. Electric Lightning Line Arc between the two satellites */}
          <svg className="w-full h-full absolute inset-0 overflow-visible">
            <defs>
              <filter id="sparkGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Glowing background arc */}
            <line
              x1={`${activeSpark.x1}vw`}
              y1={`${activeSpark.y1}vh`}
              x2={`${activeSpark.x2}vw`}
              y2={`${activeSpark.y2}vh`}
              stroke="#FFE58F"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.85"
              filter="url(#sparkGlow)"
              className="animate-pulse"
            />
            {/* Core electric filament */}
            <line
              x1={`${activeSpark.x1}vw`}
              y1={`${activeSpark.y1}vh`}
              x2={`${activeSpark.x2}vw`}
              y2={`${activeSpark.y2}vh`}
              stroke="#FAF6EE"
              strokeWidth="1.6"
              strokeDasharray="4 2"
              strokeLinecap="round"
              opacity="0.95"
            />
          </svg>

          {/* 2. Central Celestial Spark Flare at Midpoint */}
          <div
            style={{
              left: `${activeSpark.midX}vw`,
              top: `${activeSpark.midY}vh`,
              transform: `translate(-50%, -50%) rotate(${activeSpark.angle + 45}deg)`,
            }}
            className="absolute flex items-center justify-center pointer-events-none"
          >
            {/* Expanding Shockwave Micro-Ring */}
            <div className="w-14 h-14 rounded-full border-2 border-[#FFE58F] animate-ping opacity-90"></div>
            <div className="w-20 h-20 rounded-full border border-[#DC143C] animate-ping opacity-60" style={{ animationDelay: '0.1s' }}></div>

            {/* Radiant Spark Star */}
            <svg width="40" height="40" viewBox="0 0 40 40" className="absolute overflow-visible animate-pulse">
              {/* Primary 4-pointed Diamond Spark */}
              <polygon
                points="20,0 23,17 40,20 23,23 20,40 17,23 0,20 17,17"
                fill="#FAF6EE"
                stroke="#FFE58F"
                strokeWidth="1"
              />
              {/* Secondary Diagonal Needles */}
              <polygon
                points="20,6 22,18 34,20 22,22 20,34 18,22 6,20 18,18"
                fill="#E5C76B"
                opacity="0.75"
                transform="rotate(45, 20, 20)"
              />
              {/* Center Plasma Core */}
              <circle cx="20" cy="20" r="3.5" fill="#DC143C" />
              <circle cx="20" cy="20" r="1.8" fill="#FAF6EE" />
            </svg>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SATELLITE 1 (PROBE ALPHA - RECONNAISSANCE & SENSORS) */}
      {/* ========================================================================= */}
      <div
        ref={sat1Ref}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          willChange: 'transform',
          zIndex: 5
        }}
        className="pointer-events-none group select-none"
        onMouseEnter={() => {
          sat1State.current.isHovered = true;
          setSat1Hovered(true);
        }}
        onMouseLeave={() => {
          sat1State.current.isHovered = false;
          setSat1Hovered(false);
        }}
        onClick={handleSat1Click}
      >
        {/* Glow Shockwave Ripples */}
        {sat1Waves.map((wave) => (
          <div key={wave.id} className="absolute -inset-10 flex items-center justify-center pointer-events-none">
            <span className="w-24 h-24 rounded-full border-2 border-[#DC143C] animate-ping opacity-90"></span>
            <span className="w-36 h-36 rounded-full border-2 border-[#E5C76B] animate-ping opacity-75" style={{ animationDelay: '0.15s' }}></span>
            <span className="w-48 h-48 rounded-full border border-[#FAF6EE] animate-ping opacity-50" style={{ animationDelay: '0.3s' }}></span>
          </div>
        ))}

        {/* Radiant Plasma Energy Halo */}
        <div 
          className={`absolute -inset-6 rounded-full blur-md transition-opacity duration-300 pointer-events-none ${
            sat1Glow 
              ? 'opacity-100 bg-radial from-[#FFE58F]/80 via-[#DC143C]/50 to-transparent scale-150 animate-pulse' 
              : sat1Hovered 
                ? 'opacity-70 bg-radial from-[#E5C76B]/50 via-[#DC143C]/30 to-transparent scale-125'
                : 'opacity-0 scale-90'
          }`}
        />

        {/* Interactive Target Reticle */}
        <div 
          className={`absolute -inset-4 rounded-full border border-dashed border-[#C5A945] pointer-events-none transition-all duration-300 ${
            sat1Hovered || sat1Glow ? 'opacity-80 scale-100 rotate-45' : 'opacity-0 scale-75'
          }`}
        />

        {/* Vector SVG for Satellite 1 */}
        <div 
          className={`relative transition-all duration-200 ${
            sat1Glow 
              ? 'drop-shadow-[0_0_20px_rgba(201,29,55,0.9)] drop-shadow-[0_0_35px_rgba(229,199,107,0.95)]' 
              : sat1Hovered
                ? 'drop-shadow-[0_0_12px_rgba(229,199,107,0.7)] drop-shadow-[0_0_18px_rgba(201,29,55,0.4)]'
                : 'drop-shadow-[0_4px_10px_rgba(26,24,21,0.35)]'
          }`}
        >
          <svg width="56" height="56" viewBox="0 0 56 56" className="overflow-visible">
            <defs>
              <linearGradient id="solarGlowGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={sat1Glow ? "#FFEC8B" : sat1Hovered ? "#2D6C94" : "#1B425A"} />
                <stop offset="50%" stopColor={sat1Glow ? "#E5A93C" : sat1Hovered ? "#1E5275" : "#123042"} />
                <stop offset="100%" stopColor={sat1Glow ? "#DC143C" : sat1Hovered ? "#133E59" : "#0D2230"} />
              </linearGradient>

              <linearGradient id="chassisGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={sat1Glow ? "#FFF2A8" : sat1Hovered ? "#F3D866" : "#E2C34F"} />
                <stop offset="100%" stopColor={sat1Glow ? "#E5A93C" : sat1Hovered ? "#C5A128" : "#C5A945"} />
              </linearGradient>

              <linearGradient id="thrusterFlame1" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#DC143C" stopOpacity="0" />
                <stop offset="50%" stopColor="#FFE066" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#FAF6EE" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Continuous Ion Thruster Booster Plume */}
            <g transform="translate(10, 28) rotate(180)">
              <polygon 
                points="0,-3 14,0 0,3" 
                fill="url(#thrusterFlame1)" 
                className={sat1Glow ? 'animate-ping' : ''}
                opacity={sat1Glow ? 0.95 : sat1Hovered ? 0.8 : 0.45}
              />
              <line 
                x1="0" 
                y1="0" 
                x2={sat1Glow ? "24" : sat1Hovered ? "16" : "10"} 
                y2="0" 
                stroke={sat1Glow ? "#FFE58F" : "#DC143C"} 
                strokeWidth={sat1Glow ? "2.5" : "1.5"}
                strokeLinecap="round"
                opacity={sat1Glow ? 1 : 0.7} 
              />
            </g>

            {/* Communications & Sensor Mast */}
            <line x1="28" y1="28" x2="16" y2="14" stroke={sat1Glow ? "#FAF6EE" : "#1A1A1A"} strokeWidth="1.5" />
            <circle 
              cx="16" 
              cy="14" 
              r={sat1Glow ? 3 : 2} 
              fill={sat1Glow ? "#FFE58F" : "#DC143C"} 
              className={sat1Glow ? "animate-ping" : ""}
            />
            <path 
              d="M 12,12 Q 16,8 20,12" 
              stroke={sat1Glow ? "#FFE58F" : "#C5A945"} 
              strokeWidth="1.2" 
              fill="none" 
            />

            {/* Left Wing Solar Array */}
            <rect 
              x="6" 
              y="22" 
              width="14" 
              height="12" 
              rx="1.5" 
              fill="url(#solarGlowGrad1)" 
              stroke={sat1Glow ? "#FFE58F" : "#1A1A1A"} 
              strokeWidth={sat1Glow ? "1.5" : "1"} 
            />
            <line x1="13" y1="22" x2="13" y2="34" stroke={sat1Glow ? "#FAF6EE" : "#C5A945"} strokeWidth="0.8" />
            <line x1="6" y1="28" x2="20" y2="28" stroke={sat1Glow ? "#FFE58F" : "#FAF6EE"} strokeWidth="0.6" opacity="0.8" />

            {/* Right Wing Solar Array */}
            <rect 
              x="36" 
              y="22" 
              width="14" 
              height="12" 
              rx="1.5" 
              fill="url(#solarGlowGrad1)" 
              stroke={sat1Glow ? "#FFE58F" : "#1A1A1A"} 
              strokeWidth={sat1Glow ? "1.5" : "1"} 
            />
            <line x1="43" y1="22" x2="43" y2="34" stroke={sat1Glow ? "#FAF6EE" : "#C5A945"} strokeWidth="0.8" />
            <line x1="36" y1="28" x2="50" y2="28" stroke={sat1Glow ? "#FFE58F" : "#FAF6EE"} strokeWidth="0.6" opacity="0.8" />

            {/* Solar Array Hinge Connectors */}
            <rect x="20" y="26" width="3" height="4" fill="#1A1A1A" />
            <rect x="33" y="26" width="3" height="4" fill="#1A1A1A" />

            {/* Core Satellite Bus (Gold MLI Chassis) */}
            <rect 
              x="21" 
              y="20" 
              width="14" 
              height="16" 
              rx="2" 
              fill="url(#chassisGrad1)" 
              stroke={sat1Glow ? "#FAF6EE" : "#1A1A1A"} 
              strokeWidth={sat1Glow ? "2" : "1.4"} 
            />

            {/* Optical Sensor */}
            <circle cx="25" cy="25" r="2" fill="#1A1A1A" />
            <circle cx="25" cy="25" r="0.8" fill={sat1Glow ? "#6EE7B7" : "#38BDF8"} />

            {/* Telemetry Beacon LED */}
            <circle 
              cx="28" 
              cy="30" 
              r={sat1Glow ? 3 : 2} 
              fill={sat1Glow ? "#FFE58F" : "#DC143C"} 
              className="animate-pulse"
            />
            <rect 
              x="24" 
              y="32.5" 
              width="8" 
              height="1.5" 
              fill={sat1Glow ? "#48BB78" : "#C5A945"} 
              rx="0.5" 
            />
          </svg>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. SATELLITE 2 (PROBE BETA - DEEP-SPACE RELAY & PARABOLIC DISH) */}
      {/* ========================================================================= */}
      <div
        ref={sat2Ref}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          willChange: 'transform',
          zIndex: 5
        }}
        className="pointer-events-none group select-none"
        onMouseEnter={() => {
          sat2State.current.isHovered = true;
          setSat2Hovered(true);
        }}
        onMouseLeave={() => {
          sat2State.current.isHovered = false;
          setSat2Hovered(false);
        }}
        onClick={handleSat2Click}
      >
        {/* Glow Shockwave Ripples */}
        {sat2Waves.map((wave) => (
          <div key={wave.id} className="absolute -inset-10 flex items-center justify-center pointer-events-none">
            <span className="w-24 h-24 rounded-full border-2 border-[#38BDF8] animate-ping opacity-90"></span>
            <span className="w-36 h-36 rounded-full border-2 border-[#FFE58F] animate-ping opacity-75" style={{ animationDelay: '0.15s' }}></span>
            <span className="w-48 h-48 rounded-full border border-[#FAF6EE] animate-ping opacity-50" style={{ animationDelay: '0.3s' }}></span>
          </div>
        ))}

        {/* Radiant Plasma Energy Halo */}
        <div 
          className={`absolute -inset-6 rounded-full blur-md transition-opacity duration-300 pointer-events-none ${
            sat2Glow 
              ? 'opacity-100 bg-radial from-[#38BDF8]/80 via-[#C5A945]/50 to-transparent scale-150 animate-pulse' 
              : sat2Hovered 
                ? 'opacity-70 bg-radial from-[#38BDF8]/50 via-[#DC143C]/30 to-transparent scale-125'
                : 'opacity-0 scale-90'
          }`}
        />

        {/* Interactive Target Reticle */}
        <div 
          className={`absolute -inset-4 rounded-full border border-dashed border-[#38BDF8] pointer-events-none transition-all duration-300 ${
            sat2Hovered || sat2Glow ? 'opacity-80 scale-100 -rotate-45' : 'opacity-0 scale-75'
          }`}
        />

        {/* Vector SVG for Satellite 2 (Distinct Hexagonal Relay Dish Architecture) */}
        <div 
          className={`relative transition-all duration-200 ${
            sat2Glow 
              ? 'drop-shadow-[0_0_20px_rgba(56,189,248,0.9)] drop-shadow-[0_0_35px_rgba(255,229,143,0.95)]' 
              : sat2Hovered
                ? 'drop-shadow-[0_0_12px_rgba(56,189,248,0.7)] drop-shadow-[0_0_18px_rgba(156,122,40,0.4)]'
                : 'drop-shadow-[0_4px_10px_rgba(26,24,21,0.35)]'
          }`}
        >
          <svg width="52" height="52" viewBox="0 0 52 52" className="overflow-visible">
            <defs>
              <linearGradient id="relaySolarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={sat2Glow ? "#BAE6FD" : sat2Hovered ? "#38BDF8" : "#164E63"} />
                <stop offset="100%" stopColor={sat2Glow ? "#0284C7" : sat2Hovered ? "#0E7490" : "#083344"} />
              </linearGradient>

              <linearGradient id="relayChassisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={sat2Glow ? "#FAF6EE" : sat2Hovered ? "#E5DBC7" : "#CBD5E1"} />
                <stop offset="100%" stopColor={sat2Glow ? "#C5A945" : sat2Hovered ? "#64748B" : "#475569"} />
              </linearGradient>

              <linearGradient id="relayThrusterFlame" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#0284C7" stopOpacity="0" />
                <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#FAF6EE" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Twin Ion Thruster Plumes */}
            <g transform="translate(8, 22) rotate(180)">
              <polygon 
                points="0,-2 11,0 0,2" 
                fill="url(#relayThrusterFlame)" 
                opacity={sat2Glow ? 0.95 : sat2Hovered ? 0.8 : 0.5}
              />
            </g>
            <g transform="translate(8, 30) rotate(180)">
              <polygon 
                points="0,-2 11,0 0,2" 
                fill="url(#relayThrusterFlame)" 
                opacity={sat2Glow ? 0.95 : sat2Hovered ? 0.8 : 0.5}
              />
            </g>

            {/* Parabolic Deep-Space High-Gain Dish */}
            <path 
              d="M 44,14 Q 35,26 44,38" 
              stroke={sat2Glow ? "#FFE58F" : "#1A1A1A"} 
              strokeWidth={sat2Glow ? "2.5" : "1.8"} 
              fill={sat2Glow ? "#FFE58F" : "#F0EAD6"} 
              opacity={sat2Glow ? "0.9" : "0.75"}
            />
            {/* Dish Feed Horn Antenna */}
            <line x1="39" y1="26" x2="48" y2="26" stroke={sat2Glow ? "#FAF6EE" : "#1A1A1A"} strokeWidth="1.2" />
            <circle cx="48" cy="26" r="1.5" fill={sat2Glow ? "#38BDF8" : "#DC143C"} />

            {/* Cross/Quad Solar Wing Top */}
            <rect 
              x="20" 
              y="6" 
              width="10" 
              height="12" 
              rx="1" 
              fill="url(#relaySolarGrad)" 
              stroke={sat2Glow ? "#BAE6FD" : "#1A1A1A"} 
              strokeWidth="0.9" 
            />
            <line x1="20" y1="12" x2="30" y2="12" stroke="#FAF6EE" strokeWidth="0.5" opacity="0.6" />

            {/* Cross/Quad Solar Wing Bottom */}
            <rect 
              x="20" 
              y="34" 
              width="10" 
              height="12" 
              rx="1" 
              fill="url(#relaySolarGrad)" 
              stroke={sat2Glow ? "#BAE6FD" : "#1A1A1A"} 
              strokeWidth="0.9" 
            />
            <line x1="20" y1="40" x2="30" y2="40" stroke="#FAF6EE" strokeWidth="0.5" opacity="0.6" />

            {/* Main Bus Chassis (Titanium Octagonal Housing) */}
            <polygon 
              points="18,20 24,18 32,18 36,22 36,30 32,34 24,34 18,30" 
              fill="url(#relayChassisGrad)" 
              stroke={sat2Glow ? "#FAF6EE" : "#1A1A1A"} 
              strokeWidth={sat2Glow ? "1.8" : "1.2"} 
            />

            {/* Central Optical Core */}
            <circle cx="27" cy="26" r="3" fill="#1A1A1A" />
            <circle cx="27" cy="26" r="1.5" fill={sat2Glow ? "#38BDF8" : "#C5A945"} />

            {/* Beacon LED */}
            <circle 
              cx="33" 
              cy="22" 
              r={sat2Glow ? 2.5 : 1.5} 
              fill={sat2Glow ? "#38BDF8" : "#DC143C"} 
              className="animate-pulse"
            />
          </svg>
        </div>
      </div>
        </>
      )}

    </div>
  );
};
